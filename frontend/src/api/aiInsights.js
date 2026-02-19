import axios from "./axios";

export const getDailyBriefing = async () => {
  try {
    const response = await axios.get("/ai-insights/briefing");
    return response.data;
  } catch (error) {
    console.error("Failed to fetch daily briefing", error);
    throw error;
  }
};

export const getAnomalies = async () => {
  try {
    const response = await axios.get("/ai-insights/anomalies");
    return response.data;
  } catch (error) {
    console.error("Failed to fetch anomalies", error);
    throw error;
  }
};

export const getPredictions = async () => {
  try {
    const response = await axios.get("/ai-insights/predictions");
    return response.data;
  } catch (error) {
    console.error("Failed to fetch predictions", error);
    throw error;
  }
};

export const getStockProjections = async () => {
  try {
    const response = await axios.get("/ai-insights/stock-projections");
    return response.data;
  } catch (error) {
    console.error("Failed to fetch stock projections", error);
    throw error;
  }
};

export const getSalesForecast = async () => {
  try {
    const response = await axios.get("/ai-insights/sales-forecast");
    return response.data;
  } catch (error) {
    console.error("Failed to fetch sales forecast", error);
    throw error;
  }
};

export const getOutstandingReceivables = async () => {
  try {
    const response = await axios.get("/ai-insights/receivables");
    return response.data;
  } catch (error) {
    console.error("Failed to fetch outstanding receivables", error);
    throw error;
  }
};
