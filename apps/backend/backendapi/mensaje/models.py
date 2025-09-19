from django.db import models
from django.utils import timezone


class Mensaje(models.Model):
    id = models.BigAutoField(primary_key=True)
    emisor_id = models.UUIDField(db_index=True)
    receptor_id = models.UUIDField(db_index=True)
    cuerpo = models.TextField()
    # Campo en DB se llama "ts", no usar auto_now_add para respetar el valor de DB si lo hay
    ts = models.DateTimeField(db_column="ts", default=timezone.now, db_index=True)

    class Meta:
        db_table = "mensaje"
        managed = False  # La tabla ya existe en la base de datos (Supabase)
        ordering = ("-ts",)

    def __str__(self) -> str:
        return f"Mensaje #{self.id} {self.emisor_id} -> {self.receptor_id}"