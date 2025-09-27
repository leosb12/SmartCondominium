# backendapi/analytics/constants.py
"""
Constantes de configuración para el módulo Analytics (CU-35).

⚙️ Objetivo: centralizar umbrales, ventanas, límites, textos y formatos,
para que el comportamiento sea consistente y fácil de ajustar sin tocar lógica.
"""

# =========================
# Zona horaria y DB
# =========================
TIMEZONE = "America/La_Paz"
STATEMENT_TIMEOUT_MS = 3000  # límite por consulta on-demand (ms)

# =========================
# Ventanas por defecto
# =========================
VENTANA_MOROSIDAD_90D = 90              # días para atraso/multas recientes
VENTANA_PUNTUALIDAD_MESES = 6           # meses para % pagos a tiempo
VENTANA_AREAS_SEMANAS_DEF = 8           # semanas para demanda esperada
VENTANA_AREAS_SEMANAS_MAX = 12          # tope semanas
VENTANA_SEGURIDAD_DIAS_DEF = 21         # días de ventana en seguridad
VENTANA_SEGURIDAD_DIAS_MAX = 60         # tope días

# =========================
# Límites de paginación
# =========================
LIST_DEFAULT_LIMIT = 50
LIST_MAX_LIMIT = 100

AREAS_DEFAULT_LIMIT = 100
AREAS_MAX_LIMIT = 200

SEG_DEFAULT_LIMIT = 100
SEG_MAX_LIMIT = 200

EXPORT_MAX_ROWS = 10_000  # tope de filas para CSV

# =========================
# Riesgo / scoring (heurístico, sin IA)
# =========================
# Umbrales de clasificación por score
SCORE_RIESGO_ALTO = 0.70
SCORE_RIESGO_MEDIO = 0.40

# Reglas de motivo (coherentes con services.py)
ATRASO_ALTO_DIAS = 30
PUNTUALIDAD_MIN_OK = 0.60       # < 0.60 => "Pocos pagos a tiempo"
MULTAS_RECENTES_SIN_CUBRIR_MIN = 2

# Pesos del score (deben coincidir con services.py)
WEIGHT_ATRASO = 0.45
WEIGHT_PUNTUALIDAD = 0.45
WEIGHT_MULTAS = 0.10

# =========================
# Ordering permitido
# =========================
ORDERING_MOROSIDAD = ("score", "-score", "saldo_total", "-saldo_total")

# =========================
# Textos/labels estándar
# =========================
RIESGO_LABELS = ("alto", "medio", "bajo")

MOTIVO_LABEL_ATRASO_ALTO = "Atraso alto"
MOTIVO_LABEL_PUNTUALIDAD_BAJA = "Pocos pagos a tiempo"
MOTIVO_LABEL_MULTAS_RECIENTES = "Múltiples multas recientes"
MOTIVO_LABEL_ESTABLE = "Perfil estable"

# Glosario (para PDF o tooltips en frontend)
GLOSARIO = {
    "saldo": "Importe pendiente: total del ítem menos montos abonados en cargos.",
    "pago_en_curso": "Existe al menos un cargo asociado, pero aún hay saldo por cubrir.",
    "pago_completo": "La sumatoria de cargos cubre el total del ítem.",
    "atraso": "Días transcurridos respecto a la fecha_vencimiento (solo expensas/reservas).",
    "puntualidad_6m": "Proporción de ítems cubiertos a tiempo en los últimos 6 meses.",
    "zscore": "Desviación respecto a la media histórica de esa misma hora del día.",
}

# =========================
# Exportación
# =========================
EXPORT_FILENAME_PREFIX = "Analitica"
EXPORT_CSV_HEADERS = {
    "morosidad": [
        "propiedad_id", "nro_casa",
        "saldo_expensas", "saldo_reservas", "saldo_multas", "saldo_total",
        "atraso_max_90d", "pagos_a_tiempo_6m_pct",
        "multas_recientes_90d_count", "multas_recientes_90d_monto",
        "multas_recientes_90d_sin_cubrir_count",
        "score", "riesgo", "motivo",
    ],
    "areas": [
        "area_social_id", "nombre_area",
        "dow", "hora", "demanda_esperada",
        "reservas_totales_periodo", "ingreso_estimado_periodo",
    ],
    "seguridad_flat": [
        # Export “flat” combinando secciones con un campo “seccion”
        "seccion", "hora", "autorizados", "denegados", "permisos",
        "rechazos", "rechazos_invitados", "rechazos_no_invitados",
        "zscore", "estado", "id", "tipo_anomalia", "descripcion",
        "ubicacion", "procesado",
    ],
}

# =========================
# Utilidades UX
# =========================
# Nombres de días en español (0 = domingo)
DOW_NAMES_ES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]

# =========================
# Bandera de uso futuro
# =========================
# Si más adelante quisieras habilitar vistas materializadas/pre-cálculo,
# puedes usar estos flags para feature toggles (mantener OFF en CU-35).
FEATURE_USE_MATVIEWS = False
FEATURE_USE_WORKERS = False
FEATURE_USE_ML = False
