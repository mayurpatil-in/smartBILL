import api from "./axios";

// Get Expenses (supports filtering)
export const getExpenses = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.startDate) params.append("start_date", filters.startDate);
  if (filters.endDate) params.append("end_date", filters.endDate);
  if (filters.category) params.append("category", filters.category);
  if (filters.isRecurring !== undefined) params.append("is_recurring", filters.isRecurring);

  const response = await api.get(`/expenses/?${params.toString()}`);
  return response.data;
};

// Get Stats
export const getExpenseStats = async () => {
  const response = await api.get("/expenses/stats");
  return response.data;
};

// Create Expense
export const createExpense = async (data) => {
  const response = await api.post("/expenses/", data);
  return response.data;
};

// Update Expense
export const updateExpense = async (id, data) => {
  const response = await api.put(`/expenses/${id}`, data);
  return response.data;
};

// Delete Expense
export const deleteExpense = async (id) => {
  const response = await api.delete(`/expenses/${id}`);
  return response.data;
};

// Post Recurring Template (Generate Real Expense)
export const postRecurringExpense = async (templateId) => {
  const response = await api.post(`/expenses/${templateId}/post`);
  return response.data;
};
