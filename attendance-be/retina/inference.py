import json
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple, Union

import numpy as np

from .config import RetinaArcFaceConfig
from .image_io import ImageInput, deepface_face_to_pil, load_rgb_pil, to_deepface_input


def _load_deepface():
    try:
        from deepface import DeepFace
    except ImportError as exc:
        raise ImportError(
            "DeepFace is required for RetinaFace + ArcFace. "
            "Install dependencies with: pip install -r requirements.txt"
        ) from exc
    return DeepFace


def normalize_vector(vector: Iterable[float]) -> np.ndarray:
    array = np.asarray(list(vector), dtype=np.float32)
    norm = float(np.linalg.norm(array))
    if norm <= 1e-12:
        return array
    return array / norm


def cosine_similarity(query_embedding: Iterable[float], candidate_embedding: Iterable[float]) -> float:
    query = normalize_vector(query_embedding)
    candidate = normalize_vector(candidate_embedding)
    return float(np.dot(query, candidate))


def _primary_face_index(rows: List[dict]) -> int:
    if not rows:
        raise ValueError("No face detected.")

    best_index = 0
    best_area = -1
    for index, row in enumerate(rows):
        area = row.get("facial_area") or row.get("region") or {}
        width = int(area.get("w", 0) or area.get("width", 0) or 0)
        height = int(area.get("h", 0) or area.get("height", 0) or 0)
        face_area = width * height
        if face_area > best_area:
            best_area = face_area
            best_index = index
    return best_index


class RetinaArcFaceAnalysis:
    """
    RetinaFace detector + ArcFace embedding wrapper.

    The public methods intentionally mirror the previous custom model wrapper:
    represent(), compare(), build_gallery(), identify().
    """

    def __init__(
        self,
        threshold: float = RetinaArcFaceConfig.threshold,
        enforce_detection: bool = RetinaArcFaceConfig.enforce_detection,
        align: bool = RetinaArcFaceConfig.align,
        config: RetinaArcFaceConfig = RetinaArcFaceConfig(),
    ):
        self.config = config
        self.threshold = threshold
        self.enforce_detection = enforce_detection
        self.align = align
        self.DeepFace = _load_deepface()

    def _represent_rows(self, image_source: ImageInput, enforce_detection: Optional[bool] = None):
        img_path = to_deepface_input(image_source)
        active_enforce = self.enforce_detection if enforce_detection is None else enforce_detection
        kwargs = {
            "img_path": img_path,
            "model_name": self.config.model_name,
            "detector_backend": self.config.detector_backend,
            "enforce_detection": active_enforce,
            "align": self.align,
        }

        try:
            return self.DeepFace.represent(**kwargs, normalization=self.config.normalization)
        except TypeError:
            return self.DeepFace.represent(**kwargs)

    def process_image(self, image_source: ImageInput, enforce_detection: Optional[bool] = None) -> np.ndarray:
        rows = self._represent_rows(image_source, enforce_detection=enforce_detection)
        if isinstance(rows, dict):
            rows = [rows]
        index = _primary_face_index(rows)
        embedding = rows[index]["embedding"]
        return normalize_vector(embedding)

    def represent(self, image_source: ImageInput, enforce_detection: Optional[bool] = None) -> list:
        return self.process_image(image_source, enforce_detection=enforce_detection).astype(float).tolist()

    def extract_face(
        self,
        image_source: ImageInput,
        enforce_detection: Optional[bool] = None,
        fallback_to_original: bool = False,
    ):
        img_path = to_deepface_input(image_source)
        active_enforce = self.enforce_detection if enforce_detection is None else enforce_detection
        try:
            faces = self.DeepFace.extract_faces(
                img_path=img_path,
                detector_backend=self.config.detector_backend,
                enforce_detection=active_enforce,
                align=self.align,
            )
        except ValueError:
            if fallback_to_original:
                return load_rgb_pil(image_source)
            raise

        index = _primary_face_index(faces)
        return deepface_face_to_pil(faces[index]["face"])

    def compare(
        self,
        img1: ImageInput,
        img2: ImageInput,
        threshold: Optional[float] = None,
        enforce_detection: Optional[bool] = None,
    ) -> Tuple[float, bool]:
        emb1 = self.process_image(img1, enforce_detection=enforce_detection)
        emb2 = self.process_image(img2, enforce_detection=enforce_detection)
        similarity = float(np.dot(emb1, emb2))
        active_threshold = self.threshold if threshold is None else threshold
        return similarity, similarity >= active_threshold

    def build_gallery(
        self,
        dataset_dir: Union[str, Path],
        enforce_detection: Optional[bool] = None,
        return_details: bool = False,
    ):
        dataset_path = Path(dataset_dir)
        if not dataset_path.exists():
            raise FileNotFoundError(f"Gallery dataset not found: {dataset_path}")

        image_exts = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
        gallery = {}
        details = {}

        for class_dir in sorted([path for path in dataset_path.iterdir() if path.is_dir()]):
            embeddings = []
            paths = []
            for image_path in sorted(class_dir.iterdir()):
                if image_path.suffix.lower() not in image_exts:
                    continue
                try:
                    embedding = self.process_image(image_path, enforce_detection=enforce_detection)
                except Exception as exc:
                    print(f"Skip {image_path}: {exc}")
                    continue
                embeddings.append(embedding)
                paths.append(str(image_path))

            if embeddings:
                centroid = normalize_vector(np.mean(np.stack(embeddings), axis=0))
                gallery[class_dir.name] = centroid.astype(float).tolist()
                details[class_dir.name] = {
                    "image_count": len(embeddings),
                    "paths": paths,
                    "embeddings": [embedding.astype(float).tolist() for embedding in embeddings],
                }

        return (gallery, details) if return_details else gallery

    @staticmethod
    def save_gallery(gallery: Dict[str, list], output_path: Union[str, Path], metadata: Optional[dict] = None):
        path = Path(output_path)
        path.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "metadata": metadata or {},
            "gallery": gallery,
        }
        path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    @staticmethod
    def load_gallery(gallery_path: Union[str, Path]) -> Dict[str, list]:
        payload = json.loads(Path(gallery_path).read_text(encoding="utf-8"))
        if "gallery" in payload:
            return payload["gallery"]
        return payload

    def identify(
        self,
        image_source: ImageInput,
        gallery: Dict[str, list],
        threshold: Optional[float] = None,
        enforce_detection: Optional[bool] = None,
    ) -> Dict[str, object]:
        query = self.process_image(image_source, enforce_detection=enforce_detection)
        best_label = None
        best_similarity = -1.0

        for label, vector in gallery.items():
            similarity = float(np.dot(query, normalize_vector(vector)))
            if similarity > best_similarity:
                best_similarity = similarity
                best_label = label

        active_threshold = self.threshold if threshold is None else threshold
        return {
            "label": best_label,
            "similarity": best_similarity,
            "is_match": best_similarity >= active_threshold,
            "threshold": active_threshold,
            "model": self.config.model_name,
            "detector": self.config.detector_backend,
        }
