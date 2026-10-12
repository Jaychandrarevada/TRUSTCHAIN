# TrustChain

> **Cryptographic Credential Infrastructure for Verifiable Academic & Professional Degrees**

TrustChain is a blockchain-based certificate issuance and verification platform designed to eliminate academic degree fraud. By combining cryptographic hashing (SHA-256), Merkle tree batching, and distributed smart contracts, TrustChain allows institutions (such as Osmania University) to issue tamper-evident credentials that anyone can verify in seconds.

---

## 🚀 Quick Start with Docker (Recommended for College Demonstration)

The entire project is Dockerized and ready to deploy on any computer with Docker Desktop installed:

```bash
# 1. Enter the project directory
cd TRUSTCHAIN

# 2. Copy the environment configuration template
cp .env.example .env    # On Windows PowerShell: Copy-Item .env.example .env

# 3. Build and launch all services
docker compose up -d --build
```

### Access URLs
* **Frontend Web Application**: [http://localhost:3000](http://localhost:3000)
* **Backend Swagger API**: [http://localhost:5000/api/v1/docs](http://localhost:5000/api/v1/docs)
* **Backend Live Healthcheck**: [http://localhost:5000/api/v1/health/live](http://localhost:5000/api/v1/health/live)

For detailed deployment instructions, logs, service restart, and troubleshooting, read the **[Docker Deployment Guide](docs/DOCKER_DEPLOYMENT.md)** and the **[Docker Verification Report](docs/DOCKER_VERIFICATION.md)**.

---

## 👥 Demo Accounts & Pre-Seeded Roles

The database self-bootstraps on first launch with seeded institutions, Osmania University degrees, and user roles. All demo accounts use the standard password:

> **Password for all demo accounts**: `ChangeMe-Demo-123!`

| Role | Email | Portal Access | Key Actions |
|---|---|---|---|
| **Platform Admin** | `admin@trustchain.local` | `/admin` | Approve university KYB requests, view platform analytics & trust network |
| **University Registrar** | `registrar@demo-university.local` | `/issuer` | Approve certificate batches, revoke credentials |
| **University Operator** | `operator@demo-university.local` | `/issuer/batches/new` | Upload certificate CSV, issue batches |
| **Student** | `rahul.sharma@osmania.ac.in` | `/wallet` | View cryptographic degree in student credential wallet |
| **Public Verifier / Employer** | *(No login required)* | `/verify` | Drag-and-drop degree PDF or enter certificate UID to verify cryptographic validity |

---

## 🎓 Demonstrating Authentic vs. Tampered Degrees

1. Go to **[http://localhost:3000/verify](http://localhost:3000/verify)**.
2. Click **"Download Sample Original"** to download the authentic Osmania University degree PDF.
3. Upload the original PDF:
   * **Verdict**: `VERIFIED - Cryptographically Valid` (Green shield, Merkle proof matched, issuer signed).
4. Click **"Download Sample Tampered"** (or edit any text in the PDF):
   * **Verdict**: `INVALID - Tamper Detected` (Red shield, SHA-256 hash mismatch, signature rejected).

---

## 🛠 Local Development Without Docker

If running directly on a machine without Docker:

### 1. Backend (Python 3.12+)
```bash
cd backend
python -m venv .venv
# Activate venv:
# Windows: .venv\Scripts\activate
# Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
python -m scripts.seed
python wsgi.py
```
Backend runs on `http://localhost:5000`.

### 2. Frontend (Node 20+)
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.

---

## 📚 Documentation Index

* **[Docker Deployment Guide](docs/DOCKER_DEPLOYMENT.md)**: Full deployment instructions, port mapping, and troubleshooting.
* **[Docker Verification Report](docs/DOCKER_VERIFICATION.md)**: Audit log, test results, and static verification report.
* **[Run Local Guide](RUN-LOCAL.md)**: Local developer setup instructions.
