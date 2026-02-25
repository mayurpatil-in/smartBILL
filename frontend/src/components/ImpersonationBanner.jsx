import { LogOut, Activity } from "lucide-react";
import toast from "react-hot-toast";

export default function ImpersonationBanner() {
  const superAdminToken = localStorage.getItem("super_admin_token");

  if (!superAdminToken) return null;

  const handleRevert = () => {
    // Restore Super Admin token
    localStorage.setItem("access_token", superAdminToken);
    localStorage.removeItem("super_admin_token");
    toast.success("Welcome back, Super Admin!");
    window.location.replace("/super-admin");
  };

  return (
    <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-4 py-2 flex flex-col md:flex-row justify-between items-center gap-2 shadow-lg z-[100] relative animate-fade-in">
      <div className="flex items-center gap-2 font-bold text-sm">
        <Activity size={18} className="animate-pulse" />
        ⚠️ YOU ARE CURRENTLY IMPERSONATING A TENANT
      </div>
      <button
        onClick={handleRevert}
        className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
      >
        <LogOut size={16} />
        Return to Super Admin
      </button>
    </div>
  );
}
