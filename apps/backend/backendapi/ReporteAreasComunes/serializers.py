from rest_framework import serializers
from .models import AreaSocial, Reserva


class AreaSocialSerializer(serializers.ModelSerializer):
    class Meta:
        model = AreaSocial
        fields = ("id", "nombre", "precioxhora")


class ReservaSerializer(serializers.ModelSerializer):
    # Datos del área anidados
    area_social = AreaSocialSerializer(read_only=True)

    # IDs crudos de horas (opcionales)
    hora_inicio_id = serializers.IntegerField(read_only=True, allow_null=True)
    hora_fin_id = serializers.IntegerField(read_only=True, allow_null=True)

    # Mostrar nro de casa proveniente de la tabla propiedad (FK propiedad)
    nro_casa = serializers.CharField(source="propiedad.nro_casa", read_only=True, allow_null=True)

    # Total como string para JSON
    total = serializers.SerializerMethodField()

    class Meta:
        model = Reserva
        fields = (
            "id",
            "fecha",
            "hora_inicio_id",
            "hora_fin_id",
            "total",
            "created_at",
            "nro_casa",      # <- reemplaza a propiedad_id en la salida
            "area_social",
        )

    def get_total(self, obj):
        return str(obj.total) if obj.total is not None else None