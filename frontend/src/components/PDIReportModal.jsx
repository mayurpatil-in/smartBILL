import { useState, useEffect, Fragment } from "react";
import {
  X,
  Printer,
  Save,
  ClipboardCheck,
  Ruler,
  FileText,
  Package,
  Calendar,
  User,
  FileCheck,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  createPDIReport,
  getPDIByChallanId,
  updatePDIReport,
  printPDIReport,
  getPDIReportHtml,
} from "../api/pdi";
import { getItem } from "../api/items";

export default function PDIReportModal({ isOpen, onClose, challan }) {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [itemConfig, setItemConfig] = useState(null);
  const [formData, setFormData] = useState({
    inspector_name: "",
    inspection_date: new Date().toISOString().split("T")[0],
    parameters_data: {},
    dimensions_data: {},
    remarks: "",
    status: "Pass",
  });

  useEffect(() => {
    if (isOpen && challan) {
      fetchData();
    } else {
      resetForm();
    }
  }, [isOpen, challan]);

  const resetForm = () => {
    setReport(null);
    setItemConfig(null);
    setFormData({
      inspector_name: "",
      inspection_date: new Date().toISOString().split("T")[0],
      parameters_data: {},
      dimensions_data: {},
      remarks: "",
      status: "Pass",
    });
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      let existingReport = null;
      try {
        existingReport = await getPDIByChallanId(challan.id);
        setReport(existingReport);
      } catch (err) {
        // Report doesn't exist yet
      }

      if (challan.items && challan.items.length > 0) {
        const firstItem = challan.items[0];
        try {
          const itemId =
            firstItem.item_id || (firstItem.item ? firstItem.item.id : null);

          if (itemId) {
            const itemData = await getItem(itemId);
            setItemConfig(itemData);

            if (!existingReport) {
              setFormData((prev) => ({
                ...prev,
                parameters_data: itemData.pdi_parameters
                  ? itemData.pdi_parameters.reduce(
                      (acc, p) => ({ ...acc, [p.name]: "" }),
                      { "Part No": itemData.part_no || "" },
                    )
                  : { "Part No": itemData.part_no || "" },
                dimensions_data: itemData.pdi_dimensions
                  ? itemData.pdi_dimensions.reduce(
                      (acc, d) => ({ ...acc, [d.name]: "" }),
                      {},
                    )
                  : {},
              }));
            }
          }
        } catch (err) {
          console.error("Failed to fetch item details", err);
        }
      }

      if (existingReport) {
        setFormData({
          inspector_name: existingReport.inspector_name || "",
          inspection_date:
            existingReport.inspection_date ||
            new Date().toISOString().split("T")[0],
          parameters_data: existingReport.parameters_data || {},
          dimensions_data: existingReport.dimensions_data || {},
          remarks: existingReport.remarks || "",
          status: existingReport.status || "Pass",
        });
      }
    } catch (err) {
      console.error("Error fetching data", err);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleParameterChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      parameters_data: { ...prev.parameters_data, [key]: value },
    }));
  };

  const handleDimensionChange = (key, value) => {
    setFormData((prev) => ({
      ...prev,
      dimensions_data: { ...prev.dimensions_data, [key]: value },
    }));
  };

  const getDimensionValue = (dimName, index, suffix = "") => {
    const specificKey = `${dimName}__${index}${suffix}`;
    if (formData.dimensions_data[specificKey] !== undefined) {
      return formData.dimensions_data[specificKey];
    }
    const genericKey = `${dimName}${suffix}`;
    return formData.dimensions_data[genericKey] || "";
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
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save PDI report");
    } finally {
      setLoading(false);
    }
  };

  const handlePrintHtml = async () => {
    if (!report) return;
    try {
      const loadingToast = toast.loading("Loading HTML view...");
      const htmlContent = await getPDIReportHtml(report.id);

      const newWindow = window.open("", "_blank");
      if (newWindow) {
        newWindow.document.write(htmlContent);
        newWindow.document.close();
        toast.success("Report opened", { id: loadingToast });
      } else {
        toast.error("Popup blocked. Please allow popups.", {
          id: loadingToast,
        });
      }
    } catch (err) {
      console.error("Failed to load HTML report", err);
      toast.error("Failed to load HTML view");
    }
  };

  const handlePrint = async () => {
    if (!report) return;
    const loadingToast = toast.loading("Generating PDF...");
    try {
      const blob = await printPDIReport(report.id);
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" }),
      );
      window.open(url, "_blank");
      toast.success("Report opened for printing", { id: loadingToast });
    } catch (error) {
      console.error("Failed to print PDI report", error);
      toast.error("PDF Failed. Opening HTML view...", { id: loadingToast });
      handlePrintHtml();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[98vh] sm:max-h-[95vh]">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 px-4 sm:px-6 md:px-8 py-4 sm:py-5 md:py-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <div className="p-2 sm:p-2.5 md:p-3 bg-white/20 backdrop-blur-md rounded-lg sm:rounded-xl shadow-lg border border-white/20">
                <ClipboardCheck
                  size={24}
                  className="text-white sm:w-7 sm:h-7 md:w-8 md:h-8"
                />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
                  PDI Report
                </h2>
                <p className="text-blue-100 text-xs sm:text-sm md:text-base font-medium mt-0.5 sm:mt-1 opacity-95">
                  {challan?.challan_number
                    ? `Challan #${challan.challan_number}`
                    : "New Inspection"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 sm:p-2.5 md:p-3 bg-white/10 hover:bg-white/20 rounded-lg sm:rounded-xl transition-all duration-200 backdrop-blur-sm border border-white/10 group"
            >
              <X
                size={20}
                className="text-white group-hover:rotate-90 transition-transform duration-300"
              />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-6 space-y-4 sm:space-y-5 md:space-y-6 custom-scrollbar bg-gray-50 dark:bg-gray-900">
          {/* Item Info Card */}
          {itemConfig && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 border-2 border-blue-100 dark:border-blue-900 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-0 mb-3 sm:mb-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Package size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-1">
                      Item Details
                    </p>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                      {itemConfig.name}
                    </h3>
                  </div>
                </div>
                <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs sm:text-sm font-bold rounded-lg shadow-md">
                  <div className="flex items-center gap-2">
                    <Package size={16} />
                    <span>Qty: {challan?.items?.[0]?.quantity || 0}</span>
                  </div>
                </div>
              </div>

              {itemConfig.pdi_equipment &&
                itemConfig.pdi_equipment.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-400 flex items-center gap-1">
                      <Ruler size={14} />
                      Equipment:
                    </span>
                    {itemConfig.pdi_equipment.map((eq, i) => (
                      <span
                        key={i}
                        className="px-3 py-1 bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-800 rounded-lg text-xs text-gray-700 dark:text-gray-300 font-semibold shadow-sm"
                      >
                        {eq}
                      </span>
                    ))}
                  </div>
                )}
            </div>
          )}

          {/* Basic Details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
              <FileCheck size={16} />
              Inspection Details
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Package size={14} />
                  Part No
                </label>
                <input
                  type="text"
                  name="part_no"
                  id="part_no"
                  value={formData.parameters_data["Part No"] || ""}
                  onChange={(e) =>
                    handleParameterChange("Part No", e.target.value)
                  }
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium"
                  placeholder="Enter Part No"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <User size={14} />
                  Inspector Name
                </label>
                <input
                  type="text"
                  name="inspector_name"
                  id="inspector_name"
                  value={formData.inspector_name}
                  onChange={(e) =>
                    setFormData({ ...formData, inspector_name: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium"
                  placeholder="Enter inspector name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Calendar size={14} />
                  Inspection Date
                </label>
                <input
                  type="date"
                  name="inspection_date"
                  id="inspection_date"
                  value={formData.inspection_date}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      inspection_date: e.target.value,
                    })
                  }
                  className="w-full px-4 py-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all font-medium"
                />
              </div>
            </div>
          </div>

          {/* Document Reference Details */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4 flex items-center gap-2">
              <FileText size={16} />
              Document Reference
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400">
                  Doc. Ref No.
                </label>
                <input
                  type="text"
                  name="doc_ref_no"
                  id="doc_ref_no"
                  value={formData.parameters_data["Doc Ref No"] || ""}
                  onChange={(e) =>
                    handleParameterChange("Doc Ref No", e.target.value)
                  }
                  className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="Doc Ref No"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400">
                  Rev. No.
                </label>
                <input
                  type="text"
                  name="rev_no"
                  id="rev_no"
                  value={formData.parameters_data["Rev No"] || ""}
                  onChange={(e) =>
                    handleParameterChange("Rev No", e.target.value)
                  }
                  className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="Rev No"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400">
                  Rev. Date
                </label>
                <input
                  type="date"
                  name="rev_date"
                  id="rev_date"
                  value={formData.parameters_data["Rev Date"] || ""}
                  onChange={(e) =>
                    handleParameterChange("Rev Date", e.target.value)
                  }
                  className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 dark:text-gray-400">
                  Drg. Rev. No.
                </label>
                <input
                  type="text"
                  name="drg_rev_no"
                  id="drg_rev_no"
                  value={formData.parameters_data["Drg Rev No"] || ""}
                  onChange={(e) =>
                    handleParameterChange("Drg Rev No", e.target.value)
                  }
                  className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
                  placeholder="Drg Rev No"
                />
              </div>
            </div>
          </div>

          {/* Dimensions & Measurements */}
          {itemConfig &&
            itemConfig.pdi_dimensions &&
            itemConfig.pdi_dimensions.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl p-4 sm:p-5 md:p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-3 sm:mb-4">
                  <Ruler
                    size={18}
                    className="text-blue-600 dark:text-blue-400"
                  />
                  <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white">
                    Dimensions & Measurements
                  </h3>
                </div>
                <div className="overflow-x-auto rounded-lg border-2 border-gray-200 dark:border-gray-700 -mx-4 sm:mx-0">
                  <table className="w-full text-xs sm:text-sm text-center whitespace-nowrap">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 sticky top-0 z-10">
                      <tr>
                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 text-left sticky left-0 bg-gray-50 dark:bg-gray-900 z-20 border-r-2 border-gray-200 dark:border-gray-700 shadow-sm font-bold text-gray-700 dark:text-gray-300">
                          Dimension
                        </th>
                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border-r-2 border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300">
                          Specification
                        </th>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <th
                            key={i}
                            colSpan={2}
                            className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border-b-2 border-r-2 border-gray-200 dark:border-gray-700 font-bold text-gray-700 dark:text-gray-300"
                          >
                            Set {i}
                          </th>
                        ))}
                      </tr>
                      <tr>
                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 text-left sticky left-0 bg-gray-50 dark:bg-gray-900 z-20 border-r-2 border-gray-200 dark:border-gray-700 shadow-sm"></th>
                        <th className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 border-r-2 border-gray-200 dark:border-gray-700"></th>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Fragment key={i}>
                            <th className="px-2 sm:px-3 py-1.5 sm:py-2 min-w-[80px] sm:min-w-[100px] border-r border-gray-200 dark:border-gray-700 text-[10px] sm:text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30">
                              Sup-{i}
                            </th>
                            <th className="px-2 sm:px-3 py-1.5 sm:py-2 min-w-[80px] sm:min-w-[100px] border-r-2 border-gray-200 dark:border-gray-700 text-[10px] sm:text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30">
                              QC-{i}
                            </th>
                          </Fragment>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {itemConfig.pdi_dimensions.map((dim, index) => (
                        <tr
                          key={index}
                          className="hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-colors"
                        >
                          <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200 text-left sticky left-0 bg-white dark:bg-gray-800 z-10 border-r-2 border-gray-200 dark:border-gray-700">
                            {dim.name}
                          </td>
                          <td className="px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 md:py-3 text-gray-600 dark:text-gray-400 border-r-2 border-gray-200 dark:border-gray-700">
                            <span className="font-mono text-[10px] sm:text-xs bg-gray-100 dark:bg-gray-900 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded border border-gray-200 dark:border-gray-700">
                              {dim.specification} {dim.unit}
                            </span>
                          </td>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <Fragment key={i}>
                              <td className="px-2 py-2 border-r border-gray-200 dark:border-gray-700 bg-blue-50/30 dark:bg-blue-950/10">
                                <input
                                  type="text"
                                  name={`${dim.name}__${index}${
                                    i === 1 ? "" : `_sup_${i}`
                                  }`}
                                  id={`${dim.name}__${index}${
                                    i === 1 ? "" : `_sup_${i}`
                                  }`}
                                  value={getDimensionValue(
                                    dim.name,
                                    index,
                                    i === 1 ? "" : `_sup_${i}`,
                                  )}
                                  onChange={(e) =>
                                    handleDimensionChange(
                                      `${dim.name}__${index}${
                                        i === 1 ? "" : `_sup_${i}`
                                      }`,
                                      e.target.value,
                                    )
                                  }
                                  className="w-full px-1.5 sm:px-2 py-1.5 sm:py-2 text-xs sm:text-sm rounded-md border-2 border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none text-center font-medium transition-all"
                                  placeholder="-"
                                />
                              </td>
                              <td className="px-2 py-2 border-r-2 border-gray-200 dark:border-gray-700 bg-purple-50/30 dark:bg-purple-950/10">
                                <input
                                  type="text"
                                  name={`${dim.name}__${index}_qc_${i}`}
                                  id={`${dim.name}__${index}_qc_${i}`}
                                  value={getDimensionValue(
                                    dim.name,
                                    index,
                                    `_qc_${i}`,
                                  )}
                                  onChange={(e) =>
                                    handleDimensionChange(
                                      `${dim.name}__${index}_qc_${i}`,
                                      e.target.value,
                                    )
                                  }
                                  className="w-full px-1.5 sm:px-2 py-1.5 sm:py-2 text-xs sm:text-sm rounded-md border-2 border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 outline-none text-center font-medium transition-all"
                                  placeholder="-"
                                />
                              </td>
                            </Fragment>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          {/* Remarks */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
            <label className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3 block flex items-center gap-2">
              <FileText size={14} />
              Final Remarks
            </label>
            <textarea
              name="remarks"
              id="remarks"
              value={formData.remarks}
              onChange={(e) =>
                setFormData({ ...formData, remarks: e.target.value })
              }
              rows={4}
              className="w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-sm sm:text-base rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:bg-white dark:focus:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none font-medium"
              placeholder="Enter any additional observations or remarks..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-3 sm:py-4 md:py-5 bg-white dark:bg-gray-800 border-t-2 border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4 flex-shrink-0">
          <div className="flex items-center gap-3">
            <label className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300">
              Status:
            </label>
            <select
              name="status"
              id="status"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className={`px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 text-sm sm:text-base rounded-lg border-2 font-bold focus:outline-none focus:ring-2 transition-all ${
                formData.status === "Pass"
                  ? "border-green-300 bg-green-50 text-green-700 focus:ring-green-500/20"
                  : formData.status === "Fail"
                    ? "border-red-300 bg-red-50 text-red-700 focus:ring-red-500/20"
                    : "border-yellow-300 bg-yellow-50 text-yellow-700 focus:ring-yellow-500/20"
              }`}
            >
              <option value="Pass">✓ Pass</option>
              <option value="Fail">✗ Fail</option>
              <option value="Pending">⏳ Pending</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {report && (
              <>
                <button
                  type="button"
                  onClick={handlePrintHtml}
                  className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-bold transition-all border-2 border-gray-300 dark:border-gray-600 hover:shadow-md"
                >
                  <FileText size={16} className="sm:w-[18px] sm:h-[18px]" />
                  View HTML
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 text-sm sm:text-base bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg font-bold transition-all hover:shadow-md"
                >
                  <Printer size={16} className="sm:w-[18px] sm:h-[18px]" />
                  Print PDF
                </button>
              </>
            )}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 sm:px-8 py-2 sm:py-2.5 text-sm sm:text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-bold shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 transform hover:scale-105 transition-all disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
            >
              <Save size={16} className="sm:w-[18px] sm:h-[18px]" />
              {loading
                ? "Saving..."
                : report
                  ? "Update Report"
                  : "Create Report"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
