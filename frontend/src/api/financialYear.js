import axios from "./axios"; // your pre-configured axios

export const getActiveFinancialYear = async () => {
  const response = await axios.get("/financial-year/active");
  return response.data;
};
