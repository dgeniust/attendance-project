import numpy as np
import cv2
from deepface import DeepFace
from pymongo import MongoClient
from datetime import datetime, timezone, timedelta

# 1. IMPORT CÁC MÔ HÌNH NHẬN DIỆN
from resnet.inference import FaceAnalysis # Model 1: Wide ResNet
from retina.adapter import AttendanceEmbeddingAdapter # Model 2: RetinaFace + ArcFace
from mtcnn_facenet_model.adapter import MTCNNFacenetAdapter # Model 3: MTCNN + InceptionResnetV1 (Từ GitHub)

class AttendanceService:
    def __init__(self, mongo_uri: str):
        """Khởi tạo kết nối phân tách rõ ràng luồng nghiệp vụ dữ liệu khuôn mặt và checkin"""
        self.client = MongoClient(mongo_uri)
        self.db = self.client["attendance_db"]
        self.students_collection = self.db["students"] 
        self.checkins_collection = self.db["checkins"] 
        
        # KHỞI TẠO ĐỒNG THỜI 3 MODEL NHẬN DIỆN (Chỉ load 1 lần khi server start)
        print("🤖 Đang nạp Model 1: Wide ResNet...")
        self.resnet_analyzer = FaceAnalysis()

        print("🤖 Đang nạp Model 2: RetinaFace + ArcFace...")
        self.arcface_analyzer = AttendanceEmbeddingAdapter(threshold=0.35)

        print("🤖 Đang nạp Model 3: MTCNN + InceptionResnetV1...")
        self.facenet_analyzer = MTCNNFacenetAdapter()
    def register_student_face(self, img_frame: np.ndarray, student_id: str):
        """Cập nhật hoặc đăng ký mới mảng vector đặc trưng vào tài khoản học sinh đã tồn tại"""
        try:
            student_exists = self.students_collection.find_one({"student_id": student_id})
            if not student_exists:
                return False, f"Không tìm thấy thông tin MSSV {student_id} trên hệ thống. Hãy đăng ký tài khoản trước!"

            # --- BỔ SUNG: KIỂM TRA TRÙNG LẶP / ĐÃ ĐĂNG KÝ KHUÔN MẶT CHƯA ---
            # Nếu tài khoản sinh viên đã chứa ít nhất một trong các vector đặc trưng, từ chối đăng ký tiếp
            if any(key in student_exists for key in ["embedding_resnet", "embedding_arcface", "embedding_facenet"]):
                return False, f"Sinh viên {student_exists.get('name', student_id)} đã đăng ký dữ liệu khuôn mặt trên hệ thống rồi!"

            # DÙNG DEEPFACE ĐỂ ĐẢM BẢO CHẮC CHẮN CÓ KHUÔN MẶT TRONG ẢNH
            DeepFace.extract_faces(
                img_path=img_frame, 
                detector_backend="mtcnn",
                enforce_detection=True
            )
            
            # Dictionary chứa các dữ liệu vector sẽ được cập nhật vào MongoDB
            update_data = {}

            # --- 1. CHẠY MODEL WIDE RESNET ---
            try:
                resnet_tensor = self.resnet_analyzer.process_image(img_frame)
                resnet_vector = resnet_tensor.cpu().numpy().flatten().tolist()
                update_data["embedding_resnet"] = resnet_vector
            except Exception as e:
                print(f"Lỗi trích xuất Wide ResNet: {e}")

            # --- 2. CHẠY MODEL RETINAFACE + ARCFACE ---
            try:
                arcface_array = self.arcface_analyzer.represent(img_frame)
                arcface_vector = arcface_array.tolist() if isinstance(arcface_array, np.ndarray) else list(arcface_array)
                update_data["embedding_arcface"] = arcface_vector
            except Exception as e:
                print(f"Lỗi trích xuất RetinaFace+ArcFace: {e}")
                
            # --- 3. CHẠY MODEL MTCNN + INCEPTION RESNET V1 ---
            try:
                facenet_vector = self.facenet_analyzer.represent(img_frame)
                update_data["embedding_facenet"] = facenet_vector
            except Exception as e:
                print(f"Lỗi trích xuất MTCNN+Facenet: {e}")
                
            # Kiểm tra xem có trích xuất được ít nhất 1 vector không
            if not update_data:
                return False, "Không thể trích xuất đặc trưng khuôn mặt từ bất kỳ model nào!"
            
            # --- LƯU TẤT CẢ VÀO MONGODB TRONG 1 LẦN GỌI ---
            self.students_collection.update_one(
                {"student_id": student_id},
                {"$set": update_data}
            )
            return True, f"Đã tích hợp hồ sơ khuôn mặt (Đa mô hình) cho sinh viên {student_exists['name']} thành công!"
                
        except ValueError:
            return False, "Không tìm thấy khuôn mặt hợp lệ trong ảnh chụp mẫu."
        except Exception as e:
            return False, f"Lỗi đồng bộ dữ liệu AI: {str(e)}"

    def recognize_and_attendance(self, frame: np.ndarray, current_student_id: str, model_type: str = "arcface", threshold: float = 0.45):
        """
        Xử lý quét sinh trắc học thời gian thực hỗ trợ 3 mô hình.
        """
        try:
            # =========================================================
            # BƯỚC 1: DÙNG DEEPFACE ĐỂ CHỐNG SPOOFING (FAKE FACE)
            # =========================================================
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
                    {"$inc": {"reward_points": -20}} 
                )
                return {
                    "success": False, 
                    "code": "SPOOF_DETECTED", 
                    "message": "🚨 CẢNH BÁO GIAN LẬN: Hệ thống phát hiện hình ảnh giả mạo! Tài khoản của bạn đã bị ghi nhận vi phạm và trừ 20 điểm chuyên cần."
                }
            
            # =========================================================
            # BƯỚC 2: TRÍCH XUẤT ĐẶC TRƯNG TÙY THUỘC VÀO MODEL_TYPE
            # =========================================================
            # =========================================================
            # BƯỚC 2: TRÍCH XUẤT ĐẶC TRƯNG TÙY THUỘC VÀO MODEL_TYPE
            # =========================================================
            try:
                if model_type == "resnet":
                    embedding_tensor = self.resnet_analyzer.process_image(frame)
                    query_vector = embedding_tensor.cpu().numpy().flatten().tolist()
                    index_name = "vector_index_resnet" 
                    db_field = "embedding_resnet"
                    active_threshold = threshold  # Dùng threshold truyền vào từ API
                
                elif model_type == "retina": # Đây là RetinaFace + ArcFace
                    embedding_array = self.arcface_analyzer.represent(frame)
                    query_vector = embedding_array.tolist() if isinstance(embedding_array, np.ndarray) else list(embedding_array)
                    index_name = "vector_index_arcface" 
                    db_field = "embedding_arcface"
                    active_threshold = 0.35
                elif model_type == "facenet":
                    query_vector = self.facenet_analyzer.represent(frame)
                    index_name = "vector_index_facenet"
                    db_field = "embedding_facenet"
                    active_threshold = 0.5 # Cosine của Facenet thường tốt ở ngưỡng ~0.5
                else:
                    return {"success": False, "code": "INVALID_MODEL", "message": "Loại model không hợp lệ được cung cấp."}

            # BẮT ĐÚNG LỖI THIẾU THƯ VIỆN CỦA SCRFD ĐỂ BÁO VỀ FRONTEND
            except ValueError as val_err:
                if "scrfd" in str(val_err).lower():
                    return {
                        "success": False,
                        "code": "DETECTOR_NOT_SUPPORTED",
                        "message": "⚠️ Mô hình SCRFD chưa được cấu hình tương thích với DeepFace trên thiết bị này. Vui lòng sử dụng ResNet hoặc RetinaFace!"
                    }
                raise val_err # Đẩy các lỗi ValueError khác (ví dụ không thấy mặt) ra ngoài

            # =========================================================
            # BƯỚC 3: TRUY VẤN MONGODB ATLAS VECTOR SEARCH
            # =========================================================
            pipeline = [
                {
                    "$vectorSearch": {
                        "index": index_name,     # Đã sửa: Dùng biến động
                        "path": db_field,        # Đã sửa: Dùng biến động
                        "queryVector": query_vector,
                        "numCandidates": 512,
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
                
                if score >= active_threshold:
                    matched_student_id = best_match['student_id']
                    
                    if matched_student_id != current_student_id:
                        # Điểm danh hộ
                        fraud_doc = {
                            "student_id": current_student_id, 
                            "timestamp": datetime.now(timezone.utc),
                            "status": "Mismatch_Attendance",
                            "reason": f"Face matched with student {matched_student_id} instead of logged in user ({model_type})",
                            "device": "Webcam Server Engine"
                        }
                        self.checkins_collection.insert_one(fraud_doc)
                        self.students_collection.update_one(
                            {"student_id": current_student_id},
                            {"$inc": {"reward_points": -10}}
                        )
                        return {
                            "success": False,
                            "code": "IDENTITY_MISMATCH",
                            "message": f"🚨 LỖI ĐỒNG BỘ: Khuôn mặt không khớp với chủ tài khoản đăng nhập! Hệ thống trừ 10 điểm vi phạm."
                        }
                    now_utc = datetime.now(timezone.utc)
                    start_of_day = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
                    end_of_day = start_of_day + timedelta(days=1)
                    existing_checkin = self.checkins_collection.find_one({
                        "student_id": current_student_id,
                        "status": "Present", # Chỉ kiểm tra những lần điểm danh hợp lệ
                        "timestamp": {
                            "$gte": start_of_day,
                            "$lt": end_of_day
                        }
                    })
                    if existing_checkin:
                        return {
                            "success": True, # Hoặc False tùy thuộc frontend của bạn muốn xử lý popup thế nào
                            "code": "ALREADY_CHECKED_IN",
                            "message": "Bạn đã điểm danh thành công trong ngày hôm nay rồi, không cần thực hiện lại!"
                        }
                    # Điểm danh hợp lệ
                    checkin_doc = {
                        "student_id": current_student_id,
                        "timestamp": datetime.now(timezone.utc),
                        "status": "Present",
                        "model_used": model_type, # Lưu lại model nào được dùng để tiện thống kê
                        "device": "Webcam Server Engine"
                    }
                    self.checkins_collection.insert_one(checkin_doc)
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
                        "model_used": model_type.upper(),
                        "message": f"Điểm danh thành công ({model_type.upper()})! Tài khoản của bạn đã được cộng 10 điểm chuyên cần."
                    }
                else:
                    return {
                        "success": False,
                        "code": "MATCH_LOW_SCORE",
                        "message": f"Khuôn mặt chưa khớp với sinh viên nào trong hệ thống bằng {model_type.upper()} (Độ khớp: {score:.4f})"
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
            
    def check_today_attendance(self, student_id: str) -> bool:
        """
        Kiểm tra xem học sinh đã có lượt điểm danh hợp lệ (Present) nào trong ngày hôm nay chưa.
        Trả về True nếu ĐÃ ĐIỂM DANH, False nếu CHƯA ĐIỂM DANH.
        """
        try:
            now_utc = datetime.now(timezone.utc)
            
            # Thiết lập khung thời gian từ 00:00:00 đến 23:59:59 ngày hôm nay (tính theo UTC)
            # Lưu ý: Nếu muốn tính theo múi giờ Việt Nam (UTC+7), bạn cần hoán đổi thời gian cho chuẩn.
            start_of_day = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
            end_of_day = start_of_day + timedelta(days=1)

            existing_checkin = self.checkins_collection.find_one({
                "student_id": student_id,
                "status": "Present",
                "timestamp": {
                    "$gte": start_of_day,
                    "$lt": end_of_day
                }
            })

            return True if existing_checkin else False
        except Exception as e:
            print(f"Lỗi khi kiểm tra điểm danh: {e}")
            return False