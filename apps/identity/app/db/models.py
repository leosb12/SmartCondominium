from sqlalchemy.orm import declarative_base, relationship, Mapped, mapped_column
from sqlalchemy import String, Float, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import Enum as PgEnum
import uuid
import enum
from datetime import datetime

Base = declarative_base()

class VisitorStatus(enum.Enum):
    procesando = "procesando"
    activo = "activo"
    bloqueado = "bloqueado"


class Visitor(Base):
    __tablename__ = "visitors"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    doc_type: Mapped[str] = mapped_column(String(50), nullable=False)
    doc_number: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped["VisitorStatus"] = mapped_column(PgEnum(VisitorStatus, name="visitor_status", create_constraint=False), default=VisitorStatus.procesando)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    faces: Mapped[list["VisitorFace"]] = relationship(
        "VisitorFace",
        back_populates="visitor",
        cascade="all, delete-orphan"
    )

class VisitorFace(Base):
    __tablename__ = "visitor_faces"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    visitor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("visitors.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    image_path: Mapped[str] = mapped_column(String(500), nullable=False)
    embedding: Mapped[list[float]] = mapped_column("embedding_json", JSONB, nullable=False)
    embedding_dim: Mapped[int] = mapped_column()
    det_score: Mapped[float] = mapped_column(Float, nullable=False)
    quality_score: Mapped[float] = mapped_column(Float, nullable=False)
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)

    visitor: Mapped[Visitor] = relationship("Visitor", back_populates="faces")