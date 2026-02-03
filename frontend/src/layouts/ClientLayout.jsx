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
} from "lucide-react";

export default function ClientLayout() {
  const { isAuthenticated, loading, logout, client } = useClientAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/portal/login" replace />;
  }

  const navItems = [
    { path: "/portal/dashboard", label: "Dashboard", icon: Home },
    { path: "/portal/invoices", label: "Invoices", icon: FileText },
    { path: "/portal/ledger", label: "Statement", icon: Wallet },
    { path: "/portal/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar for Desktop */}
      <aside className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 w-64 flex-shrink-0 h-screen sticky top-0 hidden md:flex flex-col z-10 shadow-sm">
        {/* Branding */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                SmartBILL
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Client Portal
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30"
                    : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700/50 hover:translate-x-1"
                }`}
              >
                <div className="flex items-center">
                  <Icon
                    className={`w-5 h-5 mr-3 ${isActive ? "text-white" : ""}`}
                  />
                  {item.label}
                </div>
                {isActive && <ChevronRight className="w-4 h-4" />}
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={logout}
            className="flex items-center justify-center w-full px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200 hover:shadow-md group"
          >
            <LogOut className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <div className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 dark:text-white">
              SmartBILL
            </span>
          </div>
          <button
            onClick={logout}
            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto pb-20 md:pb-8">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 md:px-8 py-4 mt-auto hidden md:block">
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            © {new Date().getFullYear()} ·{" "}
            <a
              href="https://www.arcneuron.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            >
              ArcNeuron.ai
            </a>{" "}
            · Built with <span className="text-red-500">❤</span> by{" "}
            <a
              href="https://www.mayurpatil.in"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 dark:text-blue-400 hover:underline underline-offset-4 transition-colors"
            >
              Mayur Patil
            </a>
          </div>
        </footer>

        {/* Mobile Bottom Nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around p-2 z-30 shadow-lg">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <Icon
                  className={`w-6 h-6 mb-1 ${isActive ? "scale-110" : ""} transition-transform`}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
