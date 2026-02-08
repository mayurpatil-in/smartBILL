import { useState, useEffect } from "react";
import {
  X,
  CheckCircle,
  AlertCircle,
  Printer,
  Save,
  ClipboardCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  createPDIReport,
  getPDIByChallanId,
  updatePDIReport,
  printPDIReport,
} from "../api/pdi";

export default function PDIReportModal({ isOpen, onClose, challan }) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [formData, setFormData] = useState({
    inspector_name: "",
    inspection_date: new Date().toISOString().split("T")[0],
    checklist: {
      "Physical Condition (Scratches/Dents)": "Pass",
      "Quantity Verification": "Pass",
      "Packaging Condition": "Pass",
      "Accessories Check": "Pass",
      "Functional Test": "Pass",
    },
    remarks: "",
    status: "Pass",
  });

  useEffect(() => {
    if (isOpen && challan) {
      fetchReport();
    } else {
      // Reset form when closed or no challan
      setReport(null);
      setFormData({
        inspector_name: "",
        inspection_date: new Date().toISOString().split("T")[0],
        checklist: {
          "Physical Condition (Scratches/Dents)": "Pass",
          "Quantity Verification": "Pass",
          "Packaging Condition": "Pass",
          "Accessories Check": "Pass",
          "Functional Test": "Pass",
        },
        remarks: "",
        status: "Pass",
      });
    }
  }, [isOpen, challan]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const data = await getPDIByChallanId(challan.id);
      setReport(data);
      setFormData({
        inspector_name: data.inspector_name || "",
        inspection_date:
          data.inspection_date || new Date().toISOString().split("T")[0],
        checklist: data.checklist || {},
        remarks: data.remarks || "",
        status: data.status || "Pass",
      });
    } catch (err) {
      if (err.response?.status !== 404) {
        toast.error("Failed to fetch PDI report");
      }
      // If 404, it just means no report exists yet, which is fine
    } finally {
      setLoading(false);
    }
  };

  const handleChecklistChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [key]: value,
      },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.inspector_name) {
      toast.error("Inspector Name is required");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        challan_id: challan.id,
      };

      if (report) {
        await updatePDIReport(report.id, payload);
        toast.success("PDI Report updated successfully");
      } else {
        const newReport = await createPDIReport(payload);
        setReport(newReport);
        toast.success("PDI Report created successfully");
      }
      // Refresh report data
      await fetchReport();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.detail || "Failed to save PDI report");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!report) return;
    try {
      const loadingToast = toast.loading("Generating PDF...");
      const blob = await printPDIReport(report.id);
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" }),
      );
      window.open(url, "_blank");
      toast.success("PDF generated", { id: loadingToast });
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Header with Gradient */}
        <div className="relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <ClipboardCheck size={24} className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">PDI Report</h2>
                <p className="text-blue-100 text-sm mt-0.5">
                  Challan #{challan?.challan_number}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-full transition-all duration-200"
            >
              <X size={22} className="text-white" />
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Inspector Info Section */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-4 border-2 border-blue-200 dark:border-blue-800">
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-4 flex items-center gap-2">
                <div className="p-1.5 bg-blue-600 rounded-lg">
                  <ClipboardCheck size={14} className="text-white" />
                </div>
                Inspection Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Inspector Name *
                  </label>
                  <input
                    type="text"
                    value={formData.inspector_name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        inspector_name: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all font-medium"
                    placeholder="Enter inspector name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                    Inspection Date *
                  </label>
                  <input
                    type="date"
                    value={formData.inspection_date}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        inspection_date: e.target.value,
                      })
                    }
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all font-medium"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Checklist Section */}
            <div>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide mb-3 flex items-center gap-2">
                <div className="p-1.5 bg-indigo-600 rounded-lg">
                  <CheckCircle size={14} className="text-white" />
                </div>
                Inspection Checklist
              </h3>

              <div className="border-2 border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold">
                    <tr>
                      <th className="px-4 py-4">Inspection Point</th>
                      <th className="px-4 py-4 w-[220px]">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {Object.keys(formData.checklist).map((key) => (
                      <tr
                        key={key}
                        className="hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/30 dark:hover:from-blue-900/10 dark:hover:to-purple-900/10 transition-all"
                      >
                        <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white">
                          {key}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            {["Pass", "Fail", "NA"].map((status) => (
                              <label
                                key={status}
                                className={`
                                                        px-3 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all border-2 flex-1 text-center
                                                        ${
                                                          formData.checklist[
                                                            key
                                                          ] === status
                                                            ? status === "Pass"
                                                              ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white border-green-600 shadow-lg shadow-green-500/30"
                                                              : status ===
                                                                  "Fail"
                                                                ? "bg-gradient-to-r from-red-500 to-rose-600 text-white border-red-600 shadow-lg shadow-red-500/30"
                                                                : "bg-gradient-to-r from-gray-500 to-gray-600 text-white border-gray-600 shadow-lg shadow-gray-500/30"
                                                            : "bg-white text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                                                        }
                                                    `}
                              >
                                <input
                                  type="radio"
                                  name={`checklist-${key}`}
                                  value={status}
                                  checked={formData.checklist[key] === status}
                                  onChange={() =>
                                    handleChecklistChange(key, status)
                                  }
                                  className="hidden"
                                />
                                {status}
                              </label>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) =>
                  setFormData({ ...formData, remarks: e.target.value })
                }
                className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all min-h-[80px]"
                placeholder="Additional observations..."
              />
            </div>

            <div className="flex items-center gap-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Overall Status:
              </label>
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    checked={formData.status === "Pass"}
                    onChange={() =>
                      setFormData({ ...formData, status: "Pass" })
                    }
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Pass
                  </span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    checked={formData.status === "Fail"}
                    onChange={() =>
                      setFormData({ ...formData, status: "Fail" })
                    }
                    className="text-red-600 focus:ring-red-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Fail
                  </span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    checked={formData.status === "Pending"}
                    onChange={() =>
                      setFormData({ ...formData, status: "Pending" })
                    }
                    className="text-amber-600 focus:ring-amber-500"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Pending
                  </span>
                </label>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-6 border-t-2 border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700 font-semibold transition-all border-2 border-gray-300 dark:border-gray-600"
              >
                Cancel
              </button>
              <div className="flex items-center gap-3">
                {report && (
                  <button
                    type="button"
                    onClick={handlePrint}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:scale-105 transition-all duration-200 disabled:opacity-50"
                  >
                    <Printer size={18} />
                    Print PDF
                  </button>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:via-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 hover:scale-105 transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save size={18} />
                      Save Report
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
