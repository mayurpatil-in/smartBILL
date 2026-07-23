import api from "./axios";

export const getInvoices = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([key, v]) => key !== "returnFullResponse" && v !== "" && v != null)
  );
  const response = await api.get("/invoice/", { params: cleanParams });
  const totalCount = parseInt(response.headers["x-total-count"] || "0", 10);
  if (params.returnFullResponse) {
    return { data: response.data, totalCount };
  }
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
  const response = await api.get("/invoice/stats");
  return response.data;
};

export const getNextInvoiceNumber = async () => {
  const response = await api.get("/invoice/next-number");
  return response.data;
};

export const getPendingInvoices = async (partyId) => {
  const params = partyId ? { party_id: partyId } : {};
  const response = await api.get("/invoice/pending", { params });
  return response.data;
};

export const getInvoiceShareLink = async (id) => {
  const response = await api.get(`/invoice/${id}/share`);
  return response.data;
};

export const printBulkInvoices = async (invoice_ids) => {
  const response = await api.post(
    "/invoice/bulk-print",
    { invoice_ids },
    { responseType: "blob" }
  );
  return response.data;
};

// ─── E-Way Bill API helpers ──────────────────────────────────────────────────

/** Auto-generate EWB via NIC API */
export const generateEWayBillOnline = async (invoiceId, data) => {
  const response = await api.post(
    `/invoice/${invoiceId}/eway-bill/generate`,
    data
  );
  return response.data;
};

/** Save manually entered EWB number (offline/client generated) */
export const saveEWayBillManual = async (invoiceId, data) => {
  const response = await api.post(
    `/invoice/${invoiceId}/eway-bill/manual`,
    data
  );
  return response.data;
};

/** Update transport details on existing EWB */
export const updateEWayBill = async (invoiceId, data) => {
  const response = await api.put(
    `/invoice/${invoiceId}/eway-bill/update`,
    data
  );
  return response.data;
};

/** Cancel EWB via NIC API (within 24 hours) */
export const cancelEWayBillViaAPI = async (invoiceId, data) => {
  const response = await api.delete(
    `/invoice/${invoiceId}/eway-bill/cancel-api`,
    { data }
  );
  return response.data;
};

/** Remove EWB details from invoice locally (no NIC API call) */
export const clearEWayBillLocal = async (invoiceId) => {
  const response = await api.delete(
    `/invoice/${invoiceId}/eway-bill/clear`
  );
  return response.data;
};

/** Fetch live EWB status from NIC portal */
export const getEWayBillStatus = async (invoiceId) => {
  const response = await api.get(
    `/invoice/${invoiceId}/eway-bill/api-status`
  );
  return response.data;
};
