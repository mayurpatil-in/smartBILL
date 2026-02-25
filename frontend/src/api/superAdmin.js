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
  const res = await api.post(
    `/super-admin/companies/${companyId}/admin`,
    payload,
  );
  return res.data;
};

export const extendSubscription = async (companyId, payload) => {
  const res = await api.patch(
    `/super-admin/companies/${companyId}/extend`,
    undefined,
    { params: payload },
  );
  return res.data;
};

export const toggleCompanyStatus = async (companyId) => {
  const res = await api.patch(
    `/super-admin/companies/${companyId}/toggle-status`,
  );
  return res.data;
};

export const updateCompany = async (companyId, payload) => {
  const res = await api.patch(`/super-admin/companies/${companyId}`, payload);
  return res.data;
};

export const resetCompanyPassword = async (companyId, payload) => {
  const res = await api.post(
    `/super-admin/companies/${companyId}/reset-password`,
    payload,
  );
  return res.data;
};

export const deleteCompany = async (companyId) => {
  const res = await api.delete(`/super-admin/companies/${companyId}`);
  return res.data;
};

export const getAuditLogs = async (companyId = null, isSuperAdmin = null) => {
  let url = "/super-admin/audit-logs?";
  const params = new URLSearchParams();
  if (companyId) params.append("company_id", companyId);
  if (isSuperAdmin !== null) params.append("is_super_admin", isSuperAdmin);
  const res = await api.get(url + params.toString());
  return res.data;
};

export const getSaaSAnalytics = async () => {
  const res = await api.get("/super-admin/analytics");
  return res.data;
};

// --- Subscription Plans API ---
export const getPlans = async () => {
  const res = await api.get("/super-admin/plans");
  return res.data;
};

export const createPlan = async (payload) => {
  const res = await api.post("/super-admin/plans", payload);
  return res.data;
};

export const updatePlan = async (planId, payload) => {
  const res = await api.patch(`/super-admin/plans/${planId}`, payload);
  return res.data;
};

// --- Maintenance Mode API ---
export const getMaintenanceStatus = async () => {
  const res = await api.get("/super-admin/maintenance");
  return res.data;
};

export const setMaintenanceStatus = async (isMaintenance) => {
  const res = await api.post("/super-admin/maintenance", {
    is_maintenance: isMaintenance,
  });
  return res.data;
};

// --- Impersonation API ---
export const impersonateTenant = async (companyId) => {
  const res = await api.post(`/super-admin/impersonate/${companyId}`);
  return res.data;
};
