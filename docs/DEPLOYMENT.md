# Deployment Guide

This document provides instructions for setting up and operating the Axiom system in both Local (Development) and Production environments.

## 1. Local Development Environment

### Prerequisites

- **Node.js** >= 18.x (For Frontend)
- **Python** >= 3.10 (For Backend)
- **Git**
- **uv** (Python package manager)
- **just** (Command runner)

### Step 1: Install Dependencies

Open a terminal at the project root and run:

```bash
# This will setup uv, install backend dependencies, and install NPM dependencies
just install
```

### Step 2: Start the Backend (FastAPI)

In the root terminal:

```bash
just backend-dev
```

Your API will be running at: `http://localhost:8000`

### Step 3: Start the Frontend (Next.js)

Open a new terminal (keep the backend running) and run:

```bash
just frontend-dev
```

Your Web interface will be running at: `http://localhost:3000`

---

## 2. Production Environment - Quick Guide

For a real-world enterprise environment, this system is designed to be deployed **On-Premise**.

### Backend Deployment (Docker)

It is recommended to use Docker and Gunicorn to run FastAPI:

```bash
# Reference command
docker build -t axiom-api -f Dockerfile.backend .
docker run -d -p 8000:8000 axiom-api
```

### LiveKit Server (WebRTC)

The system uses LiveKit for real-time video/audio conferencing.
To run this in production, you have two options:

1. **LiveKit Cloud:** The easiest way to get started. Sign up for a free account at [LiveKit Cloud](https://cloud.livekit.io/) and get your keys.
2. **Self-Hosted:** Deploy a LiveKit server instance using Docker. Reference the [LiveKit Deployment Guide](https://docs.livekit.io/realtime/self-hosting/local/).

You must provide the following environment variables to the backend and frontend:

- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `NEXT_PUBLIC_LIVEKIT_URL` (For frontend to connect)

### Frontend Deployment (Vercel or Nginx)

- The frontend can be built statically (`cd src/frontend && npm run build`) and hosted on any web server like Nginx, or deployed to platforms like Vercel if an absolute internal network restriction is not required.
