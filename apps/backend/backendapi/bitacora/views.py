from django.db import models
from django.db.models import TextField
from django.db.models.functions import Cast
from rest_framework import generics
from rest_framework.permissions import AllowAny

from .models import Bitacora
from .serializers import BitacoraSerializer

class BitacoraListAPIView(generics.ListAPIView):
    """
    Lista pública (sin token) de la bitácora.
    Filtros opcionales por querystring:
      - table_name, event_type (iexact)
      - user_id (uuid)
      - created_from, created_to (ISO datetime)
      - q (búsqueda simple en title, nombres, row_id, table_name, event_type y details como texto)
      - ordering (por defecto -created_at). Acepta: created_at, -created_at, id, -id
    """
    serializer_class = BitacoraSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = Bitacora.objects.all().order_by("-created_at")

        params = self.request.query_params

        table_name = params.get("table_name")
        if table_name:
            qs = qs.filter(table_name__iexact=table_name)

        event_type = params.get("event_type")
        if event_type:
            qs = qs.filter(event_type__iexact=event_type)

        user_id = params.get("user_id")
        if user_id:
            qs = qs.filter(user_id=user_id)

        created_from = params.get("created_from")
        if created_from:
            qs = qs.filter(created_at__gte=created_from)

        created_to = params.get("created_to")
        if created_to:
            qs = qs.filter(created_at__lte=created_to)

        # Búsqueda simple (sin dependencias extra)
        q = params.get("q")
        if q:
            qs = qs.annotate(details_text=Cast("details", TextField()))
            qs = qs.filter(
                models.Q(title__icontains=q)
                | models.Q(first_name__icontains=q)
                | models.Q(last_name__icontains=q)
                | models.Q(row_id__icontains=q)
                | models.Q(table_name__icontains=q)
                | models.Q(event_type__icontains=q)
                | models.Q(details_text__icontains=q)
            )

        ordering = params.get("ordering")
        if ordering in {"created_at", "-created_at", "id", "-id"}:
            qs = qs.order_by(ordering)

        return qs


class BitacoraDetailAPIView(generics.RetrieveAPIView):
    """
    Detalle público por id (sin token).
    """
    serializer_class = BitacoraSerializer
    permission_classes = [AllowAny]
    queryset = Bitacora.objects.all()