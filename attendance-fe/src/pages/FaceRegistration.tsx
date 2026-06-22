import { useState, useRef, useEffect } from "react";
import {
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  VideoOff,
  User,
  Fingerprint,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useNavigate } from "react-router-dom";

interface RegisterResponse {
  success: boolean;
  code?: string;
  message: string;
  student_id?: string;
}

export default function FaceRegistration() {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RegisterResponse | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [studentId, setStudentId] = useState("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const navigate = useNavigate();

  // Tự động kích hoạt WebCam khi vào trang đăng ký
  useEffect(() => {
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 1280, height: 720, facingMode: "user" },
          audio: false,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          streamRef.current = stream;
          setCameraActive(true);
        }
      } catch (err) {
        console.error("Lỗi mở thiết bị camera:", err);
        showToast(
          "error",
          "Không thể truy cập Camera. Vui lòng cấp quyền cho trình duyệt.",
        );
        setCameraActive(false);
      }
    }

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [showToast]);

  // Xử lý chụp ảnh và gọi API Đăng ký
  const handleRegisterFace = async () => {
    if (!studentId.trim()) {
      showToast("warning", "Vui lòng nhập Mã số sinh viên trước khi đăng ký.");
      return;
    }

    if (!videoRef.current || !cameraActive) {
      showToast("error", "Thiết bị quay chưa sẵn sàng.");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      // 1. Khởi tạo canvas để trích xuất frame từ video
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Không thể khởi tạo bộ xử lý đồ họa 2D Canvas");

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // 2. Chuyển đổi thành Blob (JPEG)
      const imageBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95),
      );

      if (!imageBlob) {
        throw new Error("Trích xuất dữ liệu ảnh thất bại.");
      }

      // 3. Khởi tạo FormData theo chuẩn request cURL
      const formData = new FormData();
      formData.append("file", imageBlob, "register_face.jpg");
      formData.append("student_id", studentId);

      // 4. Gửi request sang FastAPI backend
      const response = await fetch("http://127.0.0.1:8000/api/ai/register", {
        method: "POST",
        headers: {
          accept: "application/json",
          // Lưu ý: Không set Content-Type thủ công khi dùng FormData,
          // trình duyệt sẽ tự động thiết lập boundary
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          code: "REGISTER_SUCCESS",
          message: data.message || "Đăng ký khuôn mặt thành công!",
          student_id: studentId,
        });
        showToast(
          "success",
          "Đã thu thập và lưu trữ sinh trắc học thành công!",
        );

        // Chuyển hướng sau khi đăng ký thành công
        setTimeout(() => {
          navigate("/attendance");
        }, 10000);
      } else {
        throw new Error(data.message || "Quá trình đăng ký thất bại.");
      }
    } catch (error: any) {
      console.error("Lỗi đăng ký:", error);
      showToast("error", error.message || "Không thể kết nối đến máy chủ AI.");
      setResult({
        success: false,
        code: "REGISTER_FAILED",
        message: error.message || "Hệ thống gặp sự cố. Vui lòng thử lại sau.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full px-8 mx-auto py-4">
      {/* KHU VỰC TIÊU ĐỀ */}
      <div className="flex flex-col gap-1">
        <h2 className="font-roobert text-[32px] font-medium tracking-[-0.021em] text-slate-text">
          Đăng ký dữ liệu khuôn mặt
        </h2>
        <p className="text-[14px] text-ash-gray">
          Vui lòng nhập MSSV và nhìn thẳng vào camera. Đảm bảo môi trường đủ
          sáng và không đeo kính râm hay khẩu trang.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* CỘT TRÁI & TRUNG TÂM: KHUNG CAMERA VÀ INPUT */}
        <div className="md:col-span-2 flex flex-col gap-4">
          {/* Ô NHẬP MSSV */}
          <div className="flex flex-col gap-2 bg-cloud-white border border-stone-border/50 rounded-[12px] p-4 shadow-sm">
            <label
              htmlFor="studentId"
              className="text-[12px] font-semibold text-ash-gray tracking-[0.048px] uppercase flex items-center gap-1.5"
            >
              <User size={14} className="text-steel-gray" />
              Mã số sinh viên
            </label>
            <input
              id="studentId"
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={isLoading}
              placeholder="VD: 22110129"
              className="w-full bg-canvas-fog text-slate-text border border-stone-border rounded-lg px-3 py-2.5 text-[14px] focus:outline-none focus:border-chartwell-blue/70 focus:ring-1 focus:ring-chartwell-blue/30 disabled:opacity-50 font-medium transition-all"
            />
          </div>

          <div className="bg-cloud-white rounded-[16px] p-2 shadow-xl border border-stone-border/30 relative aspect-video w-full overflow-hidden flex items-center justify-center bg-stone-border/20">
            {/* THẺ VIDEO */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full bg-slate-900 rounded-[10px] object-cover scale-x-[-1] ${
                !cameraActive ? "hidden" : ""
              }`}
            />

            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-ash-gray gap-2 bg-slate-900 rounded-[10px]">
                <VideoOff size={32} className="text-steel-gray animate-pulse" />
                <span className="text-[13px] font-medium">
                  Đang tìm kiếm luồng thiết bị quay...
                </span>
              </div>
            )}

            {cameraActive && !isLoading && (
              <>
                <div className="absolute top-6 left-6 w-8 h-8 border-t-[3px] border-l-[3px] border-chartwell-blue/80 rounded-tl-md"></div>
                <div className="absolute top-6 right-6 w-8 h-8 border-t-[3px] border-r-[3px] border-chartwell-blue/80 rounded-tr-md"></div>
                <div className="absolute bottom-6 left-6 w-8 h-8 border-b-[3px] border-l-[3px] border-chartwell-blue/80 rounded-bl-md"></div>
                <div className="absolute bottom-6 right-6 w-8 h-8 border-b-[3px] border-r-[3px] border-chartwell-blue/80 rounded-br-md"></div>

                {/* Guide overlay */}
                <div className="absolute inset-0 border-[2px] border-dashed border-cloud-white/20 rounded-[10px] m-10 pointer-events-none"></div>
              </>
            )}

            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-[2px]">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-chartwell-blue shadow-[0_0_20px_#3ba6f1] animate-[bounce_1.5s_infinite]"></div>
                <RefreshCw
                  size={36}
                  className="text-chartwell-blue animate-spin mb-4"
                />
                <span className="text-[13px] font-medium text-cloud-white tracking-[0.048px] uppercase">
                  Đang trích xuất đặc trưng sinh trắc học...
                </span>
              </div>
            )}
          </div>

          <button
            onClick={handleRegisterFace}
            disabled={isLoading || !cameraActive || !studentId.trim()}
            className="w-full bg-slate-800 text-cloud-white font-medium text-[14px] rounded-full py-3 hover:bg-slate-900 transition-colors shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {isLoading
              ? "Hệ thống đang lưu trữ..."
              : "Bấm Để Chụp & Đăng Ký Dữ Liệu"}
          </button>
        </div>

        {/* CỘT PHẢI: KHUNG THÔNG BÁO KẾT QUẢ */}
        <div className="md:col-span-1 flex flex-col gap-4">
          <div className="bg-cloud-white border border-stone-border rounded-[10px] p-6 shadow-md min-h-[240px] flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-ash-gray tracking-[0.048px] uppercase block mb-4">
                Trạng thái hệ thống
              </span>

              {!result && !isLoading && (
                <div className="flex flex-col items-center justify-center text-center py-8 gap-3 text-steel-gray">
                  <Fingerprint size={28} className="text-stone-border" />
                  <p className="text-[13px]">
                    Sẵn sàng ghi nhận dữ liệu khuôn mặt. Đảm bảo góc mặt rõ ràng
                    trước khi chụp.
                  </p>
                </div>
              )}

              {isLoading && (
                <div className="flex flex-col gap-4 animate-pulse">
                  <div className="h-6 bg-stone-border rounded-[4px] w-3/4"></div>
                  <div className="h-4 bg-stone-border rounded-[4px] w-full"></div>
                  <div className="h-4 bg-stone-border rounded-[4px] w-2/3"></div>
                </div>
              )}

              {result && (
                <div className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-300">
                  <div className="flex items-center gap-2.5">
                    {result.success ? (
                      <CheckCircle2
                        size={22}
                        className="text-emerald-500 shrink-0"
                      />
                    ) : (
                      <AlertCircle
                        size={22}
                        className="text-red-500 shrink-0"
                      />
                    )}
                    <span
                      className={`text-[15px] font-semibold ${
                        result.success ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {result.success
                        ? "Khởi Tạo Hồ Sơ Thành Công"
                        : "Khởi Tạo Thất Bại"}
                    </span>
                  </div>

                  {result.success && (
                    <div className="flex flex-col gap-2 bg-emerald-50/50 p-3 border border-emerald-100 rounded-[6px]">
                      <div className="text-[13px] text-slate-text">
                        <span className="text-ash-gray">MSSV Đăng ký:</span>{" "}
                        <strong className="font-semibold text-slate-800">
                          {result.student_id}
                        </strong>
                      </div>
                    </div>
                  )}

                  <p className="text-[13px] text-ash-gray leading-[1.6] bg-canvas-fog p-3 rounded-[6px] border border-stone-border/50">
                    {result.message}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
