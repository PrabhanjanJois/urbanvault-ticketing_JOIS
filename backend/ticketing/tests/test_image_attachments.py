import pytest
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.test import APIClient
from authentication.models import User, UserRole
from ticketing.models import Property, Client, Department, Ticket, TicketStatus, ActivityActionType


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
class TestImageAttachments:
    def test_file_upload_endpoint(self, api_client, setup_data):
        client_user = setup_data["client_user"]
        api_client.force_authenticate(user=client_user)

        image_content = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
        uploaded = SimpleUploadedFile("broken_ac.png", image_content, content_type="image/png")

        resp = api_client.post("/api/ticketing/upload/", {"file": uploaded}, format="multipart")
        assert resp.status_code == status.HTTP_201_CREATED
        assert "file_url" in resp.data
        assert resp.data["file_url"].startswith("/media/attachments/")

    def test_ticket_creation_with_image(self, api_client, setup_data):
        client_user = setup_data["client_user"]
        api_client.force_authenticate(user=client_user)

        payload = {
            "title": "Water dripping from AC duct",
            "description": "Continuous leak noticed above desk 12",
            "department": setup_data["dept"].id,
            "floors": ["2F"],
            "image_url": "/media/attachments/broken_ac.png",
        }
        resp = api_client.post(reverse("ticket-list"), payload, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["image_url"] == "/media/attachments/broken_ac.png"

        ticket = Ticket.objects.get(id=resp.data["id"])
        assert ticket.image_url == "/media/attachments/broken_ac.png"

        creation_act = ticket.activities.filter(action_type=ActivityActionType.CREATED).first()
        assert creation_act is not None
        assert creation_act.image_url == "/media/attachments/broken_ac.png"

    def test_comment_with_image(self, api_client, setup_data):
        client_user = setup_data["client_user"]
        api_client.force_authenticate(user=client_user)

        ticket = Ticket.objects.create(
            ticket_number="TK-9901",
            title="Pantry water dispenser faulty",
            property=setup_data["prop"],
            client=setup_data["client"],
            created_by=client_user,
            department=setup_data["dept"],
            assigned_to=setup_data["dept_poc"],
            status=TicketStatus.PENDING_TECHNICIAN_ASSIGNMENT,
        )

        resp = api_client.post(
            f"/api/ticketing/tickets/{ticket.id}/comments/",
            {"content": "Here is the error code on the machine screen", "image_url": "/media/attachments/error_screen.png"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["image_url"] == "/media/attachments/error_screen.png"

        comment = ticket.comments.first()
        assert comment is not None
        assert comment.image_url == "/media/attachments/error_screen.png"

    def test_mark_resolved_with_completion_image(self, api_client, setup_data):
        client_user = setup_data["client_user"]
        api_client.force_authenticate(user=client_user)

        ticket = Ticket.objects.create(
            ticket_number="TK-9902",
            title="Desk lamp wire loose",
            property=setup_data["prop"],
            client=setup_data["client"],
            created_by=client_user,
            department=setup_data["dept"],
            assigned_to=setup_data["dept_poc"],
            status=TicketStatus.PENDING_TECHNICIAN_ASSIGNMENT,
        )

        resp = api_client.post(
            f"/api/ticketing/tickets/{ticket.id}/mark-resolved/",
            {"image_url": "/media/attachments/fixed_lamp.png", "notes": "Re-insulated and verified working"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["status"] == TicketStatus.RESOLVED

        resolve_act = ticket.activities.filter(action_type=ActivityActionType.RESOLVED).first()
        assert resolve_act is not None
        assert resolve_act.image_url == "/media/attachments/fixed_lamp.png"
