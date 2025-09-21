from django.utils import timezone
from django.db.models import Q
from rest_framework import viewsets, permissions
from rest_framework.response import Response
from rest_framework.decorators import action

from backendapi.historialComunicados.models import Comunicado
from backendapi.historialComunicados.serializers import ComunicadoSerializer
from backendapi.historialComunicados.pagination import DefaultPagination


class ComunicadoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Endpoints:
    - GET /historial-comunicados/
    - GET /historial-comunicados/{id}/

    Filtros:
      - search: texto en título/contenido
      - published_from (ISO8601)
      - published_to   (ISO8601)
      - author: UUID (perfiles.id)
      - author_name: texto (nombre/apellido)
    """

    serializer_class = ComunicadoSerializer
    pagination_class = DefaultPagination
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        now = timezone.now()
        qs = (
            Comunicado.objects.all()
            .filter(
                Q(published_at__isnull=False)
                & (Q(expires_at__isnull=True) | Q(expires_at__gt=now))
            )
            .select_related("author")  # join con profiles
            .order_by("-published_at", "-created_at")
        )

        params = self.request.query_params

        # search (titulo o contenido)
        search = params.get("search")
        if search:
            qs = qs.filter(Q(titulo__icontains=search) | Q(contenido__icontains=search))

        # rango de publicación
        published_from = params.get("published_from")
        if published_from:
            qs = qs.filter(published_at__gte=published_from)

        published_to = params.get("published_to")
        if published_to:
            qs = qs.filter(published_at__lte=published_to)

        # autor por UUID (compat)
        author = params.get("author")
        if author:
            qs = qs.filter(author_id=author)

        # autor por nombre/apellido (nuevo)
        author_name = params.get("author_name")
        if author_name:
            tokens = [t.strip() for t in author_name.split() if t.strip()]
            for t in tokens:
                qs = qs.filter(
                    Q(author__first_name__icontains=t) | Q(author__last_name__icontains=t)
                )

        return qs

    @action(detail=False, methods=["get"], url_path="health")
    def health(self, request):
        return Response({"status": "ok"})