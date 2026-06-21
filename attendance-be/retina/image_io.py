from pathlib import Path
from typing import Union

import cv2
import numpy as np
from PIL import Image, ImageOps

ImageInput = Union[str, Path, Image.Image, np.ndarray]


def to_deepface_input(image_source: ImageInput):
    """Return a path or OpenCV BGR array that DeepFace can consume."""

    if isinstance(image_source, (str, Path)):
        path = Path(image_source)
        if not path.exists():
            raise FileNotFoundError(f"Image not found: {path}")
        return str(path)

    if isinstance(image_source, Image.Image):
        image = ImageOps.exif_transpose(image_source).convert("RGB")
        rgb = np.asarray(image, dtype=np.uint8)
        return cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)

    if isinstance(image_source, np.ndarray):
        if image_source.ndim != 3:
            raise ValueError("Numpy image must have shape HxWxC.")
        return image_source

    raise TypeError("Input must be a file path, PIL Image, or OpenCV BGR numpy array.")


def load_rgb_pil(image_source: ImageInput) -> Image.Image:
    if isinstance(image_source, (str, Path)):
        path = Path(image_source)
        if not path.exists():
            raise FileNotFoundError(f"Image not found: {path}")
        return ImageOps.exif_transpose(Image.open(path)).convert("RGB")

    if isinstance(image_source, Image.Image):
        return ImageOps.exif_transpose(image_source).convert("RGB")

    if isinstance(image_source, np.ndarray):
        rgb = cv2.cvtColor(image_source, cv2.COLOR_BGR2RGB)
        return Image.fromarray(rgb).convert("RGB")

    raise TypeError("Input must be a file path, PIL Image, or OpenCV BGR numpy array.")


def deepface_face_to_pil(face_array) -> Image.Image:
    """Convert DeepFace extract_faces output into a RGB PIL image."""

    face = np.asarray(face_array)
    if face.dtype != np.uint8:
        if face.max() <= 1.0:
            face = face * 255.0
        face = np.clip(face, 0, 255).astype(np.uint8)

    if face.ndim != 3:
        raise ValueError("Extracted face must have shape HxWxC.")

    return Image.fromarray(face).convert("RGB")
