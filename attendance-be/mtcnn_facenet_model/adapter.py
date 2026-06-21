import cv2
import torch
import numpy as np
from PIL import Image
from facenet_pytorch import MTCNN, InceptionResnetV1

class MTCNNFacenetAdapter:
    def __init__(self, device='cpu'):
        """
        Khởi tạo mô hình dựa trên repo ThocodeVN/22110227_NguyenDuyThanh_XLAS.
        Sử dụng MTCNN để phát hiện khuôn mặt và InceptionResnetV1 để trích xuất 512 chiều.
        """
        # Tự động dùng GPU nếu có, không thì dùng CPU
        self.device = torch.device('cuda' if torch.cuda.is_available() and device=='cuda' else 'cpu')
        
        # Cấu hình MTCNN image_size=160 theo đúng chuẩn repo
        self.mtcnn = MTCNN(image_size=160, margin=0, keep_all=False, device=self.device)
        
        # Load pre-trained InceptionResnetV1 (VGGFace2)
        self.resnet = InceptionResnetV1(pretrained='vggface2').eval().to(self.device)

    def represent(self, img_frame: np.ndarray) -> list:
        # Chuyển đổi ảnh từ BGR (OpenCV) sang RGB (PIL) để MTCNN xử lý
        img_rgb = cv2.cvtColor(img_frame, cv2.COLOR_BGR2RGB)
        img_pil = Image.fromarray(img_rgb)

        # Phát hiện và cắt khuôn mặt
        face = self.mtcnn(img_pil)
        if face is None:
            raise ValueError("MTCNN không tìm thấy khuôn mặt trong ảnh.")

        # Thêm chiều batch_size và đưa vào thiết bị (CPU/GPU)
        face = face.unsqueeze(0).to(self.device)
        
        # Trích xuất vector đặc trưng
        with torch.no_grad():
            embedding_tensor = self.resnet(face)
            
        # Trả về list 512 chiều chuẩn định dạng MongoDB
        return embedding_tensor.cpu().numpy().flatten().tolist()