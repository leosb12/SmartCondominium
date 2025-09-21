# backendapi/comunicados/serializers.py
from typing import Optional
from datetime import timezone as dt_timezone  # <- usar UTC desde datetime (Django 5)
from rest_framework import serializers
from django.utils.dateparse import parse_datetime
from django.utils import timezone


class ComunicadoCreateSerializer(serializers.Serializer):
    titulo = serializers.CharField(max_length=500, allow_blank=False)
    contenido = serializers.CharField(allow_blank=False)

    portada_path = serializers.CharField(required=False, allow_blank=True)
    portada_bucket = serializers.CharField(required=False, allow_blank=True, default="comunicados")

    # Recibimos como string y lo normalizamos a ISO UTC (o None)
    scheduled_for = serializers.CharField(required=False, allow_blank=False)
    expires_at = serializers.CharField(required=False, allow_blank=False)

    def _parse_iso_utc(self, value: Optional[str]) -> Optional[str]:
        """
        Acepta string ISO, valida que sea fecha/hora válida y retorna el ISO normalizado (UTC, con tz).
        Guardamos como string ISO porque el repo inserta texto en supabase (timestamptz lo castea).
        """
        if value is None:
            return None

        dt = parse_datetime(value)
        if dt is None:
            raise serializers.ValidationError(
                "Formato de fecha inválido. Use ISO 8601, ej: 2025-09-22T08:00:00Z"
            )

        if timezone.is_naive(dt):
            # Asumimos que viene en UTC si no trae tz (evitamos ambigüedad)
            dt = dt.replace(tzinfo=dt_timezone.utc)

        # Normalizamos a UTC siempre
        dt = dt.astimezone(dt_timezone.utc)
        return dt.isoformat()

    def validate(self, attrs):
        titulo = (attrs.get("titulo") or "").strip()
        contenido = (attrs.get("contenido") or "").strip()
        if not titulo:
            raise serializers.ValidationError({"titulo": "Requerido"})
        if not contenido:
            raise serializers.ValidationError({"contenido": "Requerido"})

        # now en UTC para comparar coherentemente
        now_utc = timezone.now().astimezone(dt_timezone.utc)

        scheduled_for_raw = attrs.get("scheduled_for")
        expires_at_raw = attrs.get("expires_at")

        scheduled_for_iso = (
            self._parse_iso_utc(scheduled_for_raw) if scheduled_for_raw is not None else None
        )
        expires_at_iso = (
            self._parse_iso_utc(expires_at_raw) if expires_at_raw is not None else None
        )

        # Reglas mínimas
        if scheduled_for_iso:
            sdt = parse_datetime(scheduled_for_iso).astimezone(dt_timezone.utc)
            if sdt <= now_utc:
                raise serializers.ValidationError({"scheduled_for": "Debe ser una fecha futura"})

        if expires_at_iso:
            edt = parse_datetime(expires_at_iso).astimezone(dt_timezone.utc)
            if edt <= now_utc:
                raise serializers.ValidationError({"expires_at": "Debe ser una fecha futura"})
            if scheduled_for_iso:
                sdt = parse_datetime(scheduled_for_iso).astimezone(dt_timezone.utc)
                if edt <= sdt:
                    raise serializers.ValidationError(
                        {"expires_at": "Debe ser posterior a scheduled_for"}
                    )

        attrs["scheduled_for"] = scheduled_for_iso
        attrs["expires_at"] = expires_at_iso
        return attrs
