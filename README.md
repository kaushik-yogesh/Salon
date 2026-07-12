# SalonOS: Enterprise Salon Management SaaS

SalonOS is a comprehensive, multi-tenant B2B2C Software as a Service (SaaS) built to manage the entire lifecycle of a Salon or Spa business. It provides capabilities comparable to Vagaro, Zenoti, and Mindbody.

## 🚀 Features

- **Multi-Tenant Architecture**: Securely isolates data (Customers, Appointments, Staff, Inventory) on a per-salon basis (`tenantId`).
- **Role-Based Access Control (RBAC)**: Fine-grained permissions (Super Admin, Salon Owner, Receptionist, Stylist).
- **Online Customer Booking Portal**: Public-facing, white-labeled booking widget (`/book/:tenantId`).
- **Point of Sale (POS) & Billing**: Generates invoices, handles discounts, and integrates with **Stripe** and **Razorpay** via webhooks.
- **Inventory & Supply Chain**: Stock alerts, purchase orders, and automatic inventory deduction upon checkout.
- **HR & Payroll Commissions**: Shift scheduling, attendance, flat/percentage commission calculations.
- **Background Event Engine**: Asynchronous SMS, Email, and custom Webhook notifications powered by **BullMQ** and **Redis**.
- **AI Analytics**: Generates proactive financial insights and re-booking forecasts.

---

## 🏗️ System Architecture

SalonOS utilizes a modern monolithic API layer paired with a React Single Page Application, containerized for production deployment.

### Tech Stack
- **Frontend**: React 18, Vite, TailwindCSS, React Query, Zustand, React Router.
- **Backend**: Node.js (Express), Prisma ORM, JSON Web Tokens (JWT).
- **Database**: PostgreSQL (Relational Data & JSONB configurations).
- **Queue / Cache**: Redis (BullMQ for background jobs & rate-limiting).
- **Infrastructure**: Docker & Docker Compose.

---

## 🛠️ Local Setup Guide (Docker)

The fastest way to run SalonOS locally is via Docker Compose, which will spin up the Postgres Database, Redis, the Node Backend, and the React Frontend.

### Prerequisites
- Docker & Docker Compose
- Node.js (v18+)

### 1. Environment Variables
Copy `.env.example` to `.env` in both the root/server directory and configure the secrets (Stripe, JWT, etc.).

### 2. Start Services
Run the following command at the root:
```bash
docker-compose up --build -d
```
This will start:
- **Postgres DB**: `localhost:5432`
- **Redis Cache**: `localhost:6379`
- **Node.js API**: `http://localhost:5000`
- **React Client**: `http://localhost:80`

### 3. Database Migrations
Attach to the server container and push the Prisma schema:
```bash
docker exec -it salon_server /bin/sh
npx prisma db push
node prisma/seed.js
```

---

## 🔒 Security Posture
- **API Rate Limiting**: Distributed rate-limiting via Redis (`rate-limit-redis`).
- **Helmet Headers**: Strict `Cross-Origin Resource Policies`.
- **CORS**: Restricted strictly to the frontend application domains.
- **Sensitive Log Redaction**: Using `pino-http` to strip Passwords and Auth tokens before printing to stdout.
- **Database Backups**: Automated daily Postgres dumps via `scripts/backup.sh`.

---

## 👨‍💻 CI/CD & Production Deployment
This repository is configured with **GitHub Actions**. Upon merging into `main`, the `.github/workflows/deploy.yml` pipeline triggers, validating tests and building the production-ready Docker images. 

Production traffic should be routed through the provided `nginx.conf` reverse proxy, ensuring SSL termination and unified port delivery (routing `/api/*` to the server container).
