import api from './axios';

export const getPayments = async (params = {}) => {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([_, v]) => v !== "" && v != null)
  );
  const response = await api.get('/payments/', { params: cleanParams });
  return response.data;
};

export const createPayment = async (data) => {
  const response = await api.post('/payments/', data);
  return response.data;
};

export const updatePayment = async (id, data) => {
  const response = await api.put(`/payments/${id}`, data);
  return response.data;
};

export const deletePayment = async (id) => {
  const response = await api.delete(`/payments/${id}`);
  return response.data;
};
