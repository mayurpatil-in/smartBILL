import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import LoadingSpinner from "./components/LoadingSpinner";
import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";

// 💤 Lazy Load Pages
const Login = lazy(() => import("./auth/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const AIInsights = lazy(() => import("./pages/AIInsights")); // [NEW]
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const SuperAdminAuditLogs = lazy(() => import("./pages/SuperAdminAuditLogs"));
const Invoices = lazy(() => import("./pages/Invoices"));
const InvoiceForm = lazy(() => import("./pages/InvoiceForm"));
const Parties = lazy(() => import("./pages/Parties"));
const Items = lazy(() => import("./pages/Items"));
const Challans = lazy(() => import("./pages/Challans"));
const PartyChallans = lazy(() => import("./pages/PartyChallans"));
const Employees = lazy(() => import("./pages/Employees"));
const Reports = lazy(() => import("./pages/Reports"));
const Payments = lazy(() => import("./pages/PaymentList"));
const Settings = lazy(() => import("./pages/Settings"));
const Expenses = lazy(() => import("./pages/Expenses")); // [NEW]
const Backup = lazy(() => import("./pages/Backup")); // [Backup]
const RoleManagement = lazy(() => import("./pages/RoleManagement")); // [RBAC]
const UserManagement = lazy(() => import("./pages/UserManagement")); // [RBAC]
const VerifyID = lazy(() => import("./pages/VerifyID"));
const EmployeeDashboard = lazy(
  () => import("./pages/employee/EmployeeDashboard"),
); // [Employee Portal]

// [Client Portal]
const ClientLogin = lazy(() => import("./pages/client/ClientLogin"));
const ClientLayout = lazy(() => import("./layouts/ClientLayout"));
const ClientDashboard = lazy(() => import("./pages/client/ClientDashboard"));
const ClientInvoices = lazy(() => import("./pages/client/ClientInvoices"));
const ClientLedger = lazy(() => import("./pages/client/ClientLedger")); // [New Feature]
const ClientSettings = lazy(() => import("./pages/client/ClientSettings")); // [New Feature]

function AppRoutes() {
  const { isSuperAdmin, user } = useAuth();
  const isEmployee = user?.role_name === "Employee";

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/verify-id/:id" element={<VerifyID />} />

        {/* Employee Portal */}
        <Route
          path="/employee"
          element={
            <ProtectedRoute>
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />

        {/* Protected App */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              {isEmployee ? (
                <Navigate to="/employee" replace />
              ) : (
                <DashboardLayout />
              )}
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={
              isEmployee ? (
                <Navigate to="/employee" replace />
              ) : isSuperAdmin ? (
                <SuperAdminDashboard />
              ) : (
                <Dashboard />
              )
            }
          />
          <Route
            path="dashboard"
            element={isSuperAdmin ? <SuperAdminDashboard /> : <Dashboard />}
          />
          <Route path="ai-insights" element={<AIInsights />} /> {/* [NEW] */}
          <Route path="invoices" element={<Invoices />} />
          <Route path="invoices/new" element={<InvoiceForm />} />
          <Route path="invoices/:id/edit" element={<InvoiceForm />} />
          <Route path="parties" element={<Parties />} />
          <Route path="items" element={<Items />} />
          <Route path="party-challans" element={<PartyChallans />} />
          <Route path="challans" element={<Challans />} />
          <Route path="employees" element={<Employees />} />
          <Route path="reports" element={<Reports />} />
          <Route path="payments" element={<Payments />} />
          <Route path="settings" element={<Settings />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="roles" element={<RoleManagement />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="backup" element={<Backup />} />
          <Route
            path="audit-logs"
            element={
              isSuperAdmin ? (
                <SuperAdminAuditLogs />
              ) : (
                <Navigate to="/dashboard" />
              )
            }
          />
        </Route>

        {/* Client Portal */}
        <Route path="/portal" element={<ClientPortalRoutes />}>
          <Route path="login" element={<ClientLogin />} />
          <Route element={<ClientLayout />}>
            <Route path="dashboard" element={<ClientDashboard />} />
            <Route path="invoices" element={<ClientInvoices />} />
            <Route path="ledger" element={<ClientLedger />} />
            <Route path="settings" element={<ClientSettings />} />
            {/* Redirect /portal to /portal/dashboard or login */}
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Suspense>
  );
}

// [NEW] Client Portal Route Wrapper to provide Context
import { ClientAuthProvider } from "./context/ClientAuthContext";
import { Outlet } from "react-router-dom";

function ClientPortalRoutes() {
  return (
    <ClientAuthProvider>
      <Outlet />
    </ClientAuthProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          className: `
            bg-white text-gray-900 border border-gray-200
            dark:bg-gray-800 dark:text-white dark:border-gray-700
          `,
        }}
      />
      <AppRoutes />
    </BrowserRouter>
  );
}

export default App;
