"""
Permisos para el módulo de administración de finanzas

Utiliza los decoradores de autenticación existentes que ya funcionan
en el módulo de roles.
"""

# Importar los decoradores que ya funcionan correctamente
from ..roles.auth_helpers import require_auth, require_admin


# Re-exportar para uso en el módulo
__all__ = ['require_auth', 'require_admin']