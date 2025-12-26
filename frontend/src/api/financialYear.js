import api from "./axios";

export const getActiveFinancialYear = async () => {
  const res = await api.get("/financial-year/active");
  return res.data;
};

export const getAllFinancialYears = async () => {
  const res = await api.get("/financial-year");
  return res.data;
};

export const createFinancialYear = async (payload) => {
  const res = await api.post("/financial-year", payload);
  return res.data;
};

export const activateFinancialYear = async (fyId) => {
  const res = await api.post(`/financial-year/${fyId}/activate`);
  return res.data;
};

export const deleteFinancialYear = async (fyId) => {
  const res = await api.delete(`/financial-year/${fyId}`);
  return res.data;
};
