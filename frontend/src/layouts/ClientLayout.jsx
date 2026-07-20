import { Outlet, Navigate, Link, useLocation } from "react-router-dom";
import { useClientAuth } from "../context/ClientAuthContext";
import {
  Home,
  FileText,
  LogOut,
  Wallet,
  Settings,
  User,
  ChevronRight,
  Shield,
  Truck,
  Sparkles,
} from "lucide-react";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useTranslation } from "react-i18next";

export default function ClientLayout() {
  const { isAuthenticated, loading, logout, client } = useClientAuth();
  const { t } = useTranslation();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0f1117]">
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 animate-spin"></div>
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-gray-400 text-sm font-medium tracking-wide">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/portal/login" replace />;
  }

  const navItems = [
    { path: "/portal/dashboard", label: t("sidebar.dashboard") || "Dashboard", icon: Home, color: "from-blue-500 to-cyan-500" },
    { path: "/portal/invoices", label: t("sidebar.invoices") || "Invoices", icon: FileText, color: "from-emerald-500 to-teal-500" },
    { path: "/portal/challans", label: t("sidebar.party_challans") || "Challans", icon: Truck, color: "from-violet-500 to-purple-600" },
    { path: "/portal/ledger", label: t("reports.tab_statement") || "Statement", icon: Wallet, color: "from-amber-500 to-orange-500" },
    { path: "/portal/settings", label: t("sidebar.settings") || "Settings", icon: Settings, color: "from-rose-500 to-pink-600" },
  ];

  // Get initials for avatar
  const clientName = client?.partyName || client?.username || "Client";
  const initials = clientName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* === DESKTOP SIDEBAR === */}
      <aside className="hidden md:flex w-64 flex-shrink-0 h-screen sticky top-0 flex-col z-20 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800">



        {/* Brand */}
        <div className="relative z-10 p-6 border-b border-white/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-2xl border border-white/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">SmartBILL</h2>
              <p className="text-[11px] text-blue-100/80 font-medium tracking-wider uppercase">Client Portal</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="relative z-10 flex-1 p-4 space-y-1.5 overflow-y-auto">
          <p className="text-[10px] font-semibold text-blue-100/60 uppercase tracking-widest px-3 mb-3">Main Menu</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-white/20 text-white shadow-lg backdrop-blur-sm border border-white/30"
                    : "text-blue-100 hover:text-white hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-white/30 shadow-md"
                      : "bg-white/10 group-hover:bg-white/20"
                  }`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span>{item.label}</span>
                </div>
                {isActive && (
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <ChevronRight className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Profile Card */}
        <div className="relative z-10 p-4 border-t border-white/20">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-lg flex-shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-white text-sm font-semibold truncate">{clientName}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[10px] text-emerald-400 font-medium">Active</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mb-3 px-2">
            <LanguageSwitcher />
          </div>

          <button
            onClick={logout}
            className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-medium text-blue-100 hover:text-white hover:bg-white/10 rounded-xl transition-all duration-200 border border-white/20 hover:border-white/30 group"
          >
            <LogOut className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
            {t("sidebar.logout") || "Sign Out"}
          </button>
        </div>
      </aside>

      {/* === MAIN CONTENT === */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-20 border-b border-indigo-800/40"
          style={{ background: "linear-gradient(to right, #2563eb, #4f46e5, #7c3aed)", backdropFilter: "blur(16px)" }}>
          <div className="flex justify-between items-center px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-white text-base tracking-tight">SmartBILL</span>
              <span className="text-[10px] text-blue-100 font-semibold bg-white/15 px-2 py-0.5 rounded-full border border-white/25">PORTAL</span>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <button
                onClick={logout}
                className="p-2 text-blue-100 hover:text-white hover:bg-white/20 rounded-lg transition-all"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content with Transition */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-24 md:pb-8">
          <div
            key={location.pathname}
            style={{
              animation: "pageEnter 0.35s cubic-bezier(0.16, 1, 0.3, 1) both",
            }}
          >
            <Outlet />
          </div>
        </main>

        {/* Footer - Desktop */}
        <footer className="border-t border-gray-200 dark:border-white/5 bg-white dark:bg-[#0f1117] px-4 md:px-8 py-3 mt-auto hidden md:block">
          <div className="text-center text-xs text-gray-500 dark:text-gray-500">
            © {new Date().getFullYear()} ·{" "}
            <a href="https://www.arcneuron.ai" target="_blank" rel="noopener noreferrer"
              className="font-semibold text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              ArcNeuron.ai
            </a>{" "}
            · Built with <span className="text-red-500">❤</span> by{" "}
            <a href="https://www.mayurpatil.in" target="_blank" rel="noopener noreferrer"
              className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline underline-offset-4 transition-colors">
              Mayur Patil
            </a>
          </div>
        </footer>

        {/* Mobile Bottom Nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-indigo-700/50"
          style={{ background: "linear-gradient(to right, rgba(37,99,235,0.97), rgba(79,70,229,0.97), rgba(124,58,237,0.97))", backdropFilter: "blur(20px)" }}>
          <div className="flex justify-around px-2 py-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] font-medium transition-all duration-200 ${
                    isActive ? "text-white" : "text-blue-100/70 hover:text-white"
                  }`}
                >
                  <div className={`p-1.5 rounded-lg transition-all ${
                    isActive ? "bg-white/25 shadow-md" : ""
                  }`}>
                    <Icon className={`w-5 h-5 ${isActive ? "text-white" : ""} ${isActive ? "scale-110" : ""} transition-transform`} />
                  </div>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* Global page transition animation */}
      <style>{`
        @keyframes pageEnter {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
