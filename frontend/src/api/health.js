import api from "./axios";

export async function checkBackendHealth() {
  try {
    await api.get("/health", { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}
