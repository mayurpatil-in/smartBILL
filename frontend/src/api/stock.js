import axios from "./axios";

export const getStock = async () => {
  const { data } = await axios.get("/stock/");
  return data;
};

export const stockIn = async (itemId, quantity) => {
  const { data } = await axios.post("/stock/in", { item_id: itemId, quantity });
  return data;
};
