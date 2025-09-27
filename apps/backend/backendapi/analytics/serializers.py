# backendapi/analytics/serializers.py
from __future__ import annotations
from typing import Any, Dict, List, Optional
from rest_framework import serializers


# ============================================================
# Utilidades y enums
# ============================================================

class BasePaginationQuerySerializer(serializers.Serializer):
    limit = serializers.IntegerField(required=False, min_value=1, default=50)
    offset = serializers.IntegerField(required=False, min_value=0, default=0)


class RiesgoEnum(serializers.ChoiceField):
    def __init__(self, **kwargs):
        super().__init__(choices=("bajo", "medio", "alto"), allow_blank=True, allow_null=True, **kwargs)


# ============================================================
# Dashboard
# ============================================================

class DashboardQuerySerializer(serializers.Serializer):
    torre_id = serializers.IntegerField(required=False, allow_null=True)
    desde = serializers.DateField(required=False, allow_null=True)
    hasta = serializers.DateField(required=False, allow_null=True)


class MorosidadTopItemSerializer(serializers.Serializer):
    propiedad_id = serializers.IntegerField()
    nro_casa = serializers.CharField(allow_blank=True)
    saldo_total = serializers.FloatField()
    riesgo = serializers.ChoiceField(choices=("alto", "medio", "bajo"))
    motivo = serializers.CharField(allow_blank=True)


class MorosidadKPIsSerializer(serializers.Serializer):
    porcentaje_alto = serializers.FloatField()
    porcentaje_medio = serializers.FloatField()
    porcentaje_bajo = serializers.FloatField()
    saldo_total_expensas = serializers.FloatField()
    saldo_total_reservas = serializers.FloatField()
    saldo_total_multas = serializers.FloatField()
    top5_propiedades = MorosidadTopItemSerializer(many=True)


class AreasTopHoraSerializer(serializers.Serializer):
    area_social_id = serializers.IntegerField()
    nombre_area = serializers.CharField()
    dow = serializers.IntegerField(min_value=0, max_value=6)
    hora = serializers.IntegerField(min_value=0, max_value=23)
    demanda_esperada = serializers.FloatField()


class AreasTopAreaSerializer(serializers.Serializer):
    area_social_id = serializers.IntegerField()
    nombre_area = serializers.CharField(allow_blank=True, required=False)
    demanda_total_periodo = serializers.FloatField()


class AreasKPIsSerializer(serializers.Serializer):
    top5_horas_pico = AreasTopHoraSerializer(many=True)
    top3_areas_por_demanda = AreasTopAreaSerializer(many=True)


class SeguridadHotHourSerializer(serializers.Serializer):
    hora = serializers.CharField()  # ISO string
    zscore = serializers.FloatField()


class SeguridadKPIsSerializer(serializers.Serializer):
    horas_calientes_autos = SeguridadHotHourSerializer(many=True)
    horas_calientes_personas = SeguridadHotHourSerializer(many=True)
    anomalias_pendientes = serializers.IntegerField()


class DashboardResponseSerializer(serializers.Serializer):
    morosidad = MorosidadKPIsSerializer()
    areas = AreasKPIsSerializer()
    seguridad = SeguridadKPIsSerializer()
    filtros = serializers.DictField(child=serializers.CharField(allow_blank=True), required=False)


# ============================================================
# Morosidad
# ============================================================

class MorosidadQuerySerializer(BasePaginationQuerySerializer):
    torre_id = serializers.IntegerField(required=False, allow_null=True)
    propiedad_id = serializers.IntegerField(required=False, allow_null=True)
    desde = serializers.DateField(required=False, allow_null=True)
    hasta = serializers.DateField(required=False, allow_null=True)
    min_riesgo = RiesgoEnum(required=False, allow_null=True, allow_blank=True)
    ordering = serializers.ChoiceField(
        choices=("score", "-score", "saldo_total", "-saldo_total"),
        required=False,
        default="-score",
    )

    def validate(self, attrs):
        # Limitar hard caps coherentes con las views
        attrs["limit"] = min(attrs.get("limit", 50), 100)
        attrs["offset"] = max(attrs.get("offset", 0), 0)
        return attrs


class MorosidadItemSerializer(serializers.Serializer):
    propiedad_id = serializers.IntegerField()
    nro_casa = serializers.CharField(allow_blank=True)
    saldo_expensas = serializers.FloatField()
    saldo_reservas = serializers.FloatField()
    saldo_multas = serializers.FloatField()
    saldo_total = serializers.FloatField()
    atraso_max_90d = serializers.IntegerField()
    pagos_a_tiempo_6m_pct = serializers.FloatField(allow_null=True)
    multas_recientes_90d_count = serializers.IntegerField()
    multas_recientes_90d_monto = serializers.FloatField()
    multas_recientes_90d_sin_cubrir_count = serializers.IntegerField()
    score = serializers.FloatField()
    riesgo = serializers.ChoiceField(choices=("alto", "medio", "bajo"))
    motivo = serializers.CharField(allow_blank=True)


