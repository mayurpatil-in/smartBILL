import api from "./axios";

// Original Export (Direct Download)

// Original Import (Upload) - Updated to support password
export const importBackup = async (file, password = null) => {
  const formData = new FormData();
  formData.append("file", file);
  if (password) {
    formData.append("password", password);
  }

  const res = await api.post("/backup/import", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return res.data;
};

// --- New Advanced Features ---

export const getBackupList = async () => {
  const res = await api.get("/backup/list");
  return res.data;
};

export const getBackupConfig = async () => {
  const res = await api.get("/backup/config");
  return res.data;
};

export const createManualBackup = async (password = null, format = "sql") => {
  const formData = new FormData();
  formData.append("format", format);
  if (password) {
    formData.append("password", password);
  }
  // Note: Even though it's 'create', we use Form data if sending password
  // Standard axios post with data object works for JSON, but Router expects Form for password if mixed?
  // Actually Router defines `password: Optional[str] = Form(None)`. So we must send form-data.

  const res = await api.post("/backup/create", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const deleteBackup = async (filename) => {
  const res = await api.delete(`/backup/${filename}`);
  return res.data;
};

export const downloadBackupFile = async (filename) => {
  const res = await api.get(`/backup/download/${filename}`, {
    responseType: "blob",
  });
  return res.data;
};
