import { useState, useEffect } from "react";
import { X, ShieldCheck, KeyRound } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { setup2FA, verifySetup2FA, disable2FA } from "../api/superAdmin";
import { toast } from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";

export default function TwoFactorSetupModal({ onClose }) {
  const { updateUser } = useAuth();
  const [step, setStep] = useState(1); // 1 = loading/intro, 2 = setup, 3 = disable
  const [uri, setUri] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Attempt to start setup. If it fails with 400 "already enabled", we go to disable step.
    const initSetup = async () => {
      setLoading(true);
      try {
        const data = await setup2FA();
        setSecret(data.secret);
        setUri(data.uri);
        setStep(2);
      } catch (err) {
        if (err.response?.data?.detail?.includes("already enabled")) {
          setStep(3);
        } else {
          toast.error("Failed to initialize 2FA setup");
          onClose();
        }
      } finally {
        setLoading(false);
      }
    };
    initSetup();
  }, [onClose]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error("Code must be 6 digits");
      return;
    }
    setLoading(true);
    try {
      await verifySetup2FA(secret, code);
      updateUser({ is_2fa_enabled: true });
      toast.success("2FA has been successfully enabled!");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error("Code must be 6 digits");
      return;
    }
    setLoading(true);
    try {
      await disable2FA(code);
      updateUser({ is_2fa_enabled: false });
      toast.success("2FA has been disabled.");
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Invalid code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl text-blue-600 dark:text-blue-400">
              <ShieldCheck size={24} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Two-Factor Authentication
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {loading && step === 1 && (
            <div className="text-center text-gray-500 py-10">
              Loading security settings...
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  1. Scan this QR code with your Authenticator App (Google
                  Authenticator, Authy, etc.)
                </p>
                <div className="flex justify-center bg-white p-4 rounded-xl border-2 border-gray-100 inline-block">
                  {uri && <QRCodeSVG value={uri} size={200} />}
                </div>
                <p className="text-xs text-gray-500 mt-2 break-all px-4">
                  Or enter secret manually: <br />
                  <strong className="font-mono text-gray-800 dark:text-gray-200">{secret}</strong>
                </p>
              </div>

              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    2. Enter the 6-digit code to verify
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="w-full px-4 py-3 text-center tracking-widest text-xl rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Verify & Enable 2FA"}
                </button>
              </form>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                <ShieldCheck size={48} className="mx-auto text-green-500 mb-2" />
                <h3 className="text-lg font-bold text-green-700 dark:text-green-400">
                  2FA is Enabled
                </h3>
                <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                  Your account is protected with Two-Factor Authentication.
                </p>
              </div>

              <form onSubmit={handleDisable} className="space-y-4 pt-4">
                <p className="text-sm text-gray-600 dark:text-gray-300 text-center">
                  To disable 2FA, please verify your identity by entering your current authenticator code.
                </p>
                <div className="relative">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="w-full pl-12 pr-4 py-3 tracking-widest text-lg rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                >
                  {loading ? "Disabling..." : "Disable 2FA"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
