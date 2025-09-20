# backendapi/mantenimiento/services/staff.py
from backendapi.mantenimiento.repository import roles as roles_repo
from backendapi.mantenimiento.constants import ROLE_MANTENIMIENTO_INTERNO, ROLE_MANTENIMIENTO_EXTERNO

def es_interno(user_id: str) -> bool:
    return ROLE_MANTENIMIENTO_INTERNO in roles_repo.user_role_ids(user_id)

def es_externo(user_id: str) -> bool:
    return ROLE_MANTENIMIENTO_EXTERNO in roles_repo.user_role_ids(user_id)

def validar_personal(user_id: str):
    if not (es_interno(user_id) or es_externo(user_id)):
        raise PermissionError("El usuario destino no es personal interno ni externo")

def listar_personal(tipo: str) -> list[str]:
    rol = ROLE_MANTENIMIENTO_INTERNO if tipo == "interno" else ROLE_MANTENIMIENTO_EXTERNO
    return roles_repo.listar_personal_por_rol(rol)

def listar_personal_con_nombres(tipo: str) -> list[dict]:
    rol = ROLE_MANTENIMIENTO_INTERNO if tipo == "interno" else ROLE_MANTENIMIENTO_EXTERNO
    return roles_repo.listar_personal_con_nombres_por_rol(rol)