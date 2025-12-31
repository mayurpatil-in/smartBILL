import { toast } from "react-hot-toast";
import api from "../api/axios";

export const generateSalarySlip = async (salaryData, employee) => {
  const loadingToast = toast.loading("Generating Salary Slip...");
  try {
    const month = salaryData.month.split("-")[1];
    const year = salaryData.month.split("-")[0];
    
    const response = await api.get(`/employees/${employee.id}/salary/pdf`, {
      params: { month, year },
      responseType: "blob",
    });

    // Create a blob URL
    const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
    const filename = `SalarySlip_${employee.name}_${salaryData.month}.pdf`;
    
    toast.dismiss(loadingToast);
    return { url, filename };
  } catch (error) {
    console.error("PDF Download Error:", error);
    toast.dismiss(loadingToast);
    toast.error("Failed to generate Salary Slip");
    return null;
  }
};
