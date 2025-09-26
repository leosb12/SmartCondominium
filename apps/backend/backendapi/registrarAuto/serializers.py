from rest_framework import serializers
from .models import Auto

class AutoSerializer(serializers.ModelSerializer):
    nro_casa = serializers.CharField(source="propiedad.nro_casa", read_only=True)
    estado_nombre = serializers.CharField(source="estado.nombre", read_only=True)

    class Meta:
        model = Auto
        fields = [
            "placa", "modelo", "marca", "nro_casa", "estado_nombre", "propiedad", "estado"
        ]