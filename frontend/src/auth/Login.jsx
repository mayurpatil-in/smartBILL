import { useState, useEffect } from "react";
import api from "../api/axios";
import { Eye, EyeOff } from "lucide-react";
import { setDarkMode } from "../utils/theme";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Single source of truth for theme
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

  const login = async () => {
    if (!email || !password) {
      setError("Email and password are required");
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

      // ✅ Correct remember-me token storage
      if (remember) {
        localStorage.setItem("token", token);
        sessionStorage.removeItem("token");
      } else {
        sessionStorage.setItem("token", token);
        localStorage.removeItem("token");
      }

      localStorage.setItem("remember", remember ? "true" : "false");

      window.location.href = "/";
    } catch (err) {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
        min-h-screen w-screen flex items-center justify-center
        bg-gradient-to-br from-blue-600 to-indigo-700
        dark:from-gray-900 dark:to-black px-4
      "
    >
      {/* Card */}
      <div
        className="
          w-full max-w-md
          bg-white/90 dark:bg-gray-900/90
          backdrop-blur rounded-2xl shadow-2xl
          p-8 animate-fade-in
        "
      >
        {/* Accent */}
        <div className="h-1 w-16 bg-blue-600 rounded-full mx-auto mb-6" />

        {/* Logo */}
        <div className="flex justify-center mb-2">
          <img
            src="/logo2.png"
            alt="SmartBill Logo"
            className="h-32 object-contain"
          />
        </div>

        <h2 className="text-3xl font-bold text-center tracking-wide text-gray-900 dark:text-white">
          Smart<span className="text-blue-600">Bill</span>
        </h2>

        <p className="text-center text-sm text-gray-500 mt-1">
          Smart billing for modern businesses
        </p>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
          Login to continue
        </p>

        {error && (
          <p className="text-red-500 text-sm text-center mb-4">
            {error}
          </p>
        )}

        {/* Email */}
        <input
          type="email"
          autoFocus
          placeholder="Email address"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError("");
          }}
          onKeyDown={(e) => e.key === "Enter" && login()}
          className="
            w-full px-4 py-3 mb-4 rounded-lg
            border border-gray-300 dark:border-gray-700
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-white
            focus:ring-2 focus:ring-blue-500 outline-none
          "
        />

        {/* Password */}
        <div className="relative mb-3">
          <input
            type={showPwd ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (error) setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && login()}
            className="
              w-full px-4 py-3 rounded-lg
              border border-gray-300 dark:border-gray-700
              bg-white dark:bg-gray-800
              text-gray-900 dark:text-white
              focus:ring-2 focus:ring-blue-500 outline-none
            "
          />
          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            className="absolute right-3 top-3 text-gray-500"
          >
            {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Remember + Forgot */}
        <div className="flex justify-between items-center mb-5">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={remember}
              onChange={() => setRemember(!remember)}
            />
            Remember me
          </label>

          <button className="text-sm text-blue-500 hover:underline">
            Forgot password?
          </button>
        </div>

        {/* Login */}
        <button
          onClick={login}
          disabled={loading}
          className="
            w-full py-3 rounded-lg font-semibold
            bg-blue-600 hover:bg-blue-700
            text-white transition
            disabled:opacity-60 disabled:cursor-not-allowed
          "
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

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
          · Built with{" "}
          <span className="text-red-500">❤</span>{" "}
          by{" "}
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
