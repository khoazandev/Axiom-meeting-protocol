"""
Event-Driven Pub/Sub Broker for Asynchronous Workspace Telemetry & Webhook Notifications.
"""

from typing import Any, Callable, Dict, List


class EventBroker:
    """In-memory event broker supporting topic subscriptions and async payload dispatch."""

    def __init__(self):
        self._subscribers: Dict[str, List[Callable[[Any], None]]] = {}

    def subscribe(self, event_name: str, handler: Callable[[Any], None]):
        if event_name not in self._subscribers:
            self._subscribers[event_name] = []
        self._subscribers[event_name].append(handler)

    def publish(self, event_name: str, payload: Any):
        handlers = self._subscribers.get(event_name, [])
        for handler in handlers:
            try:
                handler(payload)
            except Exception as e:
                pass


event_broker = EventBroker()
