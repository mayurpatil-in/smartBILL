
import api from "./axios";

export const getInvoices = async () => {
  const response = await api.get("/invoice/");
  return response.data;
};

export const createInvoice = async (data) => {
  const response = await api.post("/invoice/", data);
  return response.data;
};

export const createInvoiceFromChallan = async (challanId) => {
  const response = await api.post(`/invoice/from-challan/${challanId}`);
  return response.data;
};

// Get Single Invoice
export const getInvoice = async (id) => {
  const response = await api.get(`/invoice/${id}`);
  return response.data;
};

// Update Invoice
export const updateInvoice = async (id, data) => {
  const response = await api.put(`/invoice/${id}`, data);
  return response.data;
};

// Delete Invoice
export const deleteInvoice = async (id) => {
  const response = await api.delete(`/invoice/${id}`);
  return response.data;
};

export const getInvoiceStats = async () => {
  const response = await api.get('/invoice/stats');
  return response.data;
};

export const getNextInvoiceNumber = async () => {
  const response = await api.get("/invoice/next-number");
  return response.data;
};

export const getPendingInvoices = async (partyId) => {
  const params = partyId ? { party_id: partyId } : {};
  const response = await api.get('/invoice/pending', { params });
  return response.data;
};
