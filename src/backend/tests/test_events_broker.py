import pytest
from src.backend.core import events

def test_event_broker_pub_sub():
    broker = events.EventBroker()
    received_payloads = []

    def handler(payload):
        received_payloads.append(payload)

    broker.subscribe("meeting.created", handler)
    broker.publish("meeting.created", {"meeting_id": 42, "title": "Architecture Review"})

    assert len(received_payloads) == 1
    assert received_payloads[0]["meeting_id"] == 42
    assert received_payloads[0]["title"] == "Architecture Review"
