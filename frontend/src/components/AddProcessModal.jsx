import { useState, useEffect } from "react";
import { X, Save, Trash2, Edit2, Power } from "lucide-react";
import toast from "react-hot-toast";
import { createProcess, updateProcess, deleteProcess } from "../api/processes";

export default function AddProcessModal({
  open,
  onClose,
  onSuccess,
  existingProcesses = [],
}) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [localProcesses, setLocalProcesses] = useState([]);

  useEffect(() => {
    setLocalProcesses(existingProcesses);
  }, [existingProcesses]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (editingId) {
        // Update existing
        const updated = await updateProcess(editingId, { name });
        toast.success("Process updated successfully");

        // Update local list
        const newList = localProcesses.map((p) =>
          p.id === editingId ? updated : p
        );
        setLocalProcesses(newList);
        onSuccess(updated); // Pass back updated item
        setEditingId(null);
      } else {
        // Create new
        const newProcess = await createProcess({ name, is_active: true });
        toast.success("Process created successfully");

        // Update local list
        const newList = [...localProcesses, newProcess];
        setLocalProcesses(newList);
        onSuccess(newProcess);
      }
      setName("");
    } catch (err) {
      toast.error(
        editingId ? "Failed to update process" : "Failed to create process"
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (process) => {
    setName(process.name);
    setEditingId(process.id);
  };

  const handleCancelEdit = () => {
    setName("");
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this process?"))
      return;
    try {
      await deleteProcess(id);
      toast.success("Process deleted");
      const newList = localProcesses.filter((p) => p.id !== id);
      setLocalProcesses(newList);
      // We might want to trigger a refresh in the parent, but for now local update is good visual feedback
    } catch (err) {
      toast.error("Failed to delete process");
    }
  };

  const handleToggleStatus = async (process) => {
    try {
      const updated = await updateProcess(process.id, {
        ...process,
        is_active: !process.is_active,
      });
      toast.success(
        `Process ${updated.is_active ? "activated" : "deactivated"}`
      );
      const newList = localProcesses.map((p) =>
        p.id === process.id ? updated : p
      );
      setLocalProcesses(newList);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <h2 className="text-lg font-bold dark:text-white">
            Manage Processes
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition"
          >
            <X size={18} className="dark:text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                {editingId ? "Edit Process Name" : "New Process Name"}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                placeholder="e.g. Casting"
                required
              />
            </div>
            <div className="flex gap-1">
              {editingId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 transition"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-lg shadow-blue-600/20 disabled:opacity-70 transition flex items-center gap-1"
              >
                <Save size={14} />
                {editingId ? "Update" : "Add"}
              </button>
            </div>
          </form>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <label className="block text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 sticky top-0 bg-white dark:bg-gray-800 py-2">
            Existing Processes ({localProcesses.length})
          </label>
          <div className="space-y-2">
            {localProcesses.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4 italic">
                No processes found.
              </p>
            ) : (
              localProcesses.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 hover:border-blue-100 dark:hover:border-blue-900/30 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        p.is_active ? "bg-green-500" : "bg-red-500"
                      }`}
                      title={p.is_active ? "Active" : "Inactive"}
                    ></div>
                    <span
                      className={`text-sm font-medium ${
                        p.is_active
                          ? "text-gray-700 dark:text-gray-200"
                          : "text-gray-400 dark:text-gray-500 line-through"
                      }`}
                    >
                      {p.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleToggleStatus(p)}
                      className={`p-1.5 rounded-lg transition ${
                        p.is_active
                          ? "text-green-600 hover:bg-green-50"
                          : "text-gray-400 hover:bg-gray-100"
                      }`}
                      title={p.is_active ? "Deactivate" : "Activate"}
                    >
                      <Power size={14} />
                    </button>
                    <button
                      onClick={() => handleEdit(p)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition"
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
