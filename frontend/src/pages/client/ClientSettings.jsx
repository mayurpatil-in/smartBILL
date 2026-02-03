import { useState, useEffect } from "react";
import {
  User,
  Lock,
  Save,
  Loader2,
  Settings as SettingsIcon,
  Building2,
  Phone,
  MapPin,
  FileText,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import toast from "react-hot-toast";

export default function ClientSettings() {
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-600 rounded-xl">
          <SettingsIcon className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Account Settings
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manage your profile and security preferences
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${
            activeTab === "profile"
              ? "bg-white dark:bg-gray-700 shadow-md text-blue-600 dark:text-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
          }`}
        >
          <User size={18} />
          Profile Details
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all ${
            activeTab === "security"
              ? "bg-white dark:bg-gray-700 shadow-md text-blue-600 dark:text-blue-400"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
          }`}
        >
          <Lock size={18} />
          Security
        </button>
      </div>

      {/* Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-8">
        {activeTab === "profile" ? <ProfileForm /> : <SecurityForm />}
      </div>
    </div>
  );
}

function ProfileForm() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    gst_number: "",
    username: "",
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("client_token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/client/profile`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setFormData(data);
      }
    } catch (err) {
      toast.error("Failed to load profile");
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem("client_token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/client/profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: formData.name,
            phone: formData.phone,
            address: formData.address,
            gst_number: formData.gst_number,
          }),
        },
      );

      if (!res.ok) throw new Error("Update failed");

      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error("Could not update profile");
    } finally {
      setLoading(false);
    }
  };

  if (fetching)
    return (
      <div className="p-12 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24 mb-2"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>
    );

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
          Business Information
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Update your company details and contact information
        </p>

        <div className="grid gap-6">
          {/* Company Name */}
          <div>
            <label
              htmlFor="company-name"
              className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              <Building2 size={16} className="text-gray-400" />
              Company / Party Name
              <span className="text-red-500">*</span>
            </label>
            <input
              id="company-name"
              name="company-name"
              type="text"
              required
              autoComplete="organization"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="Enter company name"
            />
          </div>

          {/* Phone & GST */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="phone"
                className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                <Phone size={16} className="text-gray-400" />
                Phone Number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                value={formData.phone || ""}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="+91 XXXXX XXXXX"
              />
            </div>
            <div>
              <label
                htmlFor="gst-number"
                className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                <FileText size={16} className="text-gray-400" />
                GST Number
              </label>
              <input
                id="gst-number"
                name="gst-number"
                type="text"
                autoComplete="off"
                value={formData.gst_number || ""}
                onChange={(e) =>
                  setFormData({ ...formData, gst_number: e.target.value })
                }
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="22AAAAA0000A1Z5"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label
              htmlFor="address"
              className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              <MapPin size={16} className="text-gray-400" />
              Billing Address
            </label>
            <textarea
              id="address"
              name="address"
              rows={4}
              autoComplete="street-address"
              value={formData.address || ""}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all"
              placeholder="Enter complete billing address"
            />
          </div>

          {/* Username (Read Only) */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <label
              htmlFor="username-readonly"
              className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 mb-2"
            >
              <User size={16} />
              Username (Read Only)
            </label>
            <input
              id="username-readonly"
              name="username-readonly"
              type="text"
              readOnly
              value={formData.username}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 outline-none cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Save size={18} />
          )}
          {loading ? "Saving..." : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={fetchProfile}
          className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all"
        >
          Reset
        </button>
      </div>
    </form>
  );
}

