import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Layouts (keep static for faster initial paint)
import PublicLayout from './components/layouts/PublicLayout';
import AdminLayout from './components/layouts/AdminLayout';
import OwnerLayout from './components/layouts/OwnerLayout';
import ReceptionLayout from './components/layouts/ReceptionLayout';
import WorkerLayout from './components/layouts/WorkerLayout';
import CustomerLayout from './components/layouts/CustomerLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load Pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const UnauthorizedPage = lazy(() => import('./pages/UnauthorizedPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ClientBookingPage = lazy(() => import('./pages/ClientBookingPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const DirectoryPage = lazy(() => import('./pages/DirectoryPage'));

const SetupWizardPage = lazy(() => import('./pages/SetupWizardPage'));

const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const POSPage = lazy(() => import('./pages/POSPage'));
const BookingsPage = lazy(() => import('./pages/BookingsPage'));
const InventoryPage = lazy(() => import('./pages/InventoryPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const CatalogPage = lazy(() => import('./pages/CatalogPage'));
const HRPage = lazy(() => import('./pages/HRPage'));
const ExpensesPage = lazy(() => import('./pages/ExpensesPage'));
const SalaryPage = lazy(() => import('./pages/SalaryPage'));
const AuditLogPage = lazy(() => import('./pages/AuditLogPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const WorkerAppPage = lazy(() => import('./pages/WorkerAppPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminTenantsPage = lazy(() => import('./pages/AdminTenantsPage'));
const AdminSubscriptionsPage = lazy(() => import('./pages/AdminSubscriptionsPage'));
const AdminSystemHealthPage = lazy(() => import('./pages/AdminSystemHealthPage'));
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage'));
const ReceptionDashboardPage = lazy(() => import('./pages/ReceptionDashboardPage'));
const WorkerDashboardPage = lazy(() => import('./pages/WorkerDashboardPage'));
const WorkerLeavesPage = lazy(() => import('./pages/WorkerLeavesPage'));
const WorkerProfilePage = lazy(() => import('./pages/WorkerProfilePage'));
const CustomerDashboardPage = lazy(() => import('./pages/CustomerDashboardPage'));
const CustomerAppointmentsPage = lazy(() => import('./pages/CustomerAppointmentsPage'));
const CustomerWalletPage = lazy(() => import('./pages/CustomerWalletPage'));
const CustomerProfilePage = lazy(() => import('./pages/CustomerProfilePage'));
const CustomerHistoryPage = lazy(() => import('./pages/CustomerHistoryPage'));
const WorkerEarningsPage = lazy(() => import('./pages/WorkerEarningsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const InvoiceHistoryPage = lazy(() => import('./pages/InvoiceHistoryPage'));

const LoadingFallback = () => (
  <div className="flex h-screen w-screen items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
  </div>
);

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* ============================== */}
          {/* PUBLIC ROUTES                  */}
        {/* ============================== */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/features" element={<LandingPage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/directory" element={<DirectoryPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/book/:tenantId" element={<ClientBookingPage />} />
          
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
        </Route>

        {/* ============================== */}
        {/* SUPER ADMIN PORTAL             */}
        {/* ============================== */}
        <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="tenants" element={<AdminTenantsPage />} />
            <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="audit" element={<AuditLogPage />} />
            <Route path="health" element={<AdminSystemHealthPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
        </Route>

        {/* ============================== */}
        {/* SALON OWNER PORTAL             */}
        {/* ============================== */}
        <Route element={<ProtectedRoute allowedRoles={['TENANT_OWNER', 'SUPER_ADMIN']} />}>
          {/* Setup Wizard (standalone, no sidebar layout) */}
          <Route path="/owner/setup" element={<SetupWizardPage />} />

          <Route path="/owner" element={<OwnerLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="pos" element={<POSPage />} />
            <Route path="invoices" element={<InvoiceHistoryPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="hr" element={<HRPage />} />
            <Route path="catalog" element={<CatalogPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="expenses" element={<ExpensesPage />} />
            <Route path="salary" element={<SalaryPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>

        {/* ============================== */}
        {/* RECEPTION PORTAL               */}
        {/* ============================== */}
        <Route element={<ProtectedRoute allowedRoles={['RECEPTIONIST', 'TENANT_OWNER', 'SUPER_ADMIN']} />}>
          <Route path="/reception" element={<ReceptionLayout />}>
            <Route index element={<ReceptionDashboardPage />} />
            <Route path="calendar" element={<BookingsPage />} />
            <Route path="pos" element={<POSPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="invoices" element={<InvoiceHistoryPage />} />
          </Route>
        </Route>

        {/* ============================== */}
        {/* WORKER PORTAL                  */}
        {/* ============================== */}
        <Route element={<ProtectedRoute allowedRoles={['WORKER', 'TENANT_OWNER', 'SUPER_ADMIN']} />}>
          <Route path="/worker" element={<WorkerLayout />}>
            <Route index element={<WorkerDashboardPage />} />
            <Route path="scanner" element={<WorkerAppPage />} />
            <Route path="salary" element={<WorkerEarningsPage />} />
            <Route path="leaves" element={<WorkerLeavesPage />} />
            <Route path="profile" element={<WorkerProfilePage />} />
          </Route>
        </Route>

        {/* ============================== */}
        {/* CUSTOMER PORTAL                */}
        {/* ============================== */}
        <Route element={<ProtectedRoute allowedRoles={['CUSTOMER']} />}>
          <Route path="/customer" element={<CustomerLayout />}>
            <Route index element={<CustomerDashboardPage />} />
            <Route path="appointments" element={<CustomerAppointmentsPage />} />
            <Route path="wallet" element={<CustomerWalletPage />} />
            <Route path="history" element={<CustomerHistoryPage />} />
            <Route path="profile" element={<CustomerProfilePage />} />
          </Route>
        </Route>

        {/* ============================== */}
        {/* FALLBACKS & REDIRECTS          */}
        {/* ============================== */}
        <Route path="/dashboard" element={<Navigate to="/owner" replace />} />
        
        {/* 404 Catch All */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
        </Suspense>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
