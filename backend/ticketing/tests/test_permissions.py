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
def setup_rbac_data(db):
    dept = Department.objects.create(name="Technical / HVAC")
    prop = Property.objects.create(name="Harness-1317", total_floors=["1F", "2F", "3F"])

    client_a = Client.objects.create(name="Harness", property=prop, occupied_floors=["2F", "3F"])
    client_b = Client.objects.create(name="Competitor Corp", property=prop, occupied_floors=["1F"])

    user_a = User.objects.create_user(
        username="user_harness",
        first_name="Chaitanya",
        role=UserRole.CLIENT_POC,
        client=client_a
    )

    user_b = User.objects.create_user(
        username="user_competitor",
        first_name="Bob",
        role=UserRole.CLIENT_POC,
        client=client_b
    )

    dept_poc = User.objects.create_user(
        username="manager_dan",
        first_name="Dan",
        role=UserRole.DEPARTMENT_POC,
        department=dept
    )

    technician = User.objects.create_user(
        username="tech_prakash",
        first_name="Prakash",
        role=UserRole.TECHNICIAN,
        department=dept
    )

    other_technician = User.objects.create_user(
        username="tech_other",
        first_name="Raju",
        role=UserRole.TECHNICIAN,
        department=dept
    )

    # Ticket belonging to Client A
    ticket_a = Ticket.objects.create(
        ticket_number="TKT-A-01",
        client=client_a,
        property=prop,
        department=dept,
        created_by=user_a,
        assigned_to=technician,
        title="AC Issue in Client A",
        status=TicketStatus.PENDING_TECHNICIAN_ASSESSMENT
    )

    # Ticket belonging to Client B
    ticket_b = Ticket.objects.create(
        ticket_number="TKT-B-01",
        client=client_b,
        property=prop,
        department=dept,
        created_by=user_b,
        assigned_to=technician,
        title="Server fan failure in Client B",
        status=TicketStatus.PENDING_TECHNICIAN_ASSESSMENT
    )

    return {
        "user_a": user_a,
        "user_b": user_b,
        "dept_poc": dept_poc,
        "technician": technician,
        "other_technician": other_technician,
        "ticket_a": ticket_a,
        "ticket_b": ticket_b,
    }


@pytest.mark.django_db
class TestRoleBasedAccessControl:
    def test_client_poc_cannot_view_other_clients_tickets(self, api_client, setup_rbac_data):
        user_a = setup_rbac_data["user_a"]
        ticket_b = setup_rbac_data["ticket_b"]

        api_client.force_authenticate(user=user_a)

        # In listing, Client A must only see their own tickets
        res_list = api_client.get(reverse("ticket-list"))
        ticket_numbers = [t["ticket_number"] for t in res_list.data["results"]]
        assert setup_rbac_data["ticket_a"].ticket_number in ticket_numbers
        assert ticket_b.ticket_number not in ticket_numbers

        # Direct access to ticket B must be rejected (404/403)
        res_detail = api_client.get(reverse("ticket-detail", kwargs={"pk": ticket_b.id}))
        assert res_detail.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN]

    def test_client_poc_cannot_assign_technician(self, api_client, setup_rbac_data):
        user_a = setup_rbac_data["user_a"]
        ticket_a = setup_rbac_data["ticket_a"]
        technician = setup_rbac_data["technician"]

        api_client.force_authenticate(user=user_a)
        assign_url = reverse("ticket-assign-worker", kwargs={"pk": ticket_a.id})
        res = api_client.post(assign_url, {"worker_id": technician.id}, format="json")
        assert res.status_code == status.HTTP_403_FORBIDDEN
        assert "Only Department POC can assign workers" in res.data["detail"]

    def test_unassigned_technician_cannot_submit_assessment(self, api_client, setup_rbac_data):
        other_technician = setup_rbac_data["other_technician"]
        ticket_a = setup_rbac_data["ticket_a"]

        # other_technician is NOT assigned to ticket_a
        api_client.force_authenticate(user=other_technician)
        assess_url = reverse("ticket-submit-assessment", kwargs={"pk": ticket_a.id})
        res = api_client.post(assess_url, {"assessment_type": "FULLY_RESOLVED"}, format="json")
        assert res.status_code == status.HTTP_403_FORBIDDEN
        assert "You are not the technician assigned to this ticket" in res.data["detail"]

    def test_technician_cannot_create_ticket(self, api_client, setup_rbac_data):
        technician = setup_rbac_data["technician"]
        api_client.force_authenticate(user=technician)

        payload = {
            "title": "Technician trying to create ticket",
            "description": "This should be forbidden",
            "department": setup_rbac_data["ticket_a"].department_id,
            "floors": ["1F"],
        }
        res = api_client.post(reverse("ticket-list"), payload, format="json")
        assert res.status_code == status.HTTP_403_FORBIDDEN
        assert "Technicians are not authorized to create tickets" in res.data["detail"]
