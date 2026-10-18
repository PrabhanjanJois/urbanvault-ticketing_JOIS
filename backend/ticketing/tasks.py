import logging
from celery import shared_task
from django.core.cache import cache

logger = logging.getLogger('ticketing')


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={'max_retries': 3},
    name='ticketing.send_ticket_notification'
)
def send_ticket_notification(self, ticket_id, event_type, recipient_name=None, recipient_email=None):
    """
    Simulated asynchronous notification task for ticket lifecycle events.
    Includes Redis-backed idempotency protection to ensure notifications are never sent twice
    for the same ticket event, plus exponential backoff retry handling.
    """
    # Build unique idempotency key
    idempotency_key = f"idempotency:ticket_notify:{ticket_id}:{event_type}"

    # Check if this notification has already been processed within the deduplication window (1 hour)
    if not cache.add(idempotency_key, "PROCESSED", timeout=3600):
        logger.warning(
            f"[Celery Task] Duplicate notification prevented. "
            f"Ticket: {ticket_id}, Event: {event_type}, Key: {idempotency_key}"
        )
        return {
            "status": "skipped",
            "reason": "duplicate_execution_prevented",
            "ticket_id": ticket_id,
            "event_type": event_type,
        }

    logger.info(
        f"[Celery Task] Dispatching simulated notification. "
        f"Ticket ID: {ticket_id}, Event: {event_type}, Recipient: {recipient_name or 'Auto'}"
    )

    # In a real environment, integration with SendGrid/Twilio would happen here
    notification_result = {
        "status": "delivered",
        "ticket_id": ticket_id,
        "event_type": event_type,
        "recipient": recipient_name or "Manager",
        "channel": "SIMULATED_EMAIL_AND_SMS",
    }

    logger.info(f"[Celery Task] Successfully processed notification for ticket {ticket_id}.")
    return notification_result
