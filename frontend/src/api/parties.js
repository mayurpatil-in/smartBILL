import axios from "./axios";

export const getParties = async () => {
  const { data } = await axios.get("/party/");
  return data;
};

export const createParty = async (partyData) => {
  const { data } = await axios.post("/party/", partyData);
  return data;
};

export const updateParty = async (id, partyData) => {
  const { data } = await axios.put(`/party/${id}`, partyData);
  return data;
};

export const deleteParty = async (id) => {
  await axios.delete(`/party/${id}`);
};
