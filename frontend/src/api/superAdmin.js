import api from "./axios";

export const getCompanies = async () => {
  const res = await api.get("/super-admin/companies");
  return res.data;
};

export const createCompany = async (payload) => {
  const res = await api.post("/super-admin/companies", payload);
  return res.data;
};

export const createCompanyAdmin = async (companyId, payload) => {
  const res = await api.post(`/super-admin/companies/${companyId}/admin`, payload);
  return res.data;
};

export const extendSubscription = async (companyId, newDate) => {
  const res = await api.patch(
    `/super-admin/companies/${companyId}/extend?new_end=${newDate}`
  );
  return res.data;
};

export const toggleCompanyStatus = async (companyId) => {
  const res = await api.patch(`/super-admin/companies/${companyId}/toggle-status`);
  return res.data;
};
