import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X, User, Building, Lock, Camera } from "lucide-react";
import {
  getProfile,
  updateUserProfile,
  updateCompanyProfile,
  uploadCompanyLogo,
} from "../api/profile";
import { API_URL } from "../api/axios";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

export default function ProfileModal({ open, onClose }) {
  const { user: authUser, updateUser } = useAuth(); // for role check and updates
  const [activeTab, setActiveTab] = useState("personal");
  const [loading, setLoading] = useState(true);

  // Data State
  const [profile, setProfile] = useState(null);

  // Form States
  const [personalForm, setPersonalForm] = useState({
    name: "",
    email: "",
    current_password: "",
    new_password: "",
  });

  const [companyForm, setCompanyForm] = useState({
    name: "",
    gst_number: "",
    address: "",
    phone: "",
    email: "",
  });

  const [logo, setLogo] = useState(null);
  const fileInputRef = useRef(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getProfile();
      setProfile(data);

      // Init forms
      setPersonalForm((prev) => ({
        ...prev,
        name: data.user.name,
        email: data.user.email,
        current_password: "",
        new_password: "",
      }));

      if (data.company) {
        setCompanyForm({
          name: data.company.name || "",
          gst_number: data.company.gst_number || "",
          address: data.company.address || "",
          phone: data.company.phone || "",
          email: data.company.email || "",
        });
        setLogo(data.company.logo);
      }
    } catch (err) {
      toast.error("Failed to load profile");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handlePersonalSubmit = async (e) => {
    e.preventDefault();
    try {
      await updateUserProfile(personalForm);
      toast.success("Profile updated successfully");
      updateUser({ name: personalForm.name });
      loadData(); // refresh
    } catch (err) {
      toast.error(err.response?.data?.detail || "Update failed");
    }
  };

  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    try {
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadCompanyLogo(formData);
      // Construct full URL if needed, but relative usually fine if using logic
      // Actually backend returns /uploads/logos/..., we might need base URL
      setLogo(res.logo_url);

      // Append timestamp to force refresh on other components (Context/Dashboard)
      // Browsers cache images by URL. Since the filename is constant (company_X.png),
      // we need to change the URL string to fetch the new version.
      const cacheBustedUrl = `${res.logo_url}?t=${Date.now()}`;
      updateUser({ companyLogo: cacheBustedUrl });

      // Update local state as well to show immediate preview
      setLogo(cacheBustedUrl);

      toast.success("Logo uploaded successfully");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Logo upload failed");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCompanySubmit = async (e) => {
    e.preventDefault();
    try {
      await updateCompanyProfile(companyForm);
      toast.success("Company details updated");
      updateUser({ companyName: companyForm.name });
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Update failed");
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* HEADER */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold dark:text-white">
            Profile Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
          >
            <X size={20} className="dark:text-gray-400" />
          </button>
        </div>

        {/* TABS */}
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("personal")}
            className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition ${
              activeTab === "personal"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
          >
            <User size={18} /> Personal Info
          </button>

          {(authUser?.role === "COMPANY_ADMIN" ||
            (authUser?.role === "SUPER_ADMIN" && profile?.company)) && (
            <button
              onClick={() => setActiveTab("company")}
              className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition ${
                activeTab === "company"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/10 dark:text-blue-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
              }`}
            >
              <Building size={18} /> Company Details
            </button>
          )}
        </div>

        {/* BODY (Scrollable) */}
        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="text-center py-8">Loading...</div>
          ) : (
            <>
              {activeTab === "personal" && (
                <form onSubmit={handlePersonalSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Full Name"
                      name="personal_name"
                      value={personalForm.name}
                      onChange={(v) =>
                        setPersonalForm({ ...personalForm, name: v })
                      }
                    />
                    <Input
                      label="Email Address"
                      type="email"
                      name="personal_email"
                      autoComplete="username"
                      value={personalForm.email}
                      onChange={(v) =>
                        setPersonalForm({ ...personalForm, email: v })
                      }
                    />
                  </div>

                  <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 dark:text-gray-200">
                      <Lock size={16} /> Change Password (Optional)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Input
                        label="Current Password"
                        type="password"
                        name="current_password"
                        autoComplete="current-password"
                        value={personalForm.current_password}
                        onChange={(v) =>
                          setPersonalForm({
                            ...personalForm,
                            current_password: v,
                          })
                        }
                      />
                      <Input
                        label="New Password"
                        type="password"
                        name="new_password"
                        autoComplete="new-password"
                        value={personalForm.new_password}
                        onChange={(v) =>
                          setPersonalForm({
                            ...personalForm,
                            new_password: v,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              )}

              {activeTab === "company" && (
                <form onSubmit={handleCompanySubmit} className="space-y-4">
                  {/* LOGO UPLOAD */}
                  <div className="flex flex-col items-center justify-center mb-6">
                    <div
                      className="relative group cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="w-24 h-24 rounded-full border-4 border-gray-100 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                        {logo ? (
                          <img
                            src={`${API_URL}${logo}`}
                            alt="Company Logo"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = "";
                              setLogo(null);
                            }} // Fallback
                          />
                        ) : (
                          <Building className="text-gray-400" size={40} />
                        )}
                      </div>
                      <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Camera className="text-white" size={24} />
                      </div>
                      {uploadingLogo && (
                        <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Click to upload logo
                    </p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleLogoChange}
                    />
                  </div>

                  <Input
                    label="Company Name"
                    name="company_name"
                    value={companyForm.name}
                    onChange={(v) =>
                      setCompanyForm({ ...companyForm, name: v })
                    }
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Email"
                      type="email"
                      name="company_email"
                      value={companyForm.email}
                      onChange={(v) =>
                        setCompanyForm({ ...companyForm, email: v })
                      }
                    />
                    <Input
                      label="Phone"
                      name="company_phone"
                      value={companyForm.phone}
                      onChange={(v) =>
                        setCompanyForm({ ...companyForm, phone: v })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="GST Number"
                      name="company_gst"
                      value={companyForm.gst_number}
                      onChange={(v) =>
                        setCompanyForm({ ...companyForm, gst_number: v })
                      }
                    />
                    <Input
                      label="Address"
                      name="company_address"
                      value={companyForm.address}
                      onChange={(v) =>
                        setCompanyForm({ ...companyForm, address: v })
                      }
                    />
                  </div>

                  <div className="flex justify-end pt-4">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                      Update Company
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function Input({
  label,
  type = "text",
  value,
  onChange,
  name,
  id,
  autoComplete,
}) {
  return (
    <div>
      <label
        htmlFor={id || name}
        className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>
      <input
        type={type}
        name={name}
        id={id || name}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="
            w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600
            bg-white dark:bg-gray-800 text-gray-900 dark:text-white
            focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
            outline-none transition
          "
      />
    </div>
  );
}
