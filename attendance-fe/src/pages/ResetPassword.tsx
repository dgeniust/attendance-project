import React, { useState } from "react";
import { useSearchParams } from "react-router-dom"; // Cần cài đặt react-router-dom như bước trước
import { KeyRound, Lock, ArrowRight } from "lucide-react";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token"); // Trích xuất Token mã hóa từ Mail Link

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [statusMsg, setStatusMsg] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatusMsg({
        type: "error",
        text: "Xác nhận mật khẩu không trùng khớp!",
      });
      return;
    }
    // Thực tế: Gửi lệnh Axios POST kèm `{ token, new_password: password }` sang FastAPI
    setStatusMsg({
      type: "success",
      text: "Mật khẩu của bạn đã được cập nhật thành công! Đang chuyển hướng về trang chủ...",
    });
  };

  return (
    <div className="min-h-[calc(100vh-128px)] flex items-center justify-center py-12 px-6">
      <div className="w-full max-w-md bg-cloud-white p-8 rounded-[10px] shadow-md border border-stone-border flex flex-col gap-6">
        <div className="text-center flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-[10px] bg-chartwell-blue flex items-center justify-center text-cloud-white shadow-sm">
            <KeyRound size={20} />
          </div>
          <h2 className="font-roobert text-[20px] font-medium tracking-[-0.017em] mt-2">
            Thiết lập mật khẩu mới
          </h2>
          <p className="text-[13px] text-ash-gray">
            Mật khẩu mới phải đảm bảo độ dài bảo mật trên 8 ký tự
          </p>
        </div>

        {statusMsg && (
          <div
            className={`p-3 text-[13px] font-medium rounded-[4px] border ${
              statusMsg.type === "success"
                ? "bg-sky-tint/20 border-chartwell-blue text-slate-text"
                : "bg-red-50 border-red-200 text-red-600"
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        {!token ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-[4px] text-[13px] text-red-600 text-center">
            Mã xác thực Token không tồn tại hoặc đã bị chỉnh sửa trái phép. Vui
            lòng kiểm tra lại liên kết trong Email.
          </div>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleResetSubmit}>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-text tracking-[0.048px]">
                MẬT KHẨU MỚI
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ash-gray">
                  <Lock size={16} />
                </span>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới..."
                  className="w-full bg-cloud-white border border-platinum-outline rounded-none pl-10 pr-4 py-2.5 text-[14px] text-slate-text focus:outline-none focus:border-chartwell-blue transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-text tracking-[0.048px]">
                XÁC NHẬN MẬT KHẨU MỚI
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ash-gray">
                  <Lock size={16} />
                </span>
                <input
                  required
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Xác nhận lại mật khẩu..."
                  className="w-full bg-cloud-white border border-platinum-outline rounded-none pl-10 pr-4 py-2.5 text-[14px] text-slate-text focus:outline-none focus:border-chartwell-blue transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-chartwell-blue text-cloud-white font-medium text-[14px] rounded-full py-3 mt-2 hover:opacity-90 transition-opacity shadow-sm flex items-center justify-center gap-2"
            >
              Cập Nhật Mật Khẩu Mới <ArrowRight size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
