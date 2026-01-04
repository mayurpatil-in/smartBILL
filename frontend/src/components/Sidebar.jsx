import {
  LayoutDashboard,
  FileText,
  Package,
  Users,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Truck,
  ClipboardList,
  WalletCards,
  Wallet,
  Settings,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Sidebar({
  open,
  collapsed,
  onClose,
  onToggleCollapse,
}) {
  const { logout, isSuperAdmin, user } = useAuth();

  return (
    <aside
      className={`
        fixed md:relative z-40 h-screen
        ${collapsed ? "w-20" : "w-64"}
        bg-white dark:bg-gray-800
        border-r border-gray-200 dark:border-gray-700
        transition-all duration-300 ease-[cubic-bezier(.4,0,.2,1)]
        ${open ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0
        flex flex-col
        ${collapsed ? "overflow-visible" : "overflow-y-auto"}
      `}
    >
      {/* ================= HEADER ================= */}
      <div className="flex flex-col justify-center px-5 h-24 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-lg">
                S
              </div>
              <span className="font-bold text-xl text-gray-900 dark:text-gray-100">
                Smart<span className="text-blue-600">Bill</span>
              </span>
            </div>
          )}

          {/* Desktop collapse */}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex w-8 h-8 rounded-full items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          {/* Mobile close */}
          <button onClick={onClose} className="md:hidden">
            <X size={20} />
          </button>
        </div>

        {/* Company badge */}
        {!collapsed && user?.companyName && (
          <div className="mt-2 px-3 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-900 text-xs font-semibold truncate text-gray-600 dark:text-gray-300 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0" />
            <span className="truncate">{user.companyName}</span>
          </div>
        )}
      </div>

      {/* ================= MENU ================= */}
      <nav className="px-3 py-4 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
        {/* GROUP 1: CORE */}
        <div className="space-y-1">
          {/* Section Label (Only visible when not collapsed) */}
          {!collapsed && (
            <p className="px-4 text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-2">
              Operations
            </p>
          )}
          <MenuLink
            to="/"
            icon={LayoutDashboard}
            label="Dashboard"
            collapsed={collapsed}
          />
          {!isSuperAdmin && (
            <>
              <MenuLink
                to="/parties"
                icon={Users}
                label="Parties"
                collapsed={collapsed}
              />
              <MenuLink
                to="/items"
                icon={Package}
                label="Stock"
                collapsed={collapsed}
              />
              <MenuLink
                to="/party-challans"
                icon={ClipboardList}
                label="Party Challans"
                collapsed={collapsed}
              />
              <MenuLink
                to="/challans"
                icon={Truck}
                label="Delivery Challans"
                collapsed={collapsed}
              />
            </>
          )}
        </div>

        {!isSuperAdmin && (
          <>
            {/* GROUP 2: FINANCE */}
            <div className="space-y-1">
              {!collapsed && (
                <p className="px-4 text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-2">
                  Finance
                </p>
              )}
              <MenuLink
                to="/invoices"
                icon={FileText}
                label="Invoices"
                collapsed={collapsed}
              />
              <MenuLink
                to="/payments"
                icon={WalletCards}
                label="Payments"
                collapsed={collapsed}
              />
              <MenuLink
                to="/expenses"
                icon={Wallet}
                label="Expenses"
                collapsed={collapsed}
              />
            </div>

            {/* GROUP 3: HR */}
            <div className="space-y-1">
              {!collapsed && (
                <p className="px-4 text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-2">
                  HR
                </p>
              )}
              <MenuLink
                to="/employees"
                icon={Users}
                label="Employees"
                collapsed={collapsed}
              />
            </div>

            {/* GROUP 4: ADMIN */}
            <div className="space-y-1">
              {!collapsed && (
                <p className="px-4 text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-2">
                  System
                </p>
              )}
              <MenuLink
                to="/reports"
                icon={FileText}
                label="Reports"
                collapsed={collapsed}
              />
              <MenuLink
                to="/settings"
                icon={Settings}
                label="Settings"
                collapsed={collapsed}
              />
            </div>
          </>
        )}
      </nav>

      {/* ================= LOGOUT ================= */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={logout}
          className={`
            group relative w-full flex items-center
            ${collapsed ? "justify-center" : "gap-3"}
            px-3 py-3 rounded-xl
            text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10
          `}
        >
          <LogOut size={20} />

          {!collapsed && <span className="text-sm font-medium">Logout</span>}

          {/* Tooltip */}
          {collapsed && <Tooltip label="Logout" />}
        </button>
      </div>
    </aside>
  );
}

/* ================= MENU LINK ================= */

function MenuLink({ to, icon: Icon, label, collapsed }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `
          group relative flex items-center
          ${collapsed ? "justify-center" : "gap-3"}
          px-3 py-2.5 mx-1 rounded-xl
          transition-all duration-200
          ${
            isActive
              ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow"
              : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
          }
        `
      }
    >
      <Icon size={20} className="group-hover:scale-110 transition" />

      {!collapsed && <span className="text-sm font-medium">{label}</span>}

      {collapsed && <Tooltip label={label} />}
    </NavLink>
  );
}

/* ================= TOOLTIP ================= */

function Tooltip({ label }) {
  return (
    <div
      className="
        fixed left-[5.5rem]
        px-3 py-1.5
        rounded-md text-xs font-medium
        bg-gray-900 text-white
        opacity-0 group-hover:opacity-100
        pointer-events-none
        whitespace-nowrap
        shadow-lg
        transition-all duration-200
        z-[9999]
      "
    >
      {label}
    </div>
  );
}
