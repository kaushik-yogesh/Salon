import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import pino from 'pino-http';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import yamljs from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendError } from './utils/response.util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security Middlewares
app.use(helmet());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many requests, please try again later.' } }
});
app.use('/api', limiter);

// Production CORS Configuration
const allowedOrigins = process.env.NODE_ENV === 'production' 
  ? [process.env.FRONTEND_URL, 'https://salon-e5v9.onrender.com'].filter(Boolean)
  : ['http://localhost:5173', 'http://127.0.0.1:5173'];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow all origins in development
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Webhook routes must be parsed as raw before express.json()
import webhookRoutes from './routes/webhook.routes.js';
app.use('/api/v1/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

// Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Initialize CSRF Protection (We only apply this to specific stateful routes if needed)
// import { csrfSynchronisedProtection } from './utils/csrf.util.js';
// Removed global CSRF because this API uses Bearer tokens in localStorage, not session cookies for primary auth, making global CSRF redundant and a launch blocker.

// Logging
app.use(pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
}));

// Healthcheck
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Swagger Documentation
try {
  const swaggerDocument = yamljs.load(path.join(__dirname, 'swagger.yaml'));
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
} catch (error) {
  console.warn('Swagger docs could not be loaded:', error.message);
}

import authRoutes from './routes/auth.routes.js';
import tenantRoutes from './routes/tenant.routes.js';
import branchRoutes from './routes/branch.routes.js';
import roleRoutes from './routes/role.routes.js';
import userRoutes from './routes/user.routes.js';
import invitationRoutes from './routes/invitation.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import hrRoutes from './routes/hr.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import posRoutes from './routes/pos.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import executionRoutes from './routes/execution.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import publicRoutes from './routes/public.routes.js';
import auditRoutes from './routes/audit.routes.js';
import salaryRoutes from './routes/salary.routes.js';
import expenseRoutes from './routes/expense.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import customerRoutes from './routes/customer.routes.js';
import payrollRoutes from './routes/payroll.routes.js';
import invoiceRoutes from './routes/invoice.routes.js';
import pushRoutes from './routes/push.routes.js';
import demoRoutes from './routes/demo.routes.js';
import directoryRoutes from './routes/directory.routes.js';
import customerPortalRoutes from './routes/customer-portal.routes.js';

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/execution', executionRoutes);
app.use('/api/v1/payroll', payrollRoutes);
app.use('/api/v1/invoices', invoiceRoutes);
app.use('/api/v1/tenants', tenantRoutes);
app.use('/api/v1/branches', branchRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/invitations', invitationRoutes);
app.use('/api/v1/catalog', catalogRoutes);
app.use('/api/v1/hr', hrRoutes);
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/pos', posRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/public', publicRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/salary', salaryRoutes);
app.use('/api/v1/expenses', expenseRoutes);
app.use('/api/v1/reports', reportsRoutes);
app.use('/api/v1/customers', customerRoutes);
app.use('/api/v1/push', pushRoutes);
app.use('/api/v1/demo', demoRoutes);
app.use('/api/v1/directory', directoryRoutes);
app.use('/api/v1/customer-portal', customerPortalRoutes);

// Global Error Handler
app.use((err, req, res, _next) => {
  if (req.log) {
    req.log.error(err);
  } else {
    console.error(err);
  }

  // Default to 500
  let statusCode = err.statusCode || 500;
  
  // Handle Prisma specific errors (e.g. Unique constraint)
  if (err.code && err.code.startsWith('P2')) {
    statusCode = 400;
  }

  sendError(res, err, statusCode);
});

export default app;
