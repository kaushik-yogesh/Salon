# SalonOS Identity & RBAC Backend

## Features
- JWT Authentication with Secure Cookies
- Tenant isolation middleware
- Dynamic Role-Based Access Control (RBAC)
- Multi-Branch Worker assignment
- Audit Logging (`utils/logger.js`)

## Tech Stack
- Express.js (Node.js LTS)
- Prisma ORM (PostgreSQL)
- Pino Logging
- JSDoc Documented

## Setup Instructions
1. Run `npm install`
2. Create `.env` file based on `.env.example`
3. Run `npx prisma db push` to sync the schema.
4. Run `npm run dev` (Ensure `dev` script is mapped to `node src/server.js`)

## Security
Every route should use `requireAuth` and `requireTenantContext`.
Protected routes must use `requirePermission('MODULE', 'ACTION')`.
