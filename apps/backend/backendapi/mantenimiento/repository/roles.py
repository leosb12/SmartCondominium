# backendapi/mantenimiento/repository/roles.py
from core.supabase_client import supabase

def user_role_ids(user_id: str) -> set[int]:
    res = supabase.table("roles_usuario").select("rol_id").eq("usuario_id", user_id).execute()
    return {row["rol_id"] for row in (res.data or [])}

def listar_personal_por_rol(rol_id: int) -> list[str]:
    res = supabase.table("roles_usuario").select("usuario_id").eq("rol_id", rol_id).execute()
    return [row["usuario_id"] for row in (res.data or [])]

def listar_personal_con_nombres_por_rol(rol_id: int) -> list[dict]:
    # Primero obtener los user_ids del rol
    res = supabase.table("roles_usuario").select("usuario_id").eq("rol_id", rol_id).execute()
    user_ids = [row["usuario_id"] for row in (res.data or [])]
    
    if not user_ids:
        return []
    
    # Obtener información real de los usuarios usando el mismo patrón que /api/me/
    from core.supabase_client import supabase_admin
    
    tecnicos = []
    
    for user_id in user_ids:
        try:
            # Usar admin client para obtener información del usuario
            user_response = supabase_admin.auth.admin.get_user_by_id(user_id)
            
            if user_response and hasattr(user_response, 'user') and user_response.user:
                user = user_response.user
                email = user.email or ""
                
                # Intentar obtener nombre completo desde la tabla profiles (como en /api/me/)
                full_name = ""
                try:
                    sel = (
                        supabase_admin.table("profiles")
                        .select("first_name,last_name")
                        .eq("id", user_id)
                        .single()
                        .execute()
                    )
                    if sel.data:
                        fn = (sel.data.get("first_name") or "").strip()
                        ln = (sel.data.get("last_name") or "").strip()
                        full_name = f"{fn} {ln}".strip()
                except Exception:
                    # Si no hay tabla profiles, usar nombre del metadata
                    user_metadata = getattr(user, 'user_metadata', {}) or {}
                    full_name = user_metadata.get('full_name', '') or user_metadata.get('name', '')
                
                # Si no hay nombre completo, usar una versión amigable del email
                if not full_name:
                    full_name = f"Técnico {email.split('@')[0] if email else user_id[:8]}"
                
                tecnicos.append({
                    "id": user_id,
                    "nombre": full_name,
                    "email": email
                })
            else:
                # Fallback si no se puede obtener el usuario
                tecnicos.append({
                    "id": user_id,
                    "nombre": f"Técnico {user_id[:8]}",
                    "email": ""
                })
        except Exception as e:
            # Fallback en caso de error
            tecnicos.append({
                "id": user_id,
                "nombre": f"Técnico {user_id[:8]}",
                "email": f"Error: {str(e)[:20]}"
            })
    
    return tecnicos