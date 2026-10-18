import pytest
from unittest.mock import patch, MagicMock
from django.core.cache import cache
from ticketing.tasks import send_ticket_notification


@pytest.fixture(autouse=True)
def clear_test_cache():
    cache.clear()
    yield
    cache.clear()


class TestCeleryTaskNotificationAndIdempotency:
    def test_task_executes_successfully_and_is_idempotent(self):
        ticket_id = 999
        event_type = "TICKET_CREATED"

        # First run: should execute and deliver notification
        result1 = send_ticket_notification.apply(args=[ticket_id, event_type, "Manager Dan"]).get()
        assert result1["status"] == "delivered"
        assert result1["ticket_id"] == ticket_id

        # Second run with same ticket_id & event_type: should be intercepted by idempotency key
        result2 = send_ticket_notification.apply(args=[ticket_id, event_type, "Manager Dan"]).get()
        assert result2["status"] == "skipped"
        assert result2["reason"] == "duplicate_execution_prevented"

    def test_task_different_events_allowed_for_same_ticket(self):
        ticket_id = 1001

        res_created = send_ticket_notification.apply(args=[ticket_id, "TICKET_CREATED"]).get()
        assert res_created["status"] == "delivered"

        res_assigned = send_ticket_notification.apply(args=[ticket_id, "WORKER_ASSIGNED"]).get()
        assert res_assigned["status"] == "delivered"

    @patch("ticketing.tasks.logger.info")
    def test_task_handles_retries_on_transient_failure(self, mock_logger):
        # Verify Celery task retry configurations are properly bound
        assert send_ticket_notification.max_retries == 3
        assert send_ticket_notification.retry_backoff is True
