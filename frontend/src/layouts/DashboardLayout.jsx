import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SessionWarning from "../components/SessionWarning";

import {
  startSessionTimer,
  clearSession,
  getToken,
  getRemainingTime
} from "../utils/sessionTimer";

import { refreshSession } from "../utils/refreshSession";

export default function DashboardLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // 🔐 START SESSION TIMER (SINGLE SOURCE OF TRUTH)
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    // Initial remaining time
    setTimeLeft(Math.floor(getRemainingTime(token) / 1000));

    startSessionTimer({
      warningBeforeMs: 6 * 60 * 1000, // 6 minutes
      onWarning: () => setShowWarning(true),
      onExpire: () => {
        clearSession();
        window.location.replace("/login");
      }
    });

    // ⏱ Update countdown every second
    const interval = setInterval(() => {
      const remaining = getRemainingTime(token);
      setTimeLeft(Math.max(0, Math.floor(remaining / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // 🔁 EXTEND SESSION (FIXED)
  const extendSession = async () => {
    await refreshSession({
      onWarning: () => setShowWarning(true),
      onExpire: () => {
        clearSession();
        window.location.replace("/login");
      }
    });

    setShowWarning(false);

    const token = getToken();
    if (token) {
      setTimeLeft(Math.floor(getRemainingTime(token) / 1000));
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar
        open={sidebarOpen}
        collapsed={collapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setCollapsed(v => !v)}
      />
      {/* ⏰ SESSION WARNING */}
      <SessionWarning
        open={showWarning}
        timeLeftSeconds={timeLeft}
        onExtend={extendSession}
        onClose={() => setShowWarning(false)}
      />
      <div className="flex-1 flex flex-col">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-6">{children}</main>
        <Footer />
      </div>


    </div>
  );
}
