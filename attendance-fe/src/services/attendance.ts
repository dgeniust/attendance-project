import { fetchApi } from "../utils/api";

interface AttendanceResponse {
  success: boolean;
  code: string;
  student_id: string;
  name: string;
  score: number;
  message: string;
}
export const attendanceService = {
  submitFaceData: (imageFile: File | Blob, threshold: number = 0.88) => {
    const formData = new FormData();
    formData.append("file", imageFile, "attendance_capture.jpg");
    return fetchApi<AttendanceResponse>(
      `/ai/attendance?threshold=${threshold}`,
      "POST",
      {
        data: formData,
      },
    );
  },
};
