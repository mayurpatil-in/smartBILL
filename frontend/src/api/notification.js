import api from "./axios";

// Get list of recent notifications
export const getNotifications = async (limit = 20) => {
  const res = await api.get(`/notifications/?limit=${limit}`);
  return res.data;
};

// Mark single as read
export const markAsRead = async (id) => {
  const res = await api.put(`/notifications/${id}/read`);
  return res.data;
};

// Mark all as read
export const markAllAsRead = async () => {
  const res = await api.put("/notifications/read-all");
  return res.data;
};

// Clear all (Optional)
export const clearAllNotifications = async () => {
  const res = await api.delete("/notifications/clear-all");
  return res.data;
};
