import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SessionWarning from "../components/SessionWarning";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // 🔒 Lock body scroll when mobile sidebar is open
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">

      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        collapsed={collapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setCollapsed(v => !v)}
      />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 p-6">
          {/* 🔑 THIS IS WHERE Dashboard / Invoices / Party RENDER */}
          <Outlet />
        </main>

        <Footer />
      </div>

      {/* ⏰ Session Expiry Warning */}
      <SessionWarning />
    </div>
  );
}
