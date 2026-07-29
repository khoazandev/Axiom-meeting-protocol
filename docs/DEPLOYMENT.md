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

### Frontend Deployment (Vercel or Nginx)
- The frontend can be built statically (`cd src/frontend && npm run build`) and hosted on any web server like Nginx, or deployed to platforms like Vercel if an absolute internal network restriction is not required.

### Jitsi Meet Server 
In the current MVP code (at `src/app/meetings/[id]/page.tsx`), the system uses the public domain `meet.jit.si`. 
When deploying for an enterprise, you must self-host a Jitsi server (Reference: [Jitsi Meet Handbook](https://jitsi.github.io/handbook/docs/devops-guide/devops-guide-quickstart)) and point the domain in the Next.js source code to that server to guarantee 100% data privacy.
