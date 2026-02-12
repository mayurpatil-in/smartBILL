import axios from "./axios";

export const getItems = async () => {
  const { data } = await axios.get("/item/");
  return data;
};

export const createItem = async (data) => {
  const { data: response } = await axios.post("/item/", data);
  return response;
};

export const updateItem = async (id, data) => {
  const { data: response } = await axios.put(`/item/${id}`, data);
  return response;
};

export const deleteItem = async (id) => {
  await axios.delete(`/item/${id}`);
};

export const printItemBarcode = async (
  id,
  count = 1,
  format = "thermal",
  date = null,
) => {
  let url = `/item/${id}/print-barcode?count=${count}&format=${format}`;
  if (date) {
    url += `&date=${encodeURIComponent(date)}`;
  }
  const response = await axios.get(url, {
    responseType: "blob",
  });
  return response.data;
};
