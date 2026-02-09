import { useState, useEffect } from "react";
import {
  X,
  Truck,
  FileText,
  MapPin,
  Building2,
  Hash,
  Calendar,
} from "lucide-react";
import api from "../api/axios";
import toast from "react-hot-toast";

export default function EWayBillModal({
  isOpen,
  onClose,
  invoiceId,
  invoiceData,
}) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    transport_mode: "Road",
    vehicle_number: "",
    transport_distance: "",
    transporter_id: "",
    vehicle_type: "Regular",
    transporter_doc_no: "",
    transporter_doc_date: "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({
        transport_mode: "Road",
        vehicle_number: "",
        transport_distance: "",
        transporter_id: "",
        vehicle_type: "Regular",
        transporter_doc_no: "",
        transporter_doc_date: "",
      });
      setErrors({});
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.vehicle_number.trim()) {
      newErrors.vehicle_number = "Vehicle number is required";
    }

    if (
      !formData.transport_distance ||
      Number(formData.transport_distance) <= 0
    ) {
      newErrors.transport_distance = "Distance must be greater than 0";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePreview = async () => {
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      const loadToast = toast.loading("Generating E-Way Bill preview...");

      // Prepare data with proper types
      const requestData = {
        ...formData,
        transport_distance: parseInt(formData.transport_distance, 10),
      };

      const response = await api.post(
        `/invoice/${invoiceId}/eway-bill/preview`,
        requestData,
        { responseType: "blob" },
      );

      toast.dismiss(loadToast);

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");

      toast.success("E-Way Bill preview generated!");
    } catch (error) {
      console.error("Failed to generate preview", error);
      toast.dismiss();
      const msg = error.response?.data?.detail || "Failed to generate preview";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndPrint = async () => {
    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      const loadToast = toast.loading("Saving transport details...");

      // Prepare data with proper types
      const requestData = {
        ...formData,
        transport_distance: parseInt(formData.transport_distance, 10),
      };

      // First, save the transport details
      await api.post(`/invoice/${invoiceId}/eway-bill`, requestData);

      toast.dismiss(loadToast);
      toast.loading("Generating E-Way Bill PDF...");

      // Then, generate and open the PDF
      const response = await api.get(`/invoice/${invoiceId}/eway-bill/print`, {
        responseType: "blob",
      });

      toast.dismiss();

      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");

      toast.success("E-Way Bill saved and generated successfully!");
      onClose();
    } catch (error) {
      console.error("Failed to save and print", error);
      toast.dismiss();
      const msg = error.response?.data?.detail || "Failed to save and print";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Truck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Generate E-Way Bill</h2>
              <p className="text-sm text-blue-100">
                Invoice: {invoiceData?.invoice_number} | Amount: ₹
                {invoiceData?.grand_total?.toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            disabled={loading}
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          {/* Transport Mode */}
          <div>
            <label
              htmlFor="transport_mode"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
            >
              <Truck size={16} className="inline mr-2" />
              Transport Mode *
            </label>
            <select
              id="transport_mode"
              name="transport_mode"
              value={formData.transport_mode}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all"
            >
              <option value="Road">Road</option>
              <option value="Rail">Rail</option>
              <option value="Air">Air</option>
              <option value="Ship">Ship</option>
            </select>
          </div>

          {/* Vehicle Number */}
          <div>
            <label
              htmlFor="vehicle_number"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
            >
              <Hash size={16} className="inline mr-2" />
              Vehicle Number *
            </label>
            <input
              type="text"
              id="vehicle_number"
              name="vehicle_number"
              value={formData.vehicle_number}
              onChange={handleChange}
              placeholder="e.g., MH12AB1234"
              className={`w-full px-4 py-3 rounded-xl border-2 ${
                errors.vehicle_number
                  ? "border-red-500 focus:ring-red-500/30"
                  : "border-gray-200 dark:border-gray-700 focus:ring-blue-500/30"
              } bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:border-blue-500 outline-none transition-all`}
            />
            {errors.vehicle_number && (
              <p className="text-red-500 text-sm mt-1">
                {errors.vehicle_number}
              </p>
            )}
          </div>

          {/* Vehicle Type */}
          <div>
            <label
              htmlFor="vehicle_type"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
            >
              Vehicle Type
            </label>
            <select
              id="vehicle_type"
              name="vehicle_type"
              value={formData.vehicle_type}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all"
            >
              <option value="Regular">Regular</option>
              <option value="ODC">Over Dimensional Cargo (ODC)</option>
            </select>
          </div>

          {/* Transport Distance */}
          <div>
            <label
              htmlFor="transport_distance"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
            >
              <MapPin size={16} className="inline mr-2" />
              Approximate Distance (in KM) *
            </label>
            <input
              type="number"
              id="transport_distance"
              name="transport_distance"
              value={formData.transport_distance}
              onChange={handleChange}
              placeholder="e.g., 150"
              min="1"
              className={`w-full px-4 py-3 rounded-xl border-2 ${
                errors.transport_distance
                  ? "border-red-500 focus:ring-red-500/30"
                  : "border-gray-200 dark:border-gray-700 focus:ring-blue-500/30"
              } bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:border-blue-500 outline-none transition-all`}
            />
            {errors.transport_distance && (
              <p className="text-red-500 text-sm mt-1">
                {errors.transport_distance}
              </p>
            )}
          </div>

          {/* Transporter GSTIN (Optional) */}
          <div>
            <label
              htmlFor="transporter_id"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
            >
              <Building2 size={16} className="inline mr-2" />
              Transporter GSTIN (Optional)
            </label>
            <input
              type="text"
              id="transporter_id"
              name="transporter_id"
              value={formData.transporter_id}
              onChange={handleChange}
              placeholder="e.g., 27AABCU9603R1ZM"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          {/* Transporter Document Number (Optional) */}
          <div>
            <label
              htmlFor="transporter_doc_no"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
            >
              <FileText size={16} className="inline mr-2" />
              Transporter Document Number (Optional)
            </label>
            <input
              type="text"
              id="transporter_doc_no"
              name="transporter_doc_no"
              value={formData.transporter_doc_no}
              onChange={handleChange}
              placeholder="e.g., DOC123456"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          {/* Transporter Document Date (Optional) */}
          <div>
            <label
              htmlFor="transporter_doc_date"
              className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2"
            >
              <Calendar size={16} className="inline mr-2" />
              Transporter Document Date (Optional)
            </label>
            <input
              type="date"
              id="transporter_doc_date"
              name="transporter_doc_date"
              value={formData.transporter_doc_date}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Note:</strong> This will generate a formatted E-Way Bill
              document with all invoice details. You can then use this document
              to manually enter the information on the GST portal at{" "}
              <a
                href="https://ewaybillgst.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="underline font-semibold"
              >
                ewaybillgst.gov.in
              </a>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 px-6 py-4 rounded-b-2xl flex items-center justify-end gap-3 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-6 py-3 rounded-xl font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handlePreview}
            disabled={loading}
            className="px-6 py-3 rounded-xl font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Preview
          </button>
          <button
            onClick={handleSaveAndPrint}
            disabled={loading}
            className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-lg shadow-blue-600/30 hover:shadow-xl hover:shadow-blue-600/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : "Save & Generate"}
          </button>
        </div>
      </div>
    </div>
  );
}
