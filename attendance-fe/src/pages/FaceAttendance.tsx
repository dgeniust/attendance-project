import { useState, useRef, useEffect } from "react";
import {
  Camera,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Award,
  VideoOff,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { attendanceService } from "../services/attendance";

interface AttendanceResponse {
  success: boolean;
  code: string;
  student_id?: string;
  name?: string;
  score?: number;
  message: string;
}

export default function FaceAttendance() {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AttendanceResponse | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  // Khai báo các Ref điều khiển luồng Media stream
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Tự động kích hoạt mở Webcam khi Sinh viên vào màn hình điểm danh
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

    // Dọn dẹp tắt đèn camera khi sinh viên chuyển sang trang khác (Unmount component)
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [showToast]);

  // Hàm xử lý trích xuất Frame hiện tại từ luồng Video và gửi sang FastAPI
  const handleScanAttendance = async () => {
    if (!videoRef.current || !cameraActive) {
      showToast("error", "Thiết bị quay chưa sẵn sàng.");
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      // 1. Khởi tạo canvas ẩn để trích xuất dữ liệu ảnh của thẻ <video>
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Không thể khởi tạo bộ xử lý đồ họa 2D Canvas");

      // Vẽ frame ảnh hiện tại từ luồng camera lên canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // 2. Chuyển đổi dữ liệu canvas thành tệp Blob nhị phân dạng JPEG để gửi đi
      const imageBlob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.95),
      );

      if (!imageBlob) {
        throw new Error("Trích xuất dữ liệu ảnh thất bại.");
      }
      console.log("Captured image blob:", imageBlob);
      // 3. Đẩy tệp tin ảnh thật vào hàm service để gửi request dạng multipart/form-data
      const res = await attendanceService.submitFaceData(imageBlob);
      console.log("Attendance API response:", JSON.stringify(res));

      setResult(res);
      if (res.success) {
        showToast("success", `Đã xác thực danh tính: ${res.name}`);
      } else {
        showToast("error", res.message || "Xác thực không thành công.");
      }
    } catch (error: any) {
      showToast(
        "error",
        error.message || "Hệ thống AI gặp sự cố đường truyền mạng.",
      );
      setResult({
        success: false,
        code: "INTERNAL_ERROR",
        message:
          error.message ||
          "Lỗi hệ thống phụ trách điểm danh. Vui lòng căn chỉnh lại góc máy và thử lại.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full px-8 mx-auto py-4">
      {/* KHU VỰC TIÊU ĐỀ SECTION CHÍNH */}
      <div className="flex flex-col gap-1">
        <h2 className="font-roobert text-[32px] font-medium tracking-[-0.021em] text-slate-text">
          Xác thực khuôn mặt
        </h2>
        <p className="text-[14px] text-ash-gray">
          Vui lòng nhìn thẳng vào camera trường, hệ thống AI đang tự động chạy
          giải thuật chống giả mạo thực thể sống.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* CỘT TRÁI & TRUNG TÂM: KHUNG CAMERA THẬT (ELEVATED FEATURE CARD) */}
        <div className="md:col-span-2 flex flex-col gap-4">
          <div className="bg-cloud-white rounded-[16px] p-2 shadow-xl border border-stone-border/30 relative aspect-video w-full overflow-hidden flex items-center justify-center bg-stone-border/20">
            {/* THẺ VIDEO HIỂN THỊ LUỒNG CAMERA THỰC TẾ */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full bg-slate-900 rounded-[10px] object-cover scale-x-[-1] ${
                !cameraActive ? "hidden" : ""
              }`}
            />

            {/* KHUNG HIỂN THỊ LỖI KHI CAMERA MẤT QUYỀN TRUY CẬP */}
            {!cameraActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-ash-gray gap-2 bg-slate-900 rounded-[10px]">
                <VideoOff size={32} className="text-steel-gray animate-pulse" />
                <span className="text-[13px] font-medium">
                  Đang tìm kiếm luồng thiết bị quay...
                </span>
              </div>
            )}

            {/* KHUNG NGẮM MỤC TIÊU (HIỂN THỊ KHI CAMERA SẴN SÀNG VÀ KHÔNG LOADING) */}
            {cameraActive && !isLoading && (
              <>
                <div className="absolute top-6 left-6 w-6 h-6 border-t-2 border-l-2 border-chartwell-blue/70"></div>
                <div className="absolute top-6 right-6 w-6 h-6 border-t-2 border-r-2 border-chartwell-blue/70"></div>
                <div className="absolute bottom-6 left-6 w-6 h-6 border-b-2 border-l-2 border-chartwell-blue/70"></div>
                <div className="absolute bottom-6 right-6 w-6 h-6 border-b-2 border-r-2 border-chartwell-blue/70"></div>
              </>
            )}

            {/* TRẠNG THÁI: ĐANG LOADING QUÉT AI (LASER SCANNING LINE EFFECT) */}
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-[1px]">
                {/* Đường Line Laser chạy quét từ trên xuống dưới liên tục */}
                <div className="absolute top-0 left-0 w-full h-[2px] bg-chartwell-blue shadow-[0_0_15px_#3ba6f1] animate-[bounce_2s_infinite]"></div>

                <RefreshCw
                  size={32}
                  className="text-chartwell-blue animate-spin mb-3"
                />
                <span className="text-[13px] font-medium text-cloud-white tracking-[0.048px] uppercase">
                  AI Đang phân tích sinh trắc học...
                </span>
              </div>
            )}
          </div>

          {/* HÀNH ĐỘNG KÍCH HOẠT QUÉT - PRIMARY FILLED BUTTON CHUẨN PILL */}
          <button
            onClick={handleScanAttendance}
            disabled={isLoading || !cameraActive}
            className="w-full bg-chartwell-blue text-cloud-white font-medium text-[14px] rounded-full py-3 hover:opacity-90 transition-opacity shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isLoading
              ? "Đang xử lý luồng ảnh..."
              : "Bấm Để Chụp Hình Điểm Danh"}
          </button>
        </div>

        {/* CỘT PHẢI: KHUNG THÔNG BÁO KẾT QUẢ ĐIỂM DANH (DASHBOARD CARD) */}
        <div className="md:col-span-1 flex flex-col gap-4">
          <div className="bg-cloud-white border border-stone-border rounded-[10px] p-6 shadow-md min-h-[240px] flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-semibold text-ash-gray tracking-[0.048px] uppercase block mb-4">
                Kết quả định danh
              </span>

              {/* TRẠNG THÁI CHƯA CÓ RESPONSE */}
              {!result && !isLoading && (
                <div className="flex flex-col items-center justify-center text-center py-8 gap-2 text-steel-gray">
                  <Camera size={24} />
                  <p className="text-[13px]">
                    Vui lòng nhấn nút chụp hình để nhận phản hồi kết quả dữ
                    liệu.
                  </p>
                </div>
              )}

              {/* TRẠNG THÁI ĐANG ĐỢI RESPONSE (SKELETON ANIMATION LOADER) */}
              {isLoading && (
                <div className="flex flex-col gap-4 animate-pulse">
                  <div className="h-6 bg-stone-border rounded-[4px] w-3/4"></div>
                  <div className="h-4 bg-stone-border rounded-[4px] w-1/2"></div>
                  <div className="h-4 bg-stone-border rounded-[4px] w-2/3"></div>
                </div>
              )}

              {/* TRẠNG THÁI KHI ĐÃ NHẬN RESPONSE THÀNH CÔNG TỪ FASTAPI */}
              {result && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                  <div className="flex items-center gap-2.5">
                    {result.success ? (
                      <CheckCircle2
                        size={20}
                        className="text-chartwell-blue shrink-0"
                      />
                    ) : (
                      <AlertCircle
                        size={20}
                        className="text-red-500 shrink-0"
                      />
                    )}
                    <span
                      className={`text-[14px] font-semibold ${
                        result.success ? "text-chartwell-blue" : "text-red-600"
                      }`}
                    >
                      {result.code === "ATTENDANCE_SUCCESS"
                        ? "Xác Thực Thành Công"
                        : "Xác Thực Thất Bại"}
                    </span>
                  </div>

                  {result.success && (
                    <div className="flex flex-col gap-2 bg-canvas-fog p-3 border border-stone-border rounded-[4px]">
                      <div className="text-[13px] text-slate-text">
                        <span className="text-ash-gray">Sinh viên:</span>{" "}
                        <strong className="font-medium">{result.name}</strong>
                      </div>
                      <div className="text-[13px] text-slate-text">
                        <span className="text-ash-gray">MSSV:</span>{" "}
                        <strong className="font-medium">
                          {result.student_id}
                        </strong>
                      </div>
                      <div className="text-[13px] text-slate-text flex items-center gap-1.5">
                        <span className="text-ash-gray">Độ tương đồng:</span>
                        <span className="font-bold text-chartwell-blue bg-cloud-white px-1.5 py-0.5 border border-stone-border text-[11px] rounded-[4px]">
                          {(result.score ? result.score * 100 : 0).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                  )}

                  <p className="text-[13px] text-ash-gray leading-[1.5]">
                    {result.message}
                  </p>
                </div>
              )}
            </div>

            {/* BOX FOOTER HIỂN THỊ PHẦN THƯỞNG KHI THÀNH CÔNG */}
            {result?.success && (
              <div className="mt-4 pt-4 border-t border-stone-border flex items-center gap-2 text-[12px] font-medium text-slate-text bg-sky-tint/10 p-2 border border-chartwell-blue/30 rounded-[4px]">
                <Award size={16} className="text-chartwell-blue" />
                <span>
                  Hệ thống tự động tích luỹ <strong>+10</strong> điểm thưởng
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
