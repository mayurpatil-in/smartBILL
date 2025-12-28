import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { AuthContext } from "./AuthContextType";
import {
  startTimer,
  clearSession,
  getToken,
} from "../utils/sessionTimer";


export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🔄 Restore session on refresh
  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();

      if (!token) {
        clearSession();
        setLoading(false);
        return;
      }

      try {
        const payload = jwtDecode(token);

        // ⛔ Token expired
        if (payload.exp * 1000 < Date.now()) {
          clearSession();
          setUser(null);
          setLoading(false);
          return;
        }

        setUser({
          id: payload.user_id,
          name: payload.name ?? "User",
          companyId: payload.company_id ?? null,
          role: payload.role,
          companyName: payload.company_name ?? null,
        });

        startTimer();
      } catch (err) {
        console.error("Invalid token", err);
        clearSession();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // 🔐 Login handler
  const login = (token, remember) => {
    if (remember) {
      localStorage.setItem("access_token", token);
      sessionStorage.removeItem("access_token");
    } else {
      sessionStorage.setItem("access_token", token);
      localStorage.removeItem("access_token");
    }

    const payload = jwtDecode(token);

    setUser({
      id: payload.user_id,
      name: payload.name ?? "User",
      companyId: payload.company_id ?? null,
      role: payload.role,
      companyName: payload.company_name ?? null,
    });

    startTimer();
  };

  // 🚪 Logout handler
  const logout = () => {
    clearSession();
    setUser(null);
    window.location.replace("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isSuperAdmin: user?.role === "SUPER_ADMIN",
        isAdmin: user?.role === "ADMIN",
        isUser: user?.role === "USER",
        login,
        logout,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

