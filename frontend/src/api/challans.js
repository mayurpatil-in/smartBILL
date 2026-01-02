import api from './axios';

export const getDeliveryChallans = async (partyId = null, status = null) => {
  const params = {};
  if (partyId) params.party_id = partyId;
  if (status) params.status = status;
  
  const response = await api.get('/challan/', { params });
  return response.data;
};

export const getDeliveryChallan = async (id) => {
  const response = await api.get(`/challan/${id}`);
  return response.data;
};

export const createDeliveryChallan = async (data) => {
  const response = await api.post('/challan/', data);
  return response.data;
};

export const updateDeliveryChallan = async (id, data) => {
  const response = await api.put(`/challan/${id}`, data);
  return response.data;
};

export const deleteDeliveryChallan = async (id) => {
  const response = await api.delete(`/challan/${id}`);
  return response.data;
};

export const getNextDeliveryChallanNumber = async (partyId = null) => {
  const params = {};
  if (partyId) params.party_id = partyId;
  const response = await api.get('/challan/next-number/preview', { params });
  return response.data;
};

export const getPendingChallanItems = async (partyId) => {
  const response = await api.get(`/challan/pending-items/${partyId}`);
  return response.data;
};

export const getChallanStats = async () => {
  const response = await api.get('/challan/stats');
  return response.data;
};

export const printDeliveryChallan = async (id) => {
  const response = await api.get(`/challan/${id}/print`, {
    responseType: 'blob',
  });
  return response.data;
};
