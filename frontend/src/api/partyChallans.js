import api from './axios';

export const getPartyChallans = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== "" && v != null)
  );
  const response = await api.get('/party-challan/', { params: cleanParams });
  return response.data;
};

export const getPartyChallanStats = async () => {
  const response = await api.get('/party-challan/stats');
  return response.data;
};

export const getPartyChallan = async (id) => {
  const response = await api.get(`/party-challan/${id}`);
  return response.data;
};

export const createPartyChallan = async (data) => {
  const response = await api.post('/party-challan/', data);
  return response.data;
};

export const updatePartyChallan = async (id, data) => {
  const response = await api.put(`/party-challan/${id}`, data);
  return response.data;
};

export const deletePartyChallan = async (id) => {
  const response = await api.delete(`/party-challan/${id}`);
  return response.data;
};

export const getDeliveryProgress = async (id) => {
  const response = await api.get(`/party-challan/${id}/delivery-progress`);
  return response.data;
};

export const getNextPartyChallanNumber = async () => {
  const response = await api.get('/party-challan/next-number/preview');
  return response.data;
};

export const checkDuplicatePartyChallanNumber = async (challanNumber, partyId, excludeId = null) => {
  const params = { challan_number: challanNumber, party_id: partyId };
  if (excludeId) params.exclude_id = excludeId;
  const response = await api.get('/party-challan/check-duplicate', { params });
  return response.data;
};

export const getPartyChallansByItem = async (partyId, itemId) => {
  const response = await api.get(`/party-challan/by-item/${partyId}/${itemId}`);
  return response.data;
};
