from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from .models import Auto
from .serializers import AutoSerializer
from core.supabase_client import supabase_admin

class AutoListCreateView(generics.ListCreateAPIView):
    serializer_class = AutoSerializer
    
    def get_queryset(self):
        # Si el usuario está autenticado, filtramos por sus propiedades
        user_id = getattr(self.request, 'user_id', None)
        queryset = Auto.objects.select_related(
            'propiedad',
            'propiedad__id_dueño',
            'estado'
        )
        
        # Si hay un parámetro 'mis_registros' o el usuario quiere ver solo sus autos
        if self.request.query_params.get('mis_registros') or user_id:
            if user_id:
                # Obtener las propiedades del usuario
                try:
                    uh_res = (
                        supabase_admin.table("usuario_habitante")
                        .select("propiedad_id")
                        .eq("usuario_id", user_id)
                        .eq("estado_id", 1)
                        .execute()
                    )
                    propiedad_ids = [
                        r.get("propiedad_id")
                        for r in (getattr(uh_res, "data", None) or [])
                        if r.get("propiedad_id") is not None
                    ]
                    if propiedad_ids:
                        queryset = queryset.filter(propiedad_id__in=propiedad_ids)
                    else:
                        queryset = queryset.none()
                except Exception:
                    pass
        
        return queryset.all()
    
    def perform_create(self, serializer):
        # Si el usuario está autenticado y no especifica propiedad, asignar su propiedad
        user_id = getattr(self.request, 'user_id', None)
        if user_id and not serializer.validated_data.get('propiedad'):
            try:
                # Obtener la primera propiedad activa del usuario
                uh_res = (
                    supabase_admin.table("usuario_habitante")
                    .select("propiedad_id")
                    .eq("usuario_id", user_id)
                    .eq("estado_id", 1)
                    .limit(1)
                    .execute()
                )
                propiedades = getattr(uh_res, "data", None) or []
                if propiedades and propiedades[0].get("propiedad_id"):
                    from .models import Auto
                    from backendapi.models import Propiedad
                    propiedad = Propiedad.objects.get(id=propiedades[0].get("propiedad_id"))
                    serializer.save(propiedad=propiedad)
                    return
            except Exception:
                pass
        
        serializer.save()


class MisAutosView(generics.ListAPIView):
    """
    GET /api/autos/mis-autos/
    Devuelve solo los autos del usuario autenticado
    """
    serializer_class = AutoSerializer
    
    def get_queryset(self):
        user_id = getattr(self.request, 'user_id', None)
        if not user_id:
            return Auto.objects.none()
        
        try:
            # Obtener las propiedades del usuario
            uh_res = (
                supabase_admin.table("usuario_habitante")
                .select("propiedad_id")
                .eq("usuario_id", user_id)
                .eq("estado_id", 1)
                .execute()
            )
            propiedad_ids = [
                r.get("propiedad_id")
                for r in (getattr(uh_res, "data", None) or [])
                if r.get("propiedad_id") is not None
            ]
            
            if not propiedad_ids:
                return Auto.objects.none()
            
            return Auto.objects.select_related(
                'propiedad',
                'propiedad__id_dueño',
                'estado'
            ).filter(propiedad_id__in=propiedad_ids)
        except Exception:
            return Auto.objects.none()


class AutoRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AutoSerializer
    
    def get_queryset(self):
        return Auto.objects.select_related(
            'propiedad',
            'propiedad__id_dueño',
            'estado'
        ).all()