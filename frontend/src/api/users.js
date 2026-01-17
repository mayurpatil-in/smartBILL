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
