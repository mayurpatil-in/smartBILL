import axios from "./axios";

/**
 * Get current employee's profile
 */
export const getMyProfile = async () => {
  const response = await axios.get("/employees/me/profile");
  return response.data;
};

/**
 * Get current employee's attendance for a month
 */
export const getMyAttendance = async (month, year) => {
  const response = await axios.get("/employees/me/attendance", {
    params: { month, year },
  });
  return response.data;
};

/**
 * Get list of salary slips for current employee
 */
export const getMySalarySlips = async () => {
  const response = await axios.get("/employees/me/salary-slips");
  return response.data;
};

/**
 * Download salary slip PDF for current employee
 */
export const downloadMySalarySlip = (month, year) => {
  return `/employees/me/salary-slip/${month}/${year}/pdf`;
};

/**
 * Fetch salary slip PDF blob
 */
export const getMySalarySlipPdf = async (month, year) => {
  const response = await axios.get(
    `/employees/me/salary-slip/${month}/${year}/pdf`,
    {
      responseType: "blob",
    },
  );
  return response.data;
};
