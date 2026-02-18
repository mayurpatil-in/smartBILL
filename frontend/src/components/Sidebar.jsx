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
  Shield,
  UserCog,
  Database,
  Sparkles, // [NEW]
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { usePermissions } from "../hooks/usePermissions";

export default function Sidebar({
  open,
  collapsed,
  onClose,
  onToggleCollapse,
}) {
  const { logout, isSuperAdmin, isCompanyAdmin, user } = useAuth();
  const { hasPermission } = usePermissions();

  return (
    <aside
      className={`
        fixed md:relative z-40 h-screen
        ${collapsed ? "w-20" : "w-64"}
        bg-white dark:bg-gray-800
        border-r-2 border-gray-200 dark:border-gray-700
        transition-all duration-300 ease-[cubic-bezier(.4,0,.2,1)]
        ${open ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0
        flex flex-col
        ${collapsed ? "overflow-visible" : "overflow-y-auto"}
      `}
      style={{
        borderRightColor: "rgb(229, 231, 235)",
      }}
    >
      {/* ================= HEADER ================= */}
      <div className="flex flex-col justify-center px-5 h-24 border-b border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 text-white flex items-center justify-center font-bold text-lg shadow-lg ring-2 ring-blue-100 dark:ring-blue-900/30">
                S
              </div>
              <span className="font-bold text-xl">
                <span className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 dark:from-gray-100 dark:via-gray-200 dark:to-gray-100 bg-clip-text text-transparent">
                  Smart
                </span>
                <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Bill
                </span>
              </span>
            </div>
          )}

          {/* Desktop collapse */}
          <button
            onClick={onToggleCollapse}
            className="hidden md:flex w-8 h-8 rounded-full items-center justify-center text-gray-400 hover:text-white transition-all duration-300 group"
            style={{
              background: "transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background =
                "linear-gradient(135deg, rgb(59, 130, 246), rgb(147, 51, 234))";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>

          {/* Mobile close */}
          <button
            onClick={onClose}
            className="md:hidden text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Company badge */}
        {!collapsed && user?.companyName && (
          <div className="mt-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-900 dark:to-blue-900/20 text-xs font-semibold truncate text-gray-700 dark:text-gray-300 flex items-center gap-2 border border-blue-100 dark:border-blue-900/30">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shrink-0 shadow-sm shadow-green-500/50" />
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
            <div className="px-3 py-1.5 mx-1 mb-2 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-100 dark:border-blue-900/30">
              <p className="text-xs font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent uppercase tracking-wider">
                Operations
              </p>
            </div>
          )}
          <MenuLink
            to="/"
            icon={LayoutDashboard}
            label="Dashboard"
            collapsed={collapsed}
          />
          <MenuLink
            to="/ai-insights"
            icon={Sparkles}
            label="AI Insights"
            collapsed={collapsed}
          />
          {!isSuperAdmin && (
            <>
              {(isCompanyAdmin || hasPermission("parties.view")) && (
                <MenuLink
                  to="/parties"
                  icon={Users}
                  label="Parties"
                  collapsed={collapsed}
                />
              )}
              {(isCompanyAdmin || hasPermission("items.view")) && (
                <MenuLink
                  to="/items"
                  icon={Package}
                  label="Stock"
                  collapsed={collapsed}
                />
              )}
              {(isCompanyAdmin || hasPermission("challans.view")) && (
                <>
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
            </>
          )}
        </div>

        {!isSuperAdmin && (
          <>
            {/* GROUP 2: FINANCE */}
            <div className="space-y-1">
              {!collapsed && (
                <div className="px-3 py-1.5 mx-1 mb-2 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-100 dark:border-green-900/30">
                  <p className="text-xs font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent uppercase tracking-wider">
                    Finance
                  </p>
                </div>
              )}
              {(isCompanyAdmin || hasPermission("invoices.view")) && (
                <MenuLink
                  to="/invoices"
                  icon={FileText}
                  label="Invoices"
                  collapsed={collapsed}
                />
              )}
              {(isCompanyAdmin || hasPermission("payments.view")) && (
                <MenuLink
                  to="/payments"
                  icon={WalletCards}
                  label="Payments"
                  collapsed={collapsed}
                />
              )}
              {(isCompanyAdmin || hasPermission("expenses.view")) && (
                <MenuLink
                  to="/expenses"
                  icon={Wallet}
                  label="Expenses"
                  collapsed={collapsed}
                />
              )}
            </div>

            {/* GROUP 3: HR */}
            <div className="space-y-1">
              {!collapsed && (
                <div className="px-3 py-1.5 mx-1 mb-2 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-100 dark:border-purple-900/30">
                  <p className="text-xs font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent uppercase tracking-wider">
                    HR
                  </p>
                </div>
              )}
              {(isCompanyAdmin || hasPermission("employees.view")) && (
                <MenuLink
                  to="/employees"
                  icon={Users}
                  label="Employees"
                  collapsed={collapsed}
                />
              )}
            </div>

            {/* GROUP 4: ADMIN */}
            <div className="space-y-1">
              {!collapsed && (
                <div className="px-3 py-1.5 mx-1 mb-2 rounded-lg bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-100 dark:border-orange-900/30">
                  <p className="text-xs font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent uppercase tracking-wider">
                    System
                  </p>
                </div>
              )}
              {(isCompanyAdmin || hasPermission("reports.view")) && (
                <MenuLink
                  to="/reports"
                  icon={FileText}
                  label="Reports"
                  collapsed={collapsed}
                />
              )}
              {(isCompanyAdmin || hasPermission("settings.view")) && (
                <MenuLink
                  to="/settings"
                  icon={Settings}
                  label="Settings"
                  collapsed={collapsed}
                />
              )}
              {!isSuperAdmin &&
                (isCompanyAdmin || hasPermission("users.view")) && (
                  <MenuLink
                    to="/users"
                    icon={UserCog}
                    label="User Management"
                    collapsed={collapsed}
                  />
                )}
              {!isSuperAdmin &&
                (isCompanyAdmin || hasPermission("roles.view")) && (
                  <MenuLink
                    to="/roles"
                    icon={Shield}
                    label="Roles & Permissions"
                    collapsed={collapsed}
                  />
                )}
            </div>
          </>
        )}

        {/* GROUP 5: SUPER ADMIN ONLY */}
        {isSuperAdmin && (
          <div className="space-y-1">
            {!collapsed && (
              <div className="px-3 py-1.5 mx-1 mb-2 rounded-lg bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border border-red-100 dark:border-red-900/30">
                <p className="text-xs font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent uppercase tracking-wider">
                  Administration
                </p>
              </div>
            )}
            <MenuLink
              to="/roles"
              icon={Shield}
              label="Roles & Permissions"
              collapsed={collapsed}
            />
            <MenuLink
              to="/backup"
              icon={Database}
              label="Backup & Restore"
              collapsed={collapsed}
            />
          </div>
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
            text-red-600 dark:text-red-400
            transition-all duration-300
            hover:text-white hover:shadow-lg
          `}
          style={{
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background =
              "linear-gradient(135deg, rgb(239, 68, 68), rgb(236, 72, 153))";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <LogOut
            size={20}
            className="group-hover:scale-110 transition-transform duration-300"
          />

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
          transition-all duration-300
          ${
            isActive
              ? "text-white shadow-lg shadow-blue-500/50"
              : "text-gray-600 dark:text-gray-400"
          }
        `
      }
      style={({ isActive }) => {
        if (isActive) {
          return {
            background:
              "linear-gradient(135deg, rgb(59, 130, 246), rgb(168, 85, 247), rgb(236, 72, 153))",
          };
        }
        return {};
      }}
      onMouseEnter={(e) => {
        // Check if this link is currently active by looking at aria-current
        const isActive =
          e.currentTarget.getAttribute("aria-current") === "page";
        if (!isActive) {
          e.currentTarget.style.background =
            "linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(147, 51, 234, 0.1))";
        }
      }}
      onMouseLeave={(e) => {
        // Check if this link is currently active
        const isActive =
          e.currentTarget.getAttribute("aria-current") === "page";
        if (!isActive) {
          e.currentTarget.style.background = "";
        } else {
          // Restore the active gradient
          e.currentTarget.style.background =
            "linear-gradient(135deg, rgb(59, 130, 246), rgb(168, 85, 247), rgb(236, 72, 153))";
        }
      }}
    >
      <Icon
        size={20}
        className="group-hover:scale-110 transition-transform duration-300"
      />

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
