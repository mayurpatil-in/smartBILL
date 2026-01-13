import React, { useState, useEffect } from "react";
import {
  Download,
  Upload,
  AlertTriangle,
  Lock,
  Archive,
  Cloud,
  Clock,
  Trash2,
  RefreshCw,
  FileDown,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  importBackup,
  getBackupList,
  getBackupConfig,
  createManualBackup,
  deleteBackup,
  downloadBackupFile,
} from "../../api/backup";
import ConfirmDialog from "../ConfirmDialog";

const BackupTab = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dbType, setDbType] = useState(null);

  // Dialog State
  const [dialog, setDialog] = useState({
    open: false,
    type: "info",
    title: "",
    onConfirm: () => {},
  });
  const [password, setPassword] = useState("");
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [backupFormat, setBackupFormat] = useState("sql"); // sql or dump

  useEffect(() => {
    loadBackups();
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const config = await getBackupConfig();
      setDbType(config.db_type);
    } catch (e) {
      console.error("Failed to load backup config");
    }
  };

  const closeDialog = () => {
    setDialog({ ...dialog, open: false });
    setPassword("");
    setIsEncrypted(false);
    setBackupFormat("sql");
  };

  const loadBackups = async () => {
    try {
      setLoading(true);
      const data = await getBackupList();
      setBackups(data);
    } catch (e) {
      console.error("Failed to load backups");
    } finally {
      setLoading(false);
    }
  };

  // ... (rest of the code until around line 243)

  {
    /* FORMAT SELECTION */
  }
  {
    dbType === "sqlite" ? (
      <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <label className="text-xs font-semibold uppercase text-gray-500 tracking-wider">
          Backup Format
        </label>
        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700">
            .db
          </span>
          <span>SQLite Database File (Direct Copy)</span>
        </div>
      </div>
    ) : (
      <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <label className="text-xs font-semibold uppercase text-gray-500 tracking-wider">
          Backup Format
        </label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="format"
              value="sql"
              checked={backupFormat === "sql"}
              onChange={(e) => setBackupFormat(e.target.value)}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Plain SQL (.sql)
            </span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="format"
              value="dump"
              checked={backupFormat === "dump"}
              onChange={(e) => setBackupFormat(e.target.value)}
              className="text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Binary (.dump)
            </span>
          </label>
        </div>
      </div>
    );
  }

  // --- CREATE BACKUP ---
  const openCreateDialog = () => {
    setDialog({
      open: true,
      type: "info",
      title: "Create New Backup",
      mode: "create",
      // onConfirm removed to prevent stale closures
    });
  };

  const handleCreateConfirm = async () => {
    // Capture state before closing dialog to avoid race conditions/resets
    const currentPassword = password;
    const currentIsEncrypted = isEncrypted;
    const currentFormat = backupFormat;

    if (currentIsEncrypted && !currentPassword) {
      toast.error("Password is required for encryption");
      return;
    }

    closeDialog();
    const toastId = toast.loading("Creating backup...");
    try {
      const data = await createManualBackup(
        currentIsEncrypted ? currentPassword : null,
        currentFormat
      );
      toast.success("Backup created successfully!", { id: toastId });
      loadBackups();

      // Auto-download the newly created file
      handleDownloadBackup(data.filename);
    } catch (e) {
      toast.error("Failed to create backup", { id: toastId });
    }
  };

  // --- RESTORE BACKUP ---
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file seems encrypted
    const needsPassword = file.name.endsWith(".enc");
    setIsEncrypted(needsPassword);

    setDialog({
      open: true,
      type: "danger",
      title: "Restore Database",
      mode: "restore",
      file: file,
      needsPassword: needsPassword,
      // onConfirm removed
    });

    // Reset input so same file can be selected again if cancelled
    e.target.value = null;
  };

  const handleRestoreConfirm = async (file, needsPassword) => {
    // If password input is active in dialog, read from state `password`
    // Use params if passed, or fall back to dialog state if accessed via wrapper
    const validFile = file || dialog.file;
    const validNeedsPassword =
      needsPassword !== undefined ? needsPassword : dialog.needsPassword;

    if (validNeedsPassword && !password) {
      toast.error("Decryption password is required");
      return;
    }

    closeDialog();
    const toastId = toast.loading("Restoring database...");
    try {
      await importBackup(validFile, password);
      toast.success("Restored successfully! Reloading...", { id: toastId });
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Restore failed", {
        id: toastId,
      });
    }
  };

  const handleDownloadBackup = async (filename) => {
    const toastId = toast.loading("Downloading...");
    try {
      const blob = await downloadBackupFile(filename);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.dismiss(toastId);
    } catch {
      toast.error("Failed to download", { id: toastId });
    }
  };

  // --- DELETE BACKUP ---
  const openDeleteDialog = (filename) => {
    setDialog({
      open: true,
      type: "danger",
      title: "Delete Backup",
      mode: "delete",
      message: `Are you sure you want to delete ${filename}? This action cannot be undone.`,
      filename: filename, // Store filename
    });
  };

  const handleDeleteConfirm = async (filename) => {
    closeDialog();
    try {
      await deleteBackup(filename);
      toast.success("Backup deleted");
      loadBackups();
    } catch {
      toast.error("Failed to delete");
    }
  };

  // Dispatcher to handle confirmation based on mode
  const handleDialogConfirm = () => {
    if (dialog.mode === "create") {
      handleCreateConfirm();
    } else if (dialog.mode === "restore") {
      handleRestoreConfirm(dialog.file, dialog.needsPassword);
    } else if (dialog.mode === "delete") {
      handleDeleteConfirm(dialog.filename);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HER MODAL RENDER */}
      <ConfirmDialog
        open={dialog.open}
        type={dialog.type}
        title={dialog.title}
        message={dialog.message}
        onCancel={closeDialog}
        onConfirm={handleDialogConfirm}
        confirmLabel={
          dialog.mode === "delete"
            ? "Delete"
            : dialog.mode === "restore"
            ? "Restore Data"
            : "Create Backup"
        }
      >
        {/* Custom Content for Create */}
        {dialog.mode === "create" && (
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              Create a snapshot of your current database. You can optionally
              encrypt this file.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="encrypt"
                checked={isEncrypted}
                onChange={(e) => setIsEncrypted(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label
                htmlFor="encrypt"
                className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
              >
                Encrypt Backup with Password
              </label>
            </div>

            {/* FORMAT SELECTION */}
            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700">
              <label className="text-xs font-semibold uppercase text-gray-500 tracking-wider">
                Backup Format
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value="sql"
                    checked={backupFormat === "sql"}
                    onChange={(e) => setBackupFormat(e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Plain SQL (.sql)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value="dump"
                    checked={backupFormat === "dump"}
                    onChange={(e) => setBackupFormat(e.target.value)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Binary (.dump)
                  </span>
                </label>
              </div>
            </div>

            {isEncrypted && (
              <input
                type="password"
                placeholder="Enter Encryption Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                autoFocus
              />
            )}
          </div>
        )}

        {/* Custom Content for Restore */}
        {dialog.mode === "restore" && (
          <div className="space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800 text-sm text-red-700 dark:text-red-300">
              <strong>Warning:</strong> This action will <u>overwrite</u> your
              existing database. All current data will be lost.
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              File:{" "}
              <span className="font-mono font-medium">{dialog.file?.name}</span>
            </div>

            {dialog.needsPassword && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  File is encrypted. Enter password:
                </label>
                <input
                  type="password"
                  placeholder="Decryption Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  autoFocus
                />
              </div>
            )}
          </div>
        )}
      </ConfirmDialog>

      {/* Hero Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Backup Card */}
        <div className="bg-gradient-to-br from-blue-50 to-white dark:from-gray-800 dark:to-gray-900 p-6 rounded-2xl border border-blue-100 dark:border-gray-700 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Archive size={100} className="text-blue-500" />
          </div>
          <div className="relative z-10">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Archive className="text-blue-600" size={20} />
              Create Backup
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 mb-6">
              Create a secure copy of your database. You can optionally encrypt
              it with a password.
            </p>
            <button
              onClick={openCreateDialog}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
            >
              <RefreshCw size={18} />
              Create New Backup
            </button>
          </div>
        </div>

        {/* Restore Card */}
        <div className="bg-gradient-to-br from-amber-50 to-white dark:from-gray-800 dark:to-gray-900 p-6 rounded-2xl border border-amber-100 dark:border-gray-700 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Upload size={100} className="text-amber-500" />
          </div>
          <div className="relative z-10">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Upload className="text-amber-600" size={20} />
              Restore Database
            </h3>
            <div className="mt-2 mb-4 bg-amber-100/50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-700/50">
              <p className="text-xs text-amber-800 dark:text-amber-200 flex gap-2">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                Warning: Restoring will replace all current data.
              </p>
            </div>
            <label className="inline-flex cursor-pointer bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors items-center gap-2">
              <FileDown size={18} />
              Select Backup File
              <input
                type="file"
                className="hidden"
                accept=".sql,.enc,.db,.dump"
                onChange={handleFileSelect}
              />
            </label>
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[400px]">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Clock size={20} className="text-gray-500" />
              Backup History
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Server-side backups. Automated daily at 2:00 AM.
            </p>
          </div>
          <button
            onClick={loadBackups}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow"
            title="Refresh List"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 dark:bg-gray-900/50 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700 sticky top-0 backdrop-blur-sm z-10">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider">
                  Filename
                </th>
                <th className="px-6 py-4 font-semibold tracking-wider">Type</th>
                <th className="px-6 py-4 font-semibold tracking-wider">
                  Created
                </th>
                <th className="px-6 py-4 font-semibold tracking-wider">Size</th>
                <th className="px-6 py-4 font-semibold tracking-wider text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {backups.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400 dark:text-gray-500">
                      <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                        <Archive size={32} className="opacity-50" />
                      </div>
                      <p className="text-base font-medium text-gray-600 dark:text-gray-300">
                        No backups found
                      </p>
                      <p className="text-sm mt-1">
                        Create a manual backup or wait for the daily
                        auto-backup.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                backups.map((b) => {
                  const isAuto = b.filename.startsWith("auto_");
                  const isDump =
                    b.filename.endsWith(".dump") ||
                    b.filename.includes(".dump");
                  const isEnc = b.is_encrypted;

                  return (
                    <tr
                      key={b.filename}
                      className="group hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors duration-200"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm ${
                              isDump
                                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                                : "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                            }`}
                          >
                            {isDump ? (
                              <Archive size={20} />
                            ) : (
                              <FileDown size={20} />
                            )}
                          </div>
                          <div>
                            <p
                              className="font-medium text-gray-900 dark:text-white truncate max-w-[200px] sm:max-w-xs"
                              title={b.filename}
                            >
                              {b.filename}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {isAuto && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800 uppercase tracking-wide">
                                  Auto
                                </span>
                              )}
                              {isEnc && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-800">
                                  <Lock size={10} /> Encrypted
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-md border ${
                            isDump
                              ? "bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800"
                              : "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800"
                          }`}
                        >
                          {isDump ? "BINARY DUMP" : "SQL TEXT"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300 text-sm">
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {new Date(b.created_at).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(b.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300 font-mono text-sm">
                        {(b.size / 1024 / 1024).toFixed(2)} MB
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <button
                            onClick={() => handleDownloadBackup(b.filename)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/20 rounded-lg transition-all"
                            title="Download"
                          >
                            <Download size={18} />
                          </button>
                          <button
                            onClick={() => openDeleteDialog(b.filename)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BackupTab;
