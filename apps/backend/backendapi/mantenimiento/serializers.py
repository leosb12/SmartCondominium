# backendapi/mantenimiento/serializers.py
from rest_framework import serializers

class PreventivoCreateSerializer(serializers.Serializer):
    catalogo_id = serializers.IntegerField()
    descripcion = serializers.CharField(max_length=2000)
    fecha_programada = serializers.DateField()
    hora_id = serializers.IntegerField()                     # 0..23
    costo = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    ordenado_a_id = serializers.UUIDField(required=False, allow_null=True)

class PreventivoResponseSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    catalogo_id = serializers.IntegerField()
    creado_por_id = serializers.UUIDField()
    ordenado_a_id = serializers.UUIDField(allow_null=True)
    tipo = serializers.CharField()
    estado_trabajo_id = serializers.IntegerField()
    descripcion = serializers.CharField()
    costo = serializers.DecimalField(max_digits=12, decimal_places=2, allow_null=True)
    fecha_programada = serializers.DateField()
    hora_id = serializers.IntegerField()

class AsignacionSerializer(serializers.Serializer):
    orden_trabajo_id = serializers.IntegerField()
    usuario_id = serializers.UUIDField()

class StaffQuerySerializer(serializers.Serializer):
    tipo = serializers.ChoiceField(choices=["interno", "externo"])