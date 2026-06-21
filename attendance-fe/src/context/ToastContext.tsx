import React, { createContext, useContext, useState, useCallback } from "react";
// Bổ sung thêm AlertTriangle (cho warning) và Info (cho info) từ lucide-react
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";

// 1. CẬP NHẬT TYPE: Thêm 'warning' và 'info'
export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((type: ToastType, message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    // Tự động xóa thông báo sau 4 giây
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  // Hàm helper để render Icon dựa trên ToastType
  const renderIcon = (type: ToastType) => {
    switch (type) {
      case "success":
        return (
          <CheckCircle2
            size={18}
            className="text-chartwell-blue shrink-0 mt-0.5"
          />
        );
      case "error":
        return (
          <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
        );
      case "warning":
        return (
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
        );
      case "info":
        return <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />;
    }
  };

  // Hàm helper để render Tiêu đề dựa trên ToastType
  const renderTitle = (type: ToastType) => {
    switch (type) {
      case "success":
        return "Hệ thống";
      case "error":
        return "Cảnh báo";
      case "warning":
        return "Lưu ý";
      case "info":
        return "Thông tin";
    }
  };

  // Hàm helper để render màu sắc của Progress Bar dựa trên ToastType
  const renderProgressBarColor = (type: ToastType) => {
    switch (type) {
      case "success":
        return "from-sky-tint to-chartwell-blue";
      case "error":
        return "from-red-300 to-red-500";
      case "warning":
        return "from-amber-300 to-amber-500";
      case "info":
        return "from-blue-300 to-blue-500";
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* KHU VỰC HIỂN THỊ CÁC TOAST BOX (GÓC TRÊN BÊN PHẢI) */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto w-full bg-cloud-white border border-stone-border rounded-[4px] p-4 shadow-md flex gap-3 items-start animate-in fade-in slide-in-from-top-4 duration-300 overflow-hidden relative"
          >
            {/* ICON CHỈ ĐỊNH LOẠI TRẠNG THÁI */}
            {renderIcon(toast.type)}

            {/* NỘI DUNG THÔNG BÁO */}
            <div className="flex-1 flex flex-col gap-0.5">
              <span className="text-[12px] font-semibold text-slate-text tracking-[0.048px] uppercase">
                {renderTitle(toast.type)}
              </span>
              <p className="text-[13px] text-ash-gray leading-[1.43]">
                {toast.message}
              </p>
            </div>

            {/* NÚT ĐÓNG NHANH */}
            <button
              onClick={() => removeToast(toast.id)}
              className="text-steel-gray hover:text-slate-text p-0.5 transition-colors"
            >
              <X size={14} />
            </button>

            {/* THANH TIẾN TRÌNH ĐẾM NGƯỢC (PROGRESS BAR) */}
            <div
              className={`absolute bottom-0 left-0 h-[2px] bg-gradient-to-r w-full origin-left animate-[shrink_4s_linear_forwards] ${renderProgressBarColor(toast.type)}`}
            />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast phải được bọc bên trong một ToastProvider");
  }
  return context;
}
