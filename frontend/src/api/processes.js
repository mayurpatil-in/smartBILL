import axios from "./axios";

export const getProcesses = async (config = {}) => {
  const { data } = await axios.get("/process/", config);
  return data;
};

export const createProcess = async (data) => {
  const { data: response } = await axios.post("/process/", data);
  return response;
};

export const updateProcess = async (id, data) => {
  const { data: response } = await axios.put(`/process/${id}`, data);
  return response;
};

export const deleteProcess = async (id) => {
  await axios.delete(`/process/${id}`);
};
