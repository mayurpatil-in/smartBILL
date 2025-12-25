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
        fixed md:static z-40 h-full
        ${collapsed ? "w-20" : "w-64"}
        bg-white dark:bg-gray-800
        border-r border-gray-200 dark:border-gray-700
        transform transition-all duration-300 ease-in-out
        ${open ? "translate-x-0" : "-translate-x-full"}
        md:translate-x-0
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 h-16">
        {!collapsed && (
          <span className="font-bold text-xl text-blue-600 tracking-wide">
            SmartBill
          </span>
        )}

        {/* Desktop collapse */}
        <button
          onClick={onToggleCollapse}
          className="
            hidden md:flex items-center justify-center
            w-8 h-8 rounded-lg
            text-gray-500 hover:text-gray-800
            dark:hover:text-white
            hover:bg-gray-100 dark:hover:bg-gray-700
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
      <nav className="px-2 space-y-1">
        <MenuLink to="/" icon={LayoutDashboard} label="Dashboard" collapsed={collapsed} />
        <MenuLink to="/invoices" icon={FileText} label="Invoices" collapsed={collapsed} />
        <MenuLink to="/stock" icon={Package} label="Stock" collapsed={collapsed} />
        <MenuLink to="/employees" icon={Users} label="Employees" collapsed={collapsed} />
      </nav>
    </aside>
  );
}

function MenuLink({ to, icon: Icon, label, collapsed }) {
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `
          group relative flex items-center gap-3
          px-3 py-3 rounded-lg
          transition-all duration-200
          focus:outline-none
          ${
            isActive
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-gray-700"
          }
        `
      }
    >
      {/* Active indicator */}
      <span
        className={`
          absolute left-0 top-1/2 -translate-y-1/2
          h-6 w-1 rounded-r
          bg-blue-600
          opacity-0 group-[.active]:opacity-100
        `}
      />

      <Icon size={20} />

      {!collapsed && <span className="text-sm font-medium">{label}</span>}

      {/* Tooltip when collapsed */}
      {collapsed && (
        <span
          className="
            absolute left-full ml-3 px-2 py-1
            rounded-md text-xs
            bg-gray-900 text-white
            opacity-0 group-hover:opacity-100
            pointer-events-none
            whitespace-nowrap
            transition
          "
        >
          {label}
        </span>
      )}
    </NavLink>
  );
}
