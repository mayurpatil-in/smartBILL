/**
 * Backend Health Check Utility
 * Polls the backend API to determine when it's ready to accept requests
 */

const API_BASE_URL = "http://localhost:8000";
const HEALTH_ENDPOINT = "/health";
const MAX_RETRIES = 30;
const INITIAL_DELAY = 100; // ms

/**
 * Check if backend is ready by pinging the health endpoint
 * @returns {Promise<boolean>} True if backend is ready, false otherwise
 */
async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}${HEALTH_ENDPOINT}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });

    return response.ok;
  } catch (error) {
    // Backend not ready yet
    return false;
  }
}

/**
 * Wait for backend to become ready with exponential backoff
 * @param {Function} onProgress - Optional callback for progress updates
 * @returns {Promise<boolean>} True if backend became ready, false if timed out
 */
export async function waitForBackend(onProgress = null) {
  let attempt = 0;
  let delay = INITIAL_DELAY;

  while (attempt < MAX_RETRIES) {
    attempt++;

    if (onProgress) {
      onProgress({
        attempt,
        maxAttempts: MAX_RETRIES,
        message: `Checking backend... (${attempt}/${MAX_RETRIES})`,
      });
    }

    const isReady = await checkBackendHealth();

    if (isReady) {
      if (onProgress) {
        onProgress({
          attempt,
          maxAttempts: MAX_RETRIES,
          message: "Backend ready!",
          ready: true,
        });
      }
      return true;
    }

    // Wait before next attempt with exponential backoff
    await new Promise((resolve) => setTimeout(resolve, delay));

    // Exponential backoff with cap at 2 seconds
    delay = Math.min(delay * 1.5, 2000);
  }

  // Timeout - backend didn't become ready
  if (onProgress) {
    onProgress({
      attempt,
      maxAttempts: MAX_RETRIES,
      message: "Backend startup timeout",
      error: true,
    });
  }

  return false;
}

/**
 * Simple health check without retries
 * @returns {Promise<boolean>}
 */
export async function isBackendReady() {
  return checkBackendHealth();
}
