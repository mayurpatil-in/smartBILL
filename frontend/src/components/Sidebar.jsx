import {
  LayoutDashboard,
  FileText,
  Package,
  Users,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { NavLink } from "react-router-dom";

export default function Sidebar({
  open,
  collapsed,
  onClose,
  onToggleCollapse,
}) {
  return (
    <aside
      className={`
        fixed md:static z-40 h-screen
        ${collapsed ? "w-20" : "w-64"}
        bg-white dark:bg-gray-900
        border-r border-gray-200 dark:border-gray-700
        transform transition-all duration-300 ease-[cubic-bezier(.4,0,.2,1)]
        ${open ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-20 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <span className="font-bold text-xl tracking-wide text-gray-900 dark:text-gray-100">
            Smart<span className="text-blue-600">Bill</span>
          </span>

        )}

        {/* Desktop collapse */}
        <button
          onClick={onToggleCollapse}
          className="
            hidden md:flex items-center justify-center
            w-8 h-8 rounded-lg
            text-gray-500 hover:text-gray-900
            dark:text-gray-400 dark:hover:text-white
            hover:bg-gray-100 dark:hover:bg-gray-800
            transition
          "
          aria-label="Toggle sidebar"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        {/* Mobile close */}
        <button
          onClick={onClose}
          className="
            md:hidden text-gray-600 dark:text-gray-300
            hover:text-gray-900 dark:hover:text-white
          "
          aria-label="Close sidebar"
        >
          <X size={20} />
        </button>
      </div>

      {/* Menu */}
      <nav className="px-3 py-4 space-y-1">
        <MenuLink to="/" icon={LayoutDashboard} label="Dashboard" collapsed={collapsed} />
        <MenuLink to="/invoices" icon={FileText} label="Invoices" collapsed={collapsed} />
        <MenuLink to="/stock" icon={Package} label="Stock" collapsed={collapsed} />
        <MenuLink to="/employees" icon={Users} label="Employees" collapsed={collapsed} />
      </nav>
    </aside>
  );
}

/* ========================= */
/* MENU LINK COMPONENT */
/* ========================= */

function MenuLink({ to, icon: Icon, label, collapsed }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `
          group relative flex items-center
          ${collapsed ? "justify-center" : "gap-3"}
          px-3 py-3 rounded-xl
          transition-all duration-200 ease-out
          ${isActive
          ? "bg-blue-600 text-white shadow-md"
          : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-800"
        }
        `
      }
    >
      {/* Active accent bar */}
      <span
        className={`
          absolute left-0 top-1/2 -translate-y-1/2
          h-6 w-1 rounded-r-full
          bg-blue-500
          transition-opacity
          ${collapsed ? "hidden" : ""}
        `}
      />

      {/* Icon */}
      <Icon
        size={20}
        className="
          transition-transform duration-200
          group-hover:scale-110
        "
      />

      {/* Label */}
      {!collapsed && (
        <span className="text-sm font-medium tracking-wide">
          {label}
        </span>
      )}

      {/* Tooltip (collapsed mode) */}
      {collapsed && (
        <div
          className="
            absolute left-full ml-3 px-3 py-1.5
            rounded-md text-xs font-medium
            bg-gray-900 text-white
            opacity-0 group-hover:opacity-100
            pointer-events-none
            whitespace-nowrap
            shadow-lg
            transition-all duration-200
          "
        >
          {label}
        </div>
      )}
    </NavLink>
  );
}
