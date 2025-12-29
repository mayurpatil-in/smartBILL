import api from './axios';

export const getPartyChallans = async (partyId = null, status = null) => {
  const params = {};
  if (partyId) params.party_id = partyId;
  if (status) params.status = status;
  
  const response = await api.get('/party-challan/', { params });
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
