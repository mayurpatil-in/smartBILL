import { Settings, RefreshCw } from "lucide-react";

export default function Maintenance() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-8 animate-fade-in bg-white p-10 rounded-3xl shadow-2xl border border-gray-100">
        <div className="flex justify-center relative">
          <div className="relative">
            <Settings className="w-24 h-24 text-purple-600 animate-[spin_4s_linear_infinite]" />
            <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-sm">
              <Settings className="w-12 h-12 text-blue-500 animate-[spin_3s_linear_infinite_reverse]" />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            System Under Maintenance
          </h1>
          <p className="text-gray-600 text-base leading-relaxed">
            We are currently performing scheduled maintenance to update
            SmartBill. The system will be back online shortly. Thank you for
            your patience!
          </p>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="mt-8 inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:-translate-y-0.5"
        >
          <RefreshCw className="w-5 h-5" />
          Check Status
        </button>
      </div>
    </div>
  );
}
