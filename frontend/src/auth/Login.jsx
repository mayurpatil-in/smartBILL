import { useState } from "react";
import api from "../api/axios";
import { Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [dark, setDark] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", res.data.access_token);

      if (remember) {
        localStorage.setItem("remember", "true");
      }

      window.location.href = "/";
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen w-screen flex items-center justify-center
        bg-gradient-to-br from-blue-600 to-indigo-700
        dark:from-gray-900 dark:to-black px-4">

        {/* Card */}
        <div className="w-full max-w-md bg-white/90 dark:bg-gray-900/90
          backdrop-blur rounded-2xl shadow-2xl p-8
          animate-fade-in">

          {/* Top accent */}
          <div className="h-1 w-16 bg-blue-600 rounded-full mx-auto mb-6" />

          {/* Logo */}
          <div className="flex justify-center mb-4">
            <img src="/logo.png" alt="Logo" className="h-12" />
          </div>

          <h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white">
            SmartBill
          </h2>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
            Login to continue
          </p>

          {error && (
            <p className="text-red-500 text-sm text-center mb-4">{error}</p>
          )}

          {/* Email */}
          <input
            type="email"
            placeholder="Email address"
            className="w-full px-4 py-3 mb-4 rounded-lg border
              border-gray-300 dark:border-gray-700
              bg-white dark:bg-gray-800
              text-gray-900 dark:text-white
              focus:ring-2 focus:ring-blue-500 outline-none"
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && login()}
          />

          {/* Password */}
          <div className="relative mb-3">
            <input
              type={showPwd ? "text" : "password"}
              placeholder="Password"
              className="w-full px-4 py-3 rounded-lg border
                border-gray-300 dark:border-gray-700
                bg-white dark:bg-gray-800
                text-gray-900 dark:text-white
                focus:ring-2 focus:ring-blue-500 outline-none"
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
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
            className="w-full py-3 rounded-lg font-semibold
              bg-blue-600 hover:bg-blue-700
              text-white transition disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          {/* Dark mode */}
          <div className="flex justify-center mt-6">
            <button
              onClick={() => setDark(!dark)}
              className="text-sm text-gray-500 hover:text-gray-800
                dark:hover:text-white transition"
            >
              {dark ? "☀ Light Mode" : "🌙 Dark Mode"}
            </button>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-6">
            © {new Date().getFullYear()}{" "}
            <a
              href="https://www.mayurpatil.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              mayurpatil.in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
