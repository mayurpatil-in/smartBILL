import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X,
  User,
  Building,
  Lock,
  Camera,
  Mail,
  Phone,
  MapPin,
  FileText,
  Eye,
  EyeOff,
  Upload,
  Sparkles,
} from "lucide-react";
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
  const { user: authUser, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState("personal");
  const [loading, setLoading] = useState(true);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

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
      loadData();
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
      setLogo(res.logo_url);

      const cacheBustedUrl = `${res.logo_url}?t=${Date.now()}`;
      updateUser({ companyLogo: cacheBustedUrl });
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

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-in border-2 border-gray-200 dark:border-gray-700">
        {/* ENHANCED HEADER */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 overflow-hidden">
          {/* Decorative Elements */}
          <div className="absolute top-0 right-0 opacity-20">
            <Sparkles size={100} className="text-white animate-float" />
          </div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />

          <div className="relative z-10 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <User size={32} className="text-white/90" />
                Profile Settings
              </h2>
              <p className="text-indigo-100 text-sm">
                Manage your personal and company information
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-white/20 rounded-xl transition-all duration-300 hover:scale-110 group"
            >
              <X
                size={24}
                className="text-white group-hover:rotate-90 transition-transform duration-300"
              />
            </button>
          </div>
        </div>

        {/* ENHANCED TABS */}
        <div className="flex border-b-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={() => setActiveTab("personal")}
            className={`relative flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-300 ${
              activeTab === "personal"
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            }`}
          >
            <User size={20} />
            Personal Info
            {activeTab === "personal" && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-t-full" />
            )}
          </button>

          {(authUser?.role === "COMPANY_ADMIN" ||
            (authUser?.role === "SUPER_ADMIN" && profile?.company)) && (
            <button
              onClick={() => setActiveTab("company")}
              className={`relative flex-1 py-4 text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-300 ${
                activeTab === "company"
                  ? "text-purple-600 dark:text-purple-400"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              <Building size={20} />
              Company Details
              {activeTab === "company" && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-600 rounded-t-full" />
              )}
            </button>
          )}
        </div>

        {/* BODY (Scrollable) */}
        <div className="p-8 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Loading profile...
              </p>
            </div>
          ) : (
            <>
              {activeTab === "personal" && (
                <form onSubmit={handlePersonalSubmit} className="space-y-6">
                  {/* User Avatar */}
                  <div className="flex justify-center mb-6">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg ring-4 ring-blue-100 dark:ring-blue-900/50">
                        {getInitials(personalForm.name)}
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white dark:border-gray-800 shadow-lg" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <EnhancedInput
                      label="Full Name"
                      name="personal_name"
                      icon={User}
                      value={personalForm.name}
                      onChange={(v) =>
                        setPersonalForm({ ...personalForm, name: v })
                      }
                    />
                    <EnhancedInput
                      label="Email Address"
                      type="email"
                      name="personal_email"
                      icon={Mail}
                      autoComplete="username"
                      value={personalForm.email}
                      onChange={(v) =>
                        setPersonalForm({ ...personalForm, email: v })
                      }
                    />
                  </div>

                  <div className="pt-6 border-t-2 border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-white">
                      <Lock size={20} className="text-indigo-600" />
                      Change Password
                      <span className="text-xs font-normal text-gray-500">
                        (Optional)
                      </span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <EnhancedInput
                        label="Current Password"
                        type={showCurrentPassword ? "text" : "password"}
                        name="current_password"
                        icon={Lock}
                        autoComplete="current-password"
                        value={personalForm.current_password}
                        onChange={(v) =>
                          setPersonalForm({
                            ...personalForm,
                            current_password: v,
                          })
                        }
                        rightIcon={
                          <button
                            type="button"
                            onClick={() =>
                              setShowCurrentPassword(!showCurrentPassword)
                            }
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {showCurrentPassword ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        }
                      />
                      <EnhancedInput
                        label="New Password"
                        type={showNewPassword ? "text" : "password"}
                        name="new_password"
                        icon={Lock}
                        autoComplete="new-password"
                        value={personalForm.new_password}
                        onChange={(v) =>
                          setPersonalForm({
                            ...personalForm,
                            new_password: v,
                          })
                        }
                        rightIcon={
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            {showNewPassword ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        }
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-6">
                    <button
                      type="submit"
                      className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
                    >
                      <Sparkles size={18} />
                      Save Changes
                    </button>
                  </div>
                </form>
              )}

              {activeTab === "company" && (
                <form onSubmit={handleCompanySubmit} className="space-y-6">
                  {/* ENHANCED LOGO UPLOAD */}
                  <div className="flex flex-col items-center justify-center mb-8">
                    <div
                      className="relative group cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <div className="w-32 h-32 rounded-2xl border-4 border-dashed border-gray-300 dark:border-gray-600 group-hover:border-purple-500 dark:group-hover:border-purple-400 overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 flex items-center justify-center transition-all duration-300 group-hover:scale-105 group-hover:shadow-2xl">
                        {logo ? (
                          <img
                            src={`${API_URL}${logo}`}
                            alt="Company Logo"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = "";
                              setLogo(null);
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2">
                            <Upload
                              className="text-gray-400 group-hover:text-purple-500 transition-colors"
                              size={40}
                            />
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                              Upload Logo
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/80 to-pink-500/80 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                        <Camera className="text-white" size={32} />
                      </div>
                      {uploadingLogo && (
                        <div className="absolute inset-0 bg-black/70 rounded-2xl flex items-center justify-center">
                          <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 font-medium">
                      Click to upload company logo
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      PNG, JPG or GIF (Max 5MB)
                    </p>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleLogoChange}
                    />
                  </div>

                  <EnhancedInput
                    label="Company Name"
                    name="company_name"
                    icon={Building}
                    value={companyForm.name}
                    onChange={(v) =>
                      setCompanyForm({ ...companyForm, name: v })
                    }
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <EnhancedInput
                      label="Email"
                      type="email"
                      name="company_email"
                      icon={Mail}
                      value={companyForm.email}
                      onChange={(v) =>
                        setCompanyForm({ ...companyForm, email: v })
                      }
                    />
                    <EnhancedInput
                      label="Phone"
                      name="company_phone"
                      icon={Phone}
                      value={companyForm.phone}
                      onChange={(v) =>
                        setCompanyForm({ ...companyForm, phone: v })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <EnhancedInput
                      label="GST Number"
                      name="company_gst"
                      icon={FileText}
                      value={companyForm.gst_number}
                      onChange={(v) =>
                        setCompanyForm({ ...companyForm, gst_number: v })
                      }
                    />
                    <EnhancedInput
                      label="Address"
                      name="company_address"
                      icon={MapPin}
                      value={companyForm.address}
                      onChange={(v) =>
                        setCompanyForm({ ...companyForm, address: v })
                      }
                    />
                  </div>

                  <div className="flex justify-end pt-6">
                    <button
                      type="submit"
                      className="px-8 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
                    >
                      <Sparkles size={18} />
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

function EnhancedInput({
  label,
  type = "text",
  value,
  onChange,
  name,
  id,
  autoComplete,
  icon: Icon,
  rightIcon,
}) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative">
      <label
        htmlFor={id || name}
        className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300"
      >
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <div
            className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${
              isFocused ? "text-blue-600 dark:text-blue-400" : "text-gray-400"
            }`}
          >
            <Icon size={18} />
          </div>
        )}
        <input
          type={type}
          name={name}
          id={id || name}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`
            w-full ${Icon ? "pl-12" : "pl-4"} ${
            rightIcon ? "pr-12" : "pr-4"
          } py-3.5 rounded-xl border-2
            bg-white dark:bg-gray-800 text-gray-900 dark:text-white
            transition-all duration-300
            ${
              isFocused
                ? "border-blue-500 dark:border-blue-400 ring-4 ring-blue-500/20 dark:ring-blue-400/20 shadow-lg"
                : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
            }
            outline-none placeholder-gray-400 dark:placeholder-gray-500
          `}
        />
        {rightIcon && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {rightIcon}
          </div>
        )}
      </div>
    </div>
  );
}
