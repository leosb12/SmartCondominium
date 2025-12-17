from rest_framework import serializers
from .models import Auto

class AutoSerializer(serializers.ModelSerializer):
    nro_casa = serializers.SerializerMethodField()
    estado_nombre = serializers.SerializerMethodField()
    nombre_propietario = serializers.SerializerMethodField()
    apellido_propietario = serializers.SerializerMethodField()
    telefono_contacto = serializers.SerializerMethodField()

    def get_nro_casa(self, obj):
        try:
            prop = getattr(obj, "propiedad", None)
            return getattr(prop, "nro_casa", None)
        except Exception:
            return None

    def get_estado_nombre(self, obj):
        try:
            est = getattr(obj, "estado", None)
            return getattr(est, "nombre", None)
        except Exception:
            return None

    def get_nombre_propietario(self, obj):
        try:
            prop = getattr(obj, "propiedad", None)
            if prop:
                profile = getattr(prop, "id_dueño", None)
                return getattr(profile, "first_name", None) if profile else None
            return None
        except Exception:
            return None

    def get_apellido_propietario(self, obj):
        try:
            prop = getattr(obj, "propiedad", None)
            if prop:
                profile = getattr(prop, "id_dueño", None)
                return getattr(profile, "last_name", None) if profile else None
            return None
        except Exception:
            return None

    def get_telefono_contacto(self, obj):
        try:
            prop = getattr(obj, "propiedad", None)
            if prop:
                profile = getattr(prop, "id_dueño", None)
                return getattr(profile, "phone", None) if profile else None
            return None
        except Exception:
            return None

    class Meta:
        model = Auto
        fields = [
            "placa", "modelo", "marca", "nro_casa", "estado_nombre", 
            "nombre_propietario", "apellido_propietario", "telefono_contacto",
            "propiedad", "estado"
        ]