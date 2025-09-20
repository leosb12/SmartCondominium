from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict


def _to_float(value: Any, default: float = 0.0) -> float:
    if value is None:
        return default
    if isinstance(value, (int, float, Decimal)):
        return float(value)
    # Intentar castear strings numéricos
    try:
        return float(value)
    except Exception:
        return default


def _to_iso(value: Any) -> Any:
    """
    Si es date/datetime, devolver ISO 8601; si es string u otro tipo, devolver tal cual.
    """
    if isinstance(value, datetime):
        # Mantener timezone si la trae
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return value


class AreaSocialSerializer:
    @staticmethod
    def to_dict(area_social):
        """Convert area_social tuple/dict to serialized dict"""
        if isinstance(area_social, dict):
            return {
                'id': area_social.get('id'),
                'nombre': area_social.get('nombre'),
                'precioxhora': _to_float(area_social.get('precioxhora'), 0.0),
            }
        # Fallback tupla (id, nombre, precioxhora)
        return {
            'id': area_social[0] if len(area_social) > 0 else None,
            'nombre': area_social[1] if len(area_social) > 1 else None,
            'precioxhora': _to_float(area_social[2] if len(area_social) > 2 else None, 0.0),
        }


class ReservaSerializer:
    @staticmethod
    def to_dict(reserva):
        """Convert reserva tuple/dict to serialized dict"""
        if isinstance(reserva, dict):
            out: Dict[str, Any] = {
                'id': reserva.get('id'),
                'propiedad_id': reserva.get('propiedad_id'),
                'area_social_id': reserva.get('area_social_id'),
                'area_social_nombre': reserva.get('area_social_nombre'),
                'nro_casa': reserva.get('nro_casa'),
                'fecha': _to_iso(reserva.get('fecha')),
                'hora_inicio_id': reserva.get('hora_inicio_id'),
                'hora_fin_id': reserva.get('hora_fin_id'),
                'hora_inicio_valor': reserva.get('hora_inicio_valor'),
                'hora_fin_valor': reserva.get('hora_fin_valor'),
                'total': _to_float(reserva.get('total'), 0.0),
                'created_at': _to_iso(reserva.get('created_at')),
                'fecha_vencimiento': _to_iso(reserva.get('fecha_vencimiento')),
            }
            return out

        # Fallback tupla (posiciones según comentario previo)
        return {
            'id': reserva[0] if len(reserva) > 0 else None,
            'propiedad_id': reserva[1] if len(reserva) > 1 else None,
            'area_social_id': reserva[2] if len(reserva) > 2 else None,
            'fecha': _to_iso(reserva[3] if len(reserva) > 3 else None),
            'hora_inicio_id': reserva[4] if len(reserva) > 4 else None,
            'hora_fin_id': reserva[5] if len(reserva) > 5 else None,
            'total': _to_float(reserva[6] if len(reserva) > 6 else None, 0.0),
            'created_at': _to_iso(reserva[7] if len(reserva) > 7 else None),
            'fecha_vencimiento': _to_iso(reserva[8] if len(reserva) > 8 else None),
        }


class PropiedadSerializer:
    @staticmethod
    def to_dict(propiedad):
        """Convert propiedad tuple/dict to serialized dict"""
        if isinstance(propiedad, dict):
            return {
                'id': propiedad.get('id'),
                'nro_casa': propiedad.get('nro_casa'),
                'm2': _to_float(propiedad.get('m2'), 0.0),
            }
        # Si llega tupla, devolver como venga (o arma un dict mínimo)
        return propiedad


class HoraSerializer:
    @staticmethod
    def to_dict(hora):
        """Convert hora tuple/dict to serialized dict"""
        if isinstance(hora, dict):
            return {
                'id': hora.get('id'),
                'valor': hora.get('valor'),
            }
        return hora