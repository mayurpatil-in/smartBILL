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

export const uploadCompanyLogo = async (formData) => {
  const { data } = await axios.post("/profile/company/logo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};
