import io
import cv2
import numpy as np
from PIL import Image

def blur_focus_score(gray):
    return cv2.Laplacian(gray, cv2.CV_64F).var()

def compute_quality(img_bytes: bytes) -> float:
    """
    Retorna un score [0..1] muy básico basado en enfoque.
    Puedes mejorar esto luego (iluminación, contraste, pose).
    """
    img = Image.open(io.BytesIO(img_bytes)).convert("L")
    arr = np.array(img)
    # Laplacian variance
    var = blur_focus_score(arr)
    # Normalización arbitraria: var ~ 300..1200 generalmente
    norm = min(1.0, var / 1000.0)
    return float(norm)