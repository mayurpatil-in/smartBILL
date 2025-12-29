import axios from "./axios";

export const getProfile = async () => {
  const { data } = await axios.get("/profile/");
  return data;
};

export const updateUserProfile = async (userData) => {
  const { data } = await axios.patch("/profile/user", userData);
  return data;
};

export const updateCompanyProfile = async (companyData) => {
  const { data } = await axios.patch("/profile/company", companyData);
  return data;
};
