import axios from "./axios";

/**
 * Roles and Permissions API
 */

// Get all roles
export const getRoles = async () => {
  const response = await axios.get("/roles/");
  return response.data;
};

// Get role by ID with permissions
export const getRole = async (roleId) => {
  const response = await axios.get(`/roles/${roleId}`);
  return response.data;
};

// Create new role
export const createRole = async (roleData) => {
  const response = await axios.post("/roles/", roleData);
  return response.data;
};

// Update role
export const updateRole = async (roleId, roleData) => {
  const response = await axios.put(`/roles/${roleId}`, roleData);
  return response.data;
};

// Delete role
export const deleteRole = async (roleId) => {
  await axios.delete(`/roles/${roleId}`);
};

// Get all available permissions
export const getAllPermissions = async () => {
  const response = await axios.get("/roles/permissions/all");
  return response.data;
};

// Get current user's permissions
export const getMyPermissions = async () => {
  const response = await axios.get("/roles/permissions/my");
  return response.data;
};
