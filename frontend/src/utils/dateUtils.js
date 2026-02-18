export const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  // Ensure we have a valid date
  if (isNaN(date.getTime())) return dateString;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}-${month}-${year}`;
};

export const getFinancialYearStartDate = () => {
  const today = new Date();
  const currentMonth = today.getMonth(); // 0-11
  const currentYear = today.getFullYear();

  // Financial year starts on April 1st
  // If current month is Jan (0) to March (2), FY started in previous year
  // If current month is April (3) to Dec (11), FY started in current year
  const startYear = currentMonth < 3 ? currentYear - 1 : currentYear;

  // Return formatted as YYYY-MM-DD for input type="date"
  return `${startYear}-04-01`;
};

export const getFinancialYearEndDate = () => {
  const today = new Date();
  const currentMonth = today.getMonth(); // 0-11
  const currentYear = today.getFullYear();

  // Financial year starts on April 1st
  const startYear = currentMonth < 3 ? currentYear - 1 : currentYear;
  const endYear = startYear + 1;

  // Return formatted as YYYY-MM-DD for input type="date"
  return `${endYear}-03-31`;
};
