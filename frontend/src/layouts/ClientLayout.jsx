import { Outlet, Navigate, Link, useLocation } from "react-router-dom";
import { useClientAuth } from "../context/ClientAuthContext";
import { Home, FileText, LogOut, Menu } from "lucide-react";

export default function ClientLayout() {
  const { isAuthenticated, loading, logout, client } = useClientAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/portal/login" replace />;
  }

  const navItems = [
    { path: "/portal/dashboard", label: "Dashboard", icon: Home },
    { path: "/portal/invoices", label: "Invoices", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar for Desktop */}
      <aside className="bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 w-64 flex-shrink-0 h-screen sticky top-0 hidden md:flex flex-col z-10">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Client Portal
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
            {client?.partyName}
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                    : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700/50"
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={logout}
            className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area with Footer */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <div className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center sticky top-0 z-20">
          <span className="font-bold text-gray-900 dark:text-white">
            Client Portal
          </span>
          <button onClick={logout} className="text-gray-500 dark:text-gray-400">
            <LogOut className="w-6 h-6" />
          </button>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-y-auto pb-20 md:pb-8">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-8 py-4 mt-auto">
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            © {new Date().getFullYear()} ·{" "}
            <span className="font-medium text-gray-800 dark:text-gray-200">
              <a
                href="https://www.arcneuron.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold tracking-wide text-gray-800 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
              >
                ArcNeuron.ai
              </a>{" "}
            </span>{" "}
            · Built with <span className="text-red-500">❤</span> by{" "}
            <a
              href="https://www.mayurpatil.in"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-blue-600 dark:text-blue-400 hover:underline underline-offset-4 transition-colors duration-200"
            >
              Mayur Patil
            </a>
          </div>
        </footer>

        {/* Mobile Bottom Nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around p-3 z-30">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center text-xs font-medium ${
                  isActive
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                <Icon className="w-6 h-6 mb-1" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
