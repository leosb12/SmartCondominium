from typing import Optional
from uuid import UUID
from django.utils import timezone
from django.db.models import Q, QuerySet
from .models import Mensaje


def get_inbox_queryset(user_uuid: UUID) -> QuerySet[Mensaje]:
    """
    Todos los mensajes donde el usuario participa (enviados o recibidos).
    """
    return Mensaje.objects.filter(Q(emisor_id=user_uuid) | Q(receptor_id=user_uuid)).order_by("-ts")


def get_thread_queryset(user_uuid: UUID, other_uuid: UUID) -> QuerySet[Mensaje]:
    """
    Conversación entre usuario y otro participante.
    """
    return Mensaje.objects.filter(
        (Q(emisor_id=user_uuid) & Q(receptor_id=other_uuid))
        | (Q(emisor_id=other_uuid) & Q(receptor_id=user_uuid))
    ).order_by("-ts")


def create_message(emisor_uuid: UUID, receptor_uuid: UUID, cuerpo: str) -> Mensaje:
    """
    Crea un mensaje asignando timestamp si no viene desde DB.
    Nota: managed=False solo afecta migraciones; ORM puede crear registros.
    """
    return Mensaje.objects.create(
        emisor_id=emisor_uuid,
        receptor_id=receptor_uuid,
        cuerpo=cuerpo,
        ts=timezone.now(),
    )