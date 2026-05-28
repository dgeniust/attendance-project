import numpy as np
import cv2
from deepface import DeepFace
from pymongo import MongoClient
from datetime import datetime, timezone

class AttendanceService:
    def __init__(self, mongo_uri: str):
        """Khởi tạo kết nối phân tách rõ ràng luồng nghiệp vụ dữ liệu khuôn mặt và checkin"""
        self.client = MongoClient(mongo_uri)
        self.db = self.client["attendance_db"]
        self.students_collection = self.db["students"] # Đọc/Cập nhật vector đặc trưng
        self.checkins_collection = self.db["checkins"] # Bảng ghi nhận lịch sử điểm danh mới

    def register_student_face(self, img_frame: np.ndarray, student_id: str):
        """Cập nhật hoặc đăng ký mới mảng vector đặc trưng vào tài khoản học sinh đã tồn tại"""
        try:
            # Kiểm tra xem tài khoản sinh viên đã được tạo qua luồng Auth chưa
            student_exists = self.students_collection.find_one({"student_id": student_id})
            if not student_exists:
                return False, f"Không tìm thấy thông tin MSSV {student_id} trên hệ thống. Hãy đăng ký tài khoản trước!"

            # Trích xuất Face embedding
            result = DeepFace.represent(
                img_path=img_frame, 
                model_name="Facenet", 
                detector_backend="retinaface",
                enforce_detection=True
            )
            embedding_vector = result[0]["embedding"]
            
            # Cập nhật mảng vector vào tài khoản sinh viên đã đăng ký từ trước
            self.students_collection.update_one(
                {"student_id": student_id},
                {"$set": {"embedding": embedding_vector}}
            )
            return True, f"Đã tích hợp hồ sơ khuôn mặt cho sinh viên {student_exists['name']} thành công!"
                
        except ValueError:
            return False, "Không tìm thấy khuôn mặt hợp lệ trong ảnh chụp mẫu."
        except Exception as e:
            return False, f"Lỗi đồng bộ dữ liệu AI: {str(e)}"

    def recognize_and_attendance(self, frame: np.ndarray, current_student_id: str, threshold: float = 0.88):
        """
        Xử lý quét sinh trắc học thời gian thực, chống giả mạo, so khớp danh tính.
        Nếu phát hiện FAKE FACE, phạt trực tiếp chủ tài khoản đang đăng nhập (current_student_id).
        """
        try:
            # BƯỚC 1: Kiểm tra chống spoofing qua ảnh tĩnh/màn hình giả lập
            face_objs = DeepFace.extract_faces(
                img_path=frame, 
                detector_backend="mtcnn",
                enforce_detection=True,
                anti_spoofing=True
            )
            face_data = face_objs[0]
            
            if not face_data.get("is_real", True):
                fake_checkin_doc = {
                    "student_id": current_student_id,
                    "timestamp": datetime.now(timezone.utc),
                    "status": "Fraud_Detected",
                    "reason": "Spoofing attempt (Photo/Screen detected)",
                    "device": "Webcam Server Engine"
                }
                self.checkins_collection.insert_one(fake_checkin_doc)
                self.students_collection.update_one(
                    {"student_id": current_student_id},
                    {"$inc": {"reward_points": -20}} # Trừ 20 điểm phạt
                )
                return {
                    "success": False, 
                    "code": "SPOOF_DETECTED", 
                    "message": "🚨 CẢNH BÁO GIAN LẬN: Hệ thống phát hiện hình ảnh giả mạo! Tài khoản của bạn đã bị ghi nhận vi phạm và trừ 20 điểm chuyên cần."
                }
            
            # BƯỚC 2: Trích xuất vector truy vấn nhanh (Bỏ qua phát hiện lại khuôn mặt)
            cropped_face = face_data["face"]
            result = DeepFace.represent(
                img_path=cropped_face, 
                model_name="Facenet", 
                detector_backend="skip" 
            )
            query_vector = result[0]["embedding"]
            
            # BƯỚC 3: Truy vấn Vector Search trên Atlas dựa trên Index cấu hình sẵn
            pipeline = [
                {
                    "$vectorSearch": {
                        "index": "vector_index", 
                        "path": "embedding",
                        "queryVector": query_vector,
                        "numCandidates": 100,
                        "limit": 1
                    }
                },
                {
                    "$project": {
                        "_id": 0, "student_id": 1, "name": 1,
                        "score": {"$meta": "vectorSearchScore"} 
                    }
                }
            ]
            
            matches = list(self.students_collection.aggregate(pipeline))
            
            if matches:
                best_match = matches[0]
                score = best_match['score']
                
                if score >= threshold:
                    matched_student_id = best_match['student_id']
                    
                    # KIỂM TRA: Khuôn mặt quét được có trùng với tài khoản đang đăng nhập không?
                    if matched_student_id != current_student_id:
                        # Điểm danh hộ: Khuôn mặt hợp lệ của người khác nhưng dùng tài khoản người này
                        fraud_doc = {
                            "student_id": current_student_id, # Ghi nhận lỗi cho tài khoản đăng nhập
                            "timestamp": datetime.now(timezone.utc),
                            "status": "Mismatch_Attendance",
                            "reason": f"Face matched with student {matched_student_id} instead of logged in user",
                            "device": "Webcam Server Engine"
                        }
                        self.checkins_collection.insert_one(fraud_doc)
                        
                        # Phạt trừ điểm tài khoản đăng nhập vì cho người khác mượn tài khoản
                        self.students_collection.update_one(
                            {"student_id": current_student_id},
                            {"$inc": {"reward_points": -10}}
                        )
                        
                        return {
                            "success": False,
                            "code": "IDENTITY_MISMATCH",
                            "message": f"🚨 LỖI ĐỒNG BỘ: Khuôn mặt không khớp với chủ tài khoản đăng nhập! Hệ thống trừ 10 điểm vi phạm."
                        }
                    
                    # --- XỬ LÝ LOGIC NGHIỆP VỤ ĐIỂM DANH & TÍCH ĐIỂM THƯỞNG ---
                    # 1. Thêm bản ghi mới vào bảng lịch sử điểm danh 'checkins'
                    checkin_doc = {
                        "student_id": current_student_id,
                        "timestamp": datetime.now(timezone.utc),
                        "status": "Present",
                        "device": "Webcam Server Engine"
                    }
                    self.checkins_collection.insert_one(checkin_doc)
                    
                    # 2. Cộng điểm thưởng chuyên cần (+10 điểm thưởng) trực tiếp vào bảng students
                    self.students_collection.update_one(
                        {"student_id": current_student_id},
                        {"$inc": {"reward_points": 10}}
                    )
                    
                    return {
                        "success": True,
                        "code": "ATTENDANCE_SUCCESS",
                        "student_id": current_student_id,
                        "name": best_match['name'],
                        "score": round(score, 4),
                        "message": "Điểm danh thành công! Tài khoản của bạn đã được cộng 10 điểm chuyên cần."
                    }
                else:
                    return {
                        "success": False,
                        "code": "MATCH_LOW_SCORE",
                        "message": f"Khuôn mặt chưa khớp với sinh viên nào trong hệ thống (Độ khớp: {score:.4f})"
                    }
            else:
                return {
                    "success": False,
                    "code": "COLLECTION_EMPTY",
                    "message": "Cơ sở dữ liệu lưu trữ vector trắc học hiện tại đang trống."
                }
                
        except ValueError:
            return {
                "success": False, 
                "code": "FACE_NOT_FOUND", 
                "message": "Không nhận diện được cấu trúc khuôn mặt. Vui lòng căn chỉnh góc máy và thử lại."
            }
        except Exception as e:
            return {
                "success": False, 
                "code": "INTERNAL_ERROR", 
                "message": f"Lỗi hệ thống phụ trách điểm danh: {str(e)}"
            }