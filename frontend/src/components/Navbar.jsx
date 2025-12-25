import { useState, useRef, useEffect } from "react";
import {
  Menu,
  Bell,
  ChevronDown,
  User,
  LogOut,
  Moon,
  Sun,
  Settings,
} from "lucide-react";
import Breadcrumbs from "./Breadcrumbs";
import { setDarkMode } from "../utils/theme";

export default function Navbar({ onMenuClick }) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(
    document.documentElement.classList.contains("dark")
  );
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggleTheme = () => {
    setDarkMode(!dark);
    setDark(!dark);
  };

  const logout = () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  };

  return (
    <header
      className="
        sticky top-0 z-20
        bg-white dark:bg-gray-800
        border-b border-gray-200 dark:border-gray-700
        px-6 py-4
        flex items-center justify-between
      "
    >
      {/* LEFT */}
      <div className="flex items-center gap-4">
        <button
          className="md:hidden text-gray-700 dark:text-white"
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>

        <div>
          <h1 className="text-lg font-semibold text-gray-800 dark:text-white">
            Dashboard
          </h1>
          <Breadcrumbs />
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="
            text-gray-500 hover:text-gray-800
            dark:hover:text-white transition
          "
          aria-label="Toggle theme"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <button
          className="
            relative text-gray-500 hover:text-gray-800
            dark:hover:text-white transition
          "
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* USER DROPDOWN */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
              <User size={16} />
            </div>
            <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-200">
              Admin
            </span>
            <ChevronDown size={14} className="text-gray-400" />
          </button>

          {/* Dropdown */}
          {open && (
            <div
              className="
                absolute right-0 mt-2 w-44
                bg-white dark:bg-gray-800
                border border-gray-200 dark:border-gray-700
                rounded-lg shadow-lg
                py-1 text-sm
                origin-top-right
                animate-scale-in
              "
            >
              {/* Profile */}
              <button
                className="
                  w-full flex items-center gap-3
                  px-4 py-2 text-sm
                  text-gray-700 dark:text-gray-200
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  transition rounded-md
                  focus:outline-none
                "
              >
                <User size={16} />
                Profile
              </button>

              {/* Settings */}
              <button
                className="
                  w-full flex items-center gap-3
                  px-4 py-2 text-sm
                  text-gray-700 dark:text-gray-200
                  hover:bg-gray-100 dark:hover:bg-gray-700
                  transition rounded-md
                  focus:outline-none
                "
              >
                <Settings size={16} />
                Settings
              </button>

              <hr className="my-1 border-gray-200 dark:border-gray-700" />

              {/* Logout */}
              <button
                onClick={logout}
                className="
                  w-full flex items-center gap-3
                  px-4 py-2 text-sm
                  text-red-600
                  hover:bg-red-50 dark:hover:bg-red-900/20
                  transition rounded-md
                  focus:outline-none
                "
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
