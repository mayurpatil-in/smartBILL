import axios from "axios";
import { getToken, clearSession } from "../utils/sessionTimer";

import { isTauri } from "@tauri-apps/api/core";

// 🚀 Dynamic Base URL (Works on LAN/WiFi)
// 🚀 Dynamic Base URL (Works on LAN/WiFi)
export const API_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL
  : isTauri()
    ? "http://localhost:8000"
    : `${window.location.protocol}//${window.location.hostname}:8000`;

console.log("🚀 [AXIOS] Using API_URL:", API_URL);

const api = axios.create({
  baseURL: API_URL,
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
  (error) => Promise.reject(error),
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
  },
);

export default api;
