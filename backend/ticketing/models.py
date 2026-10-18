from django.db import models
from django.conf import settings


class TicketStatus(models.TextChoices):
    PENDING_TECHNICIAN_ASSIGNMENT = 'PENDING_TECHNICIAN_ASSIGNMENT', 'Pending Manager Approval'
    PENDING_TECHNICIAN_ASSESSMENT = 'PENDING_TECHNICIAN_ASSESSMENT', 'Pending Technician Assessment'
    PENDING_DEPARTMENT_REVIEW = 'PENDING_DEPARTMENT_REVIEW', 'Pending Department POC Review'
    RESOLVED = 'RESOLVED', 'Resolved'
    CLOSED = 'CLOSED', 'Closed'


class ActivityActionType(models.TextChoices):
    CREATED = 'CREATED', 'Created Ticket'
    AUTO_ASSIGNED = 'AUTO_ASSIGNED', 'System Auto-Assigned'
    ASSIGNED_WORKER = 'ASSIGNED_WORKER', 'Assigned Worker'
    CHANGED_DEPARTMENT = 'CHANGED_DEPARTMENT', 'Changed Department'
    STATUS_CHANGED = 'STATUS_CHANGED', 'Status Changed'
    RESOLVED = 'RESOLVED', 'Marked Resolved'
    COMMENT_ADDED = 'COMMENT_ADDED', 'Comment Added'


class Property(models.Model):
    name = models.CharField(max_length=150, unique=True)
    address = models.TextField(blank=True)
    total_floors = models.JSONField(default=list, help_text='List of floors, e.g. ["1F", "2F", "3F"]')
    facility_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='managed_properties'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = 'Properties'
        ordering = ['name']

    def __str__(self):
        return self.name


class Client(models.Model):
    name = models.CharField(max_length=150, unique=True)
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='clients'
    )
    occupied_floors = models.JSONField(
        default=list,
        help_text='Floors occupied by this client, e.g. ["2F", "3F"]'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.property.name})"


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    poc = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='poc_departments'
    )
    default_quick_issues = models.JSONField(
        default=list,
        blank=True,
        help_text='Common issue templates for this department'
    )

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Ticket(models.Model):
    ticket_number = models.CharField(max_length=32, unique=True, db_index=True)
    client = models.ForeignKey(
        Client,
        on_delete=models.CASCADE,
        related_name='tickets'
    )
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name='tickets'
    )
    floors = models.JSONField(
        default=list,
        help_text='Affected floor(s), e.g. ["2F", "3F"]'
    )
    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT,
        related_name='tickets'
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_tickets'
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tickets'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    ac_unit_number = models.CharField(max_length=64, blank=True, default='', help_text='Optional AC / asset unique identifier')
    image_url = models.CharField(max_length=500, blank=True, default='', help_text='Attached image URL')
    status = models.CharField(
        max_length=40,
        choices=TicketStatus.choices,
        default=TicketStatus.PENDING_TECHNICIAN_ASSIGNMENT,
        db_index=True
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at'], name='tkt_status_created_idx'),
            models.Index(fields=['client', 'status'], name='tkt_client_status_idx'),
            models.Index(fields=['department', 'status'], name='tkt_dept_status_idx'),
            models.Index(fields=['assigned_to', 'status'], name='tkt_assignee_status_idx'),
        ]

    def __str__(self):
        return f"{self.ticket_number}: {self.title} ({self.get_status_display()})"


class TicketActivity(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='activities'
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activities'
    )
    action_type = models.CharField(
        max_length=40,
        choices=ActivityActionType.choices
    )
    description = models.CharField(max_length=255)
    image_url = models.CharField(max_length=500, blank=True, default='', help_text='Attached event image URL')
    metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text='Context: old_status, new_status, old_assignee, new_assignee, note, etc.'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['created_at']
        verbose_name_plural = 'Ticket Activities'

    def __str__(self):
        return f"[{self.ticket.ticket_number}] {self.description} ({self.created_at})"


class TicketComment(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='ticket_comments'
    )
    content = models.TextField()
    image_url = models.CharField(max_length=500, blank=True, default='', help_text='Attached comment image URL')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author.display_name} on {self.ticket.ticket_number}"
