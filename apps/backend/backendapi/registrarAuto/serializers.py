from rest_framework import serializers
from .models import Auto

class AutoSerializer(serializers.ModelSerializer):
    nro_casa = serializers.SerializerMethodField()
    estado_nombre = serializers.SerializerMethodField()

    def get_nro_casa(self, obj):
        try:
            prop = getattr(obj, "propiedad", None)
            return getattr(prop, "nro_casa", None)
        except Exception:
            return None

    def get_estado_nombre(self, obj):
        try:
            est = getattr(obj, "estado", None)
            return getattr(est, "nombre", None)
        except Exception:
            return None

    class Meta:
        model = Auto
        fields = [
            "placa", "modelo", "marca", "nro_casa", "estado_nombre", "propiedad", "estado"
        ]