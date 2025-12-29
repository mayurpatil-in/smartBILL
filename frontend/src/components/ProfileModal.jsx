import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, User, Building, Lock } from "lucide-react";
import {
  getProfile,
  updateUserProfile,
  updateCompanyProfile,
} from "../api/profile";
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
                      value={personalForm.name}
                      onChange={(v) =>
                        setPersonalForm({ ...personalForm, name: v })
                      }
                    />
                    <Input
                      label="Email Address"
                      type="email"
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
                  <Input
                    label="Company Name"
                    value={companyForm.name}
                    onChange={(v) =>
                      setCompanyForm({ ...companyForm, name: v })
                    }
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Email"
                      type="email"
                      value={companyForm.email}
                      onChange={(v) =>
                        setCompanyForm({ ...companyForm, email: v })
                      }
                    />
                    <Input
                      label="Phone"
                      value={companyForm.phone}
                      onChange={(v) =>
                        setCompanyForm({ ...companyForm, phone: v })
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="GST Number"
                      value={companyForm.gst_number}
                      onChange={(v) =>
                        setCompanyForm({ ...companyForm, gst_number: v })
                      }
                    />
                    <Input
                      label="Address"
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

function Input({ label, type = "text", value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
        {label}
      </label>
      <input
        type={type}
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
