"""
Prometheus Metrics Telemetry Middleware & /metrics Exporter.
"""

import time
from fastapi import FastAPI, Request, Response
from fastapi.responses import PlainTextResponse


class PrometheusMetrics:

    def __init__(self):
        self.request_count = 0
        self.request_durations = []

    def record_request(self, method: str, path: str, status_code: int, duration_seconds: float):
        self.request_count += 1
        self.request_durations.append(duration_seconds)
        if len(self.request_durations) > 1000:
            self.request_durations.pop(0)

    def generate_metrics_text(self) -> str:
        avg_duration = (
            sum(self.request_durations) / len(self.request_durations)
            if self.request_durations
            else 0.0
        )
        return (
            "# HELP http_requests_total Total number of HTTP requests processed.\n"
            "# TYPE http_requests_total counter\n"
            f"http_requests_total {self.request_count}\n\n"
            "# HELP http_request_duration_seconds Average HTTP request duration in seconds.\n"
            "# TYPE http_request_duration_seconds gauge\n"
            f"http_request_duration_seconds {avg_duration:.6f}\n"
        )


metrics_collector = PrometheusMetrics()


async def prometheus_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    metrics_collector.record_request(
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_seconds=duration,
    )
    return response


def setup_metrics_router(app: FastAPI):
    app.middleware("http")(prometheus_middleware)

    @app.get("/metrics", response_class=PlainTextResponse)
    def metrics():
        return metrics_collector.generate_metrics_text()
