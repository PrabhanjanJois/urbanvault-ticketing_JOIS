import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from authentication.models import User, UserRole
from ticketing.models import Property, Client, Department, Ticket, TicketStatus


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def setup_data(db):
    dept = Department.objects.create(name="Technical / HVAC")
    prop = Property.objects.create(name="Harness-1317", total_floors=["1F", "2F", "3F"])
    client_obj = Client.objects.create(name="Harness", property=prop, occupied_floors=["2F", "3F"])

    client_user = User.objects.create_user(
        username="chaitanya_test",
        first_name="Chaitanya",
        last_name="M",
        role=UserRole.CLIENT_POC,
        client=client_obj
    )

    dept_poc = User.objects.create_user(
        username="dhananjaya_test",
        first_name="Dhananjaya",
        last_name="Murthy",
        role=UserRole.DEPARTMENT_POC,
        department=dept
    )
    dept.poc = dept_poc
    dept.save()

    technician = User.objects.create_user(
        username="prakash_test",
        first_name="Prakash",
        last_name="Kumar",
        role=UserRole.TECHNICIAN,
        department=dept
    )

    return {
        "dept": dept,
        "prop": prop,
        "client": client_obj,
        "client_user": client_user,
        "dept_poc": dept_poc,
        "technician": technician,
    }


@pytest.mark.django_db
class TestTicketLifecycleStateTransitions:
    def test_complete_valid_ticket_lifecycle(self, api_client, setup_data):
        client_user = setup_data["client_user"]
        dept_poc = setup_data["dept_poc"]
        technician = setup_data["technician"]
        client_obj = setup_data["client"]
        dept = setup_data["dept"]

        # Step 1: Client POC creates ticket
        api_client.force_authenticate(user=client_user)
        create_url = reverse("ticket-list")
        create_payload = {
            "title": "AC not cooling in meeting room",
            "description": "Warm air blowing from ceiling units",
            "floors": ["2F"],
            "department": dept.id,
        }
        res_create = api_client.post(create_url, create_payload, format="json")
        assert res_create.status_code == status.HTTP_201_CREATED
        ticket_id = res_create.data["id"]
        assert res_create.data["status"] == TicketStatus.PENDING_TECHNICIAN_ASSIGNMENT
        assert res_create.data["assigned_to"] == dept_poc.id
        assert len(res_create.data["activities"]) == 2  # Created + Auto-assigned

        # Step 2: Department POC assigns technician
        api_client.force_authenticate(user=dept_poc)
        assign_url = reverse("ticket-assign-worker", kwargs={"pk": ticket_id})
        assign_payload = {"worker_id": technician.id}
        res_assign = api_client.post(assign_url, assign_payload, format="json")
        assert res_assign.status_code == status.HTTP_200_OK
        assert res_assign.data["status"] == TicketStatus.PENDING_TECHNICIAN_ASSESSMENT
        assert res_assign.data["assigned_to"] == technician.id

        # Step 3: Assigned technician submits assessment (Fully Resolved)
        api_client.force_authenticate(user=technician)
        assess_url = reverse("ticket-submit-assessment", kwargs={"pk": ticket_id})
        assess_payload = {
            "assessment_type": "FULLY_RESOLVED",
            "notes": "Replaced faulty capacitor and recharged coolant. Temperatures normal."
        }
        res_assess = api_client.post(assess_url, assess_payload, format="json")
        assert res_assess.status_code == status.HTTP_200_OK
        assert res_assess.data["status"] == TicketStatus.RESOLVED

    def test_invalid_state_transition_rejected(self, api_client, setup_data):
        dept_poc = setup_data["dept_poc"]
        technician = setup_data["technician"]
        ticket = Ticket.objects.create(
            ticket_number="TKT-TEST-99",
            client=setup_data["client"],
            property=setup_data["prop"],
            department=setup_data["dept"],
            created_by=setup_data["client_user"],
            assigned_to=technician,
            title="Test Issue",
            status=TicketStatus.RESOLVED  # Already resolved!
        )

        # Attempt to assign worker on already resolved ticket
        api_client.force_authenticate(user=dept_poc)
        assign_url = reverse("ticket-assign-worker", kwargs={"pk": ticket.id})
        res = api_client.post(assign_url, {"worker_id": technician.id}, format="json")
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert "Cannot assign worker while ticket is in status" in res.data["detail"]
