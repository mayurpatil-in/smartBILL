import axios from "axios";
import { getToken, clearSession } from "../utils/sessionTimer";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * 🔐 Attach JWT token
 */
api.interceptors.request.use(
  (config) => {
    const token = getToken(); // must return access_token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * 🚨 Global error handling (AUTH + SUBSCRIPTION)
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    // 🔒 Unauthorized → force logout
    if (status === 401) {
      // Don't redirect if it's a failed login attempt
      if (error.config.url.includes("/auth/login")) {
        return Promise.reject(error);
      }
      
      clearSession();
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }

    // ⛔ Forbidden (role / company missing)
    if (status === 403) {
      if (error.config.url.includes("/auth/login")) {
        return Promise.reject(error);
      }
      window.location.replace("/unauthorized");
    }

    // 💳 Subscription expired
    if (status === 402) {
      window.location.replace("/subscription-expired");
    }

    return Promise.reject(error);
  }
);

export default api;
