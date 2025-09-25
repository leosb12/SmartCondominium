import io
import torch
import numpy as np
from PIL import Image
from facenet_pytorch import MTCNN, InceptionResnetV1

# Inicializa detector y modelo (lazy singleton)
_mtcnn = None
_resnet = None

def get_models(device: str = "cpu"):
    global _mtcnn, _resnet
    if _mtcnn is None:
        _mtcnn = MTCNN(image_size=160, margin=20, keep_all=True, post_process=True, device=device)
    if _resnet is None:
        _resnet = InceptionResnetV1(pretrained='vggface2').eval().to(device)
    return _mtcnn, _resnet

def l2_normalize(v: torch.Tensor) -> torch.Tensor:
    return v / v.norm(p=2, dim=1, keepdim=True)

def extract_face_embedding(img_bytes: bytes, min_prob: float = 0.90):
    """
    Devuelve:
    {
      ok: bool,
      embedding: [...],
      det_score: float,
      reason: str (si error)
    }
    """
    try:
        img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    except Exception as e:
        return {"ok": False, "reason": f"Error abriendo imagen: {e}"}

    mtcnn, resnet = get_models()

    # boxes: [N,4], probs: [N]
    boxes, probs = mtcnn.detect(img)
    if boxes is None or len(boxes) == 0:
        return {"ok": False, "reason": "No se detectaron rostros"}

    # Filtrar por probabilidad
    candidates = [(b, p) for b, p in zip(boxes, probs) if p is not None and p >= min_prob]
    if len(candidates) == 0:
        # tomar el de mayor prob aunque < min_prob para debug
        best_idx = int(np.argmax(probs))
        return {"ok": False, "reason": f"Confianza baja. Mejor prob={float(probs[best_idx]):.4f}"}

    if len(candidates) > 1:
        # Elegir el rostro con mayor prob
        candidates.sort(key=lambda x: x[1], reverse=True)
        # También podrías devolver error si realmente quieres EXACTAMENTE 1
        box, score = candidates[0]
    else:
        box, score = candidates[0]

    # Extrae el recorte usando MTCNN (usa keep_all=True, así hay que volver a pedir)
    # Más simple: volver a alinear llamando a mtcnn(img) (que retorna un tensor [N,3,160,160])
    aligned = _mtcnn(img)
    if aligned is None:
        return {"ok": False, "reason": "Falló alineación"}
    # Si mantiene varios, quedarnos con el primero comparado con la mayor prob ya tomada
    if aligned.ndim == 3:
        aligned_batch = aligned.unsqueeze(0)
    else:
        aligned_batch = aligned

    with torch.no_grad():
        embeddings = resnet(aligned_batch)  # shape [N,512]
        embeddings = l2_normalize(embeddings)
    # Elegir el embedding asociado al rostro seleccionado (índice 0 si simplificamos)
    emb = embeddings[0].cpu().numpy().astype(float).tolist()

    return {
        "ok": True,
        "embedding": emb,
        "det_score": float(score)
    }