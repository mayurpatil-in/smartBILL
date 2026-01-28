import { useState, useEffect } from "react";
import {
  X,
  Save,
  User,
  Mail,
  DollarSign,
  IndianRupee,
  Briefcase,
  Phone,
  Calendar,
  MapPin,
  CreditCard,
  FileText,
  Upload,
  ExternalLink,
} from "lucide-react";
import {
  createEmployee,
  updateEmployee,
  uploadDocument,
  getNextEmployeeId,
} from "../api/employees";
import toast from "react-hot-toast";
import PdfPreviewModal from "./PdfPreviewModal";

export default function AddEmployeeModal({
  open,
  employee,
  onClose,
  onSuccess,
}) {
  const [activeTab, setActiveTab] = useState("personal");
  const [uploading, setUploading] = useState(false);
  const [pendingDocs, setPendingDocs] = useState({});
  const [nextId, setNextId] = useState("");
  const [previewFile, setPreviewFile] = useState(null); // { url, title, type }

  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!employee?.id) {
      // Store in pending state for upload after creation
      setPendingDocs((prev) => ({ ...prev, [type]: file }));
      toast.success(`${type.toUpperCase()} selected (will upload on save)`);
      return;
    }

    const formDataUpload = new FormData();
    formDataUpload.append("doc_type", type);
    formDataUpload.append("file", file);

    setUploading(true);
    try {
      const res = await uploadDocument(employee.id, formDataUpload); // Changed initialData to employee
      toast.success(`${type.toUpperCase()} uploaded successfully`);

      // Update local state to show the link
      const key = type === "photo" ? "photo_path" : `${type}_doc_path`;
      setFormData((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          [key]: res.path,
        },
      }));
    } catch (err) {
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    is_active: true,
    profile: {
      designation: "",
      phone: "",
      address: "",
      pan_number: "",
      aadhar_number: "",
      joining_date: new Date().toISOString().split("T")[0],
      salary_type: "monthly",
      base_salary: "",
      tds_percentage: "",
      enable_tds: false,
      professional_tax: "",
    },
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && !employee) {
      // Fetch next ID
      getNextEmployeeId().then((data) => setNextId(data.next_id));
    }
    if (employee) {
      setFormData({
        name: employee.name,
        email: employee.email || "",
        password: "", // Don't show password
        is_active: employee.is_active,
        profile: {
          designation: employee.employee_profile?.designation || "",
          phone: employee.employee_profile?.phone || "",
          address: employee.employee_profile?.address || "",
          pan_number: employee.employee_profile?.pan_number || "",
          aadhar_number: employee.employee_profile?.aadhar_number || "",
          joining_date:
            employee.employee_profile?.joining_date ||
            new Date().toISOString().split("T")[0],
          salary_type: employee.employee_profile?.salary_type || "monthly",
          base_salary: employee.employee_profile?.base_salary || "",
          tds_percentage: employee.employee_profile?.tds_percentage || "",
          enable_tds: employee.employee_profile?.enable_tds || false,
          professional_tax: employee.employee_profile?.professional_tax || "",
          work_hours_per_day:
            employee.employee_profile?.work_hours_per_day || 8, // [NEW]
          pan_doc_path: employee.employee_profile?.pan_doc_path || "",
          aadhar_doc_path: employee.employee_profile?.aadhar_doc_path || "",
          resume_doc_path: employee.employee_profile?.resume_doc_path || "",
          photo_path: employee.employee_profile?.photo_path || "",
        },
      });
    } else {
      setFormData({
        name: "",
        email: "",
        password: "",
        is_active: true,
        profile: {
          designation: "",
          phone: "",
          address: "",
          pan_number: "",
          aadhar_number: "",
          joining_date: new Date().toISOString().split("T")[0],
          salary_type: "monthly",
          base_salary: "",
          tds_percentage: "",
          enable_tds: false,
          professional_tax: "",
          work_hours_per_day: 8,
          pan_doc_path: "",
          aadhar_doc_path: "",
          resume_doc_path: "",
          photo_path: "",
        },
      });
    }
    setPendingDocs({});
  }, [employee, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name.trim()) return toast.error("Name is required");
    if (!formData.profile.address?.trim())
      return toast.error("Address is required");
    if (!formData.profile.designation?.trim())
      return toast.error("Designation is required");

    // Phone validation (10 digits)
    const phoneRegex = /^\d{10}$/;
    if (
      !formData.profile.phone ||
      !phoneRegex.test(formData.profile.phone.replace(/\D/g, ""))
    ) {
      return toast.error("Valid 10-digit Phone Number is required");
    }

    // PAN Validation (if provided)
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    if (
      formData.profile.pan_number &&
      !panRegex.test(formData.profile.pan_number.toUpperCase())
    ) {
      return toast.error("Invalid PAN Card Number format");
    }

    // Aadhar Validation (if provided) - 12 digits
    const aadharRegex = /^\d{12}$/;
    if (
      formData.profile.aadhar_number &&
      !aadharRegex.test(formData.profile.aadhar_number.replace(/\s/g, ""))
    ) {
      return toast.error("Aadhar Number must be 12 digits");
    }

    // Salary Validation
    if (
      formData.profile.base_salary === "" ||
      parseFloat(formData.profile.base_salary) < 0
    ) {
      return toast.error("Base Salary is required and cannot be negative");
    }

    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        is_active: formData.is_active,
        profile: {
          ...formData.profile,
          base_salary: parseFloat(formData.profile.base_salary) || 0,
          tds_percentage: parseFloat(formData.profile.tds_percentage) || 0,
          enable_tds: formData.profile.enable_tds,
          professional_tax: parseFloat(formData.profile.professional_tax) || 0,
        },
      };

      if (formData.email) payload.email = formData.email;

      if (formData.password) payload.password = formData.password;

      let empId = employee?.id;

      if (employee) {
        await updateEmployee(employee.id, payload);
        toast.success("Employee updated successfully");
      } else {
        // Password optional now
        const newEmp = await createEmployee(payload);
        empId = newEmp.id;
        toast.success("Employee created successfully");
      }

      // Handle Pending Docs Uploads
      if (empId && Object.keys(pendingDocs).length > 0) {
        const uploadPromises = Object.entries(pendingDocs).map(
          ([type, file]) => {
            const formDataUpload = new FormData();
            formDataUpload.append("doc_type", type);
            formDataUpload.append("file", file);
            return uploadDocument(empId, formDataUpload);
          },
        );
        await Promise.all(uploadPromises);
        toast.success("Documents uploaded successfully");
      }
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save employee");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden animate-scale-in flex flex-col">
        <div className="flex-none flex items-center justify-between px-4 py-4 md:px-8 md:py-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-cyan-700 dark:from-blue-700 dark:to-cyan-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 dark:bg-white/10 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/30">
              <User size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                {employee ? "Edit Employee" : "Add New Employee"}
              </h2>
              <p className="text-sm text-blue-100 dark:text-cyan-100 mt-0.5">
                {employee
                  ? `Employee ID: #${
                      employee.employee_profile?.company_employee_id ||
                      employee.id
                    }`
                  : nextId
                    ? `Next Employee ID: #${nextId}`
                    : "Create a new employee record"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-white/20 dark:hover:bg-white/10 rounded-xl transition-all duration-200 group"
          >
            <X
              size={22}
              className="text-white group-hover:rotate-90 transition-transform duration-200"
            />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
          <form
            id="employee-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 items-start">
              {/* Basic Info Card */}
              <div className="space-y-5 bg-white dark:bg-gray-900/50 p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <User size={18} />
                    <h3 className="font-semibold uppercase tracking-wide text-xs">
                      Personal Details
                    </h3>
                  </div>
                  <label
                    htmlFor="is_active"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Active Status
                    </span>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        name="is_active"
                        id="is_active"
                        className="sr-only peer"
                        checked={formData.is_active}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            is_active: e.target.checked,
                          })
                        }
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </div>
                  </label>
                </div>

                {/* PROFILE PHOTO UPLOAD */}
                <div className="flex justify-center">
                  <div className="relative group">
                    <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-white dark:border-gray-700 shadow-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      {formData.profile?.photo_path ? (
                        <img
                          src={`${import.meta.env.VITE_API_URL}/${formData.profile.photo_path.replace(
                            /\\/g,
                            "/",
                          )}`}
                          alt="Profile"
                          className="w-full h-full object-cover"
                        />
                      ) : pendingDocs["photo"] ? (
                        <img
                          src={URL.createObjectURL(pendingDocs["photo"])}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User size={48} className="text-gray-400" />
                      )}
                    </div>
                    <label
                      htmlFor="profile_photo"
                      className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer"
                    >
                      <Upload size={24} />
                      <input
                        type="file"
                        id="profile_photo"
                        name="profile_photo"
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, "photo")}
                        accept="image/*"
                      />
                    </label>
                    {uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-full">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="employee_name"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <User
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      required
                      type="text"
                      name="employee_name"
                      id="employee_name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="employee_phone"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Phone
                    </label>
                    <div className="relative">
                      <Phone
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={18}
                      />
                      <input
                        type="tel"
                        name="employee_phone"
                        id="employee_phone"
                        value={formData.profile.phone}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            profile: {
                              ...formData.profile,
                              phone: e.target.value,
                            },
                          })
                        }
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="employee_email"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Email (Optional)
                    </label>
                    <div className="relative">
                      <Mail
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={18}
                      />
                      <input
                        type="email"
                        name="employee_email"
                        id="employee_email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                        placeholder="john@company.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="employee_address"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Address <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      required
                      type="text"
                      name="employee_address"
                      id="employee_address"
                      value={formData.profile.address}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          profile: {
                            ...formData.profile,
                            address: e.target.value,
                          },
                        })
                      }
                      className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                      placeholder="Full Address"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="employee_pan"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      PAN Number
                    </label>
                    <div className="relative">
                      <CreditCard
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={18}
                      />
                      <input
                        type="text"
                        name="employee_pan"
                        id="employee_pan"
                        value={formData.profile.pan_number}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            profile: {
                              ...formData.profile,
                              pan_number: e.target.value,
                            },
                          })
                        }
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                        placeholder="ABCDE1234F"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="employee_aadhar"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Aadhar Number
                    </label>
                    <div className="relative">
                      <CreditCard
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={18}
                      />
                      <input
                        type="text"
                        name="employee_aadhar"
                        id="employee_aadhar"
                        value={formData.profile.aadhar_number}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            profile: {
                              ...formData.profile,
                              aadhar_number: e.target.value,
                            },
                          })
                        }
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                        placeholder="1234 5678 9012"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Employment Details Card */}
                <div className="space-y-5 bg-white dark:bg-gray-900/50 p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 border-b border-gray-200 dark:border-gray-700 pb-3">
                    <Briefcase size={18} />
                    <h3 className="font-semibold uppercase tracking-wide text-xs">
                      Employment Details
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="employee_designation"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Designation <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Briefcase
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          size={18}
                        />
                        <input
                          required
                          type="text"
                          name="employee_designation"
                          id="employee_designation"
                          value={formData.profile.designation}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              profile: {
                                ...formData.profile,
                                designation: e.target.value,
                              },
                            })
                          }
                          className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                          placeholder="Senior Developer"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="joining_date"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Joining Date
                      </label>
                      <div className="relative">
                        <Calendar
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          size={18}
                        />
                        <input
                          type="date"
                          name="joining_date"
                          id="joining_date"
                          value={formData.profile.joining_date}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              profile: {
                                ...formData.profile,
                                joining_date: e.target.value,
                              },
                            })
                          }
                          className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Salary Type
                      </span>
                      <div className="flex gap-4 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="salary_type"
                            id="salary_type_monthly"
                            value="monthly"
                            checked={formData.profile.salary_type === "monthly"}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                profile: {
                                  ...formData.profile,
                                  salary_type: e.target.value,
                                },
                              })
                            }
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-gray-700 dark:text-gray-300">
                            Monthly
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="salary_type"
                            id="salary_type_daily"
                            value="daily"
                            checked={formData.profile.salary_type === "daily"}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                profile: {
                                  ...formData.profile,
                                  salary_type: e.target.value,
                                },
                              })
                            }
                            className="text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-gray-700 dark:text-gray-300">
                            Daily
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="work_hours_per_day"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Daily Work Hours
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          id="work_hours_per_day"
                          name="work_hours_per_day"
                          required
                          min="1"
                          max="24"
                          value={formData.profile.work_hours_per_day}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              profile: {
                                ...formData.profile,
                                work_hours_per_day: e.target.value,
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="base_salary"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Base Salary / Rate
                      </label>
                      <div className="relative">
                        <IndianRupee
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          size={18}
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          name="base_salary"
                          id="base_salary"
                          value={formData.profile.base_salary}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              profile: {
                                ...formData.profile,
                                base_salary: e.target.value,
                              },
                            })
                          }
                          className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="enable_tds"
                        checked={formData.profile.enable_tds}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            profile: {
                              ...formData.profile,
                              enable_tds: e.target.checked,
                            },
                          })
                        }
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-colors"
                      />
                      <label
                        htmlFor="enable_tds"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300 select-none cursor-pointer"
                      >
                        Enable TDS Deduction
                      </label>
                    </div>

                    {formData.profile.enable_tds && (
                      <div className="space-y-2 animate-fade-in-down">
                        <label
                          htmlFor="tds_percentage"
                          className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          TDS Percentage (%)
                        </label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">
                            %
                          </div>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            name="tds_percentage"
                            id="tds_percentage"
                            value={formData.profile.tds_percentage}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                profile: {
                                  ...formData.profile,
                                  tds_percentage: e.target.value,
                                },
                              })
                            }
                            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label
                      htmlFor="professional_tax"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Professional Tax (Fixed)
                    </label>
                    <div className="relative">
                      <IndianRupee
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={18}
                      />
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        name="professional_tax"
                        id="professional_tax"
                        value={formData.profile.professional_tax}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            profile: {
                              ...formData.profile,
                              professional_tax: e.target.value,
                            },
                          })
                        }
                        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all dark:text-white"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-5 bg-white dark:bg-gray-900/50 p-6 rounded-2xl border-2 border-gray-200 dark:border-gray-700 shadow-lg">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 border-b border-gray-200 dark:border-gray-700 pb-3">
                    <FileText size={18} />
                    <h3 className="font-semibold uppercase tracking-wide text-xs">
                      Documents
                    </h3>
                  </div>

                  <div className="space-y-3">
                    {["pan", "aadhar", "resume"].map((doc) => (
                      <div
                        key={doc}
                        className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <FileText
                              size={18}
                              className="text-gray-400 dark:text-gray-300"
                            />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-gray-900 dark:text-white capitalize">
                              {doc}
                            </p>
                            <p className="text-[10px] text-gray-500">
                              {formData.profile?.[`${doc}_doc_path`]
                                ? "Uploaded"
                                : pendingDocs[doc]
                                  ? "Selected"
                                  : "Not uploaded"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {formData.profile?.[`${doc}_doc_path`] && (
                            <button
                              type="button"
                              onClick={() => {
                                const path =
                                  formData.profile[`${doc}_doc_path`];
                                setPreviewFile({
                                  url: `${import.meta.env.VITE_API_URL}/${path.replace(
                                    /\\/g,
                                    "/",
                                  )}`,
                                  title: `${doc.toUpperCase()} Preview`,
                                  fileName: path.split(/[\\/]/).pop(),
                                });
                              }}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="View Document"
                            >
                              <ExternalLink size={16} />
                            </button>
                          )}
                          <label className="cursor-pointer p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, doc)}
                              disabled={uploading}
                              name={`file_upload_${doc}`}
                              id={`file_upload_${doc}`}
                            />
                            {uploading ? (
                              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                            ) : (
                              <Upload size={16} />
                            )}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="flex-none flex items-center justify-end gap-3 px-8 py-5 bg-white/90 dark:bg-gray-800/90 border-t border-gray-100 dark:border-gray-700 backdrop-blur-md z-10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="employee-form"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-lg shadow-blue-600/20 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              "Saving..."
            ) : (
              <>
                <Save size={18} /> Save Employee
              </>
            )}
          </button>
        </div>
      </div>

      {/* Document Preview Modal */}
      <PdfPreviewModal
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        pdfUrl={previewFile?.url}
        title={previewFile?.title}
        fileName={previewFile?.fileName}
      />
    </div>
  );
}
