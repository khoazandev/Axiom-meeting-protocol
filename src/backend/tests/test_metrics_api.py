import pytest

def test_prometheus_metrics_endpoint(client):
    res = client.get("/metrics")
    assert res.status_code == 200
    assert "http_requests_total" in res.text
    assert "process_cpu_seconds" in res.text or "http_request_duration_seconds" in res.text
