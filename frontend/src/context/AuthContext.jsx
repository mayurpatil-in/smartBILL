import { useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { getProfile } from "../api/profile";
import { AuthContext } from "./AuthContextType";
import { startTimer, clearSession, getToken } from "../utils/sessionTimer";

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

        const initialUser = {
          id: payload.user_id,
          name: payload.name ?? "User",
          companyId: payload.company_id ?? null,
          role: payload.role,
          role_name: payload.role_name, // Add role_name from JWT
          companyName: payload.company_name ?? null,
        };
        setUser(initialUser);

        // 🌍 Fetch fresh data from API to ensure updates persist
        // 🔄 RETRY LOGIC for Sidecar startup delay
        let retries = 5;
        let profileData = null;

        while (retries > 0) {
          try {
            profileData = await getProfile();
            break; // Success
          } catch (e) {
            console.warn(`Init profile fetch failed. Retries left: ${retries}`);
            retries--;
            if (retries === 0) throw e;
            await new Promise((res) => setTimeout(res, 1000)); // Wait 1s
          }
        }

        if (profileData) {
          setUser((prev) => ({
            ...prev,
            name: profileData.user.name,
            email: profileData.user.email,
            role_name: profileData.user.role_name, // Add role_name for RBAC
            companyName: profileData.company?.name || prev.companyName,
            companyLogo: profileData.company?.logo,
            plan: profileData.plan || null,
          }));
        }

        startTimer();
      } catch (err) {
        console.error("AuthContext: Invalid token or init error", err);
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
      role_name: payload.role_name, // Add role_name from JWT
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

  // 🔄 Manual User Update (Fixes profile refresh issue)
  const updateUser = (updates) => {
    setUser((prev) => {
      if (!prev) return null;
      return { ...prev, ...updates };
    });
  };

  // 🚀 Global Feature Flag Checker
  const hasFeature = (flagId) => {
    if (user?.role === "SUPER_ADMIN") return true;
    const featureFlags = user?.plan?.feature_flags || [];
    return featureFlags.includes(flagId);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        isSuperAdmin: user?.role === "SUPER_ADMIN",
        isCompanyAdmin: user?.role === "COMPANY_ADMIN",
        isAdmin: user?.role === "ADMIN",
        isUser: user?.role === "USER",
        hasFeature,
        login,
        logout,
        updateUser,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}
