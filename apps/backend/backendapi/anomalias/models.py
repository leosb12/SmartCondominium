from django.db import models

class Anomalia(models.Model):
    tipo_anomalia = models.CharField(max_length=20)
    descripcion = models.TextField()
    detalle = models.JSONField()
    fecha = models.DateTimeField()
    ubicacion = models.TextField(null=True, blank=True)
    procesado = models.BooleanField(default=False)

    class Meta:
        db_table = "anomalia"