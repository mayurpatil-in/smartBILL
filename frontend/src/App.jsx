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
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
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

function AppRoutes() {
  const { isSuperAdmin } = useAuth();

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />

        {/* Protected App */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route
            index
            element={isSuperAdmin ? <SuperAdminDashboard /> : <Dashboard />}
          />
          <Route
            path="dashboard"
            element={isSuperAdmin ? <SuperAdminDashboard /> : <Dashboard />}
          />
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
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Suspense>
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