function SecurityForm() {
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passData, setPassData] = useState({
    current: "",
    newPass: "",
    confirm: "",
  });

  // Password strength calculation
  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: "", color: "" };

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z\d]/.test(password)) strength++;

    if (strength <= 2)
      return { strength, label: "Weak", color: "text-red-600" };
    if (strength <= 3)
      return { strength, label: "Fair", color: "text-amber-600" };
    if (strength <= 4)
      return { strength, label: "Good", color: "text-blue-600" };
    return { strength, label: "Strong", color: "text-emerald-600" };
  };

  const passwordStrength = getPasswordStrength(passData.newPass);
  const passwordsMatch =
    passData.newPass &&
    passData.confirm &&
    passData.newPass === passData.confirm;
  const passwordsDontMatch =
    passData.newPass &&
    passData.confirm &&
    passData.newPass !== passData.confirm;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (passData.newPass !== passData.confirm) {
      toast.error("New passwords do not match");
      return;
    }

    if (passData.newPass.length < 8) {
      toast.error("Password must be at least 8 characters long");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("client_token");
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/client/change-password`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            current_password: passData.current,
            new_password: passData.newPass,
          }),
        },
      );

      const err = await res.json();
      if (!res.ok) throw new Error(err.detail || "Failed to change password");

      toast.success("Password changed successfully");
      setPassData({ current: "", newPass: "", confirm: "" });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
          Change Password
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          Ensure your account is using a strong password to stay secure
        </p>

        <div className="space-y-5">
          {/* Current Password */}
          <div>
            <label
              htmlFor="current-password"
              className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              <Lock size={16} className="text-gray-400" />
              Current Password
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="current-password"
                name="current-password"
                type={showPasswords.current ? "text" : "password"}
                required
                autoComplete="current-password"
                value={passData.current}
                onChange={(e) =>
                  setPassData({ ...passData, current: e.target.value })
                }
                className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() =>
                  setShowPasswords({
                    ...showPasswords,
                    current: !showPasswords.current,
                  })
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPasswords.current ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label
              htmlFor="new-password"
              className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              <Lock size={16} className="text-gray-400" />
              New Password
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="new-password"
                name="new-password"
                type={showPasswords.new ? "text" : "password"}
                required
                autoComplete="new-password"
                value={passData.newPass}
                onChange={(e) =>
                  setPassData({ ...passData, newPass: e.target.value })
                }
                className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() =>
                  setShowPasswords({
                    ...showPasswords,
                    new: !showPasswords.new,
                  })
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* Password Strength Indicator */}
            {passData.newPass && (
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">
                    Password Strength
                  </span>
                  <span
                    className={`text-xs font-medium ${passwordStrength.color}`}
                  >
                    {passwordStrength.label}
                  </span>
                </div>
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      passwordStrength.strength <= 2
                        ? "bg-red-500"
                        : passwordStrength.strength <= 3
                          ? "bg-amber-500"
                          : passwordStrength.strength <= 4
                            ? "bg-blue-500"
                            : "bg-emerald-500"
                    }`}
                    style={{
                      width: `${(passwordStrength.strength / 5) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label
              htmlFor="confirm-password"
              className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              <Lock size={16} className="text-gray-400" />
              Confirm New Password
              <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="confirm-password"
                name="confirm-password"
                type={showPasswords.confirm ? "text" : "password"}
                required
                autoComplete="new-password"
                value={passData.confirm}
                onChange={(e) =>
                  setPassData({ ...passData, confirm: e.target.value })
                }
                className={`w-full px-4 py-3 pr-12 rounded-xl border ${
                  passwordsDontMatch
                    ? "border-red-500 focus:ring-red-500"
                    : passwordsMatch
                      ? "border-emerald-500 focus:ring-emerald-500"
                      : "border-gray-200 dark:border-gray-700 focus:ring-blue-500"
                } bg-gray-50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:ring-2 focus:border-transparent outline-none transition-all`}
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() =>
                  setShowPasswords({
                    ...showPasswords,
                    confirm: !showPasswords.confirm,
                  })
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPasswords.confirm ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            {/* Match Indicator */}
            {passData.confirm && (
              <div className="mt-2 flex items-center gap-2">
                {passwordsMatch ? (
                  <>
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span className="text-xs text-emerald-600">
                      Passwords match
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle size={16} className="text-red-600" />
                    <span className="text-xs text-red-600">
                      Passwords do not match
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Password Requirements */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <AlertCircle
              size={16}
              className="text-blue-600 dark:text-blue-400 mt-0.5"
            />
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Password Requirements:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>At least 8 characters long</li>
                <li>Mix of uppercase and lowercase letters</li>
                <li>Include numbers and special characters</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          disabled={loading || passwordsDontMatch}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
        >
          {loading ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Lock size={18} />
          )}
          {loading ? "Updating..." : "Update Password"}
        </button>
        <button
          type="button"
          onClick={() => setPassData({ current: "", newPass: "", confirm: "" })}
          className="px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all"
        >
          Clear
        </button>
      </div>
    </form>
  );
}
