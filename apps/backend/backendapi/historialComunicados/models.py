import os
import uuid
from django.conf import settings
from django.db import models


def _build_public_url(bucket: str | None, path: str | None) -> str | None:
    """
    Genera una URL pública de Supabase Storage de forma robusta.
    - Si path ya es una URL, la retorna.
    - Si falta SUPABASE_URL en settings, intenta tomarla de la variable de entorno SUPABASE_URL.
    - Limpia saltos de línea y prefijos 'public/'.
    """
    if not path:
        return None

    path = str(path).strip().replace("\n", "").replace("\r", "")
    path = path.replace("\\", "/")

    if path.startswith(("http://", "https://")):
        return path

    base = (getattr(settings, "SUPABASE_URL", None) or os.getenv("SUPABASE_URL") or "").rstrip("/")
    if not base:
        return None

    if path.startswith("/storage/v1/object/public/"):
        return f"{base}{path}"

    rel = path.lstrip("/")
    if rel.startswith("public/"):
        rel = rel[len("public/"):]

    if bucket:
        bucket = bucket.strip("/")
        final_rel = rel if rel.startswith(f"{bucket}/") else f"{bucket}/{rel}"
    else:
        final_rel = rel

    return f"{base}/storage/v1/object/public/{final_rel}"


class Profile(models.Model):
    id = models.UUIDField(primary_key=True)
    first_name = models.TextField(blank=True, null=True)
    last_name = models.TextField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = "profiles"

    @property
    def full_name(self) -> str:
        fn = (self.first_name or "").strip()
        ln = (self.last_name or "").strip()
        return (fn + " " + ln).strip() or "Sin nombre"


class Comunicado(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    titulo = models.TextField()
    contenido = models.TextField()
    portada_bucket = models.TextField(blank=True, null=True)
    portada_path = models.TextField(blank=True, null=True)

    author = models.ForeignKey(
        Profile,
        db_column="created_by",
        to_field="id",
        on_delete=models.DO_NOTHING,
        related_name="comunicados",
        blank=True,
        null=True,
    )

    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    published_at = models.DateTimeField(blank=True, null=True)
    scheduled_for = models.DateTimeField(blank=True, null=True)
    expires_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        managed = False
        db_table = "comunicados"

    @property
    def created_by(self):
        return self.author_id

    @property
    def portada_url(self) -> str | None:
        return _build_public_url(self.portada_bucket, self.portada_path)