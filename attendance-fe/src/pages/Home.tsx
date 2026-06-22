import {
  QrCode,
  ClipboardList,
  Bell,
  Layers,
  CheckCircle,
  ArrowRight,
} from "lucide-react";
import type { UserProfile } from "../components/Header";
import { useNavigate } from "react-router-dom";
import { attendanceService } from "../services/attendance";
import { useToast } from "../context/ToastContext";

export default function Home() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const getStudentIdFromStorage = (): string | null => {
    const profileString = localStorage.getItem("user_profile");

    if (!profileString) return null;

    try {
      // Ép kiểu dữ liệu sau khi parse về interface UserProfile
      const profileObject = JSON.parse(profileString) as UserProfile;

      return profileObject.student_id;
    } catch (error) {
      console.error("Lỗi parse JSON:", error);
      return null;
    }
  };
  const handleCheck = async () => {
    try {
      const currentStudentId: string | null = getStudentIdFromStorage();
      if (currentStudentId) {
        const res = await attendanceService.checkAttendance(currentStudentId);
        if (res && res.has_checked_in) {
          showToast("success", "Hôm nay bạn đã điểm danh rồi");
        } else {
          navigate("/attendance");
        }
      }
    } catch (err) {}
  };
  return (
    <main className="max-w-5xl mx-auto px-6 pt-4 pb-24 flex flex-col gap-[48px]">
      {/* HERO SECTION */}
      <section className="flex flex-col items-center text-center pt-12 pb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-cloud-white border border-stone-border rounded-full text-[12px] font-medium text-ash-gray mb-6 shadow-md">
          <span className="w-2 h-2 rounded-full bg-chartwell-blue"></span>
          Hệ thống quản lý chuyên cần học kỳ 2026
        </div>
        <h1 className="font-roobert text-[52px] leading-[1] tracking-[-0.025em] font-medium max-w-3xl mb-4">
          Điểm danh sinh viên, <br />
          <span className="text-chartwell-blue">Đơn giản & Chính xác.</span>
        </h1>
        <p className="text-[18px] leading-[1.5] text-ash-gray max-w-2xl mb-8">
          Nền tảng phân tích và quản lý sự chuyên cần minh bạch dành cho nhà
          trường. Loại bỏ giấy tờ, tối ưu hóa thời gian với dữ liệu thời gian
          thực.
        </p>
        <div className="flex gap-4 mt-4">
          <button
            className="bg-chartwell-blue text-cloud-white text-[15px] font-medium rounded-full px-6 py-2.5 hover:opacity-90 transition-opacity shadow-md flex items-center gap-2"
            onClick={() => handleCheck()}
          >
            Điểm danh ngay <ArrowRight size={18} />
          </button>
          <button
            className="bg-chartwell-blue text-cloud-white text-[15px] font-medium rounded-full px-6 py-2.5 hover:opacity-90 transition-opacity shadow-md flex items-center gap-2"
            onClick={() => navigate("/register-face")}
          >
            Đăng kí khuôn mặt
          </button>
          <button className="bg-transparent text-slate-text border border-stone-border text-[15px] font-medium rounded-[4px] px-6 py-2.5 hover:bg-stone-border/20 transition-colors">
            Tìm hiểu thêm
          </button>
        </div>
      </section>

      <hr className="border-stone-border" />

      {/* FEATURE SECTION */}
      <section id="features" className="flex flex-col gap-8">
        <div className="text-center">
          <h2 className="font-roobert text-[32px] leading-[1.12] tracking-[-0.021em] mb-2">
            Khám Phá Tính Năng
          </h2>
          <p className="text-ash-gray text-[15px]">
            Công cụ tinh gọn được thiết kế riêng cho môi trường học thuật.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dashboard Card 1 */}
          <div className="bg-cloud-white rounded-[10px] p-6 shadow-md border border-stone-border/50">
            <QrCode className="text-chartwell-blue mb-4" size={28} />
            <h3 className="font-roobert text-[20px] tracking-[-0.017em] font-medium mb-2">
              Quét QR Tốc Độ Cao
            </h3>
            <p className="text-[14px] leading-[1.5] text-ash-gray">
              Sinh viên quét mã QR động được cập nhật liên tục trên màn hình
              giảng đường, điểm danh hàng trăm sinh viên chỉ trong vài giây.
            </p>
          </div>

          {/* Dashboard Card 2 */}
          <div className="bg-cloud-white rounded-[10px] p-6 shadow-md border border-stone-border/50">
            <ClipboardList className="text-chartwell-blue mb-4" size={28} />
            <h3 className="font-roobert text-[20px] tracking-[-0.017em] font-medium mb-2">
              Báo Cáo Tự Động
            </h3>
            <p className="text-[14px] leading-[1.5] text-ash-gray">
              Hệ thống tự động tổng hợp dữ liệu chuyên cần, cảnh báo sinh viên
              vắng quá số buổi quy định thông qua biểu đồ trực quan.
            </p>
          </div>

          {/* Dashboard Card 3 */}
          <div className="bg-cloud-white rounded-[10px] p-6 shadow-md border border-stone-border/50">
            <Layers className="text-chartwell-blue mb-4" size={28} />
            <h3 className="font-roobert text-[20px] tracking-[-0.017em] font-medium mb-2">
              Tích Hợp LMS
            </h3>
            <p className="text-[14px] leading-[1.5] text-ash-gray">
              Đồng bộ hóa mượt mà với các hệ thống quản lý học tập (LMS) hiện
              tại của trường như Moodle, Canvas hoặc Blackboard.
            </p>
          </div>

          {/* Dashboard Card 4 */}
          <div className="bg-cloud-white rounded-[10px] p-6 shadow-md border border-stone-border/50">
            <Bell className="text-chartwell-blue mb-4" size={28} />
            <h3 className="font-roobert text-[20px] tracking-[-0.017em] font-medium mb-2">
              Cảnh Báo Chủ Động
            </h3>
            <p className="text-[14px] leading-[1.5] text-ash-gray">
              Gửi thông báo qua email hoặc ứng dụng cho sinh viên khi điểm
              chuyên cần chạm mức giới hạn, giúp họ chủ động kế hoạch học tập.
            </p>
          </div>
        </div>
      </section>

      {/* ABOUT SECTION */}
      <section id="about" className="mt-12">
        <div className="bg-cloud-white rounded-[16px] p-8 md:p-12 shadow-xl border border-stone-border/30 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1">
            <h2 className="font-roobert text-[32px] leading-[1.12] tracking-[-0.021em] mb-4">
              Tại sao chọn nền tảng của chúng tôi?
            </h2>
            <p className="text-[15px] leading-[1.6] text-ash-gray mb-6">
              Chúng tôi tin rằng việc quản lý sự chuyên cần không nên là gánh
              nặng hành chính. Thay vào đó, nó phải là một luồng dữ liệu thông
              suốt, giúp giảng viên tập trung vào việc giảng dạy và sinh viên
              duy trì kỷ luật học tập.
            </p>
            <ul className="flex flex-col gap-3">
              {[
                "Thiết kế tối giản, loại bỏ tính năng thừa",
                "Bảo mật dữ liệu cá nhân sinh viên",
                "Kiến trúc máy chủ đám mây ổn định",
              ].map((item, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 text-[14px] font-medium text-slate-text"
                >
                  <CheckCircle size={18} className="text-chartwell-blue" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Minimalist Abstract Illustration / Metric display */}
          <div className="flex-1 bg-canvas-fog rounded-[10px] p-8 border border-stone-border flex flex-col justify-center items-center h-full min-h-[250px]">
            <div className="text-center">
              <div className="font-roobert text-[52px] text-chartwell-blue font-medium leading-none mb-2">
                99.8%
              </div>
              <div className="text-[14px] text-ash-gray">
                Tỷ lệ điểm danh thành công <br />
                under 3 giây
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CONTACT SECTION */}
      <section id="contact" className="max-w-2xl mx-auto w-full mt-8">
        <div className="text-center mb-8">
          <h2 className="font-roobert text-[32px] leading-[1.12] tracking-[-0.021em] mb-2">
            Bạn cần hỗ trợ?
          </h2>
          <p className="text-ash-gray text-[15px]">
            Để lại thông tin, đội ngũ kỹ thuật sẽ liên hệ tư vấn tích hợp hệ
            thống cho trường của bạn.
          </p>
        </div>

        <form className="bg-cloud-white p-8 rounded-[10px] shadow-md border border-stone-border flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-slate-text">
              Họ và Tên
            </label>
            <input
              type="text"
              placeholder="Nhập họ và tên..."
              className="w-full bg-cloud-white border border-platinum-outline rounded-none px-4 py-2.5 text-[14px] text-slate-text placeholder-ash-gray focus:outline-none focus:border-chartwell-blue transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-medium text-slate-text">
              Email tổ chức
            </label>
            <input
              type="email"
              placeholder="email@truong.edu.vn"
              className="w-full bg-cloud-white border border-platinum-outline rounded-none px-4 py-2.5 text-[14px] text-slate-text placeholder-ash-gray focus:outline-none focus:border-chartwell-blue transition-colors"
            />
          </div>

          <button
            type="button"
            className="w-full bg-chartwell-blue text-cloud-white font-medium rounded-full py-3 mt-2 hover:opacity-90 transition-opacity"
          >
            Gửi Yêu Cầu
          </button>
        </form>
      </section>
    </main>
  );
}
