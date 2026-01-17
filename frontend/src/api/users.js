import axios from "./axios";

/**
 * Create a new user in the company
 */
export const createUser = async (userData) => {
  const response = await axios.post("/users/", userData);
  return response.data;
};

/**
 * Get all users in the current user's company
 */
export const getCompanyUsers = async () => {
  const response = await axios.get("/users/");
  return response.data;
};

/**
 * Get details of a specific user
 */
export const getUserDetails = async (userId) => {
  const response = await axios.get(`/users/${userId}`);
  return response.data;
};

/**
 * Assign a role to a user
 */
export const assignUserRole = async (userId, roleId) => {
  const response = await axios.put(`/users/${userId}/role`, {
    role_id: roleId,
  });
  return response.data;
};

/**
 * Update user details
 */
export const updateUser = async (userId, userData) => {
  const response = await axios.put(`/users/${userId}`, userData);
  return response.data;
};

/**
 * Delete a user
 */
export const deleteUser = async (userId) => {
  const response = await axios.delete(`/users/${userId}`);
  return response.data;
};
