import { Outlet, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function AuthLayout() {
  return (
    <div className="min-h-screen font-inter bg-canvas-fog text-slate-text flex flex-col selection:bg-chartwell-blue selection:text-cloud-white">
      {/* Thanh công cụ phụ trợ phía trên để quay về trang chủ */}
      <div className="w-full max-w-7xl mx-auto px-6 h-16 flex items-center">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-ash-gray hover:text-slate-text transition-colors"
        >
          <ArrowLeft size={16} /> Quay lại trang chủ
        </Link>
      </div>

      {/* Khung nội dung trung tâm (Login / Register / Reset) */}
      <div className="flex-grow flex items-center justify-center px-6 pb-16">
        <Outlet />
      </div>
    </div>
  );
}
