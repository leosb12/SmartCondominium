from rest_framework import serializers
from .models import Mensaje


class MensajeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mensaje
        fields = ("id", "emisor_id", "receptor_id", "cuerpo", "ts")
        read_only_fields = ("id", "emisor_id", "ts")

    receptor_id = serializers.UUIDField()
    cuerpo = serializers.CharField(allow_blank=False, max_length=10000)


class MensajeListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mensaje
        fields = ("id", "emisor_id", "receptor_id", "cuerpo", "ts")