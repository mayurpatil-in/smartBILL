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
  Eye,
  Edit,
  FileEdit,
  Trash,
  Lock,
  Unlock,
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

  const toggleModulePermissions = (modulePerms) => {
    const modulePermIds = modulePerms.map((p) => p.id);
    const allSelected = modulePermIds.every((id) =>
      formData.permission_ids.includes(id),
    );

    setFormData((prev) => ({
      ...prev,
      permission_ids: allSelected
        ? prev.permission_ids.filter((id) => !modulePermIds.includes(id))
        : [...new Set([...prev.permission_ids, ...modulePermIds])],
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

  // Get icon for permission action
  const getPermissionIcon = (action) => {
    switch (action.toLowerCase()) {
      case "view":
        return <Eye size={14} />;
      case "create":
        return <Plus size={14} />;
      case "edit":
        return <Edit size={14} />;
      case "delete":
        return <Trash size={14} />;
      default:
        return <Shield size={14} />;
    }
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

        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Shield className="text-white" size={32} />
              </div>
              <h1 className="text-2xl md:text-4xl font-bold text-white tracking-tight">
                Role Management
              </h1>
            </div>
            <p className="text-blue-100 text-sm md:text-lg md:ml-16">
              Configure user roles and granular permissions
            </p>
          </div>

          <PermissionGuard permission="roles.create">
            <button
              onClick={handleCreate}
              className="group flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl hover:scale-105 font-semibold w-full md:w-auto"
            >
              <Plus
                size={20}
                className="group-hover:rotate-90 transition-transform duration-300"
              />
              Create Role
            </button>
          </PermissionGuard>
        </div>
      </div>

      {/* Roles Grid */}
      {roles.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700">
          <Shield className="mx-auto text-gray-400 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Roles Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create your first role to get started with access control
          </p>
          <PermissionGuard permission="roles.create">
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
            >
              <Plus size={20} />
              Create First Role
            </button>
          </PermissionGuard>
        </div>
      ) : (
        <div className="grid gap-4">
          {roles.map((role) => (
            <div
              key={role.id}
              className="group relative bg-white dark:bg-gray-800 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden"
            >
              {/* Gradient Border Effect on Hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl"></div>

              <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="flex-1 w-full sm:w-auto">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                        <Shield className="text-white" size={20} />
                      </div>
                      <h3 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                        {role.name}
                      </h3>
                      {role.is_system_role && (
                        <span className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full text-xs font-semibold shadow-lg">
                          <Lock size={12} />
                          System Role
                        </span>
                      )}
                      {!role.is_active && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400 rounded-full text-xs font-semibold">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 sm:ml-12">
                      {role.description || "No description provided"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => toggleRoleExpansion(role.id)}
                      className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/20 rounded-xl transition-all duration-300"
                      title="View Permissions"
                    >
                      {expandedRole === role.id ? (
                        <ChevronUp size={20} className="animate-bounce" />
                      ) : (
                        <ChevronDown size={20} />
                      )}
                    </button>

                    <PermissionGuard permission="roles.edit">
                      {role.name !== "Super Admin" && (
                        <button
                          onClick={() => handleEdit(role)}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all duration-300 hover:scale-110"
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
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-300 hover:scale-110"
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
                  <div className="mt-6 pt-6 border-t-2 border-gray-100 dark:border-gray-700 animate-fade-in">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                        <Shield size={16} />
                        Assigned Permissions
                      </h4>
                      {rolePermissionsMap[role.id] && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-semibold">
                          {rolePermissionsMap[role.id].length} Permissions
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {rolePermissionsMap[role.id] ? (
                        rolePermissionsMap[role.id].length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {rolePermissionsMap[role.id].map((perm) => (
                              <div
                                key={perm.id}
                                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-700 dark:text-blue-300 rounded-lg border border-blue-200 dark:border-blue-800 hover:shadow-md transition-all"
                              >
                                {getPermissionIcon(perm.action)}
                                <span className="font-medium capitalize text-xs">
                                  {perm.action}
                                </span>
                                <span className="text-xs text-blue-600/60 dark:text-blue-400/60">
                                  ({perm.module})
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 bg-gray-50 dark:bg-gray-900/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700">
                            <Unlock
                              className="mx-auto text-gray-400 mb-2"
                              size={32}
                            />
                            <span className="italic text-gray-500">
                              No permissions assigned
                            </span>
                          </div>
                        )
                      ) : (
                        <div className="flex items-center justify-center gap-2 py-4">
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent"></div>
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
      )}

      {/* Premium Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden animate-scale-in">
            {/* Modal Header */}
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
                    <Shield className="text-white" size={24} />
                  </div>
                  <h2 className="text-2xl font-bold text-white">
                    {editingRole ? "Edit Role" : "Create New Role"}
                  </h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-white/20 rounded-xl transition-all"
                >
                  <X className="text-white" size={24} />
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] custom-scrollbar"
            >
              {/* Basic Info */}
              <div className="space-y-4 mb-6">
                <div>
                  <label
                    htmlFor="role_name"
                    className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide"
                  >
                    Role Name *
                  </label>
                  <input
                    type="text"
                    id="role_name"
                    name="name"
                    autoComplete="off"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className={`w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all ${
                      editingRole?.is_system_role
                        ? "opacity-60 cursor-not-allowed"
                        : ""
                    }`}
                    readOnly={editingRole?.is_system_role}
                    required
                  />
                  {editingRole?.is_system_role && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-medium flex items-center gap-1">
                      <Lock size={12} />
                      System role - Name cannot be changed
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="role_description"
                    className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide"
                  >
                    Description
                  </label>
                  <textarea
                    id="role_description"
                    name="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-800 transition-all"
                    rows="3"
                    placeholder="Describe the role's purpose and responsibilities..."
                  />
                </div>
              </div>

              {/* Permissions */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                    <Shield size={20} />
                    Permissions
                  </h3>
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-semibold">
                    {formData.permission_ids.length} Selected
                  </span>
                </div>

                <div className="space-y-4">
                  {Object.entries(groupedPermissions).map(([module, perms]) => {
                    const allSelected = perms.every((p) =>
                      formData.permission_ids.includes(p.id),
                    );
                    return (
                      <div
                        key={module}
                        className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-all"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-bold text-gray-900 dark:text-white capitalize text-lg flex items-center gap-2">
                            <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                              <Shield className="text-white" size={16} />
                            </div>
                            {module.replace("_", " ")}
                          </h4>
                          <button
                            type="button"
                            onClick={() => toggleModulePermissions(perms)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                              allSelected
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                            }`}
                          >
                            {allSelected ? "Deselect All" : "Select All"}
                          </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                          {perms.map((perm) => {
                            const isChecked = formData.permission_ids.includes(
                              perm.id,
                            );
                            return (
                              <label
                                key={perm.id}
                                htmlFor={`perm_${perm.id}`}
                                className={`flex items-center gap-2 cursor-pointer p-3 rounded-lg transition-all ${
                                  isChecked
                                    ? "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-2 border-blue-300 dark:border-blue-600"
                                    : "bg-gray-50 dark:bg-gray-900/50 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  id={`perm_${perm.id}`}
                                  name={`perm_${perm.id}`}
                                  checked={isChecked}
                                  onChange={() => togglePermission(perm.id)}
                                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="flex items-center gap-1.5">
                                  {getPermissionIcon(perm.action)}
                                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
                                    {perm.action}
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row justify-end gap-3 mt-8 pt-6 border-t-2 border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl font-semibold flex items-center gap-2"
                >
                  <Check size={20} />
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
