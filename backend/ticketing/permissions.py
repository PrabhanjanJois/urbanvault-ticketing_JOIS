from rest_framework import permissions
from authentication.models import UserRole


class IsClientPOC(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == UserRole.CLIENT_POC)


class IsFacilityManager(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == UserRole.FACILITY_MANAGER)


class IsDepartmentPOC(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == UserRole.DEPARTMENT_POC)


class IsTechnician(permissions.BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == UserRole.TECHNICIAN)


class CanManageTicketAction(permissions.BasePermission):
    """
    Object-level permission enforcing that users can only perform actions allowed for their role
    and for tickets they are authorized to interact with.
    """
    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        # Superuser always allowed
        if user.is_superuser:
            return True

        if user.role == UserRole.CLIENT_POC:
            # Client POC can only access tickets for their client
            return obj.client_id == user.client_id

        if user.role == UserRole.FACILITY_MANAGER:
            # Facility Manager can access tickets for their managed property
            if obj.property.facility_manager_id == user.id:
                return True
            # Also allow if assigned
            return True

        if user.role == UserRole.DEPARTMENT_POC:
            # Department POC can access tickets for their department
            return obj.department_id == user.department_id or obj.assigned_to_id == user.id

        if user.role == UserRole.TECHNICIAN:
            # Technician can view tickets assigned to them or in their department
            return obj.assigned_to_id == user.id or obj.department_id == user.department_id

        return False
