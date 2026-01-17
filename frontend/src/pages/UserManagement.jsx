import { useState, useEffect } from "react";
import {
  Users as UsersIcon,
  Shield,
  Save,
  RefreshCw,
  UserPlus,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  X,
  Check,
  Lock,
  Unlock,
  Mail,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getCompanyUsers,
  assignUserRole,
  createUser,
  updateUser,
  deleteUser,
} from "../api/users";
import { getRoles } from "../api/roles";
import PermissionGuard from "../components/PermissionGuard";

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roleChanges, setRoleChanges] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, rolesData] = await Promise.all([
        getCompanyUsers(),
        getRoles(),
      ]);
      setUsers(usersData);
      setRoles(rolesData);
      setRoleChanges({});
    } catch (error) {
      toast.error("Failed to load users");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (userId, roleId) => {
    setRoleChanges((prev) => ({
      ...prev,
      [userId]: parseInt(roleId),
    }));
  };

  const handleSaveRole = async (userId) => {
    const newRoleId = roleChanges[userId];
    if (!newRoleId) {
      toast.error("Please select a role");
      return;
    }

    try {
      setSaving(true);
      await assignUserRole(userId, newRoleId);
      toast.success("Role assigned successfully");

      // Update local state
      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId
            ? {
                ...user,
                role_id: newRoleId,
                role_name: roles.find((r) => r.id === newRoleId)?.name,
                role_description: roles.find((r) => r.id === newRoleId)
                  ?.description,
              }
            : user,
        ),
      );

      // Clear the change
      setRoleChanges((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to assign role");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleDelete = async (user) => {
    if (!confirm(`Are you sure you want to delete user "${user.name}"?`)) {
      return;
    }

    try {
      await deleteUser(user.id);
      toast.success("User deleted successfully");
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete user");
    }
  };

  const hasChanges = (userId) => {
    return roleChanges[userId] !== undefined;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 dark:border-gray-700"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-t-blue-600 border-r-transparent border-b-transparent border-l-transparent absolute top-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-8 shadow-2xl">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
              backgroundSize: "32px 32px",
            }}
          ></div>
        </div>

        <div className="relative flex justify-between items-center">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <UsersIcon className="text-white" size={32} />
              </div>
              <h1 className="text-4xl font-bold text-white tracking-tight">
                User Management
              </h1>
            </div>
            <p className="text-blue-100 text-lg ml-16">
              Manage users and assign roles in your company
            </p>
          </div>

          <div className="flex gap-3">
            <PermissionGuard permission="users.create">
              <button
                onClick={() => setShowCreateModal(true)}
                className="group flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl hover:scale-105 font-semibold"
              >
                <UserPlus
                  size={20}
                  className="group-hover:rotate-90 transition-transform duration-300"
                />
                Add User
              </button>
            </PermissionGuard>

            <button
              onClick={loadData}
              className="flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm text-white rounded-xl hover:bg-white/30 transition-all shadow-lg font-semibold"
            >
              <RefreshCw size={20} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Users Grid */}
      {users.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
          <UsersIcon className="mx-auto text-gray-400 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Users Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create your first user to get started
          </p>
          <PermissionGuard permission="users.create">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
            >
              <UserPlus size={20} />
              Create First User
            </button>
          </PermissionGuard>
        </div>
      ) : (
        <div className="grid gap-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="group relative bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden"
            >
              {/* Gradient Border Effect on Hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl"></div>

              <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl">
                <div className="flex items-start justify-between gap-4">
                  {/* User Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold text-2xl shadow-lg">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {user.name}
                        </h3>
                        {user.is_active ? (
                          <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-semibold">
                            <Unlock size={12} />
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400 rounded-full text-xs font-semibold">
                            <Lock size={12} />
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                        <Mail size={14} />
                        <span className="text-sm">{user.email || "N/A"}</span>
                      </div>
                      {user.role_name && (
                        <div className="flex items-center gap-2">
                          <Shield size={14} className="text-blue-600" />
                          <div>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">
                              {user.role_name}
                            </span>
                            {user.role_description && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                {user.role_description}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Role Assignment */}
                  <div className="flex items-center gap-3">
                    <div className="min-w-[200px]">
                      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wide">
                        Assign Role
                      </label>
                      <select
                        value={roleChanges[user.id] ?? user.role_id ?? ""}
                        onChange={(e) =>
                          handleRoleChange(user.id, e.target.value)
                        }
                        className="w-full px-3 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all text-sm"
                      >
                        <option value="">Select a role</option>
                        {roles
                          .filter((role) => role.name !== "Super Admin")
                          .map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                      </select>
                    </div>

                    {hasChanges(user.id) && (
                      <button
                        onClick={() => handleSaveRole(user.id)}
                        disabled={saving}
                        className="mt-5 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Save Role"
                      >
                        <Save size={16} />
                      </button>
                    )}

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 mt-5">
                      <PermissionGuard permission="users.edit">
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all duration-300 hover:scale-110"
                          title="Edit User"
                        >
                          <Edit2 size={20} />
                        </button>
                      </PermissionGuard>

                      <PermissionGuard permission="users.delete">
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-300 hover:scale-110"
                          title="Delete User"
                        >
                          <Trash2 size={20} />
                        </button>
                      </PermissionGuard>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          roles={roles}
          onClose={() => setShowCreateModal(false)}
          onSave={async (userData) => {
            try {
              await createUser(userData);
              toast.success("User created successfully");
              setShowCreateModal(false);
              loadData();
            } catch (error) {
              toast.error(
                error.response?.data?.detail || "Failed to create user",
              );
            }
          }}
        />
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => {
            setShowEditModal(false);
            setEditingUser(null);
          }}
          onSave={async (userData) => {
            try {
              await updateUser(editingUser.id, userData);
              toast.success("User updated successfully");
              setShowEditModal(false);
              setEditingUser(null);
              loadData();
            } catch (error) {
              toast.error(
                error.response?.data?.detail || "Failed to update user",
              );
            }
          }}
        />
      )}
    </div>
  );
}

