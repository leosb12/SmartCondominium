from django.db import models


class AreaSocial(models.Model):
    id = models.BigIntegerField(primary_key=True, db_column="id")
    nombre = models.TextField()
    precioxhora = models.DecimalField(max_digits=12, decimal_places=2)

    class Meta:
        db_table = "area_social"
        managed = False
        verbose_name = "Área Social"
        verbose_name_plural = "Áreas Sociales"

    def __str__(self) -> str:
        return f"{self.id} - {self.nombre}"


class Hora(models.Model):
    id = models.BigIntegerField(primary_key=True, db_column="id")

    class Meta:
        db_table = "hora"
        managed = False


class Propiedad(models.Model):
    """
    Tabla propiedad: sólo mapeamos lo necesario para este caso de uso.
    """
    id = models.BigIntegerField(primary_key=True, db_column="id")
    nro_casa = models.TextField(db_column="nro_casa", null=True, blank=True)

    class Meta:
        db_table = "propiedad"
        managed = False
        verbose_name = "Propiedad"
        verbose_name_plural = "Propiedades"

    def __str__(self) -> str:
        return f"Propiedad {self.id} - Casa {self.nro_casa}"


class Reserva(models.Model):
    id = models.BigIntegerField(primary_key=True, db_column="id")
    area_social = models.ForeignKey(
        AreaSocial,
        db_column="area_social_id",
        on_delete=models.DO_NOTHING,
        related_name="reservas",
    )
    fecha = models.DateField()
    hora_inicio = models.ForeignKey(
        Hora,
        db_column="hora_inicio_id",
        on_delete=models.DO_NOTHING,
        related_name="+",
        null=True,
        blank=True,
    )
    hora_fin = models.ForeignKey(
        Hora,
        db_column="hora_fin_id",
        on_delete=models.DO_NOTHING,
        related_name="+",
        null=True,
        blank=True,
    )
    total = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    # Reemplazamos el BigInteger por una FK real a Propiedad
    propiedad = models.ForeignKey(
        Propiedad,
        db_column="propiedad_id",
        on_delete=models.DO_NOTHING,
        related_name="reservas",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "reserva"
        managed = False
        verbose_name = "Reserva"
        verbose_name_plural = "Reservas"

    def __str__(self) -> str:
        return f"Reserva {self.id} - Área {self.area_social_id} - {self.fecha}"