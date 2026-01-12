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
  Sparkles,
  LayoutDashboard,
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
            // Toast removed as per user request
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
    // Poll every 3s for real-time feeling
    const interval = setInterval(fetchNotifs, 3000);

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
        className={`relative p-2 sm:p-2.5 rounded-xl transition-all duration-300 hover:shadow-lg group shrink-0 ${
          unreadCount > 0
            ? "text-white"
            : "text-gray-500 hover:text-white dark:text-gray-400 dark:hover:text-white"
        }`}
        style={{
          background:
            unreadCount > 0
              ? "linear-gradient(135deg, rgb(239, 68, 68), rgb(220, 38, 38))"
              : "",
        }}
        onMouseEnter={(e) => {
          if (unreadCount === 0) {
            e.currentTarget.style.background =
              "linear-gradient(135deg, rgb(59, 130, 246), rgb(147, 51, 234))";
          }
        }}
        onMouseLeave={(e) => {
          if (unreadCount === 0) {
            e.currentTarget.style.background = "";
          }
        }}
      >
        <Bell size={16} className="sm:w-[18px] sm:h-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[9px] font-bold text-red-600 shadow-lg border-2 border-red-500 animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden animate-fade-in origin-top-right">
          {/* Gradient Header */}
          <div className="relative p-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-white" />
                <h3 className="font-bold text-base text-white">
                  Notifications
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-full text-xs font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white transition-all"
                    title="Mark all read"
                  >
                    <CheckCheck size={14} />
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    onClick={handleClearAll}
                    className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white transition-all"
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
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                    filter === tab.id
                      ? "bg-white text-purple-600 shadow-md"
                      : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Decorative Element */}
            <div className="absolute top-2 right-2 opacity-20">
              <Sparkles size={20} className="text-white" />
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
                        {formatDistanceToNow(
                          new Date(
                            n.created_at +
                              (n.created_at.endsWith("Z") ? "" : "Z")
                          ),
                          {
                            addSuffix: true,
                          }
                        )}
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
        bg-white/80 dark:bg-gray-800/80
        backdrop-blur-xl
        border-b-2 border-transparent
        bg-gradient-to-r from-transparent via-transparent to-transparent
        px-3 sm:px-6 py-3 sm:py-4
        flex items-center justify-between
        shadow-lg shadow-gray-200/50 dark:shadow-black/30
      "
      style={{
        borderImage:
          "linear-gradient(90deg, rgb(59, 130, 246), rgb(147, 51, 234), rgb(236, 72, 153)) 1",
      }}
    >
      {/* LEFT */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
        <button
          className="
            md:hidden
            text-gray-600 hover:text-gray-900
            dark:text-gray-300 dark:hover:text-white
            transition
            shrink-0
          "
          onClick={onMenuClick}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 shrink-0">
              <LayoutDashboard size={14} className="text-white sm:w-4 sm:h-4" />
            </div>
            <h1 className="hidden sm:block text-base sm:text-lg font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent truncate">
              Dashboard
            </h1>
          </div>
          <Breadcrumbs />
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="
            relative p-2 sm:p-2.5 rounded-xl
            text-gray-500 hover:text-white
            dark:text-gray-400 dark:hover:text-white
            transition-all duration-300
            hover:shadow-lg
            group
            shrink-0
          "
          style={{
            background: dark
              ? "linear-gradient(135deg, rgb(251, 191, 36), rgb(245, 158, 11))"
              : "linear-gradient(135deg, rgb(59, 130, 246), rgb(147, 51, 234))",
          }}
          aria-label="Toggle theme"
        >
          <div className="transform group-hover:rotate-180 transition-transform duration-500">
            {dark ? (
              <Sun size={16} className="text-white sm:w-[18px] sm:h-[18px]" />
            ) : (
              <Moon size={16} className="text-white sm:w-[18px] sm:h-[18px]" />
            )}
          </div>
        </button>

        {/* Notifications */}
        <NotificationDropdown />

        {/* USER DROPDOWN */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="
              flex items-center gap-2.5
              px-3 py-2 rounded-xl
              hover:bg-gray-100/80
              dark:hover:bg-gray-700/50
              transition-all duration-300
              hover:shadow-lg
              group
            "
            aria-haspopup="menu"
            aria-expanded={open}
          >
            {/* Gradient Avatar with Initials */}
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 via-purple-600 to-pink-600 flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-white dark:ring-gray-800 transform group-hover:scale-110 transition-transform duration-300">
                {user?.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase() || "A"}
              </div>
              {/* Online Status Indicator */}
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 shadow-sm"></div>
            </div>

            <span className="hidden sm:block text-sm font-semibold text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white transition-colors truncate max-w-[100px]">
              {user?.name || "Admin"}
            </span>

            <ChevronDown
              size={14}
              className={`text-gray-400 transition-transform duration-300 ${
                open ? "rotate-180" : ""
              }`}
            />
          </button>

          {open && (
            <div
              className="
                absolute right-0 mt-2 w-64 z-50
                bg-white dark:bg-gray-800
                border border-gray-200 dark:border-gray-700
                rounded-2xl shadow-2xl
                overflow-hidden
                animate-fade-in
              "
            >
              {/* Gradient Header */}
              <div className="relative p-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold text-lg shadow-lg ring-2 ring-white/30">
                    {user?.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase() || "A"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">
                      {user?.name || "Admin"}
                    </p>
                    <p className="text-xs text-white/80 truncate">
                      {user?.email || "admin@example.com"}
                    </p>
                  </div>
                </div>
                {/* Decorative Elements */}
                <div className="absolute top-2 right-2 opacity-20">
                  <Sparkles size={20} className="text-white" />
                </div>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <button
                  onClick={() => {
                    setOpen(false);
                    setShowProfileModal(true);
                  }}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20 transition-all"
                >
                  <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <User
                      size={16}
                      className="text-blue-600 dark:text-blue-400"
                    />
                  </div>
                  <span className="font-medium">Profile</span>
                </button>

                <button
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-200 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-900/20 dark:hover:to-pink-900/20 transition-all"
                  onClick={() => {
                    setOpen(false);
                    navigate("/settings");
                  }}
                >
                  <div className="p-1.5 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <Settings
                      size={16}
                      className="text-purple-600 dark:text-purple-400"
                    />
                  </div>
                  <span className="font-medium">Settings</span>
                </button>

                <hr className="my-2 border-gray-200 dark:border-gray-700" />

                <button
                  onClick={logout}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-red-600 dark:text-red-400 hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 dark:hover:from-red-900/20 dark:hover:to-pink-900/20 transition-all font-medium"
                >
                  <div className="p-1.5 rounded-lg bg-red-100 dark:bg-red-900/30">
                    <LogOut
                      size={16}
                      className="text-red-600 dark:text-red-400"
                    />
                  </div>
                  <span>Logout</span>
                </button>
              </div>
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
