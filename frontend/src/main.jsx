import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { AuthProvider } from "./context/AuthContext";
import { initTheme } from "./utils/theme";
import { initDesktop } from "./utils/desktop";
import { waitForBackend } from "./utils/backendHealth";
import { isTauri } from "@tauri-apps/api/core";

initTheme();
initDesktop();

/**
 * Hide splash screen with smooth fade-out animation
 */
function hideSplashScreen() {
  const splash = document.getElementById("splash-screen");
  if (splash) {
    splash.style.opacity = "0";
    setTimeout(() => {
      splash.style.display = "none";
    }, 500); // Match the CSS transition duration
  }
}

/**
 * Update splash screen status text
 */
function updateSplashStatus(message) {
  const statusElement = document.getElementById("splash-status");
  if (statusElement) {
    statusElement.textContent = message;
  }
}

/**
 * Initialize and render the application
 */
async function initializeApp() {
  // Only wait for backend if running in Tauri
  if (isTauri()) {
    // Wait for backend without updating status messages
    const backendReady = await waitForBackend();

    if (!backendReady) {
      console.warn("Backend did not become ready in time, proceeding anyway");
    }
  }

  // Render the React app
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </StrictMode>
  );

  // Hide splash screen after React has rendered
  // Give React a moment to render before hiding splash
  setTimeout(() => {
    hideSplashScreen();
  }, 100);
}

// Start the initialization process
initializeApp().catch((error) => {
  console.error("Failed to initialize app:", error);
  updateSplashStatus("Initialization error - please refresh");
});
