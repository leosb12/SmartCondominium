from rest_framework import serializers
from .models import Anomalia

class AnomaliaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Anomalia
        fields = '__all__'