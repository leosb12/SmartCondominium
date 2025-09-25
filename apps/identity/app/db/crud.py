from sqlalchemy.orm import Session
from uuid import UUID
from apps.identity.app.db.models import Visitor, VisitorFace, VisitorStatus

def get_visitor_by_doc_number(db: Session, doc_number: str) -> Visitor | None:
    return db.query(Visitor).filter(Visitor.doc_number == doc_number).first()

def create_visitor(db: Session, full_name: str, doc_type: str, doc_number: str,
                   phone: str | None, status: VisitorStatus) -> Visitor:
    v = Visitor(
        full_name=full_name,
        doc_type=doc_type,
        doc_number=doc_number,
        phone=phone,
        status=status
    )
    db.add(v)
    db.commit()
    db.refresh(v)
    return v
def block_visitor(db: Session, visitor: Visitor):
    visitor.status = "bloqueado"

def activate_visitor(db: Session, visitor: Visitor):
    visitor.status = "activo"

def add_face(db: Session, visitor_id: UUID, image_path: str,
             embedding: list[float], det_score: float, quality_score: float) -> VisitorFace:
    face = VisitorFace(
        visitor_id=visitor_id,
        image_path=image_path,
        embedding=embedding,
        embedding_dim=len(embedding),
        det_score=det_score,
        quality_score=quality_score
    )
    db.add(face)
    return face