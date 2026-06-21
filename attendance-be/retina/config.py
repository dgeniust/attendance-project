from dataclasses import dataclass


@dataclass(frozen=True)
class RetinaArcFaceConfig:
    """Default configuration for the RetinaFace + ArcFace pipeline."""

    model_name: str = "ArcFace"
    detector_backend: str = "retinaface"
    distance_metric: str = "cosine"
    normalization: str = "ArcFace"
    align: bool = True
    enforce_detection: bool = True

    embedding_size: int = 512
    target_size: int = 112
    threshold: float = 0.35

    # Used when threshold is calibrated from a local dataset.
    calibration_steps: int = 401
    max_inter_pairs: int = 20000
