import { useState, useEffect } from "react";
import {
  X,
  Truck,
  FileText,
  MapPin,
  Building2,
  Hash,
  Calendar,
  Zap,
  PenLine,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Printer,
  Trash2,
  Eye,
  Shield,
  Clock,
} from "lucide-react";
import api from "../api/axios";
import toast from "react-hot-toast";

// ─── Transport form used by BOTH modes ──────────────────────────────────────
function TransportForm({ form, onChange, errors }) {
  const cls = (field) =>
    `w-full px-4 py-3 rounded-xl border-2 ${
      errors[field]
        ? "border-red-400 focus:ring-red-400/30"
        : "border-gray-200 dark:border-gray-700 focus:ring-blue-500/30"
    } bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:border-blue-500 outline-none transition-all`;

  return (
    <div className="space-y-4">
      {/* Row 1: Mode + Vehicle Type */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            <Truck size={12} className="inline mr-1" />
            Transport Mode *
          </label>
          <select
            name="transport_mode"
            value={form.transport_mode}
            onChange={onChange}
            className={cls("transport_mode")}
          >
            <option value="Road">🚛 Road</option>
            <option value="Rail">🚂 Rail</option>
            <option value="Air">✈️ Air</option>
            <option value="Ship">🚢 Ship</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            Vehicle Type
          </label>
          <select
            name="vehicle_type"
            value={form.vehicle_type}
            onChange={onChange}
            className={cls("vehicle_type")}
          >
            <option value="Regular">Regular</option>
            <option value="ODC">ODC (Over Dimensional)</option>
          </select>
        </div>
      </div>

      {/* Row 2: Vehicle Number + Distance */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            <Hash size={12} className="inline mr-1" />
            Vehicle Number *
          </label>
          <input
            type="text"
            name="vehicle_number"
            value={form.vehicle_number}
            onChange={onChange}
            placeholder="MH12AB1234"
            className={cls("vehicle_number")}
          />
          {errors.vehicle_number && (
            <p className="text-red-500 text-xs mt-1">{errors.vehicle_number}</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            <MapPin size={12} className="inline mr-1" />
            Distance (KM) *
          </label>
          <input
            type="number"
            name="transport_distance"
            value={form.transport_distance}
            onChange={onChange}
            placeholder="e.g. 150"
            min="1"
            className={cls("transport_distance")}
          />
          {errors.transport_distance && (
            <p className="text-red-500 text-xs mt-1">
              {errors.transport_distance}
            </p>
          )}
        </div>
      </div>

      {/* Row 3: Transporter GSTIN */}
      <div>
        <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
          <Building2 size={12} className="inline mr-1" />
          Transporter GSTIN{" "}
          <span className="font-normal text-gray-400">(Optional)</span>
        </label>
        <input
          type="text"
          name="transporter_id"
          value={form.transporter_id}
          onChange={onChange}
          placeholder="27AABCU9603R1ZM"
          className={cls("transporter_id")}
        />
      </div>

      {/* Row 4: Doc No + Doc Date */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            <FileText size={12} className="inline mr-1" />
            Doc No{" "}
            <span className="font-normal text-gray-400">(Optional)</span>
          </label>
          <input
            type="text"
            name="transporter_doc_no"
            value={form.transporter_doc_no}
            onChange={onChange}
            placeholder="DOC123456"
            className={cls("transporter_doc_no")}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
            <Calendar size={12} className="inline mr-1" />
            Doc Date{" "}
            <span className="font-normal text-gray-400">(Optional)</span>
          </label>
          <input
            type="date"
            name="transporter_doc_date"
            value={form.transporter_doc_date}
            onChange={onChange}
            className={cls("transporter_doc_date")}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Modal ──────────────────────────────────────────────────────────────
export default function EWayBillModal({
  isOpen,
  onClose,
  invoiceId,
  invoiceData,
  onSuccess,
}) {
  // "select" | "online" | "manual" | "done"
  const [step, setStep] = useState("select");
  const [loading, setLoading] = useState(false);
  const [generatedEWB, setGeneratedEWB] = useState(null); // result from API

  const emptyForm = {
    transport_mode: "Road",
    vehicle_number: "",
    transport_distance: "",
    transporter_id: "",
    vehicle_type: "Regular",
    transporter_doc_no: "",
    transporter_doc_date: "",
  };

  const [form, setForm] = useState(emptyForm);
  const [manualEwbNumber, setManualEwbNumber] = useState("");
  const [manualEwbDate, setManualEwbDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [errors, setErrors] = useState({});

  // Pre-populate form if invoice already has transport details
  useEffect(() => {
    if (isOpen) {
      setStep("select");
      setGeneratedEWB(null);
      setManualEwbNumber("");
      setErrors({});

      if (invoiceData?.eway_bill_number) {
        // Already has EWB — go straight to "done" view
        setGeneratedEWB({
          eway_bill_number: invoiceData.eway_bill_number,
          eway_bill_date: invoiceData.eway_bill_date,
          transport_mode: invoiceData.transport_mode,
          vehicle_number: invoiceData.vehicle_number,
          transport_distance: invoiceData.transport_distance,
          validity_description: "",
        });
        setStep("done");
      } else if (invoiceData?.transport_mode) {
        // Has saved transport data but no EWB yet — pre-fill form
        setForm({
          transport_mode: invoiceData.transport_mode || "Road",
          vehicle_number: invoiceData.vehicle_number || "",
          transport_distance: invoiceData.transport_distance || "",
          transporter_id: invoiceData.transporter_id || "",
          vehicle_type: invoiceData.vehicle_type || "Regular",
          transporter_doc_no: invoiceData.transporter_doc_no || "",
          transporter_doc_date: invoiceData.transporter_doc_date || "",
        });
      } else {
        setForm(emptyForm);
      }
    }
  }, [isOpen, invoiceData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  const validate = () => {
    const e = {};
    if (!form.vehicle_number.trim()) e.vehicle_number = "Required";
    if (!form.transport_distance || Number(form.transport_distance) <= 0)
      e.transport_distance = "Must be > 0";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── ONLINE: Call NIC API ─────────────────────────────────────────────────
  const handleGenerateOnline = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      const t = toast.loading("Connecting to NIC EWB API…");
      const payload = {
        ...form,
        transport_distance: parseInt(form.transport_distance, 10),
      };
      const res = await api.post(
        `/invoice/${invoiceId}/eway-bill/generate`,
        payload
      );
      toast.dismiss(t);
      setGeneratedEWB(res.data);
      setStep("done");
      toast.success(`EWB ${res.data.eway_bill_number} generated via NIC! ✅`);
      onSuccess?.();
    } catch (err) {
      toast.dismiss();
      const msg =
        err.response?.data?.detail ||
        "NIC API error. Check credentials in .env";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── OFFLINE: Save manual EWB number ─────────────────────────────────────
  const handleSaveManual = async () => {
    if (!validate()) return;
    if (!manualEwbNumber || manualEwbNumber.length !== 12) {
      setErrors((p) => ({
        ...p,
        manualEwbNumber: "EWB number must be exactly 12 digits",
      }));
      return;
    }
    try {
      setLoading(true);
      const t = toast.loading("Saving E-Way Bill details…");
      const payload = {
        ...form,
        transport_distance: parseInt(form.transport_distance, 10),
        eway_bill_number: manualEwbNumber,
        eway_bill_date: manualEwbDate,
      };
      const res = await api.post(
        `/invoice/${invoiceId}/eway-bill/manual`,
        payload
      );
      toast.dismiss(t);
      setGeneratedEWB(res.data);
      setStep("done");
      toast.success("E-Way Bill details saved! ✅");
      onSuccess?.();
    } catch (err) {
      toast.dismiss();
      const msg = err.response?.data?.detail || "Failed to save EWB details";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── SAVE transport & open PDF ─────────────────────────────────────────────
  const handleSaveAndPrint = async () => {
    if (!validate()) return;
    try {
      setLoading(true);
      const t = toast.loading("Saving & generating PDF…");
      const payload = {
        ...form,
        transport_distance: parseInt(form.transport_distance, 10),
      };
      await api.post(`/invoice/${invoiceId}/eway-bill`, payload);
      const res = await api.get(`/invoice/${invoiceId}/eway-bill/print`, {
        responseType: "blob",
      });
      toast.dismiss(t);
      const url = window.URL.createObjectURL(
        new Blob([res.data], { type: "text/html" })
      );
      window.open(url, "_blank");
      toast.success("E-Way Bill PDF generated!");
      onClose();
    } catch (err) {
      toast.dismiss();
      toast.error(
        err.response?.data?.detail || "Failed to generate E-Way Bill"
      );
    } finally {
      setLoading(false);
    }
  };

  // ── CLEAR local EWB data ──────────────────────────────────────────────────
  const handleClear = async () => {
    if (!window.confirm("Remove E-Way Bill from this invoice?")) return;
    try {
      setLoading(true);
      await api.delete(`/invoice/${invoiceId}/eway-bill/clear`);
      setGeneratedEWB(null);
      setStep("select");
      toast.success("E-Way Bill cleared.");
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to clear EWB");
    } finally {
      setLoading(false);
    }
  };

  // ── PRINT existing EWB PDF ────────────────────────────────────────────────
  const handlePrintEWB = async () => {
    try {
      setLoading(true);
      const t = toast.loading("Generating E-Way Bill PDF…");
      const res = await api.get(`/invoice/${invoiceId}/eway-bill/print`, {
        responseType: "blob",
      });
      toast.dismiss(t);
      const url = window.URL.createObjectURL(
        new Blob([res.data], { type: "text/html" })
      );
      window.open(url, "_blank");
    } catch (err) {
      toast.dismiss();
      toast.error("Failed to generate PDF");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const inputCls =
    "w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto border border-gray-200 dark:border-gray-700 flex flex-col">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="sticky top-0 bg-gradient-to-r from-orange-500 to-amber-600 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between z-10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <Truck size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">
                E-Way Bill
              </h2>
              <p className="text-xs text-orange-100">
                {invoiceData?.invoice_number} · ₹
                {Number(invoiceData?.grand_total || 0).toLocaleString("en-IN")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <div className="p-6 flex-1 space-y-6">

          {/* ── STEP: SELECT MODE ─────────────────────────────────────────── */}
          {step === "select" && (
            <>
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                How do you want to generate the E-Way Bill?
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Online Card */}
                <button
                  onClick={() => setStep("online")}
                  className="group flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/20 transition-all duration-300 hover:scale-[1.02] text-left"
                >
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                    <Zap size={24} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">
                      Auto Generate
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-semibold mt-0.5">
                      via NIC API (Online)
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                      Directly call NIC EWB portal. EWB number generated
                      automatically.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-semibold mt-auto">
                    <Shield size={12} />
                    Requires API credentials in .env
                  </div>
                </button>

                {/* Manual Card */}
                <button
                  onClick={() => setStep("manual")}
                  className="group flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 hover:border-green-500 hover:shadow-lg hover:shadow-green-500/20 transition-all duration-300 hover:scale-[1.02] text-left"
                >
                  <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg shadow-green-500/30 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                    <PenLine size={24} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">
                      Manual Entry
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 font-semibold mt-0.5">
                      Offline / Client fills on portal
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                      Client generates EWB on NIC portal manually. Enter the
                      12-digit number here.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 font-semibold mt-auto">
                    <CheckCircle2 size={12} />
                    No API credentials needed
                  </div>
                </button>
              </div>

              {/* Save & Print (old flow — save transport + print PDF) */}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                <button
                  onClick={() => setStep("print")}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400 hover:text-gray-800 dark:hover:text-white text-sm font-semibold transition-all"
                >
                  <Printer size={16} />
                  Save Transport Details & Print EWB PDF (without EWB number)
                </button>
              </div>
            </>
          )}

          {/* ── STEP: ONLINE GENERATE ─────────────────────────────────────── */}
          {step === "online" && (
            <>
              <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <Zap size={18} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>Auto Generate:</strong> Fills all details from the
                  invoice and calls NIC API. EWB number is saved automatically.
                </p>
              </div>
              <TransportForm form={form} onChange={handleChange} errors={errors} />
            </>
          )}

          {/* ── STEP: MANUAL ENTRY ────────────────────────────────────────── */}
          {step === "manual" && (
            <>
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                <PenLine size={18} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                <p className="text-xs text-green-700 dark:text-green-300">
                  <strong>Manual Entry:</strong> Generate the EWB on{" "}
                  <a
                    href="https://ewaybillgst.gov.in"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-semibold"
                  >
                    ewaybillgst.gov.in
                  </a>{" "}
                  then enter the 12-digit EWB number below.
                </p>
              </div>

              {/* EWB Number + Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    EWB Number * (12 digits)
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    value={manualEwbNumber}
                    onChange={(e) => {
                      setManualEwbNumber(e.target.value.replace(/\D/g, ""));
                      if (errors.manualEwbNumber)
                        setErrors((p) => ({ ...p, manualEwbNumber: null }));
                    }}
                    placeholder="341900462810"
                    className={`${inputCls} ${errors.manualEwbNumber ? "border-red-400" : ""}`}
                  />
                  {errors.manualEwbNumber && (
                    <p className="text-red-500 text-xs mt-1">
                      {errors.manualEwbNumber}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {manualEwbNumber.length}/12 digits
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    <Calendar size={12} className="inline mr-1" />
                    EWB Date *
                  </label>
                  <input
                    type="date"
                    value={manualEwbDate}
                    onChange={(e) => setManualEwbDate(e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>

              <TransportForm form={form} onChange={handleChange} errors={errors} />
            </>
          )}

          {/* ── STEP: PRINT ONLY ──────────────────────────────────────────── */}
          {step === "print" && (
            <>
              <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-xl">
                <Printer size={18} className="text-gray-600 dark:text-gray-400 flex-shrink-0" />
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Save transport details and generate an EWB reference document
                  (without EWB number). Use this if you fill the EWB on the NIC
                  portal later.
                </p>
              </div>
              <TransportForm form={form} onChange={handleChange} errors={errors} />
            </>
          )}

          {/* ── STEP: DONE ────────────────────────────────────────────────── */}
          {step === "done" && generatedEWB && (
            <div className="space-y-4">
              {/* Success Banner */}
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 rounded-2xl">
                <div className="p-3 bg-green-500 rounded-xl flex-shrink-0">
                  <CheckCircle2 size={24} className="text-white" />
                </div>
                <div>
                  <p className="font-bold text-green-800 dark:text-green-300">
                    E-Way Bill Active
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                    Linked to invoice {invoiceData?.invoice_number}
                  </p>
                </div>
              </div>

              {/* EWB Details Card */}
              <div className="bg-gradient-to-br from-gray-50 to-orange-50 dark:from-gray-900 dark:to-orange-900/10 border-2 border-orange-200 dark:border-orange-800 rounded-2xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    EWB Number
                  </span>
                  <span className="text-2xl font-bold text-orange-600 dark:text-orange-400 font-mono tracking-widest">
                    {generatedEWB.eway_bill_number}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-orange-100 dark:border-orange-800">
                  <Detail label="Date" value={generatedEWB.eway_bill_date} />
                  <Detail label="Mode" value={generatedEWB.transport_mode} />
                  <Detail label="Vehicle" value={generatedEWB.vehicle_number} />
                  <Detail
                    label="Distance"
                    value={
                      generatedEWB.transport_distance
                        ? `${generatedEWB.transport_distance} km`
                        : "—"
                    }
                  />
                  {generatedEWB.validity_description && (
                    <div className="col-span-2">
                      <Detail
                        label="Validity"
                        value={generatedEWB.validity_description}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handlePrintEWB}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-600/30 disabled:opacity-50"
                >
                  <Printer size={16} />
                  Print EWB PDF
                </button>
                <button
                  onClick={handleClear}
                  disabled={loading}
                  className="flex items-center gap-2 py-2.5 px-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  Clear EWB
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900/80 backdrop-blur px-6 py-4 rounded-b-2xl flex items-center justify-between gap-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          {/* Back button */}
          {step !== "select" && step !== "done" && (
            <button
              onClick={() => setStep("select")}
              disabled={loading}
              className="text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-50"
            >
              ← Back
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all disabled:opacity-50 text-sm"
            >
              {step === "done" ? "Close" : "Cancel"}
            </button>

            {step === "online" && (
              <button
                onClick={handleGenerateOnline}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 shadow-lg shadow-blue-600/30 hover:shadow-xl transition-all disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Zap size={16} />
                )}
                {loading ? "Generating…" : "Generate via NIC API"}
              </button>
            )}

            {step === "manual" && (
              <button
                onClick={handleSaveManual}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 shadow-lg shadow-green-600/30 hover:shadow-xl transition-all disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <PenLine size={16} />
                )}
                {loading ? "Saving…" : "Save EWB Details"}
              </button>
            )}

            {step === "print" && (
              <button
                onClick={handleSaveAndPrint}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white bg-gradient-to-r from-gray-700 to-gray-900 hover:from-gray-800 hover:to-black shadow-lg shadow-gray-700/30 hover:shadow-xl transition-all disabled:opacity-50 text-sm"
              >
                {loading ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Printer size={16} />
                )}
                {loading ? "Processing…" : "Save & Print PDF"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Small helper component ───────────────────────────────────────────────────
function Detail({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="text-sm font-bold text-gray-900 dark:text-white">
        {value || "—"}
      </p>
    </div>
  );
}
