from rest_framework import serializers
from .models import TipoMulta, Multa, CargoMulta, Propiedad


class TipoMultaSerializer(serializers.ModelSerializer):
    """Serializer para catálogo de tipos de multa"""
    class Meta:
        model = TipoMulta
        fields = ["id", "nombre"]


class PropiedadSerializer(serializers.ModelSerializer):
    """Serializer básico de propiedades (para mostrar en dropdowns)"""
    class Meta:
        model = Propiedad
        fields = ["id", "nombre", "codigo", "numero", "torre", "piso"]


class MultaSerializer(serializers.ModelSerializer):
    """Serializer de multas con relaciones anidadas y campos de escritura por ID"""

    # Campos de solo lectura (para mostrar detalles anidados en GET)
    tipo_multa = TipoMultaSerializer(read_only=True)
    propiedad = PropiedadSerializer(read_only=True)

    # Campos de escritura (POST/PUT)
    tipo_multa_id = serializers.PrimaryKeyRelatedField(
        source="tipo_multa",
        queryset=TipoMulta.objects.all(),
        write_only=True
    )
    propiedad_id = serializers.PrimaryKeyRelatedField(
        source="propiedad",
        queryset=Propiedad.objects.all(),
        write_only=True
    )

    class Meta:
        model = Multa
        fields = [
            "id",
            "propiedad_id",
            "tipo_multa_id",
            "fecha",
            "total",
            "propiedad",
            "tipo_multa",
        ]


class CargoMultaSerializer(serializers.ModelSerializer):
    """Serializer de relación cargo_multa"""
    class Meta:
        model = CargoMulta
        fields = ["cargo_id", "multa_id"]
