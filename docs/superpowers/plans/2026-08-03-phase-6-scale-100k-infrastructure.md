# Phase 6 Implementation Plan — Scale to 100K Users & High-Availability Infrastructure

> **Goal:** Build Phase 6 Infrastructure (Redis enterprise caching layer, DB connection pool tuning, Prometheus metrics endpoint, Locust load test suite, Production Docker Suite, and Kubernetes HPA Manifests).

---

## Task 1: Redis Caching Service & Graceful Fallback (`src/backend/core/redis_cache.py`)

### Files

- **New Module:** [redis_cache.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/core/redis_cache.py)
- **New Test:** [test_redis_cache.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/tests/test_redis_cache.py)

### Step-by-Step Instructions

1. **Write failing test** `src/backend/tests/test_redis_cache.py`:
   - Test `CacheService.set("key", "val", ttl=60)`.
   - Test `CacheService.get("key")` -> returns `"val"`.
   - Test `CacheService.delete("key")` -> removes key.
   - Test fallback behavior when Redis connection fails.

2. **Run pytest** (expect FAIL):
   - Command: `uv run pytest src/backend/tests/test_redis_cache.py -v`

3. **Implement Redis cache client** `src/backend/core/redis_cache.py`.

4. **Run pytest** (expect PASS):
   - Command: `uv run pytest src/backend/tests/test_redis_cache.py -v`

5. **Git Commit:**
   - Command: `git add src/backend/core/redis_cache.py src/backend/tests/test_redis_cache.py && git commit -m "feat(cache): implement Redis caching layer with in-memory fallback"`

---

## Task 2: Database Connection Pooling & Tuning (`src/backend/database.py`)

### Files

- **Modify:** [database.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/database.py)

### Step-by-Step Instructions

1. Update `src/backend/database.py` with high-concurrency connection pool parameters: `pool_size=20`, `max_overflow=30`, `pool_timeout=30`, `pool_pre_ping=True`.
2. Run pytest suite to verify zero regressions.
3. **Git Commit:**
   - Command: `git add src/backend/database.py && git commit -m "perf(db): optimize SQLAlchemy engine with high-concurrency connection pool settings"`

---

## Task 3: Prometheus Observability Metrics Endpoint (`/metrics`)

### Files

- **New Module:** [metrics.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/core/metrics.py)
- **Modify Router:** [main.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/main.py)
- **New Test:** [test_metrics_api.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/backend/tests/test_metrics_api.py)

### Step-by-Step Instructions

1. **Write failing test** `src/backend/tests/test_metrics_api.py`:
   - `GET /metrics` -> returns 200 OK with `http_requests_total` text output.

2. **Run pytest** (expect FAIL).

3. **Implement middleware & endpoint** in `src/backend/core/metrics.py` and register in `main.py`.

4. **Run pytest** (expect PASS).

5. **Git Commit:**
   - Command: `git add src/backend/core/metrics.py src/backend/main.py src/backend/tests/test_metrics_api.py && git commit -m "feat(observability): add Prometheus /metrics endpoint and request telemetry middleware"`

---

## Task 4: High-Load Locust Load Test Suite (`scripts/load_test_locust.py`)

### Files

- **New Script:** [load_test_locust.py](file:///c:/Users/Admin/Desktop/Smart_metting_AI/scripts/load_test_locust.py)

### Step-by-Step Instructions

1. Write `scripts/load_test_locust.py` simulating 100,000 user flows:
   - User Registration & Login.
   - Meeting creation & LiveKit Token fetch.
   - MoM summary & Knowledge Hub RAG query.

2. **Git Commit:**
   - Command: `git add scripts/load_test_locust.py && git commit -m "test(load): add Locust high-concurrency load testing script for 100K users"`

---

## Task 5: Production Multi-Stage Backend Dockerfile (`Dockerfile.backend`)

### Files

- **New Dockerfile:** [Dockerfile.backend](file:///c:/Users/Admin/Desktop/Smart_metting_AI/Dockerfile.backend)

### Step-by-Step Instructions

1. Create `Dockerfile.backend` using multi-stage build:
   - Base Python 3.13 slim image.
   - Non-root application user for container hardening.
   - Gunicorn / Uvicorn worker startup command.

2. **Git Commit:**
   - Command: `git add Dockerfile.backend && git commit -m "infra(docker): add production multi-stage Dockerfile for FastAPI backend"`

---

## Task 6: Production Next.js Frontend Dockerfile & Docker Compose

### Files

- **New Dockerfile:** [Dockerfile](file:///c:/Users/Admin/Desktop/Smart_metting_AI/src/frontend/Dockerfile)
- **New Compose:** [docker-compose.prod.yml](file:///c:/Users/Admin/Desktop/Smart_metting_AI/docker-compose.prod.yml)

### Step-by-Step Instructions

1. Create `src/frontend/Dockerfile` utilizing Next.js Standalone build.
2. Create `docker-compose.prod.yml` coordinating PostgreSQL, Redis, Backend, Frontend, and LiveKit.

3. **Git Commit:**
   - Command: `git add src/frontend/Dockerfile docker-compose.prod.yml && git commit -m "infra(docker): add Next.js standalone Dockerfile and docker-compose.prod.yml"`

---

## Task 7: Kubernetes Deployments & Horizontal Pod Autoscaler (`k8s/`)

### Files

- **New Manifest:** [backend-deployment.yaml](file:///c:/Users/Admin/Desktop/Smart_metting_AI/k8s/backend-deployment.yaml)
- **New Manifest:** [frontend-deployment.yaml](file:///c:/Users/Admin/Desktop/Smart_metting_AI/k8s/frontend-deployment.yaml)
- **New Manifest:** [hpa.yaml](file:///c:/Users/Admin/Desktop/Smart_metting_AI/k8s/hpa.yaml)

### Step-by-Step Instructions

1. Create Kubernetes Deployment & Service manifests for Backend & Frontend.
2. Create `hpa.yaml` configuring HorizontalPodAutoscaler scaling from 3 to 50 replicas under load.

3. **Git Commit:**
   - Command: `git add k8s/ && git commit -m "infra(k8s): add Kubernetes production deployments, services, and HPA auto-scaling manifests"`

---

## Task 8: End-to-End System Verification

### Step-by-Step Instructions

1. Run complete Pytest test suite: `uv run pytest src/backend/ -v`.
2. Run Next.js production build: `npm run build` in `src/frontend`.
3. Verify zero errors.
4. Git Commit & Push.
