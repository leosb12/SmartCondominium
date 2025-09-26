from django.db import models
from backendapi.models import Propiedad

class Estado(models.Model):
    id = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100)

    class Meta:
        db_table = 'estados'
        managed = False

class Auto(models.Model):
    placa = models.CharField(primary_key=True, max_length=20)
    propiedad = models.ForeignKey(Propiedad, on_delete=models.DO_NOTHING, db_column='propiedad_id')
    modelo = models.CharField(max_length=50)
    marca = models.CharField(max_length=50)
    estado = models.ForeignKey(Estado, on_delete=models.DO_NOTHING, db_column='estado_id')

    class Meta:
        db_table = 'auto'
        managed = False