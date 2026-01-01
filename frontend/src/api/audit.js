import api from "./axios";

export const getCompanyAuditLogs = async () => {
  const response = await api.get("/company/audit-logs");
  return response.data;
};
