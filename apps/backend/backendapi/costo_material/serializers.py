from rest_framework import serializers


class CostoTrabajoCreateSerializer(serializers.Serializer):
    material = serializers.CharField(allow_blank=True, required=False)
    preciomanoobra = serializers.IntegerField(min_value=0)
    preciomaterial = serializers.IntegerField(min_value=0)
    horas_trabajadas = serializers.IntegerField(min_value=0)
    id_orden_trabajo = serializers.IntegerField()


class CostoTrabajoUpdateSerializer(serializers.Serializer):
    material = serializers.CharField(allow_blank=True, required=False)
    preciomanoobra = serializers.IntegerField(min_value=0, required=False)
    preciomaterial = serializers.IntegerField(min_value=0, required=False)
    horas_trabajadas = serializers.IntegerField(min_value=0, required=False)
    id_orden_trabajo = serializers.IntegerField(required=False)


class OrdenTrabajoMiniSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    descripcion = serializers.CharField()
    fecha_programada = serializers.DateField()
    hora_id = serializers.IntegerField()
    costo = serializers.DecimalField(max_digits=12, decimal_places=2, allow_null=True)
    estado_trabajo_id = serializers.IntegerField()
    tipo = serializers.CharField()


class CostoTrabajoResponseSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    material = serializers.CharField(allow_blank=True)
    preciomanoobra = serializers.IntegerField()
    preciomaterial = serializers.IntegerField()
    horas_trabajadas = serializers.IntegerField()
    id_orden_trabajo = serializers.IntegerField()
    costo_total = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    orden_trabajo = OrdenTrabajoMiniSerializer()


class CostoTrabajoListQuerySerializer(serializers.Serializer):
    # Filtro opcional por orden de trabajo
    orden_id = serializers.IntegerField(required=False)