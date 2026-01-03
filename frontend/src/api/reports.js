import api from './axios';

export const getJobWorkReport = async () => {
    const response = await api.get('/reports/job-work');
    return response.data;
};

export const getStockLedgerPDF = async (partyId, start_date, end_date) => {
  const params = {};
  if (partyId) params.party_id = partyId;
  if (start_date) params.start_date = start_date;
  if (end_date) params.end_date = end_date;

  const response = await api.get('/reports/ledger/pdf', { 
    params,
    responseType: "blob" 
  });
  return response.data;
};

export const getPartyStatement = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== "" && v != null)
  );
  const response = await api.get('/reports/party-statement', { params: cleanParams });
  return response.data;
};

export const getPartyStatementPDF = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== "" && v != null)
  );
  const response = await api.get('/reports/party-statement/pdf', { 
    params: cleanParams,
    responseType: 'blob'
  });
  return response.data;
};

export const getStockLedger = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== "" && v != null)
  );
  const response = await api.get('/reports/stock-ledger', { params: cleanParams });
  return response.data;
};

export const getTrueStockLedgerPDF = async (params = {}) => {
    const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== "" && v != null)
    );
    const response = await api.get('/reports/stock-ledger/pdf', {
        params: cleanParams,
        responseType: 'blob',
    });
    return response.data;
};

export const recalculateStock = async () => {
    const response = await api.post('/reports/recalculate-stock');
    return response.data;
};

export const getDashboardStats = async () => {
  const response = await api.get('/reports/dashboard-stats');
  return response.data;
};
