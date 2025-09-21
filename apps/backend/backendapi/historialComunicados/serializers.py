from rest_framework import serializers
from .models import Comunicado, Profile


class ProfileSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = ("id", "first_name", "last_name", "full_name")

    def get_full_name(self, obj: Profile):
        return obj.full_name


class ComunicadoSerializer(serializers.ModelSerializer):
    portada_url = serializers.SerializerMethodField()
    author = ProfileSerializer(read_only=True)
    # Compat: expone el UUID original por si lo usa otro módulo (no lo usaremos en la UI)
    created_by = serializers.UUIDField(source="author_id", read_only=True)

    class Meta:
        model = Comunicado
        fields = (
            "id",
            "titulo",
            "contenido",
            "portada_bucket",
            "portada_path",
            "portada_url",
            "author",       # objeto con nombre y apellido
            "created_by",   # solo lectura, compat opcional
            "created_at",
            "updated_at",
            "published_at",
            "scheduled_for",
            "expires_at",
        )

    def get_portada_url(self, obj: Comunicado):
        return obj.portada_url