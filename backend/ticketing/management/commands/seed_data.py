import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from authentication.models import User, UserRole
from ticketing.models import (
    Property, Client, Department, Ticket, TicketActivity, TicketComment,
    TicketStatus, ActivityActionType
)


class Command(BaseCommand):
    help = 'Seeds initial users, personas, properties, clients, departments, and tickets'

    def handle(self, *args, **options):
        self.stdout.write("Seeding UrbanVault database...")

        # 1. Departments
        dept_hvac, _ = Department.objects.get_or_create(
            name="Technical / HVAC",
            defaults={"default_quick_issues": ["AC not cooling", "AC leaking water", "Thermostat stuck"]}
        )
        dept_it, _ = Department.objects.get_or_create(
            name="IT & Networks",
            defaults={"default_quick_issues": ["Internet not working", "Conference room Wi-Fi drops", "LAN port broken"]}
        )
        dept_hk, _ = Department.objects.get_or_create(
            name="Housekeeping",
            defaults={"default_quick_issues": ["Pantry not cleaned", "Restroom supplies empty", "Trash bin overflow"]}
        )
        dept_elec, _ = Department.objects.get_or_create(
            name="Electrical",
            defaults={"default_quick_issues": ["Lights flickering", "Power socket trip", "UPS beep"]}
        )

        # 2. Users / Personas
        # Password for all seeded users for easy login if needed
        DEFAULT_PWD = "UrbanVaultPass2026!"

        # Chaitanya M (Client POC)
        client_chaitanya, _ = User.objects.get_or_create(
            username="client_chaitanya",
            defaults={
                "first_name": "Chaitanya",
                "last_name": "M",
                "role": UserRole.CLIENT_POC,
                "title": "Client POC",
                "avatar_initials": "CM",
                "phone": "+91 98765 43210",
                "email": "chaitanya@harness.io",
            }
        )
        client_chaitanya.set_password(DEFAULT_PWD)
        client_chaitanya.save()

        # Chandan S (Facility Manager)
        fm_chandan, _ = User.objects.get_or_create(
            username="fm_chandan",
            defaults={
                "first_name": "Chandan",
                "last_name": "S",
                "role": UserRole.FACILITY_MANAGER,
                "title": "Facility Manager",
                "avatar_initials": "CS",
                "phone": "+91 98765 43211",
                "email": "chandan.s@urbanvault.in",
            }
        )
        fm_chandan.set_password(DEFAULT_PWD)
        fm_chandan.save()

        # Dhananjaya Murthy (Technical Manager)
        dept_dhananjaya, _ = User.objects.get_or_create(
            username="dept_dhananjaya",
            defaults={
                "first_name": "Dhananjaya",
                "last_name": "Murthy",
                "role": UserRole.DEPARTMENT_POC,
                "title": "Technical Manager",
                "avatar_initials": "DM",
                "department": dept_hvac,
                "phone": "+91 98765 43212",
                "email": "dhananjaya.m@urbanvault.in",
            }
        )
        dept_dhananjaya.set_password(DEFAULT_PWD)
        dept_dhananjaya.save()

        # Abdul (IT Manager)
        dept_abdul, _ = User.objects.get_or_create(
            username="dept_abdul",
            defaults={
                "first_name": "Abdul",
                "last_name": "Rahman",
                "role": UserRole.DEPARTMENT_POC,
                "title": "IT Manager",
                "avatar_initials": "A",
                "department": dept_it,
                "phone": "+91 98765 43213",
                "email": "abdul.r@urbanvault.in",
            }
        )
        dept_abdul.set_password(DEFAULT_PWD)
        dept_abdul.save()

        # Prakash Kumar (Technician)
        tech_prakash, _ = User.objects.get_or_create(
            username="tech_prakash",
            defaults={
                "first_name": "Prakash",
                "last_name": "Kumar",
                "role": UserRole.TECHNICIAN,
                "title": "Technician",
                "avatar_initials": "PK",
                "department": dept_hvac,
                "phone": "+91 98765 43214",
                "email": "prakash.k@urbanvault.in",
            }
        )
        tech_prakash.set_password(DEFAULT_PWD)
        tech_prakash.save()

        # Additional Technician for IT
        tech_suresh, _ = User.objects.get_or_create(
            username="tech_suresh",
            defaults={
                "first_name": "Suresh",
                "last_name": "R",
                "role": UserRole.TECHNICIAN,
                "title": "IT Technician",
                "avatar_initials": "SR",
                "department": dept_it,
                "phone": "+91 98765 43215",
                "email": "suresh.r@urbanvault.in",
            }
        )
        tech_suresh.set_password(DEFAULT_PWD)
        tech_suresh.save()

        # Update department POC references
        dept_hvac.poc = dept_dhananjaya
        dept_hvac.save()

        dept_it.poc = dept_abdul
        dept_it.save()

        dept_elec.poc = dept_dhananjaya
        dept_elec.save()

        dept_hk.poc = dept_dhananjaya
        dept_hk.save()

        # 3. Properties
        prop_harness_1317, _ = Property.objects.get_or_create(
            name="Harness-1317",
            defaults={
                "address": "1317, 100ft Road, Indiranagar, Bengaluru, Karnataka 560038",
                "total_floors": ["1F", "2F", "3F", "4F"],
                "facility_manager": fm_chandan,
            }
        )

        prop_hsr_502, _ = Property.objects.get_or_create(
            name="UrbanVault HSR-502",
            defaults={
                "address": "502, 14th Main Rd, Sector 7, HSR Layout, Bengaluru, Karnataka 560102",
                "total_floors": ["1F", "2F", "3F"],
                "facility_manager": fm_chandan,
            }
        )

        # 4. Clients
        client_harness, _ = Client.objects.get_or_create(
            name="Harness",
            defaults={
                "property": prop_harness_1317,
                "occupied_floors": ["2F", "3F"],
            }
        )

        client_stripe, _ = Client.objects.get_or_create(
            name="Stripe India",
            defaults={
                "property": prop_harness_1317,
                "occupied_floors": ["4F"],
            }
        )

        client_razorpay, _ = Client.objects.get_or_create(
            name="Razorpay Tech",
            defaults={
                "property": prop_hsr_502,
                "occupied_floors": ["1F", "2F"],
            }
        )

        # Link Chaitanya to Client Harness
        client_chaitanya.client = client_harness
        client_chaitanya.save()

        # 5. Tickets & Audit Trail
        now = timezone.now()

        # Exact ticket TKT-1042 from wireframe
        tkt_1042, created = Ticket.objects.get_or_create(
            ticket_number="TKT-1042",
            defaults={
                "client": client_harness,
                "property": prop_harness_1317,
                "floors": ["2F", "3F"],
                "department": dept_hvac,
                "created_by": client_chaitanya,
                "assigned_to": dept_dhananjaya,
                "title": "AC not cooling",
                "description": (
                    "The air conditioning units on floors 2 and 3 have stopped cooling effectively since this morning. "
                    "Multiple clients are complaining about uncomfortable temperatures. The units appear to be running "
                    "but producing warm air. Last service was 4 months ago. Clients on Floor 3 (server room side cabin) "
                    "are affected most severely."
                ),
                "status": TicketStatus.PENDING_TECHNICIAN_ASSIGNMENT,
            }
        )

        if created:
            TicketActivity.objects.create(
                ticket=tkt_1042,
                actor=client_chaitanya,
                action_type=ActivityActionType.CREATED,
                description=f"{client_chaitanya.display_name} created the ticket.",
                metadata={"client": client_harness.name, "floors": ["2F", "3F"]}
            )
            TicketActivity.objects.create(
                ticket=tkt_1042,
                actor=None,
                action_type=ActivityActionType.AUTO_ASSIGNED,
                description="System auto-assigned the ticket.",
                metadata={"assigned_from": "Unassigned", "assigned_to": dept_dhananjaya.display_name}
            )

        # Additional sample records for rich demonstration (pagination, search, filters)
        sample_tickets_data = [
            {
                "number": "TKT-1043",
                "client": client_harness,
                "property": prop_harness_1317,
                "floors": ["2F"],
                "department": dept_it,
                "created_by": client_chaitanya,
                "assigned_to": tech_suresh,
                "title": "Internet not working",
                "description": "Floor 2 east wing switches lost uplink connectivity after power fluctuation.",
                "status": TicketStatus.PENDING_TECHNICIAN_ASSESSMENT,
            },
            {
                "number": "TKT-1044",
                "client": client_harness,
                "property": prop_harness_1317,
                "floors": ["3F"],
                "department": dept_hk,
                "created_by": client_chaitanya,
                "assigned_to": dept_dhananjaya,
                "title": "Pantry not cleaned",
                "description": "Coffee machine leak in 3F pantry; needs immediate deep sanitization.",
                "status": TicketStatus.PENDING_DEPARTMENT_REVIEW,
            },
            {
                "number": "TKT-1045",
                "client": client_stripe,
                "property": prop_harness_1317,
                "floors": ["4F"],
                "department": dept_elec,
                "created_by": fm_chandan,
                "assigned_to": dept_dhananjaya,
                "title": "Lights flickering in board room",
                "description": "LED drivers flickering intermittently when AC compressor starts.",
                "status": TicketStatus.RESOLVED,
            },
            {
                "number": "TKT-1046",
                "client": client_harness,
                "property": prop_harness_1317,
                "floors": ["3F"],
                "department": dept_hvac,
                "created_by": client_chaitanya,
                "assigned_to": tech_prakash,
                "title": "Server room cooling unit high temperature alert",
                "description": "Ambient server room temperature reached 27C. Immediate fan check required.",
                "status": TicketStatus.PENDING_TECHNICIAN_ASSESSMENT,
            },
            {
                "number": "TKT-1047",
                "client": client_razorpay,
                "property": prop_hsr_502,
                "floors": ["1F"],
                "department": dept_it,
                "created_by": fm_chandan,
                "assigned_to": tech_suresh,
                "title": "Conference room HDMI display signal lost",
                "description": "Smart screen on 1F room not showing video input.",
                "status": TicketStatus.RESOLVED,
            },
            {
                "number": "TKT-1048",
                "client": client_harness,
                "property": prop_harness_1317,
                "floors": ["2F"],
                "department": dept_hk,
                "created_by": client_chaitanya,
                "assigned_to": None,
                "title": "Restroom tap low pressure",
                "description": "Main water pressure line regulator needed adjustment.",
                "status": TicketStatus.CLOSED,
            },
            {
                "number": "TKT-1049",
                "client": client_harness,
                "property": prop_harness_1317,
                "floors": ["2F", "3F"],
                "department": dept_it,
                "created_by": client_chaitanya,
                "assigned_to": dept_abdul,
                "title": "Main entrance access card scanner fail",
                "description": "Turnstile reader not reading NFC tags intermittently.",
                "status": TicketStatus.PENDING_TECHNICIAN_ASSIGNMENT,
            },
            {
                "number": "TKT-1050",
                "client": client_stripe,
                "property": prop_harness_1317,
                "floors": ["4F"],
                "department": dept_hvac,
                "created_by": fm_chandan,
                "assigned_to": tech_prakash,
                "title": "Air purifier filter scheduled replacement",
                "description": "Quarterly HEPA filter replacement completed.",
                "status": TicketStatus.RESOLVED,
            },
            {
                "number": "TKT-1051",
                "client": client_harness,
                "property": prop_harness_1317,
                "floors": ["2F"],
                "department": dept_it,
                "created_by": client_chaitanya,
                "assigned_to": tech_suresh,
                "title": "Printer offline on Floor 2",
                "description": "Network printer shows DHCP lease expiration error.",
                "status": TicketStatus.PENDING_TECHNICIAN_ASSESSMENT,
            },
            {
                "number": "TKT-1052",
                "client": client_harness,
                "property": prop_harness_1317,
                "floors": ["3F"],
                "department": dept_hvac,
                "created_by": client_chaitanya,
                "assigned_to": dept_dhananjaya,
                "title": "Water dispenser heating malfunction",
                "description": "Hot water tap not heating properly in pantry 3F.",
                "status": TicketStatus.PENDING_TECHNICIAN_ASSIGNMENT,
            },
        ]

        for item in sample_tickets_data:
            tkt, created = Ticket.objects.get_or_create(
                ticket_number=item["number"],
                defaults={
                    "client": item["client"],
                    "property": item["property"],
                    "floors": item["floors"],
                    "department": item["department"],
                    "created_by": item["created_by"],
                    "assigned_to": item["assigned_to"],
                    "title": item["title"],
                    "description": item["description"],
                    "status": item["status"],
                }
            )
            if created:
                TicketActivity.objects.create(
                    ticket=tkt,
                    actor=item["created_by"],
                    action_type=ActivityActionType.CREATED,
                    description=f"{item['created_by'].display_name} created the ticket.",
                    metadata={"client": item["client"].name, "floors": item["floors"]}
                )
                if item["assigned_to"]:
                    TicketActivity.objects.create(
                        ticket=tkt,
                        actor=None,
                        action_type=ActivityActionType.AUTO_ASSIGNED,
                        description="System auto-assigned the ticket.",
                        metadata={"assigned_to": item["assigned_to"].display_name}
                    )

        self.stdout.write(self.style.SUCCESS("Successfully seeded UrbanVault database with rich sample data!"))
