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
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import ProfileModal from "./ProfileModal";

export default function Navbar({ onMenuClick }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [dark, setDark] = useState(
    document.documentElement.classList.contains("dark")
  );
  const dropdownRef = useRef(null);

  // 🔒 Close dropdown on outside click + ESC
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
      if (e.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", handler);
    };
  }, []);

  // 🌙 Theme toggle
  const toggleTheme = () => {
    const next = !dark;
    setDarkMode(next);
    setDark(next);
  };

  // 🔓 Logout
  const { logout, user } = useAuth();

  return (
    <header
      className="
        sticky top-0 z-30
        bg-white dark:bg-gray-800/95
        backdrop-blur
        border-b border-gray-200 dark:border-gray-700
        px-6 py-4
        flex items-center justify-between
        shadow-sm dark:shadow-black/30
      "
    >
      {/* LEFT */}
      <div className="flex items-center gap-4">
        <button
          className="
            md:hidden
            text-gray-600 hover:text-gray-900
            dark:text-gray-300 dark:hover:text-white
            transition
          "
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu size={22} />
        </button>

        <div>
          <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            Dashboard
          </h1>
          <Breadcrumbs />
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="
            p-2 rounded-lg
            text-gray-500 hover:text-gray-900 hover:bg-gray-100
            dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800
            transition
          "
          aria-label="Toggle theme"
        >
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <button
          className="
            relative p-2 rounded-lg
            text-gray-500 hover:text-gray-900 hover:bg-gray-100
            dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800
            transition
          "
          aria-label="Notifications"
        >
          <Bell size={18} />
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-400 dark:bg-red-500" />
        </button>

        {/* USER DROPDOWN */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="
              flex items-center gap-2
              px-2 py-1.5 rounded-lg
              hover:bg-gray-100
              dark:hover:bg-gray-800
              transition
            "
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center">
              <User size={16} />
            </div>

            <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-200">
              {user?.name || "Admin"}
            </span>

            <ChevronDown
              size={14}
              className={`text-gray-400 transition-transform ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>

          {open && (
            <div
              className="
                absolute right-0 mt-2 w-48 z-50
                bg-white dark:bg-gray-800
                border border-gray-200 dark:border-gray-700
                rounded-xl shadow-xl
                py-1 text-sm
                animate-fade-in
              "
            >
              <button
                onClick={() => {
                  setOpen(false);
                  setShowProfileModal(true);
                }}
                className="dropdown-item"
              >
                <User size={16} />
                Profile
              </button>

              <button
                className="dropdown-item"
                onClick={() => {
                  setOpen(false);
                  navigate("/settings");
                }}
              >
                <Settings size={16} />
                Settings
              </button>

              <hr className="my-1 border-gray-200 dark:border-gray-700" />

              <button
                onClick={logout}
                className="dropdown-item text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      <ProfileModal
        open={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </header>
  );
}
