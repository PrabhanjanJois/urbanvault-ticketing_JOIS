from django.db import models
from django.contrib.auth.models import AbstractUser


class UserRole(models.TextChoices):
    CLIENT_POC = 'CLIENT_POC', 'Client POC'
    FACILITY_MANAGER = 'FACILITY_MANAGER', 'Facility Manager'
    DEPARTMENT_POC = 'DEPARTMENT_POC', 'Department POC'
    TECHNICIAN = 'TECHNICIAN', 'Technician / Worker'


class User(AbstractUser):
    role = models.CharField(
        max_length=30,
        choices=UserRole.choices,
        default=UserRole.CLIENT_POC,
        db_index=True
    )
    title = models.CharField(max_length=120, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    avatar_initials = models.CharField(max_length=10, blank=True)

    client = models.ForeignKey(
        'ticketing.Client',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='users'
    )
    department = models.ForeignKey(
        'ticketing.Department',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='members'
    )

    def save(self, *args, **kwargs):
        if not self.avatar_initials:
            if self.first_name and self.last_name:
                self.avatar_initials = f"{self.first_name[0]}{self.last_name[0]}".upper()
            elif self.first_name:
                self.avatar_initials = self.first_name[:2].upper()
            elif self.username:
                self.avatar_initials = self.username[:2].upper()
        super().save(*args, **kwargs)

    @property
    def display_name(self):
        full = f"{self.first_name} {self.last_name}".strip()
        return full if full else self.username

    def __str__(self):
        return f"{self.display_name} ({self.get_role_display()})"
