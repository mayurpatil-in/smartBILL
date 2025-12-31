import { useState, useEffect } from "react";
import {
  X,
  Save,
  User,
  Mail,
  DollarSign,
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
} from "../api/employees";
import toast from "react-hot-toast";

export default function AddEmployeeModal({
  open,
  employee,
  onClose,
  onSuccess,
}) {
  const [activeTab, setActiveTab] = useState("personal");
  const [uploading, setUploading] = useState(false);
  const [pendingDocs, setPendingDocs] = useState({});

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
      const key = `${type}_doc_path`;
      setFormData((prev) => ({
        ...prev,
        profile: {
          ...prev.profile,
          [key]: res.path,
        },
      }));
    } catch (err) {
      toast.error("Upload failed");
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
    },
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
          pan_doc_path: employee.employee_profile?.pan_doc_path || "",
          aadhar_doc_path: employee.employee_profile?.aadhar_doc_path || "",
          resume_doc_path: employee.employee_profile?.resume_doc_path || "",
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
          pan_doc_path: "",
          aadhar_doc_path: "",
          resume_doc_path: "",
        },
      });
    }
    setPendingDocs({});
  }, [employee, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        is_active: formData.is_active,
        profile: {
          ...formData.profile,
          base_salary: parseFloat(formData.profile.base_salary) || 0,
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
          }
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
        <div className="flex-none flex items-center justify-between px-8 py-5 border-b border-gray-100 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md z-10">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {employee ? "Edit Employee" : "Add New Employee"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          <form
            id="employee-form"
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
              {/* Basic Info Card */}
              <div className="space-y-5 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <User size={18} />
                    <h3 className="font-semibold uppercase tracking-wide text-xs">
                      Personal Details
                    </h3>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Active Status
                    </span>
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
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

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Phone
                    </label>
                    <div className="relative">
                      <Phone
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={18}
                      />
                      <input
                        type="tel"
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
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email (Optional)
                    </label>
                    <div className="relative">
                      <Mail
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={18}
                      />
                      <input
                        type="email"
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
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Address
                  </label>
                  <div className="relative">
                    <MapPin
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                      size={18}
                    />
                    <input
                      type="text"
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
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      PAN Number
                    </label>
                    <div className="relative">
                      <CreditCard
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={18}
                      />
                      <input
                        type="text"
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
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Aadhar Number
                    </label>
                    <div className="relative">
                      <CreditCard
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                        size={18}
                      />
                      <input
                        type="text"
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
                <div className="space-y-5 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 border-b border-gray-200 dark:border-gray-700 pb-3">
                    <Briefcase size={18} />
                    <h3 className="font-semibold uppercase tracking-wide text-xs">
                      Employment Details
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Designation
                      </label>
                      <div className="relative">
                        <Briefcase
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          size={18}
                        />
                        <input
                          type="text"
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
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Joining Date
                      </label>
                      <div className="relative">
                        <Calendar
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          size={18}
                        />
                        <input
                          type="date"
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
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Salary Type
                      </label>
                      <div className="flex gap-4 pt-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="salary_type"
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
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Base Salary / Rate
                      </label>
                      <div className="relative">
                        <DollarSign
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                          size={18}
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
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
                </div>

                <div className="space-y-5 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
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
                            <a
                              href={`http://localhost:8000/${formData.profile[
                                `${doc}_doc_path`
                              ].replace(/\\/g, "/")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                              title="View Document"
                            >
                              <ExternalLink size={16} />
                            </a>
                          )}
                          <label className="cursor-pointer p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => handleFileUpload(e, doc)}
                              disabled={uploading}
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
    </div>
  );
}
