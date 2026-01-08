import { useState, useRef, useEffect } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  Menu,
  Bell,
  ChevronDown,
  User,
  LogOut,
  Moon,
  Sun,
  Settings,
  Check,
  CheckCheck,
  Info,
  AlertCircle,
  X,
  Clock,
  Trash2,
} from "lucide-react";
import Breadcrumbs from "./Breadcrumbs";
import { setDarkMode } from "../utils/theme";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import ProfileModal from "./ProfileModal";
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearAllNotifications,
} from "../api/notification";
import toast from "react-hot-toast";

// Short "Pop" Sound (Base64)
const NOTIFICATION_SOUND =
  "data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"; // Placeholder, real base64 below

const NotificationDropdown = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all"); // 'all', 'unread', 'error'
  const dropdownRef = useRef(null);
  const lastNotifIdRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Filter Logic
  const filteredNotifications = notifications.filter((n) => {
    if (filter === "unread") return !n.is_read;
    if (filter === "error") return n.type === "error";
    return true;
  });

  const playSound = () => {
    try {
      // A short, clean "pop" sound
      const audio = new Audio(
        "https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3"
      );
      audio.volume = 0.5;
      audio.play().catch((e) => console.log("Audio blocked", e));
    } catch (e) {}
  };

  const fetchNotifs = async () => {
    try {
      const data = await getNotifications();

      // Check for NEW notifications
      if (data.length > 0) {
        const latestId = data[0].id;

        // If we have a previous ID and the new one is larger, it's new!
        if (
          lastNotifIdRef.current !== null &&
          latestId > lastNotifIdRef.current
        ) {
          const newItems = data.filter((n) => n.id > lastNotifIdRef.current);

          newItems.forEach((n) => {
            if (n.type === "error") {
              toast.error(n.title);
            } else if (n.type === "success") {
              toast.success(n.title);
            } else {
              toast(n.title, {
                icon: "🔔",
                style: {
                  borderRadius: "10px",
                  background: "#333",
                  color: "#fff",
                },
              });
            }
          });

          playSound();
        }
        lastNotifIdRef.current = latestId;
      }

      setNotifications(data);
    } catch (e) {
      console.error("Failed to fetch notifications");
    }
  };

  useEffect(() => {
    fetchNotifs();
    // Poll every 10s for snappier feeling
    const interval = setInterval(fetchNotifs, 10000);

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      clearInterval(interval);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMarkRead = async (id, title, message) => {
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );

      // Smart Navigation
      if (title && message) {
        const content = (title + " " + message).toLowerCase();
        if (content.includes("backup")) {
          navigate("/settings");
          setOpen(false);
        }
      }
    } catch (e) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (e) {}
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotifications();
      setNotifications([]);
    } catch (e) {}
  };

  // Icon helper
  const getIcon = (type) => {
    if (type === "error")
      return <AlertCircle size={14} className="text-red-500" />;
    if (type === "success")
      return <Check size={14} className="text-green-500" />;
    return <Info size={14} className="text-blue-500" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 transition"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white shadow-sm border border-white dark:border-gray-900">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in origin-top-right">
          <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-sm text-gray-800 dark:text-gray-200">
                Notifications
              </h3>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium flex items-center gap-1"
                    title="Mark all read"
                  >
                    <CheckCheck size={14} />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 font-medium flex items-center gap-1"
                    title="Clear All"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2">
              {[
                { id: "all", label: "All" },
                { id: "unread", label: "Unread" },
                { id: "error", label: "Alerts" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`text-[11px] font-medium px-2.5 py-1 rounded-full transition-colors ${
                    filter === tab.id
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 shadow-sm"
                      : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[350px] overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <Bell size={32} className="mx-auto mb-2 opacity-20" />
                <p className="text-xs">No notifications found</p>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkRead(n.id, n.title, n.message)}
                  className={`p-3 border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer ${
                    !n.is_read ? "bg-blue-50/30 dark:bg-blue-900/10" : ""
                  }`}
                >
                  <div className="flex gap-3">
                    <div
                      className={`mt-0.5 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        n.type === "error"
                          ? "bg-red-100 dark:bg-red-900/30"
                          : n.type === "success"
                          ? "bg-green-100 dark:bg-green-900/30"
                          : "bg-blue-100 dark:bg-blue-900/30"
                      }`}
                    >
                      {getIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <p
                          className={`text-sm font-medium truncate ${
                            !n.is_read
                              ? "text-gray-900 dark:text-white"
                              : "text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                        <Clock size={10} />
                        {formatDistanceToNow(new Date(n.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

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
        <NotificationDropdown />

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
