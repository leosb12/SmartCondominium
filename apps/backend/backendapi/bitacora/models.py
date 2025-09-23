from django.db import models

class Bitacora(models.Model):
    """
    Mapea a la tabla existente public.bitacora en Postgres (Supabase).
    No crea migraciones porque managed=False.
    """
    class Meta:
        db_table = "bitacora"   # schema public por defecto
        managed = False
        verbose_name = "Bitácora"
        verbose_name_plural = "Bitácora"

    id = models.BigAutoField(primary_key=True)
    event_type = models.TextField()
    table_name = models.TextField()
    row_id = models.TextField()
    created_at = models.DateTimeField()
    user_id = models.UUIDField(null=True, blank=True)
    first_name = models.TextField(null=True, blank=True)
    last_name = models.TextField(null=True, blank=True)
    title = models.TextField(null=True, blank=True)
    details = models.JSONField(null=True, blank=True)

    def __str__(self):
        return f"[{self.created_at:%Y-%m-%d %H:%M:%S}] {self.event_type} {self.table_name}:{self.row_id}"