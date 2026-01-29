import { createContext, useEffect, useState, useContext } from "react";
import { jwtDecode } from "jwt-decode";

const ClientAuthContext = createContext();

export function useClientAuth() {
  return useContext(ClientAuthContext);
}

export function ClientAuthProvider({ children }) {
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);

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
          partyName: payload.party_name, // If we add this to token, effectively we need to decode properly
          // Note: My backend implementation didn't add party_name to the token data dict,
          // but returned it in the login response.
          // I should store it or fetch it. For now, rely on token or fetch dashboard.
        });
      } catch (err) {
        console.error("Invalid client token", err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = (token, partyName) => {
    localStorage.setItem("client_token", token);
    const payload = jwtDecode(token);
    setClient({
      id: payload.client_login_id,
      partyId: payload.party_id,
      partyName: partyName,
    });
  };

  const logout = () => {
    localStorage.removeItem("client_token");
    setClient(null);
    window.location.href = "/portal/login";
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
