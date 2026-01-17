import { usePermissions } from "../hooks/usePermissions";

/**
 * Permission Guard Component
 *
 * Conditionally renders children based on user permissions
 *
 * Usage:
 * <PermissionGuard permission="invoices.delete">
 *   <button>Delete Invoice</button>
 * </PermissionGuard>
 *
 * <PermissionGuard anyOf={["reports.view", "reports.export"]}>
 *   <Link to="/reports">Reports</Link>
 * </PermissionGuard>
 *
 * <PermissionGuard allOf={["invoices.view", "invoices.edit"]}>
 *   <EditInvoiceForm />
 * </PermissionGuard>
 */
export default function PermissionGuard({
  permission,
  anyOf,
  allOf,
  fallback = null,
  children,
}) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, loading } =
    usePermissions();

  // While loading, optionally show nothing or a loading state
  if (loading) {
    return fallback;
  }

  // Check single permission
  if (permission) {
    return hasPermission(permission) ? children : fallback;
  }

  // Check any of multiple permissions
  if (anyOf && Array.isArray(anyOf)) {
    return hasAnyPermission(anyOf) ? children : fallback;
  }

  // Check all of multiple permissions
  if (allOf && Array.isArray(allOf)) {
    return hasAllPermissions(allOf) ? children : fallback;
  }

  // If no permission specified, don't render
  return fallback;
}
