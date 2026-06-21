from typing import Iterable, Optional, Sequence

from .config import RetinaArcFaceConfig
from .inference import RetinaArcFaceAnalysis, cosine_similarity


class AttendanceEmbeddingAdapter:
    """
    Adapter layer for the FastAPI/MongoDB attendance service.

    Store represent(frame) into MongoDB as a 512-D numeric list. At attendance
    time, either use MongoDB vector search or best_match() for Python-side search.
    """

    def __init__(
        self,
        threshold: float = RetinaArcFaceConfig.threshold,
        enforce_detection: bool = RetinaArcFaceConfig.enforce_detection,
    ):
        self.engine = RetinaArcFaceAnalysis(
            threshold=threshold,
            enforce_detection=enforce_detection,
        )
        self.threshold = threshold

    def represent(self, frame):
        return self.engine.represent(frame)

    def verify(self, img1, img2, threshold: Optional[float] = None):
        return self.engine.compare(img1, img2, threshold=threshold or self.threshold)

    def best_match(
        self,
        query_embedding: Iterable[float],
        candidates: Sequence[dict],
        embedding_key: str = "embedding",
        id_key: str = "student_id",
        threshold: Optional[float] = None,
    ):
        best_doc = None
        best_score = -1.0
        for doc in candidates:
            embedding = doc.get(embedding_key)
            if not embedding:
                continue
            score = cosine_similarity(query_embedding, embedding)
            if score > best_score:
                best_score = score
                best_doc = doc

        active_threshold = self.threshold if threshold is None else threshold
        return {
            "matched": best_doc is not None and best_score >= active_threshold,
            "score": best_score,
            "student_id": best_doc.get(id_key) if best_doc else None,
            "document": best_doc,
            "threshold": active_threshold,
        }
