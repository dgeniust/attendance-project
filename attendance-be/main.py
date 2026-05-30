import os
import cv2
import numpy as np
import urllib.parse
import warnings
import jwt
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Import Lớp đối tượng xử lý từ file service.py vừa tạo
from auth import AuthService
from attendance import AttendanceService
security_scheme = HTTPBearer()
warnings.filterwarnings("ignore")
load_dotenv()

app = FastAPI(
    title="AttendSync AI Endpoint Engine",
    description="Hệ thống Microservice cung cấp API quét nhận diện khuôn mặt sinh viên.",
    version="1.0.0"
)

# Cấu hình CORS tiếp nhận tín hiệu từ React Frontend của bạn
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# -------------------------------------------------------
# CÁC ĐỐI TƯỢNG ĐỊNH NGHĨA DỮ LIỆU ĐẦU VÀO (PYDANTIC SCHEMAS)
# -------------------------------------------------------
class UserRegisterSchema(BaseModel):
    student_id: str
    name: str
    email: EmailStr
    password: str

class UserLoginSchema(BaseModel):
    student_id_or_email: str
    password: str

class ForgotPasswordSchema(BaseModel):
    email: EmailStr

class ResetPasswordSchema(BaseModel):
    token: str
    new_password: str
# ==========================================
# CẤU HÌNH & KHỞI TẠO ATTENDANCE SERVICE
# ==========================================
username = os.getenv("MONGO_USERNAME")
password = os.getenv("MONGO_PASSWORD")
cluster_url = os.getenv("CLUSTER_URL")

encoded_user = urllib.parse.quote_plus(username)
encoded_pw = urllib.parse.quote_plus(password)
MONGO_URI = f"mongodb+srv://{encoded_user}:{encoded_pw}@{cluster_url}/?appName=attendance"

# Khởi tạo một thực thể service duy nhất chạy xuyên suốt vòng đời ứng dụng
# attendance_service = AttendanceService(mongo_uri=MONGO_URI)
auth_service = AuthService(mongo_uri=MONGO_URI)
attendance_service = AttendanceService(mongo_uri=MONGO_URI)
# -------------------------------------------------------
# HELPER: KIỂM TRA ĐĂNG NHẬP (DEPENDENCY)
# -------------------------------------------------------
def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_scheme)):
    """Hàm Middleware giải mã JWT để bảo vệ các Endpoint bảo mật"""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, os.getenv("JWT_SECRET"), algorithms=[os.getenv("JWT_ALGORITHM")])
        return payload  # Trả về thông tin sinh viên ẩn bên trong token
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Phiên đăng nhập đã hết hạn.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token xác thực không hợp lệ.")

# Helper function: Chuyển đổi file upload của FastAPI thành ma trận ảnh OpenCV
async def convert_upload_to_frame(file: UploadFile):
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return frame

# ==========================================
# CÁC ROUTE API ENDPOINTS
# ==========================================

@app.post("/api/ai/attendance")
async def api_attendance(file: UploadFile = File(...), threshold: float = 0.88,current_user: dict = Depends(get_current_user)):
    """API Endpoint phục vụ quét khuôn mặt điểm danh thời gian thực"""
    frame = await convert_upload_to_frame(file)
    if frame is None:
        raise HTTPException(status_code=400, detail="Tập tin hình ảnh bị hỏng hoặc không đúng định dạng.")
    # Lấy student_id từ thông tin giải mã JWT
    student_id = current_user.get("student_id")
    result = attendance_service.recognize_and_attendance(frame=frame, current_student_id=student_id, threshold=threshold)
    return result

@app.post("/api/ai/register")
async def api_register_student(
    file: UploadFile = File(...), 
    student_id: str = Form(...), 
    name: str = Form(...)
):
    """API Endpoint phục vụ đăng ký hồ sơ khuôn mặt mới cho sinh viên"""
    frame = await convert_upload_to_frame(file)
    if frame is None:
        raise HTTPException(status_code=400, detail="Tập tin hình ảnh bị hỏng hoặc không đúng định dạng.")
        
    success, message = attendance_service.register_student_face(frame, student_id)
    
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
        
    return {"success": True, "message": message}


# -------------------------------------------------------
# ROUTER API ENDPOINTS: AUTHENTICATION
# -------------------------------------------------------

@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
def auth_register(user_data: UserRegisterSchema):
    """API đăng ký tài khoản hệ thống cho sinh viên"""
    success, message = auth_service.register_account(
        student_id=user_data.student_id,
        name=user_data.name,
        email=user_data.email,
        password=user_data.password
    )
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
    return {"success": True, "message": message}

@app.post("/api/auth/login")
def auth_login(user_data: UserLoginSchema):
    """API đăng nhập hệ thống, trả về JWT Access Token"""
    result, message = auth_service.login_account(
        student_id_or_email=user_data.student_id_or_email,
        password=user_data.password
    )
    if not result:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=message)
    return result

@app.post("/api/auth/forgot-password")
async def auth_forgot_password(data: ForgotPasswordSchema):
    """API yêu cầu cấp lại mật khẩu và gửi Email chứa token xác thực"""
    success, message = await auth_service.send_forgot_password_mail(email=data.email)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message)
    return {"success": True, "message": message}

@app.post("/api/auth/reset-password")
def auth_reset_password(data: ResetPasswordSchema):
    """API tiếp nhận token khôi phục và thiết lập mật khẩu mới"""
    success, message = auth_service.reset_new_password(token=data.token, new_password=data.new_password)
    if not success:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)
    return {"success": True, "message": message}

# -------------------------------------------------------
# VÍ DỤ: KIỂM TRA ENDPOINT ĐƯỢC BẢO VỆ BỞI JWT
# -------------------------------------------------------
@app.get("/api/students/me")
def get_my_profile(current_user: dict = Depends(get_current_user)):
    """API lấy thông tin cá nhân của sinh viên hiện tại, chỉ gọi được khi đã truyền Header JWT"""
    return {"success": True, "user_profile": current_user}
@app.get("/health")
def health_check():
    return {"status": "online", "engine": "FastAPI + DeepFace"}
@app.get("/")
def read_root():
    return {"message": "Hệ thống điểm danh AI đang chạy!"}