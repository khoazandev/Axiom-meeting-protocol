# Phase 6 Design Spec — Scale to 100K Users & High-Availability Infrastructure

> **Status:** APPROVED  
> **Date:** 2026-08-03  
> **Scope:** High-concurrency Redis caching layer, DB connection pool tuning, Prometheus observability metrics endpoint, Locust load testing suite, Production Docker Suite, and Kubernetes Deployment + HPA Manifests.

---

## 1. Overview & Objectives

Phase 6 hardens Axiom's infrastructure to reliably support **100,000 Concurrent Users** with **P99 latency < 200ms** and automated Horizontal Pod Autoscaling (HPA).

Key features:
1. **Redis Caching Layer (`src/backend/core/redis_cache.py`)**: High-performance caching for workspace stats, user tokens, and hot telemetry with in-memory fallback.
2. **SQLAlchemy Connection Pool Tuning (`src/backend/database.py`)**: Production connection pool configuration with `pool_size=20`, `max_overflow=30`, `pool_pre_ping=True`.
3. **Prometheus Observability (`src/backend/core/metrics.py` & `/metrics`)**: Exposes system metrics (request latency, error counters, active WS connections).
4. **Locust Load Test Suite (`scripts/load_test_locust.py`)**: Automated load generator simulating 100,000 user sessions.
5. **Multi-Stage Production Dockerization**: `Dockerfile.backend`, `Dockerfile.frontend`, and `docker-compose.prod.yml`.
6. **Kubernetes Cluster Manifests (`k8s/`)**: Deployment, Service, and HPA manifests scaling pods automatically under high load.

---

## 2. Infrastructure & Architectural Blueprint

### 2.1 Backend Redis Cache Client (`src/backend/core/redis_cache.py`)
- Provides `get(key)`, `set(key, value, ttl)`, `delete(key)`, and `flush()`.
- Safe fallback: If Redis environment variables are unconfigured or Redis server is unreachable, degrades gracefully to in-memory dictionary cache without breaking requests.

### 2.2 Prometheus Metrics Middleware (`src/backend/core/metrics.py`)
- Tracks:
  - `http_requests_total`: Counter by method, endpoint, status_code.
  - `http_request_duration_seconds`: Histogram of request processing times.
  - Endpoint `GET /metrics`: Standard Prometheus text format output.

### 2.3 Production Containerization
- **Backend Dockerfile** (`Dockerfile.backend`):
  - Multi-stage build with Python 3.13 slim.
  - Uses `uv` for fast dependency installation.
  - Non-root runtime user for enterprise container security.
  - Command: `uvicorn src.backend.main:app --host 0.0.0.0 --port 8000 --workers 4`.
- **Frontend Dockerfile** (`src/frontend/Dockerfile`):
  - Multi-stage Node.js 20 build utilizing Next.js Standalone output.
  - Minimal image size (< 120MB).
- **Docker Compose** (`docker-compose.prod.yml`):
  - Orchestrates PostgreSQL 16, Redis 7, Backend, Frontend, and LiveKit Server.

### 2.4 Kubernetes Deployment Suite (`k8s/`)
- `backend-deployment.yaml`: Deployment of FastAPI backend (3 initial replicas).
- `frontend-deployment.yaml`: Deployment of Next.js frontend (3 initial replicas).
- `hpa.yaml`: HorizontalPodAutoscaler targeting 3 to 50 replicas at 70% CPU / 80% Memory utilization.

---

## 3. Verification & Testing Plan

### 3.1 Pytest Suite (`src/backend/tests/`)
- `test_redis_cache.py`: Verify cache get/set/delete operations and fallback logic.
- `test_metrics_api.py`: Verify `/metrics` Prometheus metrics endpoint response.

### 3.2 Frontend & Docker Validation
- Verify Next.js standalone compilation (`npm run build`).
- Validate Dockerfile syntax and k8s YAML syntax.
