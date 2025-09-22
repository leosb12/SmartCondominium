from rest_framework import serializers

class OrdenPagoRequestSerializer(serializers.Serializer):
    tipo = serializers.ChoiceField(choices=[("expensa","expensa"), ("reserva","reserva"), ("multa","multa")])
    id = serializers.IntegerField()
    monto_parcial = serializers.DecimalField(max_digits=14, decimal_places=2, required=False, min_value=0.01)

class OrdenPagoResponseSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=["succeeded","processing","requires_action","requires_payment_method","canceled","requires_confirmation"])
    payment_intent_id = serializers.CharField()
    client_secret = serializers.CharField(allow_null=True, required=False)
    amount = serializers.IntegerField()   # minor units enviado a Stripe
    currency = serializers.CharField()
