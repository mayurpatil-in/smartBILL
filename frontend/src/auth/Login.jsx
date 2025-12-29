import { useState, useEffect } from "react";
import api from "../api/axios";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { setDarkMode } from "../utils/theme";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(null);

  const [isDark, setIsDark] = useState(
    document.documentElement.classList.contains("dark")
  );

  // ✅ Restore remember-me preference
  useEffect(() => {
    const savedRemember = localStorage.getItem("remember");
    if (savedRemember !== null) {
      setRemember(savedRemember === "true");
    }
  }, []);

  // ✅ Sync dark mode globally
  useEffect(() => {
    setDarkMode(isDark);
  }, [isDark]);

  // 🔍 Backend health check
  useEffect(() => {
    let mounted = true;

    const checkStatus = async () => {
      try {
        await api.get("/");
        if (mounted) setIsOnline(true);
      } catch {
        if (mounted) setIsOnline(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // 🔐 LOGIN HANDLER
  const login = async (e) => {
    e.preventDefault(); // ✅ prevent page reload

    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    // Simple email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/login", {
        email,
        password,
      });

      const token = res.data.access_token;

      if (remember) {
        localStorage.setItem("access_token", token);
        sessionStorage.removeItem("access_token");
      } else {
        sessionStorage.setItem("access_token", token);
        localStorage.removeItem("access_token");
      }

      localStorage.setItem("remember", remember ? "true" : "false");

      window.location.href = "/";
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-screen flex items-center justify-center
      bg-gradient-to-br from-blue-600 to-indigo-700
      dark:from-gray-900 dark:to-black px-4"
    >
      <div
        className="w-full max-w-md bg-white dark:bg-gray-800
        backdrop-blur rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8 animate-fade-in"
      >
        <div className="h-1 w-16 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-500 dark:to-indigo-500 rounded-full mx-auto mb-6" />

        {/* ONLINE / OFFLINE */}
        <div className="flex justify-center mb-2">
          {isOnline === null && (
            <span className="text-xs px-3 py-1 rounded-full bg-gray-200 dark:bg-gray-800">
              Checking connection…
            </span>
          )}
          {isOnline === true && (
            <span className="text-xs px-3 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700">
              ● Online
            </span>
          )}
          {isOnline === false && (
            <span className="text-xs px-3 py-1 rounded-full bg-red-100 dark:bg-red-900 text-red-700">
              ● Offline
            </span>
          )}
        </div>

        <div className="flex justify-center mb-1">
          <img src="/logo2.png" alt="SmartBill Logo" className="h-32" />
        </div>

        <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white">
          Smart<span className="text-blue-600 dark:text-blue-400">Bill</span>
        </h2>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-1">
          Smart billing for modern businesses
        </p>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
          Login to continue
        </p>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-3 rounded-lg mb-6 text-sm flex items-start gap-2 animate-fade-in">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ✅ FORM START */}
        <form onSubmit={login}>
          {/* Email */}
          <input
            type="email"
            autoFocus
            autoComplete="username"
            placeholder="Email address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError("");
            }}
            className="w-full px-4 py-3 mb-4 rounded-lg border border-gray-200
              bg-white text-gray-900
              dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-400
              focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
          />

          {/* Password */}
          <div className="relative mb-3">
            <input
              type={showPwd ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              className="w-full px-4 py-3 rounded-lg border border-gray-200
                bg-white text-gray-900
                dark:bg-gray-800 dark:border-gray-700 dark:text-white dark:placeholder-gray-400
                focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute right-3 top-3 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {/* Remember */}
          <div className="flex justify-between items-center mb-5">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <input
                type="checkbox"
                checked={remember}
                onChange={() => setRemember(!remember)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
              />
              Remember me
            </label>
            <a
              href="#"
              className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading || isOnline === false}
            className="w-full py-3 rounded-lg font-semibold shadow-lg
              bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 
              dark:from-blue-500 dark:to-indigo-500 dark:hover:from-blue-600 dark:hover:to-indigo-600
              text-white transition-all
              disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        {/* ✅ FORM END */}

        {/* Theme Toggle */}
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setIsDark((prev) => !prev)}
            className="
              text-sm text-gray-500 hover:text-gray-800
              dark:hover:text-white transition
            "
          >
            {isDark ? "☀ Light Mode" : "🌙 Dark Mode"}
          </button>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
          © {new Date().getFullYear()} ·{" "}
          <span className="font-medium text-gray-800 dark:text-gray-200">
            <a
              href="https://www.arcneuron.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="
      font-semibold tracking-wide
      text-gray-800 dark:text-gray-200
      hover:text-blue-600 dark:hover:text-blue-400
      transition-colors
    "
            >
              ArcNeuron.ai
            </a>{" "}
          </span>{" "}
          · Built with <span className="text-red-500">❤</span> by{" "}
          <a
            href="https://www.mayurpatil.in"
            target="_blank"
            rel="noopener noreferrer"
            className="
      font-medium text-blue-600 dark:text-blue-400
      hover:underline underline-offset-4
      transition-colors duration-200
    "
          >
            Mayur Patil
          </a>
        </p>
      </div>
    </div>
  );
}
