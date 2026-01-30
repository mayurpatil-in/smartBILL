import {
  createContext,
  useEffect,
  useState,
  useContext,
  useCallback,
} from "react";
import { jwtDecode } from "jwt-decode";
import toast from "react-hot-toast";

const ClientAuthContext = createContext();

export function useClientAuth() {
  return useContext(ClientAuthContext);
}

export function ClientAuthProvider({ children }) {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem("client_token");
    setClient(null);
    window.location.href = "/portal/login";
  }, []);

  // Check token expiration periodically
  useEffect(() => {
    const checkTokenExpiration = () => {
      const token = localStorage.getItem("client_token");

      if (!token) return;

      try {
        const payload = jwtDecode(token);
        const expirationTime = payload.exp * 1000;
        const currentTime = Date.now();

        // If token expired, logout
        if (expirationTime < currentTime) {
          toast.error("Session expired. Please login again.");
          logout();
        }
        // If token expires in less than 5 minutes, show warning
        else if (expirationTime - currentTime < 5 * 60 * 1000) {
          const minutesLeft = Math.floor(
            (expirationTime - currentTime) / 60000,
          );
          if (minutesLeft > 0) {
            toast.warning(
              `Session expires in ${minutesLeft} minute${minutesLeft > 1 ? "s" : ""}`,
              {
                duration: 4000,
              },
            );
          }
        }
      } catch (err) {
        console.error("Error checking token expiration", err);
      }
    };

    // Check immediately
    checkTokenExpiration();

    // Check every minute
    const interval = setInterval(checkTokenExpiration, 60000);

    return () => clearInterval(interval);
  }, [logout]);

  // Auto-logout on inactivity (30 minutes)
  useEffect(() => {
    let inactivityTimer;

    const resetInactivityTimer = () => {
      clearTimeout(inactivityTimer);

      // Only set timer if user is authenticated
      if (client) {
        inactivityTimer = setTimeout(
          () => {
            toast.error("Logged out due to inactivity");
            logout();
          },
          30 * 60 * 1000,
        ); // 30 minutes
      }
    };

    // Events that reset the inactivity timer
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];

    events.forEach((event) => {
      window.addEventListener(event, resetInactivityTimer);
    });

    // Start the timer
    resetInactivityTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach((event) => {
        window.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [client, logout]);

  useEffect(() => {
    const initAuth = () => {
      const token = localStorage.getItem("client_token");

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const payload = jwtDecode(token);

        if (payload.exp * 1000 < Date.now()) {
          logout();
          setLoading(false);
          return;
        }

        setClient({
          id: payload.client_login_id,
          partyId: payload.party_id,
          partyName: payload.party_name,
        });
      } catch (err) {
        console.error("Invalid client token", err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, [logout]);

  const login = (token, partyName) => {
    localStorage.setItem("client_token", token);
    const payload = jwtDecode(token);
    setClient({
      id: payload.client_login_id,
      partyId: payload.party_id,
      partyName: partyName,
    });
  };

  return (
    <ClientAuthContext.Provider
      value={{
        client,
        loading,
        isAuthenticated: !!client,
        login,
        logout,
      }}
    >
      {!loading && children}
    </ClientAuthContext.Provider>
  );
}
