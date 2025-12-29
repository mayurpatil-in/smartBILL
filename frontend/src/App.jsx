import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Login from "./auth/Login";
import Dashboard from "./pages/Dashboard";
import SuperAdminDashboard from "./pages/SuperAdminDashboard";
import Invoices from "./pages/Invoices";
import DashboardLayout from "./layouts/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./hooks/useAuth";
import Parties from "./pages/Parties";
import Items from "./pages/Items";
import Challans from "./pages/Challans";
import PartyChallans from "./pages/PartyChallans";

function AppRoutes() {
  const { isSuperAdmin } = useAuth();

  return (
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
        <Route path="parties" element={<Parties />} />
        <Route path="items" element={<Items />} />
        <Route path="party-challans" element={<PartyChallans />} />
        <Route path="challans" element={<Challans />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
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
