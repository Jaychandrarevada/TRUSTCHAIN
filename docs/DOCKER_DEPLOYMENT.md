# TrustChain Docker Deployment Guide

This guide provides instructions for deploying and running the **TrustChain** cryptographic credential verification platform on any target machine (including college project room computers or demonstration environments) using Docker and Docker Compose.

---

## 1. System Requirements & Prerequisites

* **Operating System**: Linux (Ubuntu 20.04+, Debian 11+), macOS (12+), or Windows 10/11 with WSL2 enabled.
* **Docker Engine**: Version `24.0.0` or higher.
* **Docker Compose**: Version `v2.20.0` or higher (integrated into `docker compose`).
* **Hardware**:
  * Minimum 4 GB RAM (8 GB recommended).
  * At least 5 GB free disk space for Docker images and volumes.
  * Ports available on host: `3000` (Frontend), `5000` (Backend API), `5432` (PostgreSQL), `6379` (Redis).

---

## 2. Architecture Overview

The containerized stack runs as four orchestrated services in an isolated Docker bridge network:

```
                  ┌───────────────────────────────────────────────┐
                  │                 Browser / Host                │
                  └──────┬────────────────────────────────┬───────┘
                         │ http://localhost:3000          │ http://localhost:5000
                         ▼                                ▼
                  ┌──────────────┐                 ┌──────────────┐
                  │   frontend   │                 │   backend    │
                  │ (Nginx 1.27) │─── /api/ ──────▶│ (Gunicorn)   │
                  └──────────────┘                 └──────┬───────┘
                                                          │
                                     ┌────────────────────┴───────────────────┐
                                     ▼                                        ▼
                              ┌──────────────┐                         ┌──────────────┐
                              │      db      │                         │    redis     │
                              │(Postgres 16) │                         │  (Redis 7)   │
                              └──────────────┘                         └──────────────┘
```

1. **`frontend` (Port 3000)**: Multi-stage build (Node 22 build → Nginx 1.27 Alpine runtime). Serves the responsive React SPA and reverse-proxies `/api/` traffic to `http://backend:5000`.
2. **`backend` (Port 5000)**: Multi-stage build (Python 3.12-slim builder → non-root runtime). Executes Gunicorn (4 workers), manages Merkle trees, generates tamper-evident university degrees via ReportLab & PyPDF, and connects to the blockchain engine.
3. **`db` (Port 5432)**: PostgreSQL 16 Alpine with health checks and persistent volume `trustchain_pgdata`.
4. **`redis` (Port 6379)**: Redis 7 Alpine for rate limiting and session caching.

---

## 3. Quick Start (Single-Command Setup)

### Step 1: Clone or Copy the Repository
Place the `TRUSTCHAIN` project folder onto the target machine.

```bash
cd TRUSTCHAIN
```

### Step 2: Configure Environment Variables
Copy the root `.env.example` file to `.env`:

```bash
# On Linux / macOS / Git Bash
cp .env.example .env

# On Windows PowerShell
Copy-Item .env.example .env
```

> **Note**: For local college evaluation and offline demonstrations, the default settings in `.env.example` work out of the box with `BLOCKCHAIN_MODE=mock`. No external API keys or real cryptocurrency gas fees are required.

### Step 3: Build and Start Containers

```bash
docker compose up -d --build
```

### Step 4: Access the Application