class MorosidadListResponseSerializer(serializers.Serializer):
    items = MorosidadItemSerializer(many=True)
    total = serializers.IntegerField()
    filtros = serializers.DictField(child=serializers.CharField(allow_blank=True), required=False)
    # Opcional para dashboard:
    kpis = MorosidadKPIsSerializer(required=False)


# ============================================================
# Áreas de uso
# ============================================================

class AreasUsoQuerySerializer(BasePaginationQuerySerializer):
    area_social_id = serializers.IntegerField(required=False, allow_null=True)
    semanas = serializers.IntegerField(required=False, min_value=1, default=8)

    def validate(self, attrs):
        attrs["semanas"] = min(attrs.get("semanas", 8), 12)
        attrs["limit"] = min(attrs.get("limit", 100), 200)
        attrs["offset"] = max(attrs.get("offset", 0), 0)
        return attrs


class AreasUsoItemSerializer(serializers.Serializer):
    area_social_id = serializers.IntegerField()
    nombre_area = serializers.CharField()
    dow = serializers.IntegerField(min_value=0, max_value=6)
    hora = serializers.IntegerField(min_value=0, max_value=23)
    demanda_esperada = serializers.FloatField()
    reservas_totales_periodo = serializers.IntegerField()
    ingreso_estimado_periodo = serializers.FloatField()


class AreasUsoListResponseSerializer(serializers.Serializer):
    items = AreasUsoItemSerializer(many=True)
    total = serializers.IntegerField()
    filtros = serializers.DictField(child=serializers.CharField(allow_blank=True), required=False)
    # Opcional para dashboard:
    kpis = AreasKPIsSerializer(required=False)


# ============================================================
# Seguridad
# ============================================================

class SeguridadQuerySerializer(BasePaginationQuerySerializer):
    dias = serializers.IntegerField(required=False, min_value=1, default=21)
    solo_pendientes = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        attrs["dias"] = min(attrs.get("dias", 21), 60)
        attrs["limit"] = min(attrs.get("limit", 100), 200)
        attrs["offset"] = max(attrs.get("offset", 0), 0)
        return attrs


class AutosHoraSerializer(serializers.Serializer):
    hora = serializers.CharField()  # ISO string
    autorizados = serializers.IntegerField()
    denegados = serializers.IntegerField()
    zscore = serializers.FloatField()
    estado = serializers.ChoiceField(choices=("normal", "anomalia"))


class PersonasHoraSerializer(serializers.Serializer):
    hora = serializers.CharField()
    permisos = serializers.IntegerField()
    rechazos = serializers.IntegerField()
    rechazos_invitados = serializers.IntegerField()
    rechazos_no_invitados = serializers.IntegerField()
    zscore = serializers.FloatField()
    estado = serializers.ChoiceField(choices=("normal", "anomalia"))


class AnomaliaSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    tipo_anomalia = serializers.ChoiceField(choices=("persona", "auto"))
    descripcion = serializers.CharField(allow_blank=True, required=False)
    fecha = serializers.CharField()  # ISO string
    ubicacion = serializers.CharField(allow_blank=True, required=False)
    procesado = serializers.BooleanField()


class SeguridadResponseSerializer(serializers.Serializer):
    autos_por_hora = AutosHoraSerializer(many=True)
    personas_por_hora = PersonasHoraSerializer(many=True)
    anomalias = AnomaliaSerializer(many=True)
    filtros = serializers.DictField(child=serializers.CharField(allow_blank=True), required=False)
    # Opcional para dashboard:
    kpis = SeguridadKPIsSerializer(required=False)


# ============================================================
# Exportación
# ============================================================

class ExportQuerySerializer(serializers.Serializer):
    tipo = serializers.ChoiceField(choices=("pdf", "csv_morosidad", "csv_areas", "csv_seguridad"))

    # Reutilizamos filtros de los otros endpoints (opcionales)
    # Morosidad
    propiedad_id = serializers.IntegerField(required=False)
    desde = serializers.DateField(required=False)
    hasta = serializers.DateField(required=False)
    min_riesgo = RiesgoEnum(required=False, allow_null=True, allow_blank=True)
    ordering = serializers.ChoiceField(
        choices=("score", "-score", "saldo_total", "-saldo_total"),
        required=False
    )
    limit = serializers.IntegerField(required=False, min_value=1)
    offset = serializers.IntegerField(required=False, min_value=0)

    # Áreas
    area_social_id = serializers.IntegerField(required=False)
    semanas = serializers.IntegerField(required=False, min_value=1)

    # Seguridad
    dias = serializers.IntegerField(required=False, min_value=1)
    solo_pendientes = serializers.BooleanField(required=False)

    def validate(self, attrs):
        # Caps coherentes con services/views
        if "semanas" in attrs:
            attrs["semanas"] = min(attrs["semanas"], 12)
        if "dias" in attrs:
            attrs["dias"] = min(attrs["dias"], 60)
        if "limit" in attrs:
            # En export permitimos más, pero con tope 10k
            attrs["limit"] = min(attrs["limit"], 10000)
        if "offset" in attrs:
            attrs["offset"] = max(attrs["offset"], 0)
        return attrs