// ========================
// CREATE USER MODAL
// ========================
function CreateUserModal({ roles, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role_id: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.role_id
    ) {
      toast.error("Please fill in all fields");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    try {
      await onSave(formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6">
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: "24px 24px",
              }}
            ></div>
          </div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                <UserPlus size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  Create New User
                </h2>
                <p className="text-blue-100 text-sm">
                  Add a user to your company
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-all"
            >
              <X className="text-white" size={24} />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all"
              placeholder="John Doe"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all"
              placeholder="john@company.com"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all"
                placeholder="••••••••"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Minimum 6 characters
            </p>
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
              Role *
            </label>
            <select
              value={formData.role_id}
              onChange={(e) =>
                setFormData({ ...formData, role_id: parseInt(e.target.value) })
              }
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all"
              required
            >
              <option value="">Select a role</option>
              {roles
                .filter(
                  (role) =>
                    role.name !== "Super Admin" && role.name !== "Employee",
                )
                .map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Create User
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ========================
// EDIT USER MODAL
// ========================
function EditUserModal({ user, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email || "",
    password: "",
    is_active: user.is_active,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Build update payload (only include changed fields)
    const updates = {};
    if (formData.name !== user.name) updates.name = formData.name;
    if (formData.email !== user.email) updates.email = formData.email;
    if (formData.password) updates.password = formData.password;
    if (formData.is_active !== user.is_active)
      updates.is_active = formData.is_active;

    if (Object.keys(updates).length === 0) {
      toast.error("No changes to save");
      return;
    }

    if (updates.password && updates.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);
    try {
      await onSave(updates);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6">
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                backgroundSize: "24px 24px",
              }}
            ></div>
          </div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-xl">
                <Edit2 size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Edit User</h2>
                <p className="text-blue-100 text-sm">Update user details</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-all"
            >
              <X className="text-white" size={24} />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
              Full Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
              Email Address
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
              New Password (Optional)
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all"
                placeholder="Leave blank to keep current password"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Minimum 6 characters if changing
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border-2 border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              {formData.is_active ? (
                <Unlock className="text-green-600" size={20} />
              ) : (
                <Lock className="text-gray-600" size={20} />
              )}
              <span className="font-semibold text-gray-900 dark:text-white">
                Account Status
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-14 h-7 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                {formData.is_active ? "Active" : "Inactive"}
              </span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Check size={20} />
                  Update User
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
