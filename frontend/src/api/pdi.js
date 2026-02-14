import api from "./axios";

// Using the shared api instance, so we don't need manual header handling
// The base URL is also handled by the shared api instance

export const createPDIReport = async (data) => {
  const response = await api.post("/pdi/", data);
  return response.data;
};

export const getPDIByChallanId = async (challanId) => {
  const response = await api.get(`/pdi/challan/${challanId}`);
  return response.data;
};

export const updatePDIReport = async (id, data) => {
  const response = await api.put(`/pdi/${id}`, data);
  return response.data;
};

export const printPDIReport = async (id) => {
  const response = await api.get(`/pdi/${id}/pdf`, {
    responseType: "blob",
  });
  return response.data;
};

export const getPDIReportHtml = async (id) => {
  const response = await api.get(`/pdi/${id}/html`, {
    responseType: "text",
  });
  return response.data;
};
