# backendapi/mantenimiento/services/orders.py
from backendapi.mantenimiento.constants import ESTADO_TRABAJO_PENDIENTE, TIPO_PREVENTIVO
from backendapi.mantenimiento.repository import orden_trabajo as repo
from backendapi.mantenimiento.services.validators import validar_inputs_preventivo
from backendapi.mantenimiento.services.staff import validar_personal

def crear_preventivo(*, creado_por_id: str, catalogo_id: int, descripcion: str,
                     fecha_programada, hora_id: int, costo=None, ordenado_a_id=None):
    validar_inputs_preventivo(catalogo_id=catalogo_id, fecha_programada=fecha_programada, hora_id=hora_id)
    if ordenado_a_id:
        validar_personal(ordenado_a_id)

    payload = {
        "catalogo_id": catalogo_id,
        "creado_por_id": creado_por_id,
        "ordenado_a_id": ordenado_a_id,          # puede ser null
        "tipo": TIPO_PREVENTIVO,
        "estado_trabajo_id": ESTADO_TRABAJO_PENDIENTE,
        "descripcion": descripcion,
        "costo": float(costo) if costo is not None else None,  # Convertir Decimal a float
        "fecha_programada": fecha_programada.isoformat() if hasattr(fecha_programada, 'isoformat') else fecha_programada,
        "hora_id": hora_id,
    }
    return repo.insertar(payload)

def asignar(orden_trabajo_id: int, usuario_id: str):
    validar_personal(usuario_id)
    return repo.actualizar_asignacion(orden_trabajo_id, usuario_id)