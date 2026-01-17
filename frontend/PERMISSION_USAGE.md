# Permission Guard Usage Examples

## How to Use PermissionGuard in Your Pages

### Example 1: Hide Delete Button Based on Permission

**Before (No Permission Check):**

```jsx
<button onClick={deleteInvoice}>
  <Trash2 size={18} />
  Delete
</button>
```

**After (With Permission Guard):**

```jsx
import PermissionGuard from "../components/PermissionGuard";

<PermissionGuard permission="invoices.delete">
  <button onClick={deleteInvoice}>
    <Trash2 size={18} />
    Delete
  </button>
</PermissionGuard>;
```

---

### Example 2: Conditional Navigation Link

**Hide "Employees" menu item if user doesn't have permission:**

```jsx
<PermissionGuard permission="employees.view">
  <NavLink to="/employees">
    <Users size={20} />
    Employees
  </NavLink>
</PermissionGuard>
```

---

### Example 3: Multiple Permissions (Any Of)

**Show Reports link if user has either view OR export permission:**

```jsx
<PermissionGuard anyOf={["reports.view", "reports.export"]}>
  <NavLink to="/reports">
    <FileText size={20} />
    Reports
  </NavLink>
</PermissionGuard>
```

---

### Example 4: Multiple Permissions (All Of)

**Show Edit button only if user can both view AND edit:**

```jsx
<PermissionGuard allOf={["invoices.view", "invoices.edit"]}>
  <button onClick={editInvoice}>
    <Edit2 size={18} />
    Edit
  </button>
</PermissionGuard>
```

---

### Example 5: Programmatic Permission Check

**Use the hook directly for conditional logic:**

```jsx
import { usePermissions } from "../hooks/usePermissions";

function InvoicePage() {
  const { hasPermission } = usePermissions();

  const handleDelete = () => {
    if (!hasPermission("invoices.delete")) {
      toast.error("You do not have permission to delete invoices");
      return;
    }

    // Proceed with deletion
    deleteInvoice();
  };

  return (
    <div>
      {/* ... */}
      {hasPermission("invoices.delete") && (
        <button onClick={handleDelete}>Delete</button>
      )}
    </div>
  );
}
```

---

### Example 6: Entire Page Protection

**Redirect if user doesn't have permission:**

```jsx
import { usePermissions } from "../hooks/usePermissions";
import { Navigate } from "react-router-dom";

function SettingsPage() {
  const { hasPermission, loading } = usePermissions();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!hasPermission("settings.view")) {
    return <Navigate to="/dashboard" replace />;
  }

  return <div>{/* Settings content */}</div>;
}
```

---

## Common Permission Codes

### Invoices

- `invoices.view` - View invoice list
- `invoices.create` - Create new invoice
- `invoices.edit` - Edit existing invoice
- `invoices.delete` - Delete invoice
- `invoices.approve` - Approve invoice

### Parties (Customers)

- `parties.view`
- `parties.create`
- `parties.edit`
- `parties.delete`

### Items (Products)

- `items.view`
- `items.create`
- `items.edit`
- `items.delete`

### Expenses

- `expenses.view`
- `expenses.create`
- `expenses.edit`
- `expenses.delete`
- `expenses.approve`

### Payments

- `payments.view`
- `payments.create`
- `payments.edit`
- `payments.delete`

### Employees

- `employees.view`
- `employees.create`
- `employees.edit`
- `employees.delete`

### Reports

- `reports.view`
- `reports.export`

### Settings

- `settings.view`
- `settings.edit`

### Roles (Admin Only)

- `roles.view`
- `roles.create`
- `roles.edit`
- `roles.delete`

---

## Best Practices

1. **Always guard destructive actions** (delete, approve)
2. **Hide UI elements** users can't use (better UX)
3. **Check permissions on backend too** (security)
4. **Use meaningful fallbacks** when hiding elements
5. **Test with different roles** to ensure correct behavior

---

## Testing Different Roles

1. **Login as Super Admin** - Should see everything
2. **Login as Accountant** - Should see invoices, payments, expenses
3. **Login as Sales Manager** - Should see invoices, parties, challans
4. **Login as Employee** - Should only see dashboard and own data

---

## Troubleshooting

**Q: Permission guard not working?**

- Ensure `PermissionProvider` wraps your App
- Check browser console for errors
- Verify user has role assigned
- Check permission code spelling

**Q: All buttons hidden?**

- User might not have any permissions
- Check if role has permissions assigned
- Verify backend API is returning permissions

**Q: Permission changes not reflecting?**

- Refresh permissions: `const { refreshPermissions } = usePermissions(); refreshPermissions();`
- Or logout and login again
