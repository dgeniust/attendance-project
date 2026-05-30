// --- Auth.tsx ---
import { useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Mail,
  Lock,
  User,
  IdCard,
} from "lucide-react";
import { authService } from "../services/authService";
import { tokenManager } from "../utils/api";
import { useToast } from "../context/ToastContext"; // Nạp custom toast hook
import { useNavigate } from "react-router-dom";

export default function Auth() {
  const [view, setView] = useState<"login" | "register" | "forgot">("login");
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast(); // Khai báo hàm kích hoạt hệ thống thông báo
  const navigate = useNavigate();
  // Xử lý Đăng Nhập
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await authService.login(data);
      console.log("Login API response:", JSON.stringify(response));
      tokenManager.setToken(response.access_token);

      // Bắn thông tin dạng Toast thành công
      showToast("success", "Chào mừng bạn trở lại!");
      navigate("/");
      console.log("User info:", response.user);
    } catch (error: any) {
      // Bắn thông tin dạng Toast thất bại
      showToast(
        "error",
        error.message || "Sai thông tin đăng nhập hoặc tài khoản bị khóa.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý Đăng Ký
  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const response = await authService.register(data);
      if (response.success) {
        showToast(
          "success",
          response.message || "Tạo tài khoản thành công! Hãy đăng nhập.",
        );
        setView("login");
      }
    } catch (error: any) {
      showToast(
        "error",
        error.message || "Đăng ký thất bại, dữ liệu không hợp lệ.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-128px)] flex items-center justify-center py-12 px-6">
      <div className="w-full max-w-md bg-cloud-white p-8 rounded-[10px] shadow-md border border-stone-border flex flex-col gap-6">
        {/* LOGO & TIÊU ĐỀ */}
        <div className="text-center flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-[10px] bg-chartwell-blue flex items-center justify-center text-cloud-white font-roobert font-semibold text-xl shadow-sm">
            A.
          </div>
          <h2 className="font-roobert text-[20px] font-medium tracking-[-0.017em] mt-2">
            {view === "login" && "Chào mừng trở lại"}
            {view === "register" && "Tạo tài khoản học thuật"}
            {view === "forgot" && "Khôi phục mật khẩu"}
          </h2>
          <p className="text-[13px] text-ash-gray">
            {view === "login" &&
              "Hệ thống điểm danh sinh trắc học thông minh PALS"}
            {view === "register" &&
              "Điền thông tin để đăng ký hồ sơ AttendSync"}
            {view === "forgot" &&
              "Nhập Email trường để nhận liên kết xác thực ngắn hạn"}
          </p>
        </div>

        {/* ----------------- FORM 1: LOGIN ----------------- */}
        {view === "login" && (
          <form className="flex flex-col gap-4" onSubmit={handleLogin}>
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-text tracking-[0.048px]">
                MSSV HOẶC EMAIL
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ash-gray">
                  <User size={16} />
                </span>
                <input
                  required
                  name="student_id_or_email"
                  type="text"
                  placeholder="221101xx hoặc email@truong.edu.vn"
                  className="w-full bg-cloud-white border border-platinum-outline rounded-none pl-10 pr-4 py-2.5 text-[14px] text-slate-text placeholder-ash-gray focus:outline-none focus:border-chartwell-blue transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[12px] font-medium text-slate-text tracking-[0.048px]">
                  MẬT KHẨU
                </label>
                <button
                  type="button"
                  onClick={() => setView("forgot")}
                  className="text-[12px] font-medium text-chartwell-blue hover:underline"
                >
                  Quên mật khẩu?
                </button>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ash-gray">
                  <Lock size={16} />
                </span>
                <input
                  required
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  className="w-full bg-cloud-white border border-platinum-outline rounded-none pl-10 pr-4 py-2.5 text-[14px] text-slate-text placeholder-ash-gray focus:outline-none focus:border-chartwell-blue transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-chartwell-blue text-cloud-white font-medium text-[14px] rounded-full py-3 mt-2 hover:opacity-90 transition-opacity shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoading ? "Đang xử lý..." : "Đăng Nhập Vào Hệ Thống"}{" "}
              <ArrowRight size={16} />
            </button>

            <p className="text-[13px] text-ash-gray text-center mt-2">
              Chưa có tài khoản?{" "}
              <button
                type="button"
                onClick={() => setView("register")}
                className="text-chartwell-blue font-medium hover:underline"
              >
                Đăng ký ngay
              </button>
            </p>
          </form>
        )}

        {/* ----------------- FORM 2: REGISTER ----------------- */}
        {view === "register" && (
          <form className="flex flex-col gap-4" onSubmit={handleRegister}>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-slate-text tracking-[0.048px]">
                  MÃ SỐ SINH VIÊN
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ash-gray">
                    <IdCard size={16} />
                  </span>
                  <input
                    required
                    name="student_id"
                    type="text"
                    placeholder="221101xx"
                    className="w-full bg-cloud-white border border-platinum-outline rounded-none pl-10 pr-4 py-2.5 text-[14px] text-slate-text placeholder-ash-gray focus:outline-none focus:border-chartwell-blue transition-colors"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] font-medium text-slate-text tracking-[0.048px]">
                  HỌ VÀ TÊN
                </label>
                <input
                  required
                  name="name"
                  type="text"
                  placeholder="Nguyễn Văn A"
                  className="w-full bg-cloud-white border border-platinum-outline rounded-none px-4 py-2.5 text-[14px] text-slate-text placeholder-ash-gray focus:outline-none focus:border-chartwell-blue transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-text tracking-[0.048px]">
                EMAIL TỔ CHỨC (EDU)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ash-gray">
                  <Mail size={16} />
                </span>
                <input
                  required
                  name="email"
                  type="email"
                  placeholder="221101xx@student.hcmute.edu.vn"
                  className="w-full bg-cloud-white border border-platinum-outline rounded-none pl-10 pr-4 py-2.5 text-[14px] text-slate-text placeholder-ash-gray focus:outline-none focus:border-chartwell-blue transition-colors"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-text tracking-[0.048px]">
                MẬT KHẨU KHỞI TẠO
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ash-gray">
                  <Lock size={16} />
                </span>
                <input
                  required
                  name="password"
                  type="password"
                  placeholder="Tối thiểu 8 ký tự"
                  className="w-full bg-cloud-white border border-platinum-outline rounded-none pl-10 pr-4 py-2.5 text-[14px] text-slate-text placeholder-ash-gray focus:outline-none focus:border-chartwell-blue transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-chartwell-blue text-cloud-white font-medium text-[14px] rounded-full py-3 mt-2 hover:opacity-90 transition-opacity shadow-sm flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoading ? "Đang xử lý..." : "Kích Hoạt Tài Khoản"}{" "}
              <ShieldCheck size={16} />
            </button>

            <p className="text-[13px] text-ash-gray text-center mt-2">
              Đã kích hoạt?{" "}
              <button
                type="button"
                onClick={() => setView("login")}
                className="text-chartwell-blue font-medium hover:underline"
              >
                Quay lại đăng nhập
              </button>
            </p>
          </form>
        )}

        {/* ----------------- FORM 3: FORGOT PASSWORD ----------------- */}
        {view === "forgot" && (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              showToast(
                "success",
                "Liên kết khôi phục đã gửi! Vui lòng kiểm tra hộp thư đến (Spam).",
              );
            }}
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-text tracking-[0.048px]">
                EMAIL ĐÃ LIÊN KẾT
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-ash-gray">
                  <Mail size={16} />
                </span>
                <input
                  required
                  type="email"
                  placeholder="username@student.hcmute.edu.vn"
                  className="w-full bg-cloud-white border border-platinum-outline rounded-none pl-10 pr-4 py-2.5 text-[14px] text-slate-text placeholder-ash-gray focus:outline-none focus:border-chartwell-blue transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-chartwell-blue text-cloud-white font-medium text-[14px] rounded-full py-3 mt-2 hover:opacity-90 transition-opacity shadow-sm flex items-center justify-center gap-2"
            >
              Yêu Cầu Cấp Lại Mật Khẩu
            </button>

            <button
              type="button"
              onClick={() => setView("login")}
              className="inline-flex items-center justify-center gap-2 text-[13px] text-ash-gray font-medium hover:text-slate-text transition-colors mt-2"
            >
              <ArrowLeft size={14} /> Quay lại trang đăng nhập
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
