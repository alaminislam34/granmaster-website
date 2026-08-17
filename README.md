# Granmaster Platform Monorepo

Welcome to the **Granmaster Platform** single repository. This project contains both the Next.js Frontend and Express Backend applications along with Dockerized zero-downtime CI/CD deployment logic.

---

## 📁 Repository Structure

```
.
├── .github/
│   └── workflows/
│       └── cicd.yml                # Centralized Production CI/CD Pipeline
├── yvontomassin-backend/           # Express.js & MongoDB API Server (Port 5000)
├── yvontomassin-frontend/          # Next.js Standalone Application (Port 3000)
├── docker-compose.prod.yml         # Production Docker Orchestration Config
├── deployment_guide.md             # Complete Production Setup Guide
└── README.md
```

---

## 🛠️ Local Development

### 1. Backend Setup
```bash
cd yvontomassin-backend
pnpm install
pnpm dev
```
Backend runs on `http://localhost:5000` (Health Check: `http://localhost:5000/healthcheck`).

### 2. Frontend Setup
```bash
cd yvontomassin-frontend
pnpm install
pnpm dev
```
Frontend runs on `http://localhost:3000`.

---

## 🚀 Centralized Production Docker Compose

Run all services locally or on server using Docker Compose:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 🤖 CI/CD Deployment Flow

Every push to the `main` branch automatically triggers the unified GitHub Actions pipeline:
1. Builds `yvontomassin-backend` Docker image ➔ Pushes to `ghcr.io/alaminislam34/yvontomassin-backend`.
2. Builds `yvontomassin-frontend` Docker image ➔ Pushes to `ghcr.io/alaminislam34/yvontomassin-frontend`.
3. SSH into EC2 server ➔ Performs **Zero-Downtime Rolling Deployment** with container health checks.
