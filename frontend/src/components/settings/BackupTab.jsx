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
            {/* FORMAT SELECTION */}
            {dbType === "sqlite" ? (
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
            )}

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
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-cyan-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 p-8 rounded-3xl border border-blue-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-blue-400/20 to-cyan-400/20 dark:from-blue-500/10 dark:to-cyan-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-cyan-400/15 to-blue-400/15 dark:from-cyan-500/8 dark:to-blue-500/8 rounded-full blur-2xl -ml-16 -mb-16"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl shadow-lg shadow-blue-500/30">
                <Archive className="text-white" size={24} />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Create Backup
              </h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
              Create a secure snapshot of your database. Optionally encrypt it
              with a password for enhanced security.
            </p>
            <button
              onClick={openCreateDialog}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} />
              <span>Create New Backup</span>
            </button>
          </div>
        </div>

        {/* Restore Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-900 p-8 rounded-3xl border border-amber-200 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300 group">
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-amber-400/20 to-orange-400/20 dark:from-amber-500/10 dark:to-orange-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-500"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-orange-400/15 to-amber-400/15 dark:from-orange-500/8 dark:to-amber-500/8 rounded-full blur-2xl -ml-16 -mb-16"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-500/30">
                <Upload className="text-white" size={24} />
              </div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Restore Database
              </h3>
            </div>
            <div className="mb-6 bg-amber-100/80 dark:bg-amber-900/30 p-4 rounded-xl border border-amber-200 dark:border-amber-700/50 backdrop-blur-sm">
              <p className="text-xs text-amber-800 dark:text-amber-200 flex gap-2 font-medium">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>Warning: Restoring will replace all current data.</span>
              </p>
            </div>
            <label className="w-full inline-flex cursor-pointer bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600 px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 hover:border-gray-400 dark:hover:border-gray-500 transition-all duration-300 items-center justify-center gap-2 shadow-md hover:shadow-lg">
              <FileDown size={18} />
              <span>Select Backup File</span>
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
      <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden flex-1 flex flex-col min-h-[400px]">
        <div className="p-8 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-gray-600 to-gray-800 dark:from-gray-700 dark:to-gray-900 rounded-xl shadow-lg">
              <Clock size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                Backup History
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Server-side backups • Automated daily at 2:00 AM
              </p>
            </div>
          </div>
          <button
            onClick={loadBackups}
            className="p-3 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 shadow-md hover:shadow-lg hover:scale-105"
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
                      className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-cyan-50/30 dark:hover:from-blue-900/10 dark:hover:to-cyan-900/5 transition-all duration-300"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div
                            className={`relative w-12 h-12 rounded-xl flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300 ${
                              isDump
                                ? "bg-gradient-to-br from-purple-500 to-pink-600 text-white"
                                : "bg-gradient-to-br from-blue-500 to-cyan-600 text-white"
                            }`}
                          >
                            {isDump ? (
                              <Archive size={22} />
                            ) : (
                              <FileDown size={22} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className="font-bold text-gray-900 dark:text-white truncate max-w-[250px] sm:max-w-md text-sm"
                              title={b.filename}
                            >
                              {b.filename}
                            </p>
                            <div className="flex items-center gap-2 mt-1.5">
                              {isAuto && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-sm uppercase tracking-wider">
                                  AUTO
                                </span>
                              )}
                              {!isAuto && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-sm uppercase tracking-wider">
                                  MANUAL
                                </span>
                              )}
                              {isEnc && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-gradient-to-r from-amber-100 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30 px-2 py-0.5 rounded-lg border border-amber-300 dark:border-amber-700 shadow-sm">
                                  <Lock size={10} /> ENCRYPTED
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center text-xs font-black px-3 py-1.5 rounded-xl shadow-md uppercase tracking-wider ${
                            isDump
                              ? "bg-gradient-to-r from-purple-500 to-pink-600 text-white"
                              : "bg-gradient-to-r from-blue-500 to-cyan-600 text-white"
                          }`}
                        >
                          {isDump ? "BINARY" : "SQL"}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-gray-700 dark:text-gray-200 text-sm">
                        <div className="flex flex-col">
                          <span className="font-bold">
                            {new Date(b.created_at).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {new Date(b.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-gray-700 dark:text-gray-200 font-mono text-sm font-bold">
                        {(b.size / 1024 / 1024).toFixed(2)} MB
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDownloadBackup(b.filename)}
                            className="p-2.5 text-white bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-110 duration-200"
                            title="Download"
                          >
                            <Download size={18} />
                          </button>
                          <button
                            onClick={() => openDeleteDialog(b.filename)}
                            className="p-2.5 text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 rounded-xl transition-all shadow-md hover:shadow-lg hover:scale-110 duration-200"
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
