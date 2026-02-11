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
