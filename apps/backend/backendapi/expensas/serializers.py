from rest_framework import serializers

class ExpensaCreateSerializer(serializers.Serializer):
    propiedad_id = serializers.IntegerField()
    fecha = serializers.DateField()
    total = serializers.DecimalField(max_digits=12, decimal_places=2)
    tarifa_id = serializers.IntegerField()
    fecha_vencimiento = serializers.DateTimeField()

class AbonoExpensaSerializer(serializers.Serializer):
    monto = serializers.DecimalField(max_digits=12, decimal_places=2)
