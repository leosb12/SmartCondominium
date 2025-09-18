# backendapi/serializers.py
from rest_framework import serializers
from .models import TipoMulta, Multa, CargoMulta, Propiedad


class TipoMultaSerializer(serializers.ModelSerializer):
    """Serializer para catálogo de tipos de multa"""
    class Meta:
        model = TipoMulta
        fields = ["id", "nombre"]


# backendapi/serializers.py
from rest_framework import serializers
from .models import TipoMulta, Multa, CargoMulta, Propiedad


class TipoMultaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoMulta
        fields = ["id", "nombre"]


class PropiedadSerializer(serializers.ModelSerializer):
    """Serializer ajustado a la tabla propiedad (id, nro_casa, m2)"""
    label = serializers.SerializerMethodField()

    class Meta:
        model = Propiedad
        fields = ["id", "nro_casa", "m2", "label"]

    def get_label(self, obj):
        base = f"Casa {obj.nro_casa}" if obj.nro_casa else f"Propiedad #{obj.id}"
        return f"{base} · {obj.m2} m²" if obj.m2 else base


class MultaSerializer(serializers.ModelSerializer):
    """
    Serializer de multas con relaciones anidadas y campos de escritura por ID.
    Incluye 'observacion' para persistir el textarea del frontend.
    """
    # Lectura (anidado)
    tipo_multa = TipoMultaSerializer(read_only=True)
    propiedad = PropiedadSerializer(read_only=True)

    # Escritura (por id)
    tipo_multa_id = serializers.PrimaryKeyRelatedField(
        source="tipo_multa",
        queryset=TipoMulta.objects.all(),
        write_only=True,
    )
    propiedad_id = serializers.PrimaryKeyRelatedField(
        source="propiedad",
        queryset=Propiedad.objects.all(),
        write_only=True,
    )

    class Meta:
        model = Multa
        fields = [
            "id",
            "propiedad_id",
            "tipo_multa_id",
            "fecha",
            "total",
            "observacion",   # <-- nuevo campo
            "propiedad",
            "tipo_multa",
        ]


class CargoMultaSerializer(serializers.ModelSerializer):
    """Serializer de relación cargo_multa"""
    class Meta:
        model = CargoMulta
        fields = ["cargo_id", "multa_id"]
