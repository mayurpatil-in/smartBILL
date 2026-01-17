import { useState, useEffect, useContext, createContext } from "react";
import { getMyPermissions } from "../api/roles";

// Create Permission Context
const PermissionContext = createContext({
  permissions: [],
  loading: true,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAllPermissions: () => false,
  refreshPermissions: () => {},
});

// Permission Provider Component
export function PermissionProvider({ children }) {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadPermissions = async () => {
    try {
      setLoading(true);
      const perms = await getMyPermissions();
      setPermissions(perms.map((p) => p.code));
    } catch (error) {
      console.error("Failed to load permissions:", error);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, []);

  const hasPermission = (permissionCode) => {
    return permissions.includes("*") || permissions.includes(permissionCode);
  };

  const hasAnyPermission = (permissionCodes) => {
    return (
      permissions.includes("*") ||
      permissionCodes.some((code) => permissions.includes(code))
    );
  };

  const hasAllPermissions = (permissionCodes) => {
    return (
      permissions.includes("*") ||
      permissionCodes.every((code) => permissions.includes(code))
    );
  };

  const value = {
    permissions,
    loading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions: loadPermissions,
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

// Custom hook to use permissions
export function usePermissions() {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error("usePermissions must be used within PermissionProvider");
  }
  return context;
}
