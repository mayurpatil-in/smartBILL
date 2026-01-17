import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Shield,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getRoles,
  getAllPermissions,
  createRole,
  updateRole,
  deleteRole,
  getRole,
} from "../api/roles";
import PermissionGuard from "../components/PermissionGuard";

export default function RoleManagement() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [expandedRole, setExpandedRole] = useState(null);

  // State for storing permissions of expanded roles
  const [rolePermissionsMap, setRolePermissionsMap] = useState({});

  const toggleRoleExpansion = async (roleId) => {
    if (expandedRole === roleId) {
      setExpandedRole(null);
      return;
    }

    setExpandedRole(roleId);

    // If we haven't fetched permissions for this role yet, do it now
    if (!rolePermissionsMap[roleId]) {
      try {
        const roleData = await getRole(roleId);
        setRolePermissionsMap((prev) => ({
          ...prev,
          [roleId]: roleData.permissions,
        }));
      } catch (error) {
        console.error("Failed to fetch role permissions:", error);
        toast.error("Failed to load role permissions");
      }
    }
  };

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    permission_ids: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesData, permsData] = await Promise.all([
        getRoles(),
        getAllPermissions(),
      ]);
      setRoles(rolesData);
      setPermissions(permsData);
    } catch (error) {
      toast.error("Failed to load roles");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRole(null);
    setFormData({ name: "", description: "", permission_ids: [] });
    setShowModal(true);
  };

  const handleEdit = async (role) => {
    try {
      const roleWithPerms = await getRole(role.id);
      setEditingRole(role);
      setFormData({
        name: role.name,
        description: role.description || "",
        permission_ids: roleWithPerms.permissions.map((p) => p.id),
      });
      setShowModal(true);
    } catch (error) {
      toast.error("Failed to load role details");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingRole) {
        await updateRole(editingRole.id, formData);
        toast.success("Role updated successfully");
      } else {
        await createRole(formData);
        toast.success("Role created successfully");
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save role");
    }
  };

  const handleDelete = async (role) => {
    if (!confirm(`Are you sure you want to delete the role "${role.name}"?`)) {
      return;
    }

    try {
      await deleteRole(role.id);
      toast.success("Role deleted successfully");
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete role");
    }
  };

  const togglePermission = (permId) => {
    setFormData((prev) => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(permId)
        ? prev.permission_ids.filter((id) => id !== permId)
        : [...prev.permission_ids, permId],
    }));
  };

  // Group permissions by module
  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Shield className="text-blue-600" size={32} />
            Role Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage user roles and permissions
          </p>
        </div>

        <PermissionGuard permission="roles.create">
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus size={20} />
            Create Role
          </button>
        </PermissionGuard>
      </div>

      {/* Roles List */}
      <div className="grid gap-4">
        {roles.map((role) => (
          <div
            key={role.id}
            className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-lg transition-shadow"
          >
            <div className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {role.name}
                    </h3>
                    {role.is_system_role && (
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-xs font-semibold">
                        System Role
                      </span>
                    )}
                    {!role.is_active && (
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400 rounded-full text-xs font-semibold">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {role.description}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleRoleExpansion(role.id)}
                    className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    {expandedRole === role.id ? (
                      <ChevronUp size={20} />
                    ) : (
                      <ChevronDown size={20} />
                    )}
                  </button>

                  <PermissionGuard permission="roles.edit">
                    {role.name !== "Super Admin" && (
                      <button
                        onClick={() => handleEdit(role)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="Edit Role"
                      >
                        <Edit2 size={20} />
                      </button>
                    )}
                  </PermissionGuard>

                  <PermissionGuard permission="roles.delete">
                    {!role.is_system_role && (
                      <button
                        onClick={() => handleDelete(role)}
                        className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Delete Role"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}
                  </PermissionGuard>
                </div>
              </div>

              {/* Expanded Permissions View */}
              {expandedRole === role.id && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Permissions:
                  </p>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {rolePermissionsMap[role.id] ? (
                      rolePermissionsMap[role.id].length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {rolePermissionsMap[role.id].map((perm) => (
                            <span
                              key={perm.id}
                              className="px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded text-xs border border-blue-100 dark:border-blue-800"
                            >
                              {perm.action} ({perm.module})
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="italic text-gray-500">
                          No permissions assigned
                        </span>
                      )
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span>Loading permissions...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {editingRole ? "Edit Role" : "Create New Role"}
              </h2>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]"
            >
              {/* Basic Info */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Role Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={`w-full px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all ${
                      editingRole?.is_system_role
                        ? "opacity-60 cursor-not-allowed"
                        : ""
                    }`}
                    readOnly={editingRole?.is_system_role}
                    required
                  />
                  {editingRole?.is_system_role && (
                    <p className="text-xs text-amber-600 mt-1 font-medium">
                      ⚠️ This is a system role. You can modify permissions but
                      cannot rename it.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-4 py-2 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all"
                    rows="2"
                  />
                </div>
              </div>

              {/* Permissions */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Permissions
                </h3>

                <div className="space-y-4">
                  {Object.entries(groupedPermissions).map(([module, perms]) => (
                    <div
                      key={module}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                    >
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-3 capitalize">
                        {module.replace("_", " ")}
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {perms.map((perm) => (
                          <label
                            key={perm.id}
                            className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={formData.permission_ids.includes(
                                perm.id
                              )}
                              onChange={() => togglePermission(perm.id)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                              {perm.action}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
                >
                  {editingRole ? "Update Role" : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
