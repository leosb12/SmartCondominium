from rest_framework import serializers

class IngresoReporteSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    usuario_id = serializers.UUIDField()
    invitado = serializers.BooleanField()
    ts = serializers.DateTimeField()
    resultado = serializers.CharField()
    nombre_invitado = serializers.CharField(allow_null=True, allow_blank=True)