import api from './axios';

export const getChallans = async (partyId = null, status = null) => {
  const params = {};
  if (partyId) params.party_id = partyId;
  if (status) params.status = status;
  
  const response = await api.get('/challan/', { params });
  return response.data;
};

export const getChallan = async (id) => {
  const response = await api.get(`/challan/${id}`);
  return response.data;
};

export const createChallan = async (data) => {
  const response = await api.post('/challan/', data);
  return response.data;
};

export const updateChallan = async (id, data) => {
  const response = await api.put(`/challan/${id}`, data);
  return response.data;
};

export const deleteChallan = async (id) => {
  const response = await api.delete(`/challan/${id}`);
  return response.data;
};

export const getNextChallanNumber = async () => {
  const response = await api.get('/challan/next-number/preview');
  return response.data;
};
