import { fetchApi } from "../utils/api";

interface AttendanceResponse {
  success: boolean;
  code: string;
  student_id: string;
  name: string;
  score: number;
  model_used: string;
  message: string;
}
export interface CheckAttendanceResponse {
  student_id: string;
  has_checked_in: boolean;
  message: string;
}
export const attendanceService = {
  submitFaceData: (
    imageFile: File | Blob,
    model_type: string,
    threshold: number = 0.8,
  ) => {
    const formData = new FormData();
    formData.append("file", imageFile, "attendance_capture.jpg");
    formData.append("model_type", model_type);
    return fetchApi<AttendanceResponse>(
      `/ai/attendance?threshold=${threshold}`,
      "POST",
      {
        data: formData,
      },
    );
  },
  checkAttendance: (studentId: string) => {
    return fetchApi<CheckAttendanceResponse>(
      `/attendance/check-today/${studentId}`,
      "GET",
    );
  },
};
