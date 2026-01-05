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
  createManualBackup,
  deleteBackup,
  downloadBackupFile,
} from "../../api/backup";
import ConfirmDialog from "../ConfirmDialog";

const BackupTab = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);

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
  }, []);

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

  // --- CREATE BACKUP ---
  const openCreateDialog = () => {
    setDialog({
      open: true,
      type: "info",
      title: "Create New Backup",
      mode: "create", // Custom mode to render specific children
      onConfirm: () => handleCreateConfirm(),
    });
  };

  const handleCreateConfirm = async () => {
    if (isEncrypted && !password) {
      toast.error("Password is required for encryption");
      return;
    }

    closeDialog();
    const toastId = toast.loading("Creating backup...");
    try {
      const data = await createManualBackup(
        isEncrypted ? password : null,
        backupFormat
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
      onConfirm: () => handleRestoreConfirm(file, needsPassword),
    });

    // Reset input so same file can be selected again if cancelled
    e.target.value = null;
  };

  const handleRestoreConfirm = async (file, needsPassword) => {
    // If password input is active in dialog, read from state `password`
    if (needsPassword && !password) {
      toast.error("Decryption password is required");
      return;
    }

    closeDialog();
    const toastId = toast.loading("Restoring database...");
    try {
      await importBackup(file, password);
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
      onConfirm: () => handleDeleteConfirm(filename),
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* HER MODAL RENDER */}
      <ConfirmDialog
        open={dialog.open}
        type={dialog.type}
        title={dialog.title}
        message={dialog.message}
        onCancel={closeDialog}
        onConfirm={dialog.onConfirm}
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
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
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
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Refresh List"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 dark:bg-gray-900/50 dark:text-gray-400">
              <tr>
                <th className="px-6 py-4">Filename</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4">Size</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {backups.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="px-6 py-8 text-center text-gray-400 italic"
                  >
                    No backups found on server.
                  </td>
                </tr>
              ) : (
                backups.map((b) => (
                  <tr
                    key={b.filename}
                    className="group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        {b.is_encrypted ? (
                          <Lock size={14} className="text-amber-500" />
                        ) : (
                          <FileDown size={14} className="text-blue-500" />
                        )}
                        {b.filename}
                        {b.filename.startsWith("auto_") && (
                          <span className="text-[10px] uppercase bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold border border-green-200">
                            Auto
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                      {new Date(b.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-gray-500 dark:text-gray-400 font-mono">
                      {(b.size / 1024).toFixed(1)} KB
                    </td>
                    <td className="px-6 py-4 text-right space-x-3 opacity-60 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDownloadBackup(b.filename)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-xs uppercase tracking-wide"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => openDeleteDialog(b.filename)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BackupTab;
