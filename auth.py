import os
import jwt
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from pymongo import MongoClient
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

# Cấu hình bộ băm mật khẩu bảo mật
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    def __init__(self, mongo_uri: str):
        """Khởi tạo và kết nối riêng đến bảng lưu thông tin tài khoản học thuật"""
        self.client = MongoClient(mongo_uri)
        self.db = self.client["attendance_db"]
        self.students_collection = self.db["students"] # Bảng tài khoản gốc
        
        # Cấu hình hệ thống gửi Mail
        self.mail_config = ConnectionConfig(
            MAIL_USERNAME=os.getenv("SMTP_USERNAME"),
            MAIL_PASSWORD=os.getenv("SMTP_PASSWORD"),
            MAIL_FROM=os.getenv("SMTP_FROM"),
            MAIL_PORT=int(os.getenv("SMTP_PORT", 587)),
            MAIL_SERVER=os.getenv("SMTP_SERVER"),
            MAIL_STARTTLS=True,
            MAIL_SSL_TLS=False,
            USE_CREDENTIALS=True,
            VALIDATE_CERTS=True
        )

    def hash_password(self, password: str) -> str:
        return pwd_context.hash(password)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    def create_access_token(self, data: dict, expires_delta: timedelta = None) -> str:
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60)))
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, os.getenv("JWT_SECRET"), algorithm=os.getenv("JWT_ALGORITHM"))
        return encoded_jwt

    def register_account(self, student_id: str, name: str, email: str, password: str):
        """Đăng ký tài khoản đăng nhập hệ thống"""
        if self.students_collection.find_one({"$or": [{"student_id": student_id}, {"email": email}]}):
            return False, "Mã số sinh viên hoặc Email này đã được đăng ký tài khoản."
            
        hashed_pw = self.hash_password(password)
        
        student_doc = {
            "student_id": student_id,
            "name": name,
            "email": email,
            "password": hashed_pw,
            "embedding": [],        # Sẽ được cập nhật từ service attendance
            "reward_points": 0       # Điểm chuyên cần tích lũy
        }
        
        self.students_collection.insert_one(student_doc)
        return True, "Đăng ký tài khoản sinh viên thành công!"

    def login_account(self, student_id_or_email: str, password: str):
        """Xác thực tài khoản và trả về Access Token cùng thông tin cơ bản"""
        user = self.students_collection.find_one({
            "$or": [{"student_id": student_id_or_email}, {"email": student_id_or_email}]
        })
        
        if not user or not self.verify_password(password, user["password"]):
            return None, "Thông tin tài khoản hoặc mật khẩu không chính xác."
            
        token_data = {"student_id": user["student_id"], "email": user["email"], "name": user["name"]}
        access_token = self.create_access_token(data=token_data)
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "student_id": user["student_id"],
                "name": user["name"],
                "email": user["email"],
                "reward_points": user.get("reward_points", 0)
            }
        }, "Đăng nhập thành công."

    async def send_forgot_password_mail(self, email: str):
        """Khởi tạo mã token ngắn hạn và gửi mail khôi phục mật khẩu"""
        user = self.students_collection.find_one({"email": email})
        if not user:
            return False, "Không tìm thấy tài khoản liên kết với Email này."
            
        reset_token = self.create_access_token(
            data={"reset_student_id": user["student_id"]}, 
            expires_delta=timedelta(minutes=10)
        )
        
        reset_link = f"http://localhost:5173/reset-password?token={reset_token}"
        
        html_content = f"""
        <h3>Hệ thống Quản lý Điểm danh AttendSync</h3>
        <p>Chào bạn {user['name']},</p>
        <p>Chúng tôi nhận được yêu cầu khôi phục mật khẩu từ bạn. Vui lòng bấm vào liên kết bên dưới để tiến hành đổi mật khẩu mới (Hiệu lực trong vòng 10 phút):</p>
        <p><a href="{reset_link}" style="padding: 10px 20px; background-color: #3ba6f1; color: white; text-decoration: none; border-radius: 4px; display: inline-block;">Đặt lại mật khẩu</a></p>
        <p>Nếu bạn không thực hiện hành động này, vui lòng bỏ qua email bảo mật.</p>
        """
        
        message = MessageSchema(
            subject="[AttendSync] Yêu cầu khôi phục mật khẩu tài khoản sinh viên",
            recipients=[email],
            body=html_content,
            subtype=MessageType.html
        )
        
        fm = FastMail(self.mail_config)
        await fm.send_message(message)
        return True, "Hệ thống đã gửi liên kết khôi phục vào Email của bạn."

    def reset_new_password(self, token: str, new_password: str):
        """Kiểm tra token hợp lệ và ghi đè mật khẩu mới"""
        try:
            payload = jwt.decode(token, os.getenv("JWT_SECRET"), algorithms=[os.getenv("JWT_ALGORITHM")])
            student_id = payload.get("reset_student_id")
            
            if not student_id:
                return False, "Mã xác thực cấu trúc token không hợp lệ."
                
            hashed_new_pw = self.hash_password(new_password)
            self.students_collection.update_one({"student_id": student_id}, {"$set": {"password": hashed_new_pw}})
            return True, "Mật khẩu của bạn đã được cập nhật thành công!"
            
        except jwt.ExpiredSignatureError:
            return False, "Yêu cầu khôi phục đã hết hạn. Vui lòng thực hiện lại yêu cầu."
        except jwt.InvalidTokenError:
            return False, "Mã token khôi phục mật khẩu không chính xác."