* **Frontend Web Application**: [http://localhost:3000](http://localhost:3000)
* **Backend Interactive Swagger API**: [http://localhost:5000/api/v1/docs](http://localhost:5000/api/v1/docs)
* **Backend Health Check**: [http://localhost:5000/api/v1/health/live](http://localhost:5000/api/v1/health/live)

---

## 4. Pre-Seeded Demonstration Credentials

The stack includes an automated self-bootstrapping seed step (`python -m scripts.seed`) that runs immediately after the database becomes healthy. All accounts use the standard demo password: `ChangeMe-Demo-123!`

| Role | Email | Password | Permissions & Portal Access |
|---|---|---|---|
| **Platform Admin** | `admin@trustchain.local` | `ChangeMe-Demo-123!` | System-wide analytics, KYB institution approval, trust network graph (`/admin`) |
| **University Registrar / Approver** | `registrar@demo-university.local` | `ChangeMe-Demo-123!` | Batch approval, certificate issuance, 2-person revocation (`/issuer`) |
| **Second Approver** | `approver2@demo-university.local` | `ChangeMe-Demo-123!` | Multi-signature co-signing for certificate revocation (`/issuer`) |
| **University Operator** | `operator@demo-university.local` | `ChangeMe-Demo-123!` | CSV upload, certificate batch generation (`/issuer/batches/new`) |
| **Student (Osmania University)** | `rahul.sharma@osmania.ac.in` | `ChangeMe-Demo-123!` | View credential in student cryptographic wallet (`/wallet`) |
| **Student (Sneha Reddy)** | `sneha.reddy@osmania.ac.in` | `ChangeMe-Demo-123!` | View degree in student cryptographic wallet (`/wallet`) |

---

## 5. Demonstration & Verification Testing

### A. Testing the Loading Animation
1. Open [http://localhost:3000](http://localhost:3000) in Chrome/Edge/Firefox.
2. Observe the brand intro animation: golden nodes converge into the TrustChain shield, draw network connections, sweep a light beam, and lock in the gold crest.
3. Refresh the browser (`F5` or `Ctrl+R` / `Cmd+R`).
4. **Verification**: The loading animation triggers reliably on every refresh. Press `ESC` or click "Skip intro" to enter immediately.
5. Navigate directly to [http://localhost:3000/verify](http://localhost:3000/verify) or [http://localhost:3000/login](http://localhost:3000/login) and refresh.
6. **Verification**: The signature 3D rotating blockchain cube loader displays during app initialization without layout shift or flickering.

### B. Demonstrating Authentic vs. Tampered Degrees
1. Navigate to [http://localhost:3000/verify](http://localhost:3000/verify).
2. Click **"Download Sample Original"** to download the official Osmania University degree PDF.
3. Upload the original PDF to the verification box.
   * **Result**: `VERIFIED - Cryptographically Valid`. Green shield, Merkle proof path verified, issuer signature confirmed on blockchain.
4. Click **"Download Sample Tampered"** (or modify a single character in the PDF).
5. Upload the modified PDF to the verification box.
   * **Result**: `INVALID - Tamper Detected`. Red shield, SHA-256 content mismatch pinpointed, cryptographic root integrity rejected.

---

## 6. Service Management Commands

### Check Container Status
```bash
docker compose ps
```
All 4 containers (`trustchain-frontend`, `trustchain-backend`, `trustchain-db`, `trustchain-redis`) should show `Up (healthy)`.

### Inspect Live Logs
```bash
# View aggregated live logs across all services
docker compose logs -f

# View backend logs only
docker compose logs -f backend

# View frontend access logs
docker compose logs -f frontend
```

### Re-run Database Seed Manually
The seed script is idempotent and can be safely re-run at any time to restore demo state:
```bash
docker compose exec backend python -m scripts.seed
```

### Restart a Specific Service
```bash
docker compose restart backend
docker compose restart frontend
```

### Stop the Containers
```bash
# Stop containers without deleting volume data
docker compose stop

# Stop and remove containers and networks (data preserved in volumes)
docker compose down

# Stop and wipe persistent database volumes (clean slate)
docker compose down -v
```

### Rebuild Images After Code Modifications
```bash
docker compose build --no-cache
docker compose up -d
```

---

## 7. Troubleshooting & FAQ

### Issue: Port Already in Use (e.g. Port 5432 or 3000)
* **Cause**: A local instance of PostgreSQL, Node, or another service is running on the host computer.
* **Resolution**:
  1. Stop the local service (e.g. `Stop-Service postgresql` on Windows or `sudo systemctl stop postgresql` on Linux).
  2. Alternatively, modify host port mapping in `docker-compose.yml`:
     ```yaml
     ports:
       - "3001:80"    # maps frontend to http://localhost:3001
     ```

### Issue: Containers Fail to Resolve Database
* **Cause**: Backend started before PostgreSQL finished socket initialization.
* **Resolution**: `docker-compose.yml` specifies `condition: service_healthy` on `db`. Run `docker compose restart backend`.

### Issue: Frontend Shows 502 Bad Gateway for `/api/`
* **Cause**: Backend container is restarting or Gunicorn has not finished launching workers.
* **Resolution**: Run `docker compose logs backend` to inspect Python startup traces. Verify that `DATABASE_URL` is accessible.

---

## 8. College Project Room Deployment Checklist

- [ ] Docker Desktop or Docker Engine installed on the target PC.
- [ ] Cloned or extracted `TRUSTCHAIN` folder.
- [ ] Copied `.env.example` to `.env`.
- [ ] Executed `docker compose up -d --build`.
- [ ] Verified `docker compose ps` shows all 4 containers healthy.
- [ ] Opened [http://localhost:3000](http://localhost:3000) in browser.
- [ ] Verified loading animation appears on reload (`F5`).
- [ ] Tested verification with Authentic and Tampered sample certificates.
