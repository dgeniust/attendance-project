import cv2
from deepface import DeepFace
from pymongo import MongoClient
import warnings
import urllib.parse
import os
from dotenv import load_dotenv
# Tắt các warning không cần thiết của thư viện để terminal sạch hơn
warnings.filterwarnings("ignore")

load_dotenv()
# ==========================================
# 1. CẤU HÌNH DATABASE
# ==========================================
username = os.getenv("MONGO_USERNAME")
password = os.getenv("MONGO_PASSWORD")
cluster_url = os.getenv("CLUSTER_URL")

# 2. Sử dụng quote_plus để mã hóa username và password
encoded_user = urllib.parse.quote_plus(username)
encoded_pw = urllib.parse.quote_plus(password)

# 3. Tạo chuỗi URI chuẩn
MONGO_URI = f"mongodb+srv://{encoded_user}:{encoded_pw}@{cluster_url}/?appName=attendance"
client = MongoClient(MONGO_URI)
db = client["attendance_db"]
collection = db["students"]
# def register_student(img_path, student_id, name):
#     print(f"⚙️ Đang trích xuất vector cho {name}...")
#     try:
#         # Lấy vector từ ảnh có sẵn
#         result = DeepFace.represent(
#             img_path=img_path, 
#             model_name="Facenet", 
#             detector_backend="retinaface",
#             enforce_detection=True
#         )
        
#         embedding_vector = result[0]["embedding"]
        
#         # Lưu vào MongoDB
#         student_doc = {
#             "student_id": student_id,
#             "name": name,
#             "embedding": embedding_vector
#         }
        
#         # Kiểm tra xem sinh viên đã có trong DB chưa, nếu chưa thì thêm mới
#         if collection.count_documents({"student_id": student_id}) == 0:
#             collection.insert_one(student_doc)
#             print(f"✅ Đã lưu Vector của {name} vào Database thành công!")
#         else:
#             print(f"⚠️ Sinh viên {student_id} đã tồn tại trong DB.")
            
#     except ValueError:
#         print(f"❌ Lỗi: Không tìm thấy khuôn mặt trong ảnh {img_path}!")
# ==========================================
# 2. HÀM XỬ LÝ NHẬN DIỆN VÀ ĐIỂM DANH (ĐÃ NÂNG CẤP)
# ==========================================
def recognize_and_attendance(frame, threshold=0.88):
    print("\n⏳ Đang phân tích và kiểm tra thực thể...")
    try:
        # NÂNG CẤP 1 & 2: Truyền trực tiếp frame (không lưu file tạm)
        # BƯỚC 1: Cắt khuôn mặt và kiểm tra giả mạo (Anti-Spoofing)
        face_objs = DeepFace.extract_faces(
            img_path=frame, 
            detector_backend="retinaface",
            enforce_detection=True,
            anti_spoofing=True # BẬT CHỨC NĂNG CHỐNG GIẢ MẠO
        )
        
        face_data = face_objs[0] # Lấy khuôn mặt đầu tiên tìm thấy
        
        # Kiểm tra cờ 'is_real'
        if not face_data.get("is_real", True):
            print("🚨 CẢNH BÁO: Phát hiện giả mạo (Giơ điện thoại/Ảnh in)!")
            return False, "FAKE FACE"
            
        print("✅ Xác thực người thật thành công. Đang trích xuất Vector...")
        
        # BƯỚC 2: Trích xuất Vector
        # Lấy mảng ảnh khuôn mặt đã được crop sẵn từ bước 1
        cropped_face = face_data["face"]
        
        # detector_backend="skip" vì khuôn mặt đã được detect và cắt chuẩn ở BƯỚC 1 rồi, 
        # bỏ qua detect lần 2 để tăng tốc độ xử lý gấp đôi.
        result = DeepFace.represent(
            img_path=cropped_face, 
            model_name="Facenet", 
            detector_backend="skip" 
        )
        
        query_vector = result[0]["embedding"]
        
        # ==========================================
        # BƯỚC 3: So khớp với MongoDB (Pipeline giữ nguyên)
        # ==========================================
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
        
        matches = list(collection.aggregate(pipeline))
        
        if matches:
            best_match = matches[0]
            score = best_match['score']
            
            if score >= threshold:
                print(f"✅ ĐIỂM DANH THÀNH CÔNG: {best_match['name']} - MSSV: {best_match['student_id']}")
                print(f"   Độ khớp (Similarity): {score:.4f}")
                return True, best_match['name']
            else:
                print(f"⚠️ NGƯỜI LẠ! (Khớp nhất với {best_match['name']} nhưng điểm chỉ đạt {score:.4f})")
                return False, "Unknown"
        else:
            print("❌ Chưa có ai trong Database!")
            return False, "Empty DB"
            
    except ValueError:
         print("❌ Lỗi: Không tìm thấy khuôn mặt chuẩn. Hãy đứng thẳng và đảm bảo đủ sáng!")
         return False, "No Face"
    except Exception as e:
         print(f"❌ Lỗi hệ thống: {e}")
         return False, "Error"
# ==========================================
# 3. GIAO DIỆN CAMERA CHÍNH (OPENCV)
# ==========================================
def main():
    # Khởi động Webcam (0 là camera mặc định của laptop)
    cap = cv2.VideoCapture(0)
    
    print("=========================================")
    print(" HỆ THỐNG ĐIỂM DANH KHUÔN MẶT SẴN SÀNG")
    print("=========================================")
    print("- Nhấn phím 'c' để điểm danh (Capture)")
    print("- Nhấn phím 'q' để thoát (Quit)")
    
    while True:
        ret, frame = cap.read()
        if not ret:
            print("❌ Lỗi: Không thể đọc dữ liệu từ Camera.")
            break
            
        # Lật ngược ảnh để giống như soi gương
        frame = cv2.flip(frame, 1)
        
        # Hiển thị hướng dẫn lên màn hình Camera
        cv2.putText(frame, "Press 'C' to Scan | Press 'Q' to Exit", (20, 40), 
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                    
        cv2.imshow("HCMUTE Face Attendance System", frame)
        
        # Lắng nghe sự kiện bàn phím
        key = cv2.waitKey(1) & 0xFF
        
        if key == ord('c'):
            # Khi bấm 'c', gửi frame hiện tại vào hàm xử lý
            success, name = recognize_and_attendance(frame)
            
            # Hiển thị kết quả tạm thời lên màn hình
            color = (0, 255, 0) if success else (0, 0, 255)
            cv2.putText(frame, f"Result: {name}", (20, 80), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)
            cv2.imshow("HCMUTE Face Attendance System", frame)
            cv2.waitKey(2000) # Dừng màn hình 2 giây để xem kết quả
            
        elif key == ord('q'):
            print("🛑 Đang đóng hệ thống...")
            break

    # Dọn dẹp tài nguyên
    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    # register_student("dataset\\Long.jpg", "221101xx", "Long")
    main()