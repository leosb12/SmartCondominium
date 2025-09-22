from rest_framework import serializers

class EstadoCuentaQuerySerializer(serializers.Serializer):
    propiedad_id = serializers.IntegerField(required=False)
    tipo = serializers.ChoiceField(
        required=False,
        choices=[("expensa","expensa"),("reserva","reserva"),("multa","multa")]
    )
    estado = serializers.ChoiceField(
        required=False,
        choices=[("pendiente","pendiente"),("vencida","vencida"),("pagada","pagada")]
    )
    desde = serializers.DateField(required=False)
    hasta = serializers.DateField(required=False)
    page = serializers.IntegerField(required=False, min_value=1, default=1)
    page_size = serializers.IntegerField(required=False, min_value=1, max_value=200, default=50)
    orden = serializers.ChoiceField(
        required=False,
        default="vencimiento",
        choices=[("vencimiento","vencimiento"),("periodo","periodo"),("monto","monto"),("estado","estado")]
    )

class EstadoCuentaItemSerializer(serializers.Serializer):
    tipo = serializers.ChoiceField(choices=["expensa","reserva","multa"])
    id = serializers.IntegerField()
    propiedad_id = serializers.IntegerField()
    nro_casa = serializers.CharField(allow_null=True)
    periodo_fecha = serializers.DateField()
    fecha_vencimiento = serializers.DateTimeField(allow_null=True)  # multas = null
    total = serializers.DecimalField(max_digits=14, decimal_places=2)
    pagado = serializers.DecimalField(max_digits=14, decimal_places=2)
    saldo = serializers.DecimalField(max_digits=14, decimal_places=2)
    estado = serializers.ChoiceField(choices=["pendiente","vencida","pagada"])

class EstadoCuentaResumenSerializer(serializers.Serializer):
    vencido = serializers.DecimalField(max_digits=14, decimal_places=2)
    por_vencer = serializers.DecimalField(max_digits=14, decimal_places=2)
    sin_vencimiento = serializers.DecimalField(max_digits=14, decimal_places=2)  # multas
    total = serializers.DecimalField(max_digits=14, decimal_places=2)
    ultimo_pago = serializers.DateTimeField(allow_null=True)

class EstadoCuentaResponseSerializer(serializers.Serializer):
    resumen = EstadoCuentaResumenSerializer()
    items = EstadoCuentaItemSerializer(many=True)
    page = serializers.IntegerField()
    page_size = serializers.IntegerField()
    total_items = serializers.IntegerField()
