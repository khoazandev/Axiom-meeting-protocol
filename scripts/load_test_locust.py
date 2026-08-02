"""
Locust High-Load Test Suite — Simulates up to 100,000 concurrent users.

Usage:
  locust -f scripts/load_test_locust.py --host=http://localhost:8000
"""

import random
from locust import HttpUser, task, between

class AxiomHighLoadUser(HttpUser):
    wait_time = between(1, 3)

    def on_start(self):
        """Register and authenticate user for load testing."""
        self.email = f"load_user_{random.randint(100000, 999999)}@testcompany.com"
        self.password = "Password123!"

        # Register
        self.client.post("/api/v1/auth/register", json={
            "email": self.email,
            "password": self.password,
            "full_name": "Locust Load User"
        })

        # Login
        login_res = self.client.post("/api/v1/auth/login", json={
            "email": self.email,
            "password": self.password
        })

        if login_res.status_code == 200:
            self.token = login_res.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
            
            # Create Workspace
            ws_res = self.client.post(
                "/api/v1/workspaces/",
                json={"name": f"Locust WS {random.randint(1, 10000)}", "slug": f"locust-ws-{random.randint(1, 1000000)}"},
                headers=self.headers
            )
            if ws_res.status_code == 201:
                self.workspace_id = ws_res.json()["id"]
                self.headers["X-Workspace-ID"] = self.workspace_id

    @task(3)
    def list_meetings(self):
        """Simulate frequent meeting list polling."""
        if hasattr(self, 'headers'):
            self.client.get("/api/v1/meetings/", headers=self.headers)

    @task(2)
    def create_meeting_and_get_token(self):
        """Simulate creating a meeting and requesting a LiveKit RTC join token."""
        if hasattr(self, 'headers'):
            res = self.client.post(
                "/api/v1/meetings/",
                json={
                    "title": f"Load Test Meeting {random.randint(1, 1000)}",
                    "agenda": "High concurrency load testing agenda with 20+ characters.",
                    "duration_minutes": 60
                },
                headers=self.headers
            )
            if res.status_code == 201:
                meeting_id = res.json()["id"]
                self.client.get(f"/api/v1/meetings/{meeting_id}/token", headers=self.headers)

    @task(1)
    def query_knowledge_rag(self):
        """Simulate Knowledge Hub RAG semantic search query."""
        if hasattr(self, 'headers'):
            self.client.post(
                "/api/v1/knowledge/query",
                json={"query": "What decisions were made during architecture review?"},
                headers=self.headers
            )

    @task(1)
    def check_health_metrics(self):
        """Check system health and Prometheus metrics."""
        self.client.get("/health")
        self.client.get("/metrics")
