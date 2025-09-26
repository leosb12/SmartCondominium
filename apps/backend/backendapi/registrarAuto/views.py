from rest_framework import generics
from .models import Auto
from .serializers import AutoSerializer

class AutoListCreateView(generics.ListCreateAPIView):
    queryset = Auto.objects.select_related("propiedad", "estado").all()
    serializer_class = AutoSerializer

class AutoRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Auto.objects.select_related("propiedad", "estado").all()
    serializer_class = AutoSerializer