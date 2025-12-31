import api from './axios';

export const getEmployees = async () => {
  const response = await api.get('/employees/');
  return response.data;
};

export const createEmployee = async (data) => {
  const response = await api.post('/employees/', data);
  return response.data;
};

export const updateEmployee = async (id, data) => {
  const response = await api.put(`/employees/${id}`, data);
  return response.data;
};

export const deleteEmployee = async (id) => {
  const response = await api.delete(`/employees/${id}`);
  return response.data;
};

export const markAttendance = async (records) => {
  const response = await api.post('/employees/attendance', records);
  return response.data;
};

export const getDailyAttendance = async (date) => {
  const response = await api.get('/employees/attendance/daily', { params: { date_str: date } });
  return response.data;
};

export const getEmployeeSalary = async (userId, month, year) => {
  const response = await api.get(`/employees/${userId}/salary`, { params: { month, year } });
  return response.data;
};

export const getMonthlyAttendance = async (month, year) => {
  const response = await api.get(`/employees/attendance/monthly`, {
    params: { month, year },
  });
  return response.data;
};

export const createSalaryAdvance = async (data) => {
  const response = await api.post('/employees/advances', data);
  return response.data;
};

export const getSalaryAdvances = async (userId) => {
  const response = await api.get(`/employees/${userId}/advances`);
  return response.data;
};

export const uploadDocument = async (userId, formData) => {
  const response = await api.post(`/employees/${userId}/upload`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};
