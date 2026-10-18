import logging
import uuid
from django.db import transaction, models
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.models import User, UserRole
from .models import (
    Property, Client, Department, Ticket, TicketActivity, TicketComment,
    TicketStatus, ActivityActionType
)
from .serializers import (
    PropertySerializer, ClientSerializer, DepartmentSerializer, WorkerUserSerializer,
    TicketListSerializer, TicketDetailSerializer, TicketCreateSerializer,
    AssignWorkerSerializer, ChangeDepartmentSerializer, SubmitAssessmentSerializer,
    AddCommentSerializer, TicketCommentSerializer
)
from .permissions import CanManageTicketAction
from .tasks import send_ticket_notification

logger = logging.getLogger('ticketing')


def generate_ticket_number():
    """Generates a human-friendly ticket identifier, e.g. TKT-1042 or random sequence."""
    last_ticket = Ticket.objects.order_by('-id').first()
    next_id = (last_ticket.id + 1040) if last_ticket else 1042
    return f"TKT-{next_id}"


class TicketViewSet(viewsets.ModelViewSet):
    """
    Primary API ViewSet for Ticket CRUD and lifecycle state transitions.
    Implements query optimizations, audit history generation, and transactional writes.
    """
    permission_classes = [permissions.IsAuthenticated, CanManageTicketAction]

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TicketDetailSerializer
        return TicketListSerializer

    def _get_base_scoped_queryset(self):
        user = self.request.user
        qs = Ticket.objects.select_related(
            'client',
            'property',
            'department',
            'created_by',
            'assigned_to'
        ).prefetch_related(
            'activities__actor',
            'comments__author'
        )

        # 1. Enforce Role-based visibility scoping
        if not user.is_superuser:
            if user.role == UserRole.CLIENT_POC:
                qs = qs.filter(client_id=user.client_id)
            elif user.role == UserRole.FACILITY_MANAGER:
                managed_prop_ids = Property.objects.filter(facility_manager=user).values_list('id', flat=True)
                if managed_prop_ids:
                    qs = qs.filter(property_id__in=managed_prop_ids)
            elif user.role == UserRole.DEPARTMENT_POC:
                if user.department_id:
                    qs = qs.filter(models.Q(department_id=user.department_id) | models.Q(assigned_to=user))
            elif user.role == UserRole.TECHNICIAN:
                if user.department_id:
                    qs = qs.filter(models.Q(assigned_to=user) | models.Q(department_id=user.department_id))
                else:
                    qs = qs.filter(assigned_to=user)

        # Apply base filters (search, client, department, facility manager)
        search_query = self.request.query_params.get('search')
        if search_query:
            qs = qs.filter(
                models.Q(title__icontains=search_query) |
                models.Q(description__icontains=search_query) |
                models.Q(ticket_number__icontains=search_query)
            )

        client_param = self.request.query_params.get('client')
        if client_param:
            if client_param.isdigit():
                qs = qs.filter(client_id=int(client_param))
            else:
                qs = qs.filter(client__name__icontains=client_param)

        dept_param = self.request.query_params.get('department')
        if dept_param:
            if dept_param.isdigit():
                qs = qs.filter(department_id=int(dept_param))
            else:
                qs = qs.filter(department__name__icontains=dept_param)

        fm_param = self.request.query_params.get('facility_manager')
        if fm_param and fm_param.isdigit():
            qs = qs.filter(property__facility_manager_id=int(fm_param))

        return qs

    def get_queryset(self):
        qs = self._get_base_scoped_queryset()

        # 2. Filter by Open/Closed tabs (only applies to list action)
        if self.action == 'list':
            tab = self.request.query_params.get('tab', 'open').lower()
            if tab == 'open':
                qs = qs.filter(status__in=[
                    TicketStatus.PENDING_TECHNICIAN_ASSIGNMENT,
                    TicketStatus.PENDING_TECHNICIAN_ASSESSMENT,
                    TicketStatus.PENDING_DEPARTMENT_REVIEW,
                ])
            elif tab == 'closed':
                qs = qs.filter(status__in=[
                    TicketStatus.RESOLVED,
                    TicketStatus.CLOSED,
                ])

        # Status filter
        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        # 5. Sorting (Newest First / Oldest First)
        ordering = self.request.query_params.get('ordering', '-created_at')
        if ordering in ['created_at', '-created_at']:
            qs = qs.order_by(ordering)
        else:
            qs = qs.order_by('-created_at')

        return qs

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        base_qs = self._get_base_scoped_queryset()
        open_count = base_qs.filter(status__in=[
            TicketStatus.PENDING_TECHNICIAN_ASSIGNMENT,
            TicketStatus.PENDING_TECHNICIAN_ASSESSMENT,
            TicketStatus.PENDING_DEPARTMENT_REVIEW,
        ]).count()
        closed_count = base_qs.filter(status__in=[
            TicketStatus.RESOLVED,
            TicketStatus.CLOSED,
        ]).count()

        if isinstance(response.data, dict):
            response.data['open_count'] = open_count
            response.data['closed_count'] = closed_count
        return response

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """
        Flow A: Ticket Creation
        - Creates ticket record
        - Auto-routes to Concerned Department POC
        - Adds 2 immutable Audit Log events: 1) Created, 2) Auto-assigned
        - Dispatches Celery async notification
        """
        serializer = TicketCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        user = request.user
        validated = serializer.validated_data
        client = validated['client']
        department = validated['department']
        floors = validated['floors']
        title = validated['title']
        description = validated.get('description', '')

        # Property is determined by client's property
        ticket_property = client.property

        # System auto-assigns to Department POC
        dept_poc = department.poc

        ticket = Ticket.objects.create(
            ticket_number=generate_ticket_number(),
            client=client,
            property=ticket_property,
            floors=floors,
            department=department,
            created_by=user,
            assigned_to=dept_poc,
            title=title,
            description=description,
            status=TicketStatus.PENDING_TECHNICIAN_ASSIGNMENT,
        )

        # Activity Event 1: User created the ticket
        TicketActivity.objects.create(
            ticket=ticket,
            actor=user,
            action_type=ActivityActionType.CREATED,
            description=f"{user.display_name} created the ticket.",
            metadata={
                "client": client.name,
                "floors": floors,
                "title": title
            }
        )

        # Activity Event 2: System auto-assigned the ticket
        assignee_name = dept_poc.display_name if dept_poc else "Concerned Department"
        TicketActivity.objects.create(
            ticket=ticket,
            actor=None,  # System
            action_type=ActivityActionType.AUTO_ASSIGNED,
            description="System auto-assigned the ticket.",
            metadata={
                "assigned_from": "Unassigned",
                "assigned_to": assignee_name,
                "department": department.name
            }
        )

        logger.info(
            f"Ticket created: {ticket.ticket_number} by {user.username} (Client: {client.name}, Dept: {department.name})"
        )

        # Trigger asynchronous notification task via Celery
        try:
            send_ticket_notification.delay(
                ticket.id,
                'TICKET_CREATED',
                recipient_name=assignee_name
            )
        except Exception as e:
            logger.warning(f"Could not enqueue Celery notification: {str(e)}")

        response_serializer = TicketDetailSerializer(ticket, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='assign-worker')
    @transaction.atomic
    def assign_worker(self, request, pk=None):
        """
        Flow B: Department POC assigns a technician to the ticket.
        Transition: PENDING_TECHNICIAN_ASSIGNMENT -> PENDING_TECHNICIAN_ASSESSMENT
        """
        ticket = self.get_object()
        user = request.user

        if user.role != UserRole.DEPARTMENT_POC and not user.is_superuser:
            return Response(
                {"detail": "Only Department POC can assign workers to tickets."},
                status=status.HTTP_403_FORBIDDEN
            )

        if ticket.status not in [TicketStatus.PENDING_TECHNICIAN_ASSIGNMENT, TicketStatus.PENDING_DEPARTMENT_REVIEW]:
            return Response(
                {"detail": f"Cannot assign worker while ticket is in status: {ticket.get_status_display()}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = AssignWorkerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        worker = serializer.validated_data['worker_id']

        old_assignee_name = ticket.assigned_to.display_name if ticket.assigned_to else "Unassigned"
        ticket.assigned_to = worker
        ticket.status = TicketStatus.PENDING_TECHNICIAN_ASSESSMENT
        ticket.save()

        # Activity Event: Department POC assigned technician
        TicketActivity.objects.create(
            ticket=ticket,
            actor=user,
            action_type=ActivityActionType.ASSIGNED_WORKER,
            description=f"{user.display_name} assigned technician {worker.display_name}.",
            metadata={
                "assigned_from": old_assignee_name,
                "assigned_to": worker.display_name,
                "worker_id": worker.id
            }
        )

        logger.info(f"Worker assigned: {worker.username} assigned to {ticket.ticket_number} by {user.username}")

        # Async notification to technician
        try:
            send_ticket_notification.delay(
                ticket.id,
                'WORKER_ASSIGNED',
                recipient_name=worker.display_name
            )
        except Exception as e:
            logger.warning(f"Celery notification error: {str(e)}")

        return Response(TicketDetailSerializer(ticket, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='change-department')
    @transaction.atomic
    def change_department(self, request, pk=None):
        """
        Flow B: Department POC changes ticket's department and adds forwarding note.
        Re-assigns to the new department's POC.
        """
        ticket = self.get_object()
        user = request.user

        if user.role != UserRole.DEPARTMENT_POC and not user.is_superuser:
            return Response(
                {"detail": "Only Department POC can re-route tickets to another department."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = ChangeDepartmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_dept = serializer.validated_data['department_id']
        note = serializer.validated_data['forwarding_note']

        old_dept_name = ticket.department.name
        old_assignee_name = ticket.assigned_to.display_name if ticket.assigned_to else "Unassigned"

        ticket.department = new_dept
        ticket.assigned_to = new_dept.poc
        ticket.status = TicketStatus.PENDING_TECHNICIAN_ASSIGNMENT
        ticket.save()

        # Activity Event
        TicketActivity.objects.create(
            ticket=ticket,
            actor=user,
            action_type=ActivityActionType.CHANGED_DEPARTMENT,
            description=f"{user.display_name} changed department.",
            metadata={
                "old_department": old_dept_name,
                "new_department": new_dept.name,
                "old_assignee": old_assignee_name,
                "new_assignee": new_dept.poc.display_name if new_dept.poc else "Department POC",
                "forwarding_note": note
            }
        )

        # Also add forwarding note as a comment for visibility
        TicketComment.objects.create(
            ticket=ticket,
            author=user,
            content=f"[Department Transfer Note]: {note}"
        )

        logger.info(f"Ticket {ticket.ticket_number} department changed from {old_dept_name} to {new_dept.name}")

        try:
            send_ticket_notification.delay(
                ticket.id,
                'DEPARTMENT_CHANGED',
                recipient_name=new_dept.poc.display_name if new_dept.poc else new_dept.name
            )
        except Exception as e:
            logger.warning(f"Celery notification error: {str(e)}")

        return Response(TicketDetailSerializer(ticket, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='submit-assessment')
    @transaction.atomic
    def submit_assessment(self, request, pk=None):
        """
        Flow B: Assigned Technician submits their field assessment.
        Options:
        - Mark Fully Resolved -> status = RESOLVED
        - Mark Partially Resolved -> status = PENDING_DEPARTMENT_REVIEW
        - Suggest Department/Worker Change -> status = PENDING_DEPARTMENT_REVIEW
        """
        ticket = self.get_object()
        user = request.user

        if user.role != UserRole.TECHNICIAN and not user.is_superuser:
            return Response(
                {"detail": "Only assigned technician can submit an assessment."},
                status=status.HTTP_403_FORBIDDEN
            )

        if ticket.assigned_to_id != user.id:
            return Response(
                {"detail": "You are not the technician assigned to this ticket."},
                status=status.HTTP_403_FORBIDDEN
            )

        if ticket.status != TicketStatus.PENDING_TECHNICIAN_ASSESSMENT:
            return Response(
                {"detail": f"Cannot submit assessment when ticket is in status: {ticket.get_status_display()}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = SubmitAssessmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        assessment_type = serializer.validated_data['assessment_type']
        notes = serializer.validated_data.get('notes', '')

        old_status = ticket.status
        if assessment_type == 'FULLY_RESOLVED':
            new_status = TicketStatus.RESOLVED
            action_desc = f"{user.display_name} marked ticket fully resolved."
            action_type = ActivityActionType.RESOLVED
        elif assessment_type == 'PARTIALLY_RESOLVED':
            new_status = TicketStatus.PENDING_DEPARTMENT_REVIEW
            action_desc = f"{user.display_name} marked ticket partially resolved."
            action_type = ActivityActionType.STATUS_CHANGED
        else:  # SUGGEST_CHANGE
            new_status = TicketStatus.PENDING_DEPARTMENT_REVIEW
            action_desc = f"{user.display_name} suggested department/worker change."
            action_type = ActivityActionType.STATUS_CHANGED

        ticket.status = new_status
        ticket.save()

        # Activity log event
        TicketActivity.objects.create(
            ticket=ticket,
            actor=user,
            action_type=action_type,
            description=f"{user.display_name} changed status of the ticket.",
            metadata={
                "old_status": old_status,
                "new_status": new_status,
                "assessment_type": assessment_type,
                "notes": notes
            }
        )

        if notes:
            TicketComment.objects.create(
                ticket=ticket,
                author=user,
                content=f"[Technician Assessment ({assessment_type})]: {notes}"
            )

        logger.info(f"Technician {user.username} submitted assessment ({assessment_type}) for {ticket.ticket_number}")

        try:
            send_ticket_notification.delay(
                ticket.id,
                'ASSESSMENT_SUBMITTED',
                recipient_name=ticket.department.poc.display_name if ticket.department.poc else "Department POC"
            )
        except Exception as e:
            logger.warning(f"Celery notification error: {str(e)}")

        return Response(TicketDetailSerializer(ticket, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='mark-resolved')
    @transaction.atomic
    def mark_resolved(self, request, pk=None):
        """
        Client POC or Department POC marks the ticket as Resolved directly.
        """
        ticket = self.get_object()
        user = request.user

        if user.role not in [UserRole.CLIENT_POC, UserRole.DEPARTMENT_POC] and not user.is_superuser:
            return Response(
                {"detail": "Only Client POC or Department POC can directly mark tickets resolved."},
                status=status.HTTP_403_FORBIDDEN
            )

        if ticket.status == TicketStatus.RESOLVED:
            return Response(
                {"detail": "Ticket is already marked as resolved."},
                status=status.HTTP_400_BAD_REQUEST
            )

        old_status = ticket.status
        ticket.status = TicketStatus.RESOLVED
        ticket.save()

        TicketActivity.objects.create(
            ticket=ticket,
            actor=user,
            action_type=ActivityActionType.RESOLVED,
            description=f"{user.display_name} marked ticket as resolved.",
            metadata={
                "old_status": old_status,
                "new_status": TicketStatus.RESOLVED
            }
        )

        logger.info(f"Ticket {ticket.ticket_number} marked resolved by {user.username}")

        return Response(TicketDetailSerializer(ticket, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='comments')
    @transaction.atomic
    def add_comment(self, request, pk=None):
        """
        Sticky bottom comment section: append discussion/note to ticket.
        """
        ticket = self.get_object()
        serializer = AddCommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        comment = TicketComment.objects.create(
            ticket=ticket,
            author=request.user,
            content=serializer.validated_data['content']
        )

        # Add light audit entry for comment
        TicketActivity.objects.create(
            ticket=ticket,
            actor=request.user,
            action_type=ActivityActionType.COMMENT_ADDED,
            description=f"{request.user.display_name} posted a comment.",
            metadata={"comment_id": comment.id}
        )

        return Response(TicketCommentSerializer(comment).data, status=status.HTTP_201_CREATED)


class AuxiliaryDataView(APIView):
    """
    Returns dropdown options for clients, departments, and quick issues tailored for the active user.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user

        clients_qs = Client.objects.select_related('property').all()
        departments_qs = Department.objects.select_related('poc').all()
        properties_qs = Property.objects.select_related('facility_manager').all()

        # If client POC, provide their own client floors
        if user.role == UserRole.CLIENT_POC and user.client:
            clients_data = [ClientSerializer(user.client).data]
        else:
            clients_data = ClientSerializer(clients_qs, many=True).data

        departments_data = DepartmentSerializer(departments_qs, many=True).data
        properties_data = PropertySerializer(properties_qs, many=True).data

        # Available technicians for assignment
        technicians = User.objects.filter(role=UserRole.TECHNICIAN, is_active=True).order_by('first_name')
        technicians_data = WorkerUserSerializer(technicians, many=True).data

        # Standard quick issues based on wireframe
        quick_issues = [
            {"title": "AC not cooling", "department": "Technical / HVAC"},
            {"title": "Internet not working", "department": "IT & Networks"},
            {"title": "Pantry not cleaned", "department": "Housekeeping"},
            {"title": "Lights flickering", "department": "Electrical"},
        ]

        return Response({
            "clients": clients_data,
            "departments": departments_data,
            "properties": properties_data,
            "technicians": technicians_data,
            "quick_issues": quick_issues,
        })
