from fastapi import APIRouter, UploadFile, File, Form, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import select
from apps.identity.app.core.config import get_settings
from apps.identity.app.core.security import verify_api_key
from apps.identity.app.db.models import VisitorStatus, VisitorFace, Visitor
from apps.identity.app.db.session import get_db
from apps.identity.app.db import crud
from apps.identity.app.face.inference import extract_face_embedding
from apps.identity.app.face.quality import compute_quality

import numpy as np
from scipy.spatial.distance import cosine

import os
import uuid

# --- Supabase SDK ---
from supabase import create_client, Client

settings = get_settings()

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
SUPABASE_BUCKET = "visitors"  # Cambia si tu bucket tiene otro nombre

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

router = APIRouter(
    prefix="/visitors",
    tags=["visitors"]
)

@router.post("/enroll")
async def enroll_visitor(
    full_name: str = Form(...),
    doc_type: str = Form(...),
    doc_number: str = Form(...),
    phone: str | None = Form(None),
    face_images: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    _auth = Depends(verify_api_key)
):
    existing = crud.get_visitor_by_doc_number(db, doc_number)
    if existing:
        raise HTTPException(status_code=409, detail="Documento ya registrado")

    visitor = crud.create_visitor(
        db,
        full_name=full_name,
        doc_type=doc_type,
        doc_number=doc_number,
        phone=phone,
        status=VisitorStatus.procesando
    )
    valid = 0
    min_det = settings.MIN_DET_SCORE

    public_urls = []

    for idx, upload in enumerate(face_images):
        img_bytes = await upload.read()
        result = extract_face_embedding(img_bytes, min_prob=min_det)
        if not result["ok"]:
            continue

        det_score = result["det_score"]
        embedding = result["embedding"]

        fname = f"face_{idx}_{uuid.uuid4().hex}.jpg"
        storage_path = f"{visitor.id}/{fname}"

        # Subir imagen a Supabase Storage
        upload_response = supabase.storage.from_(SUPABASE_BUCKET).upload(
            storage_path, img_bytes
        )

        # Construir URL pública (tu bucket debe ser público)
        public_url = f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{storage_path}"
        public_urls.append(public_url)

        quality = compute_quality(img_bytes)

        crud.add_face(
            db=db,
            visitor_id=visitor.id,
            image_path=storage_path,
            embedding=embedding,
            det_score=det_score,
            quality_score=quality
        )
        valid += 1

    if valid == 0:
        crud.block_visitor(db, visitor)
        db.commit()
        raise HTTPException(status_code=400, detail="No se procesaron rostros válidos")

    crud.activate_visitor(db, visitor)
    db.commit()
    db.refresh(visitor)

    return {
        "visitor_id": str(visitor.id),
        "faces": valid,
        "status": visitor.status.value,
        "images": public_urls
    }

@router.post("/match")
async def match_visitor(
    face_image: UploadFile = File(...),
    db: Session = Depends(get_db),
    _auth = Depends(verify_api_key),
    threshold: float = 0.65
):
    img_bytes = await face_image.read()
    result = extract_face_embedding(img_bytes, min_prob=settings.MIN_DET_SCORE)
    if not result["ok"]:
        raise HTTPException(status_code=400, detail="No se detectó un rostro válido")

    query = select(VisitorFace.visitor_id, VisitorFace.embedding)
    faces = db.execute(query).all()
    if not faces:
        raise HTTPException(status_code=404, detail="No hay rostros enrolados")

    probe_emb = np.array(result["embedding"], dtype=np.float32)
    best_score = -1
    best_visitor = None

    for visitor_id, db_emb in faces:
        db_emb = np.array(db_emb, dtype=np.float32)
        score = 1 - cosine(probe_emb, db_emb)
        if score > best_score:
            best_score = score
            best_visitor = visitor_id

    if best_score >= threshold:
        return {
            "match": True,
            "visitor_id": str(best_visitor),
            "score": float(best_score)
        }
    else:
        return {
            "match": False,
            "score": float(best_score)
        }

@router.get("/{visitor_id}")
def get_visitor(visitor_id: str, db: Session = Depends(get_db), _auth = Depends(verify_api_key)):
    visitor = db.query(Visitor).filter(Visitor.id == visitor_id).first()
    if not visitor:
        raise HTTPException(status_code=404, detail="Visitor not found")
    face_images = db.query(VisitorFace).filter(VisitorFace.visitor_id == visitor_id).all()
    supabase_image_paths = [f.image_path for f in face_images if f.image_path]

    # Devuelve las URLs públicas de las imágenes
    public_urls = [
        f"{SUPABASE_URL}/storage/v1/object/public/{SUPABASE_BUCKET}/{storage_path}"
        for storage_path in supabase_image_paths
    ]

    return {
        "id": str(visitor.id),
        "full_name": visitor.full_name,
        "doc_type": visitor.doc_type,
        "doc_number": visitor.doc_number,
        "phone": visitor.phone,
        "status": visitor.status.value if hasattr(visitor.status, "value") else visitor.status,
        "created_at": visitor.created_at.isoformat() if hasattr(visitor.created_at, "isoformat") else str(visitor.created_at),
        "images": public_urls
    }