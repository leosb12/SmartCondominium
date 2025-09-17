"""
Vistas para la gestión de roles

Define los ViewSets y APIViews para las operaciones de roles y usuarios.
"""

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from .permissions import IsAdminRole, IsAuthenticated
from .serializers import (
    UserRoleSerializer,
    AssignRoleSerializer,
    RemoveRoleSerializer,
    RoleOperationResponseSerializer,
    ErrorResponseSerializer,
    ListUsersQuerySerializer,
    PaginatedUsersResponseSerializer,
    AllRolesResponseSerializer,
    UserRolesResponseSerializer,
    RoleSerializer
)
from .services import (
    list_users_with_roles,
    assign_role,
    remove_role,
    get_all_roles,
    get_roles_for_user
)
from .auth_helpers import get_user_id_from_request


class CustomPageNumberPagination(PageNumberPagination):
    """Paginación personalizada para el listado de usuarios"""
    
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class RoleManagementViewSet(viewsets.ViewSet):
    """
    ViewSet principal para la gestión de roles.
    
    Proporciona endpoints para listar, asignar y remover roles.
    """
    
    permission_classes = [IsAuthenticated, IsAdminRole]
    pagination_class = CustomPageNumberPagination
    
    @extend_schema(
        summary="Debug auth - verificar autenticación",
        description="Endpoint temporal para debug de autenticación",
        responses={200: "OK", 401: "Unauthorized", 403: "Forbidden"}
    )
    @action(detail=False, methods=['get'], url_path='debug-auth', permission_classes=[])
    def debug_auth(self, request):
        """Debug endpoint para verificar autenticación"""
        try:
            user_id = get_user_id_from_request(request)
            
            if not user_id:
                return Response({
                    'error': 'No user_id found',
                    'auth_header': request.headers.get('Authorization', 'None')[:50] + '...' if request.headers.get('Authorization') else 'None',
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            # Verificar conectividad con tablas
            from core.supabase_client import supabase_admin
            
            try:
                roles_count = supabase_admin.table("roles").select("id", count="exact").execute()
                roles_usuario_count = supabase_admin.table("roles_usuario").select("usuario_id", count="exact").execute()
            except Exception as db_e:
                return Response({
                    'error': 'Database connection failed',
                    'detail': str(db_e),
                    'user_id': user_id
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Importar aquí para evitar circulares
            from .services import user_has_role
            
            is_admin = user_has_role(user_id, 'administrador')
            
            return Response({
                'user_id': user_id,
                'is_admin': is_admin,
                'roles_count': roles_count.count if hasattr(roles_count, 'count') else 'unknown',
                'roles_usuario_count': roles_usuario_count.count if hasattr(roles_usuario_count, 'count') else 'unknown',
                'message': 'Authentication working'
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': 'Exception in debug',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='test-db', permission_classes=[])
    def test_db(self, request):
        """Test endpoint para verificar conectividad con base de datos"""
        try:
            from core.supabase_client import supabase_admin
            
            # Verificar conectividad con tablas
            roles_result = supabase_admin.table("roles").select("id, nombre").limit(5).execute()
            roles_usuario_result = supabase_admin.table("roles_usuario").select("usuario_id").limit(5).execute()
            
            # Verificar usuarios de Auth
            auth_users_result = supabase_admin.auth.admin.list_users()
            auth_users_count = len(auth_users_result.users) if auth_users_result and hasattr(auth_users_result, 'users') else 0
            
            # Muestra de usuarios de auth (solo emails por privacidad)
            auth_users_sample = []
            if auth_users_result and hasattr(auth_users_result, 'users'):
                for user in auth_users_result.users[:3]:  # Solo los primeros 3
                    auth_users_sample.append({
                        'id': user.id[:8] + '...',  # Solo parte del ID
                        'email': getattr(user, 'email', 'No email'),
                        'created_at': getattr(user, 'created_at', 'Unknown')
                    })
            
            return Response({
                'message': 'Database connection OK',
                'roles_sample': roles_result.data if roles_result.data else [],
                'roles_usuario_sample': roles_usuario_result.data if roles_usuario_result.data else [],
                'auth_users_sample': auth_users_sample,
                'counts': {
                    'roles': len(roles_result.data) if roles_result.data else 0,
                    'roles_usuario': len(roles_usuario_result.data) if roles_usuario_result.data else 0,
                    'auth_users': auth_users_count
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': 'Database connection failed',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'], url_path='test-users', permission_classes=[])
    def test_users(self, request):
        """Test endpoint para probar el listado de usuarios"""
        try:
            from core.supabase_client import supabase_admin
            
            # PASO 1: Probar directamente el listado de usuarios de Auth
            try:
                auth_users_result = supabase_admin.auth.admin.list_users()
                auth_debug = {
                    'has_result': auth_users_result is not None,
                    'has_users_attr': hasattr(auth_users_result, 'users') if auth_users_result else False,
                    'users_count': len(auth_users_result.users) if auth_users_result and hasattr(auth_users_result, 'users') else 0,
                    'result_type': str(type(auth_users_result)),
                    'result_attrs': dir(auth_users_result) if auth_users_result else []
                }
                
                # Información de usuarios si existen
                users_info = []
                if auth_users_result and hasattr(auth_users_result, 'users') and auth_users_result.users:
                    for user in auth_users_result.users[:3]:  # Solo los primeros 3
                        users_info.append({
                            'id': user.id[:8] + '...',
                            'email': getattr(user, 'email', 'No email'),
                            'created_at': getattr(user, 'created_at', 'Unknown'),
                            'user_attrs': [attr for attr in dir(user) if not attr.startswith('_')]
                        })
                
            except Exception as auth_e:
                auth_debug = {
                    'error': str(auth_e),
                    'error_type': str(type(auth_e))
                }
                users_info = []
            
            # PASO 2: Probar nuestra función
            try:
                from .services import RoleService
                users, total_count = RoleService.list_users_with_roles(search="", limit=10, offset=0)
                service_debug = {
                    'success': True,
                    'total_count': total_count,
                    'users_returned': len(users) if users else 0
                }
            except Exception as service_e:
                service_debug = {
                    'success': False,
                    'error': str(service_e)
                }
                users = []
                total_count = 0
            
            return Response({
                'auth_debug': auth_debug,
                'users_info_sample': users_info,
                'service_debug': service_debug,
                'final_users_sample': users[:3] if users else []
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                'error': 'Debug failed',
                'detail': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @extend_schema(
        summary="Listar usuarios con sus roles",
        description="Obtiene una lista paginada de usuarios con sus roles asignados",
        parameters=[
            OpenApiParameter(
                name='search', 
                description='Filtrar por email de usuario', 
                required=False, 
                type=OpenApiTypes.STR
            ),
            OpenApiParameter(
                name='page', 
                description='Número de página', 
                required=False, 
                type=OpenApiTypes.INT
            ),
            OpenApiParameter(
                name='page_size', 
                description='Elementos por página (máximo 100)', 
                required=False, 
                type=OpenApiTypes.INT
            ),
        ],
        responses={
            200: PaginatedUsersResponseSerializer,
            401: ErrorResponseSerializer,
            403: ErrorResponseSerializer,
        }
    )
    @action(detail=False, methods=['get'], url_path='users', permission_classes=[IsAuthenticated])
    def list_users_with_roles(self, request):
        """Lista usuarios con sus roles asignados"""
        
        # Debug temporal - verificar user_id primero
        user_id = get_user_id_from_request(request)
        if not user_id:
            return Response({
                'error': 'Authentication failed',
                'auth_header': request.headers.get('Authorization', 'None')[:50] + '...' if request.headers.get('Authorization') else 'None'
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        # Verificar si es admin
        from .services import user_has_role
        is_admin = user_has_role(user_id, 'administrador')
        if not is_admin:
            return Response({
                'error': 'Admin role required',
                'user_id': user_id,
                'is_admin': is_admin
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Validar query parameters
        query_serializer = ListUsersQuerySerializer(data=request.query_params)
        if not query_serializer.is_valid():
            return Response(
                {'error': 'Parámetros inválidos', 'detail': query_serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Obtener parámetros validados
        search = query_serializer.validated_data.get('search', '')
        page = query_serializer.validated_data.get('page', 1)
        page_size = query_serializer.validated_data.get('page_size', 20)
        
        # Calcular offset
        offset = (page - 1) * page_size
        
        try:
            # Obtener usuarios con roles
            from .services import RoleService
            users, total_count = RoleService.list_users_with_roles(search, page_size, offset)
            
            # Preparar respuesta paginada
            has_next = (offset + page_size) < total_count
            has_previous = page > 1
            
            response_data = {
                'count': total_count,
                'next': f"?page={page + 1}&page_size={page_size}" + (f"&search={search}" if search else "") if has_next else None,
                'previous': f"?page={page - 1}&page_size={page_size}" + (f"&search={search}" if search else "") if has_previous else None,
                'results': users
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': 'Error interno del servidor', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @extend_schema(
        summary="Asignar rol a usuario",
        description="Asigna un rol específico a un usuario",
        request=AssignRoleSerializer,
        responses={
            200: RoleOperationResponseSerializer,
            400: ErrorResponseSerializer,
            401: ErrorResponseSerializer,
            403: ErrorResponseSerializer,
        }
    )
    @action(detail=False, methods=['post'], url_path='assign')
    def assign_role(self, request):
        """Asigna un rol a un usuario"""
        
        serializer = AssignRoleSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': 'Datos inválidos', 'detail': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_id = serializer.validated_data['user_id']
        role_name = serializer.validated_data['role_name']
        
        try:
            success, message = assign_role(user_id, role_name)
            
            response_data = {
                'success': success,
                'message': message,
                'user_id': user_id,
                'role_name': role_name
            }
            
            return Response(
                response_data,
                status=status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST
            )
            
        except Exception as e:
            return Response(
                {'error': 'Error interno del servidor', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @extend_schema(
        summary="Remover rol de usuario",
        description="Remueve un rol específico de un usuario",
        request=RemoveRoleSerializer,
        responses={
            200: RoleOperationResponseSerializer,
            400: ErrorResponseSerializer,
            401: ErrorResponseSerializer,
            403: ErrorResponseSerializer,
        }
    )
    @action(detail=False, methods=['post'], url_path='remove')
    def remove_role(self, request):
        """Remueve un rol de un usuario"""
        
        serializer = RemoveRoleSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(
                {'error': 'Datos inválidos', 'detail': serializer.errors},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_id = serializer.validated_data['user_id']
        role_name = serializer.validated_data['role_name']
        
        try:
            success, message = remove_role(user_id, role_name)
            
            response_data = {
                'success': success,
                'message': message,
                'user_id': user_id,
                'role_name': role_name
            }
            
            return Response(
                response_data,
                status=status.HTTP_200_OK if success else status.HTTP_400_BAD_REQUEST
            )
            
        except Exception as e:
            return Response(
                {'error': 'Error interno del servidor', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @extend_schema(
        summary="Listar todos los roles disponibles",
        description="Obtiene la lista de todos los roles disponibles en el sistema",
        responses={
            200: AllRolesResponseSerializer,
            401: ErrorResponseSerializer,
            403: ErrorResponseSerializer,
        }
    )
    @action(detail=False, methods=['get'], url_path='available')
    def list_available_roles(self, request):
        """Lista todos los roles disponibles"""
        
        try:
            roles = get_all_roles()
            return Response({'roles': roles}, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': 'Error interno del servidor', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserRolesView(APIView):
    """
    Vista para obtener los roles de un usuario específico.
    Permite que los usuarios autenticados vean sus propios roles,
    o que los administradores vean roles de cualquier usuario.
    """
    
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Obtener roles de un usuario",
        description="Obtiene los roles asignados a un usuario específico. Los usuarios pueden ver sus propios roles, los administradores pueden ver roles de cualquier usuario.",
        parameters=[
            OpenApiParameter(
                name='user_id',
                description='UUID del usuario (opcional, si no se proporciona se usa el usuario actual)',
                required=False,
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY
            ),
        ],
        responses={
            200: UserRolesResponseSerializer,
            401: ErrorResponseSerializer,
            403: ErrorResponseSerializer,
        }
    )
    def get(self, request):
        """Obtiene los roles de un usuario"""
        
        try:
            current_user_id = get_user_id_from_request(request)
            if not current_user_id:
                return Response(
                    {'error': 'Usuario no autenticado'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            # Obtener ID del usuario objetivo
            target_user_id = request.query_params.get('user_id', current_user_id)
            
            # Verificar permisos
            from .services import user_has_role
            if target_user_id != current_user_id:
                # Solo administradores pueden ver roles de otros usuarios
                if not user_has_role(current_user_id, 'administrador'):
                    return Response(
                        {'error': 'Sin permisos para ver roles de otros usuarios'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            
            # Obtener roles del usuario
            roles = get_roles_for_user(target_user_id)
            
            response_data = {
                'user_id': target_user_id,
                'roles': roles
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': 'Error interno del servidor', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class MyRolesView(APIView):
    """
    Vista simplificada para que los usuarios vean sus propios roles.
    """
    
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        summary="Obtener mis roles",
        description="Obtiene los roles del usuario autenticado actual",
        responses={
            200: UserRolesResponseSerializer,
            401: ErrorResponseSerializer,
        }
    )
    def get(self, request):
        """Obtiene los roles del usuario actual"""
        
        try:
            user_id = get_user_id_from_request(request)
            if not user_id:
                return Response(
                    {'error': 'Usuario no autenticado'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            roles = get_roles_for_user(user_id)
            
            response_data = {
                'user_id': user_id,
                'roles': roles
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': 'Error interno del servidor', 'detail': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )