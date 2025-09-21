from rest_framework import serializers


class UpdateEstadoTrabajoSerializer(serializers.Serializer):
    estado_trabajo_id = serializers.IntegerField(min_value=1)
    comentario = serializers.CharField(required=False, allow_blank=True, allow_null=True)