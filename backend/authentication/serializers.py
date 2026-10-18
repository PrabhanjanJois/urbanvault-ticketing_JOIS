from rest_framework import serializers
from .models import User, UserRole


class UserSerializer(serializers.ModelSerializer):
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    display_name = serializers.CharField(read_only=True)
    client_name = serializers.CharField(source='client.name', read_only=True)
    department_name = serializers.CharField(source='department.name', read_only=True)

    class Meta:
        model = User
        fields = [
            'id',
            'username',
            'first_name',
            'last_name',
            'display_name',
            'email',
            'role',
            'role_display',
            'title',
            'phone',
            'avatar_initials',
            'client',
            'client_name',
            'department',
            'department_name',
        ]
        read_only_fields = ['id', 'display_name', 'role_display', 'client_name', 'department_name']


class SwitchPersonaSerializer(serializers.Serializer):
    username = serializers.CharField(required=True)
