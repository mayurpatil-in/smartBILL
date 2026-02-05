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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <ClipboardCheck
                  className="text-blue-600 dark:text-blue-400"
                  size={24}
                />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  PDI Report
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Challan #{challan?.challan_number}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Inspector Name
                </label>
                <input
                  type="text"
                  value={formData.inspector_name}
                  onChange={(e) =>
                    setFormData({ ...formData, inspector_name: e.target.value })
                  }
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Enter Name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Inspection Date
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
                  className="w-full px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 font-medium border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-4 py-3">Inspection Point</th>
                    <th className="px-4 py-3 w-[200px]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {Object.keys(formData.checklist).map((key) => (
                    <tr
                      key={key}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {key}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {["Pass", "Fail", "NA"].map((status) => (
                            <label
                              key={status}
                              className={`
                                                        px-2 py-1 rounded-md text-xs font-bold cursor-pointer transition-all border
                                                        ${
                                                          formData.checklist[
                                                            key
                                                          ] === status
                                                            ? status === "Pass"
                                                              ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                                                              : status ===
                                                                  "Fail"
                                                                ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                                                                : "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:border-gray-600"
                                                            : "bg-white text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
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

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 rounded-xl text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <div className="flex items-center gap-3">
                {report && (
                  <button
                    type="button"
                    onClick={handlePrint}
                    disabled={loading}
                    className="flex items-center gap-2 px-6 py-2 rounded-xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-medium border border-purple-200 dark:border-purple-800 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors disabled:opacity-50"
                  >
                    <Printer size={18} />
                    Print PDF
                  </button>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-medium hover:from-blue-700 hover:to-indigo-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
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
