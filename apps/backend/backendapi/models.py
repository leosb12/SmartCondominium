from django.db import models


class TipoMulta(models.Model):
    id = models.BigAutoField(primary_key=True)
    nombre = models.TextField()

    class Meta:
        db_table = "tipo_multa"
        managed = False


class Propiedad(models.Model):
    id = models.BigAutoField(primary_key=True)
    nro_casa = models.TextField(null=True, blank=True)
    m2 = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = "propiedad"
        managed = False


class Multa(models.Model):
    id = models.BigAutoField(primary_key=True)
    propiedad = models.ForeignKey(
        Propiedad,
        db_column="propiedad_id",
        on_delete=models.DO_NOTHING,
        related_name="multas",
    )
    tipo_multa = models.ForeignKey(
        TipoMulta,
        db_column="tipo_multa_id",
        on_delete=models.DO_NOTHING,
        related_name="multas",
    )
    fecha = models.DateField()
    total = models.DecimalField(max_digits=14, decimal_places=2)
    observacion = models.TextField(null=True, blank=True)  # <- ya soporta el campo extra

    class Meta:
        db_table = "multas"
        managed = False


class CargoMulta(models.Model):
    cargo_id = models.BigIntegerField()
    multa = models.ForeignKey(
        Multa,
        db_column="multa_id",
        on_delete=models.DO_NOTHING,
        related_name="cargos",
    )

    class Meta:
        db_table = "cargo_multa"
        managed = False
        unique_together = (("cargo_id", "multa"),)
        # Django exige una PK, si en tu BD es compuesta (cargo_id + multa_id),
        # esta configuración con unique_together replica esa restricción.
        # Si tienes ya una PK real en la tabla, elimina unique_together
