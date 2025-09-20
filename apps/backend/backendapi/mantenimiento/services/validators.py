# backendapi/mantenimiento/services/validators.py
from datetime import date
from backendapi.mantenimiento.repository import catalogo, hora

def validar_inputs_preventivo(*, catalogo_id: int, fecha_programada, hora_id: int):
    if not catalogo.existe_catalogo(catalogo_id):
        raise ValueError("catalogo_id inválido")
    if not hora.existe_hora(hora_id):
        raise ValueError("hora_id inválido")
    if fecha_programada < date.today():
        raise ValueError("fecha_programada debe ser hoy o futura")