from rest_framework import serializers
from authentication.models import User, UserRole
from .models import (
    Property, Client, Department, Ticket, TicketActivity, TicketComment,
    TicketStatus, ActivityActionType
)


class PropertySerializer(serializers.ModelSerializer):
    facility_manager_name = serializers.CharField(source='facility_manager.display_name', read_only=True)

    class Meta:
        model = Property
        fields = ['id', 'name', 'address', 'total_floors', 'facility_manager', 'facility_manager_name']


class ClientSerializer(serializers.ModelSerializer):
    property_name = serializers.CharField(source='property.name', read_only=True)

    class Meta:
        model = Client
        fields = ['id', 'name', 'property', 'property_name', 'occupied_floors']


class DepartmentSerializer(serializers.ModelSerializer):
    poc_name = serializers.CharField(source='poc.display_name', read_only=True)

    class Meta:
        model = Department
        fields = ['id', 'name', 'poc', 'poc_name', 'default_quick_issues']


class WorkerUserSerializer(serializers.ModelSerializer):
    display_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'display_name', 'title', 'avatar_initials', 'department']


class TicketActivitySerializer(serializers.ModelSerializer):
    actor_name = serializers.SerializerMethodField()
    actor_initials = serializers.SerializerMethodField()

    class Meta:
        model = TicketActivity
        fields = [
            'id', 'ticket', 'actor', 'actor_name', 'actor_initials',
            'action_type', 'description', 'metadata', 'created_at'
        ]

    def get_actor_name(self, obj):
        if obj.actor:
            return obj.actor.display_name
        return "System"

    def get_actor_initials(self, obj):
        if obj.actor:
            return obj.actor.avatar_initials
        return "S"


class TicketCommentSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.display_name', read_only=True)
    author_initials = serializers.CharField(source='author.avatar_initials', read_only=True)
    author_role = serializers.CharField(source='author.get_role_display', read_only=True)

    class Meta:
        model = TicketComment
        fields = [
            'id', 'ticket', 'author', 'author_name', 'author_initials',
            'author_role', 'content', 'created_at'
        ]
        read_only_fields = ['id', 'ticket', 'author', 'created_at']


class TicketListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    property_name = serializers.CharField(source='property.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.display_name', read_only=True)
    created_by_title = serializers.CharField(source='created_by.title', read_only=True)
    created_by_initials = serializers.CharField(source='created_by.avatar_initials', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.display_name', read_only=True, default='')
    assigned_to_title = serializers.CharField(source='assigned_to.title', read_only=True, default='')
    assigned_to_initials = serializers.CharField(source='assigned_to.avatar_initials', read_only=True, default='')

    class Meta:
        model = Ticket
        fields = [
            'id',
            'ticket_number',
            'title',
            'description',
            'status',
            'status_display',
            'client',
            'client_name',
            'property',
            'property_name',
            'floors',
            'department',
            'department_name',
            'created_by',
            'created_by_name',
            'created_by_title',
            'created_by_initials',
            'assigned_to',
            'assigned_to_name',
            'assigned_to_title',
            'assigned_to_initials',
            'created_at',
            'updated_at',
        ]


class TicketDetailSerializer(TicketListSerializer):
    activities = TicketActivitySerializer(many=True, read_only=True)
    comments = TicketCommentSerializer(many=True, read_only=True)
    available_actions = serializers.SerializerMethodField()

    class Meta(TicketListSerializer.Meta):
        fields = TicketListSerializer.Meta.fields + ['activities', 'comments', 'available_actions']

    def get_available_actions(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return []

        user = request.user
        actions = []

        # Client POC: can Mark Resolved on their client's tickets unless already resolved/closed
        if user.role == UserRole.CLIENT_POC and obj.client_id == user.client_id:
            if obj.status not in [TicketStatus.RESOLVED, TicketStatus.CLOSED]:
                actions.append('MARK_RESOLVED')

        # Department POC: when ticket is in their department
        elif user.role == UserRole.DEPARTMENT_POC and (obj.department_id == user.department_id or obj.assigned_to_id == user.id):
            if obj.status == TicketStatus.PENDING_TECHNICIAN_ASSIGNMENT:
                actions.extend(['ASSIGN_WORKER', 'CHANGE_DEPARTMENT', 'MARK_RESOLVED'])
            elif obj.status == TicketStatus.PENDING_DEPARTMENT_REVIEW:
                actions.extend(['ASSIGN_WORKER', 'CHANGE_DEPARTMENT', 'MARK_RESOLVED'])
            elif obj.status not in [TicketStatus.RESOLVED, TicketStatus.CLOSED]:
                actions.extend(['CHANGE_DEPARTMENT', 'MARK_RESOLVED'])

        # Technician: when assigned to this ticket
        elif user.role == UserRole.TECHNICIAN and obj.assigned_to_id == user.id:
            if obj.status == TicketStatus.PENDING_TECHNICIAN_ASSESSMENT:
                actions.append('SUBMIT_ASSESSMENT')

        # Facility Manager: monitor only (no direct state changing CTAs, but can comment)
        return actions


class TicketCreateSerializer(serializers.Serializer):
    client = serializers.PrimaryKeyRelatedField(
        queryset=Client.objects.all(),
        required=False,
        allow_null=True
    )
    department = serializers.PrimaryKeyRelatedField(
        queryset=Department.objects.all(),
        required=False,
        allow_null=True
    )
    floors = serializers.ListField(
        child=serializers.CharField(max_length=20),
        allow_empty=False
    )
    title = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        user = self.context['request'].user
        if user.role == UserRole.CLIENT_POC:
            if not user.client:
                raise serializers.ValidationError("Authenticated Client POC is not associated with any client entity.")
            attrs['client'] = user.client
        else:
            if not attrs.get('client'):
                raise serializers.ValidationError({"client": "Client is required for internal staff creating a ticket."})

        # Infer department if not explicitly chosen based on title keywords
        if not attrs.get('department'):
            title_lower = attrs.get('title', '').lower()
            if any(term in title_lower for term in ['ac', 'air', 'cooling', 'hvac', 'lift', 'chiller']):
                dept = Department.objects.filter(name__icontains='HVAC').first()
            elif any(term in title_lower for term in ['internet', 'wifi', 'network', 'cable', 'router']):
                dept = Department.objects.filter(name__icontains='IT').first()
            elif any(term in title_lower for term in ['clean', 'pantry', 'washroom', 'dust', 'trash']):
                dept = Department.objects.filter(name__icontains='Housekeeping').first()
            elif any(term in title_lower for term in ['light', 'power', 'switch', 'electric']):
                dept = Department.objects.filter(name__icontains='Electrical').first()
            else:
                dept = Department.objects.first()

            if not dept:
                raise serializers.ValidationError({"department": "Could not determine department for this issue."})
            attrs['department'] = dept

        return attrs


class AssignWorkerSerializer(serializers.Serializer):
    worker_id = serializers.IntegerField(required=True)

    def validate_worker_id(self, value):
        try:
            worker = User.objects.get(id=value, role=UserRole.TECHNICIAN)
        except User.DoesNotExist:
            raise serializers.ValidationError("Valid technician user with this ID was not found.")
        return worker


class ChangeDepartmentSerializer(serializers.Serializer):
    department_id = serializers.IntegerField(required=True)
    forwarding_note = serializers.CharField(required=True, min_length=3)

    def validate_department_id(self, value):
        try:
            dept = Department.objects.get(id=value)
        except Department.DoesNotExist:
            raise serializers.ValidationError("Department with this ID was not found.")
        return dept


class SubmitAssessmentSerializer(serializers.Serializer):
    assessment_type = serializers.ChoiceField(
        choices=[
            ('FULLY_RESOLVED', 'Mark Fully Resolved'),
            ('PARTIALLY_RESOLVED', 'Mark Partially Resolved'),
            ('SUGGEST_CHANGE', 'Suggest Department/Worker Change'),
        ]
    )
    notes = serializers.CharField(required=False, allow_blank=True, default='')


class AddCommentSerializer(serializers.Serializer):
    content = serializers.CharField(required=True, min_length=1)
