from rest_framework.permissions import BasePermission


class IsParticipant(BasePermission):
    """
    Solo permite acceder a mensajes donde el usuario sea emisor o receptor.
    """

    def has_object_permission(self, request, view, obj) -> bool:
        uid = getattr(request.user, "id", None)
        # Si tu user PK ya es UUID string/UUID, esto funcionará.
        # Si tu PK es int, deberás mapear al UUID correspondiente antes de usar mensajería.
        return uid is not None and (str(obj.emisor_id) == str(uid) or str(obj.receptor_id) == str(uid))