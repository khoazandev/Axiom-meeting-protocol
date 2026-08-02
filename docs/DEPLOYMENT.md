# Deployment Guide

This guide covers how to run Axiom locally for development and how to prepare it for a production environment.

Axiom relies on three core pillars:

1. **Frontend:** Next.js 16
2. **Backend:** FastAPI + SQLite/PostgreSQL + Alembic
3. **Real-time Comms:** LiveKit Server

---

## 1. Local Development (The Easy Way)

For local development, we use SQLite for the database and connect to a local LiveKit instance.

### Prerequisites

- Node.js v20+
- Python v3.12+
- uv (Fast Python package manager)
- Docker (for LiveKit)

### Step 1: Start LiveKit Server (Local)

The easiest way to run LiveKit locally is via Docker:

```bash
docker run -d --name livekit \
  -p 7880:7880 \
  -p 7881:7881 \
  -p 7882:7882/udp \
  livekit/livekit-server \
  --dev \
  --keys "devkey:secret"
```

This spins up a LiveKit server at `ws://localhost:7880` with the API key `devkey` and secret `secret`.

### Step 2: Configure Environment Variables

**Backend (`src/backend/.env`):**
```env
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_URL=ws://localhost:7880
DATABASE_URL=sqlite:///./sql_app.db
CORS_ORIGINS=http://localhost:3000
```

**Frontend (`src/frontend/.env.local`):**
```env
NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
BACKEND_URL=http://localhost:8000
```

### Step 3: Install Dependencies & Run Migrations

```bash
# From project root
uv sync --all-extras
uv run alembic upgrade head

cd src/frontend && npm ci && cd ../..
```

### Step 4: Run the Stack

```bash
# Terminal 1: Backend
uv run uvicorn src.backend.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd src/frontend && npm run dev
```

### Step 5: Verify

```bash
# Run backend tests
uv run pytest src/backend/test_main.py -v

# Check API health
curl http://localhost:8000/health
```

---

## 2. Production Deployment (Dockerized On-Premise)

For production, Axiom is designed to be fully containerized via `docker-compose`. This ensures absolute data sovereignty within your enterprise VPC.

### Architecture

- **PostgreSQL:** Primary relational database.
- **Redis:** Used by LiveKit for distributed state.
- **FastAPI Container:** Exposes port 8000.
- **Next.js Container:** Exposes port 3000 (standalone output mode).
- **LiveKit Server Container:** Exposes WebRTC ports.
- **LiveKit Ingress/Egress/AI Workers:** (Advanced configurations).

### Environment Configuration (.env.prod)

You must generate secure keys for production:

```bash
# Generate LiveKit Keys
docker run --rm -it livekit/livekit-cli generate-keys
```

Update your production environment variables:

```env
# Backend
LIVEKIT_API_KEY=APIXXXXXXXXXXXXX
LIVEKIT_API_SECRET=XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
LIVEKIT_URL=wss://livekit.yourdomain.com
DATABASE_URL=postgresql://user:password@db:5432/axiom
CORS_ORIGINS=https://yourdomain.com

# Frontend
NEXT_PUBLIC_LIVEKIT_URL=wss://livekit.yourdomain.com
BACKEND_URL=http://backend:8000
```

### Database Migrations (Production)

Always run migrations before starting the backend container:

```bash
uv run alembic upgrade head
```

### Docker Compose

A `docker-compose.yml` is provided in the repository root. To start:

```bash
docker compose up -d
```

### SSL / TLS Configuration

WebRTC **strictly requires** HTTPS/WSS in production browsers. You must put your LiveKit server and Next.js frontend behind a reverse proxy with valid SSL certificates (e.g., Let's Encrypt via Traefik or Nginx).

---

## 3. Free Public Tunnel & Free Domain Hosting (Local PC Hosting)

If you want to host Axiom directly on your local machine and expose it to the internet with a **free HTTPS domain** for testing across different networks (e.g., 4G, remote participants):

### Option A: Cloudflare Tunnel (Recommended — 100% Free Forever)

Cloudflare Tunnel (`cloudflared`) creates a secure, encrypted HTTPS tunnel from your local PC to Cloudflare's global edge network without opening router ports.

1. **Quick Temporary Tunnel (No account needed):**

   ```bash
   npx cloudflared tunnel --url http://localhost:3000
   ```

   This generates a free HTTPS link such as `https://<random-name>.trycloudflare.com`.

2. **Permanent Free Custom Subdomain:**
   - Create a free Cloudflare account.
   - Use `cloudflared tunnel create axiom-tunnel`.
   - Map your custom domain/subdomain (e.g., `meeting.yourdomain.com` or a free `.duckdns.org` domain) directly to `http://localhost:3000`.

### Option B: Ngrok Free Static Domain

1. Register a free account at [ngrok.com](https://ngrok.com).
2. Claim your 1 permanent free static domain (e.g., `your-name.ngrok-free.app`).
3. Run:
   ```bash
   ngrok http 3000 --url=https://your-name.ngrok-free.app
   ```
