import { useState, useEffect, useCallback } from "react";
import { User, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom"; // Hoặc link điều hướng tùy bạn config
import { authService } from "../services/authService";
import { tokenManager } from "../utils/api";

export interface UserProfile {
  student_id: string;
  email: string;
  name: string;
  reward_points?: number; // Thêm trường điểm (nếu có, hoặc mặc định)
}

export default function Header() {
  const navigate = useNavigate();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchProfile = useCallback(async () => {
    const token = tokenManager.getToken();
    if (!token) return;

    try {
      const res = await authService.profile(token);
      console.log("Profile API response:", JSON.stringify(res));
      if (res.success) {
        localStorage.setItem("user_profile", JSON.stringify(res.user_profile));
        setUser(res.user_profile);
      }
    } catch (err) {
      tokenManager.removeToken();
      setUser(null);
    }
  }, []);
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Xử lý đăng xuất nhanh
  const handleLogout = () => {
    tokenManager.removeToken();
    setUser(null);
    setShowDropdown(false);
    navigate("/auth");
  };

  // Trích xuất chữ cái đầu của tên để làm Avatar (Ví dụ: Nguyen Thanh Dat -> D)
  const getInitialName = (name: string) => {
    if (!name) return "S";
    const parts = name.trim().split(" ");
    return parts[parts.length - 1].charAt(0).toUpperCase();
  };

  return (
    <nav className="w-full bg-canvas-fog border-b border-stone-border sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* LOGO - Đã fix lại kích thước bao ngoài gọn gàng */}
        <div className="flex items-center gap-2">
          <div className="px-3 h-8 rounded-[10px] bg-chartwell-blue flex items-center justify-center text-cloud-white font-roobert font-semibold tracking-[-0.016em] text-sm">
            DASH
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <div className="hidden md:flex items-center gap-8">
          <a
            href="#features"
            className="text-sm font-medium text-ash-gray hover:text-slate-text transition-colors"
          >
            Tính Năng
          </a>
          <a
            href="#about"
            className="text-sm font-medium text-ash-gray hover:text-slate-text transition-colors"
          >
            Giới Thiệu
          </a>
          <a
            href="#contact"
            className="text-sm font-medium text-ash-gray hover:text-slate-text transition-colors"
          >
            Liên Hệ
          </a>
        </div>

        {/* RIGHT SIDE: AUTHENTICATION CONTAINER */}
        <div className="flex items-center gap-4 relative">
          {user ? (
            <>
              {/* PILL CARD: HIỂN THỊ SỐ ĐIỂM CHUYÊN CẦN */}
              <div className="hidden sm:inline-flex bg-cloud-white border border-stone-border rounded-full px-3 py-1 shadow-md text-[12px] font-medium text-slate-text tracking-[0.048px]">
                🌟 Points:{" "}
                <span className="font-semibold text-chartwell-blue ml-1">
                  {user.reward_points ?? 0}
                </span>
              </div>

              {/* AVATAR CLICKABLE ICON */}
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-8 h-8 rounded-full bg-cloud-white border border-stone-border hover:border-hover-stone flex items-center justify-center font-roobert font-medium text-sm text-slate-text shadow-subtle transition-colors cursor-pointer"
              >
                {getInitialName(user.name)}
              </button>

              {/* DROPDOWN MENU KHI NHẤN VÀO AVATAR */}
              {showDropdown && (
                <div className="absolute right-0 top-10 w-48 bg-cloud-white border border-stone-border rounded-[4px] shadow-md p-1 flex flex-col z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-3 py-2 border-b border-stone-border/60 flex flex-col min-w-0">
                    <span className="text-[13px] font-semibold text-slate-text truncate">
                      {user.name}
                    </span>
                    <span className="text-[11px] text-ash-gray truncate">
                      {user.student_id}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      navigate("/dashboard");
                      setShowDropdown(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] text-ash-gray hover:text-slate-text hover:bg-canvas-fog transition-colors rounded-none"
                  >
                    <User size={14} /> Không gian cá nhân
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] text-red-600 hover:bg-red-50 transition-colors rounded-none border-t border-stone-border/60"
                  >
                    <LogOut size={14} /> Đăng xuất
                  </button>
                </div>
              )}
            </>
          ) : (
            /* TRƯỜNG HỢP CHƯA ĐĂNG NHẬP: HIỂN THỊ NÚT TRUYỀN THỐNG */
            <button
              onClick={() => navigate("/auth")}
              className="bg-chartwell-blue text-cloud-white text-sm font-medium rounded-full px-5 py-2 hover:opacity-90 transition-opacity shadow-subtle cursor-pointer"
            >
              Đăng Nhập
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
