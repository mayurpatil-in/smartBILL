import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  CheckCircle,
  XCircle,
  Loader2,
  Building,
  Phone,
  Calendar,
  User,
} from "lucide-react";
import axios from "axios";
import { API_URL } from "../api/axios";

export default function VerifyID() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      // Direct axios call to avoid auth interceptors for this specific public route if needed
      // But standard api instance handles 401. This is public route, so no token needed.
      // We can use standard axios.
      const res = await axios.get(`${API_URL}/public/verify/employee/${id}`, {
        params: { token },
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError("Invalid ID or Employee Not Found");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={40} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Verification Failed
          </h2>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden w-full max-w-sm relative">
        {/* Header Background */}
        <div className="h-32 bg-gradient-to-br from-blue-600 to-blue-800 absolute top-0 left-0 right-0"></div>

        <div className="relative pt-12 px-6 pb-6 text-center">
          {/* Company Name */}
          <div className="text-white/90 text-sm font-semibold uppercase tracking-wider mb-8 relative z-10">
            {data.company_name}
          </div>

          {/* Profile Photo */}
          <div className="relative inline-block mb-4">
            <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-gray-200 overflow-hidden mx-auto">
              {data.photo_path ? (
                <img
                  src={`${API_URL}/${data.photo_path.replace(/\\/g, "/")}`}
                  alt={data.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-100">
                  <User size={48} />
                </div>
              )}
            </div>

            {/* Verified Badge */}
            {data.is_active && (
              <div
                className="absolute bottom-1 right-1 bg-green-500 text-white p-1.5 rounded-full border-4 border-white shadow-sm"
                title="Active Employee"
              >
                <CheckCircle size={20} />
              </div>
            )}
          </div>

          {/* Name & Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{data.name}</h1>
          <p className="text-blue-600 font-medium mb-6 uppercase text-sm tracking-wide bg-blue-50 py-1 px-3 rounded-full inline-block">
            {data.designation}
          </p>

          {/* Details Grid */}
          <div className="space-y-3 text-left bg-gray-50 p-5 rounded-2xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg text-gray-400 border border-gray-100">
                <User size={16} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase">
                  Employee ID
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  EMP-{String(data.id).padStart(3, "0")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg text-gray-400 border border-gray-100">
                <Calendar size={16} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase">
                  Joining Date
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  {data.joining_date || "N/A"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-white rounded-lg text-gray-400 border border-gray-100">
                <Phone size={16} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase">
                  Contact
                </p>
                <a
                  href={`tel:${data.phone}`}
                  className="text-sm font-semibold text-blue-600 hover:underline"
                >
                  {data.phone || "N/A"}
                </a>
              </div>
            </div>
          </div>

          {/* Footer Status */}
          <div
            className={`mt-6 py-2 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${
              data.is_active
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {data.is_active ? (
              <>
                <CheckCircle size={16} /> Verified Active Employee
              </>
            ) : (
              <>
                <XCircle size={16} /> Inactive / Terminated
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
