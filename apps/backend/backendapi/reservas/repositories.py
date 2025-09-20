from core.supabase_client import supabase_admin
from datetime import datetime
import traceback

class ReservaRepository:
    """Repository layer for reserva database operations"""

    # -------------------------
    # ÁREAS SOCIALES
    # -------------------------

    @staticmethod
    def get_all_areas_sociales():
        """Get all areas sociales"""
        try:
            client = supabase_admin
            result = (
                client.table('area_social')
                .select('id, nombre, precioxhora')
                .order('nombre')
                .execute()
            )
            if result.data:
                return [dict(area) for area in result.data]
            return []
        except Exception as e:
            print(f"Error getting areas sociales: {e}")
            print(traceback.format_exc())
            return []

    @staticmethod
    def get_area_social_by_id(area_id):
        """Get area social by ID"""
        try:
            client = supabase_admin
            result = (
                client.table('area_social')
                .select('id, nombre, precioxhora')
                .eq('id', area_id)
                .single()
                .execute()
            )
            if result.data:
                return dict(result.data)
            return None
        except Exception as e:
            print(f"Error getting area social by ID: {e}")
            print(traceback.format_exc())
            return None

    @staticmethod
    def create_area_social(data):
        """Create new area social"""
        try:
            client = supabase_admin
            area_data = {
                'nombre': data.get('nombre'),
                'precioxhora': data.get('precioxhora', 0),
            }
            result = client.table('area_social').insert(area_data).execute()
            if result.data:
                return dict(result.data[0])
            return None
        except Exception as e:
            print(f"Error creating area social: {e}")
            print(traceback.format_exc())
            raise e

    @staticmethod
    def update_area_social(area_id, data):
        """Update area social"""
        try:
            client = supabase_admin
            update_data = {}
            if 'nombre' in data:
                update_data['nombre'] = data['nombre']
            if 'precioxhora' in data:
                update_data['precioxhora'] = data['precioxhora']

            if not update_data:
                return None

            result = (
                client.table('area_social')
                .update(update_data)
                .eq('id', area_id)
                .execute()
            )
            if result.data:
                return dict(result.data[0])
            return None
        except Exception as e:
            print(f"Error updating area social: {e}")
            print(traceback.format_exc())
            raise e

    @staticmethod
    def delete_area_social(area_id):
        """Delete area social (si no tiene reservas asociadas)"""
        try:
            client = supabase_admin

            # Verificar si existen reservas asociadas
            reservas_result = (
                client.table('reserva')
                .select('id')
                .eq('area_social_id', area_id)
                .limit(1)
                .execute()
            )
            if reservas_result.data:
                raise Exception("No se puede eliminar el área social porque tiene reservas asociadas")

            result = client.table('area_social').delete().eq('id', area_id).execute()
            return len(result.data) > 0
        except Exception as e:
            print(f"Error deleting area social: {e}")
            print(traceback.format_exc())
            raise e

    # -------------------------
    # RESERVAS
    # -------------------------

    @staticmethod
    def get_all_reservas():
        """Get all reservas with area social + propiedad + horas info"""
        try:
            client = supabase_admin
            result = (
                client.table('reserva')
                .select(
                    '''
                    id, propiedad_id, area_social_id, fecha, hora_inicio_id, hora_fin_id, total, created_at, fecha_vencimiento,
                    area_social:area_social_id (nombre),
                    propiedad:propiedad_id (nro_casa),
                    hora_inicio:hora_inicio_id (valor),
                    hora_fin:hora_fin_id (valor)
                    '''
                )
                .order('fecha', desc=True)
                .execute()
            )
            if result.data:
                reservas = []
                for reserva in result.data:
                    r = dict(reserva)
                    # Flatten
                    if r.get('area_social'):
                        r['area_social_nombre'] = r['area_social']['nombre']
                        del r['area_social']
                    if r.get('propiedad'):
                        r['nro_casa'] = r['propiedad']['nro_casa']
                        del r['propiedad']
                    if r.get('hora_inicio'):
                        r['hora_inicio_valor'] = r['hora_inicio']['valor']
                        del r['hora_inicio']
                    if r.get('hora_fin'):
                        r['hora_fin_valor'] = r['hora_fin']['valor']
                        del r['hora_fin']
                    reservas.append(r)
                return reservas
            return []
        except Exception as e:
            print(f"Error getting reservas: {e}")
            print(traceback.format_exc())
            return []

    @staticmethod
    def get_reserva_by_id(reserva_id):
        """Get reserva by ID with area social + propiedad + horas info"""
        try:
            client = supabase_admin
            result = (
                client.table('reserva')
                .select(
                    '''
                    id, propiedad_id, area_social_id, fecha, hora_inicio_id, hora_fin_id, total, created_at, fecha_vencimiento,
                    area_social:area_social_id (nombre),
                    propiedad:propiedad_id (nro_casa),
                    hora_inicio:hora_inicio_id (valor),
                    hora_fin:hora_fin_id (valor)
                    '''
                )
                .eq('id', reserva_id)
                .single()
                .execute()
            )
            if result.data:
                r = dict(result.data)
                if r.get('area_social'):
                    r['area_social_nombre'] = r['area_social']['nombre']
                    del r['area_social']
                if r.get('propiedad'):
                    r['nro_casa'] = r['propiedad']['nro_casa']
                    del r['propiedad']
                if r.get('hora_inicio'):
                    r['hora_inicio_valor'] = r['hora_inicio']['valor']
                    del r['hora_inicio']
                if r.get('hora_fin'):
                    r['hora_fin_valor'] = r['hora_fin']['valor']
                    del r['hora_fin']
                return r
            return None
        except Exception as e:
            print(f"Error getting reserva by ID: {e}")
            print(traceback.format_exc())
            return None

    @staticmethod
    def get_reservas_by_user(user_id):
        """
        Devuelve todas las reservas visibles para el usuario:
        - Todas las reservas de las propiedades donde el usuario figure en usuario_habitante con estado = 1.
        - Sin usar embeds (para no depender de FKs). Se enriquecen los campos en Python.
        - Tolerante a tipo de 'estado' (1 o '1') y a tipos de IDs.
        """
        try:
            client = supabase_admin

            # 1) propiedades activas por usuario_id (estado = 1, tolerante a '1')
            props_q = (
                client.table('usuario_habitante')
                .select('propiedad_id')
                .eq('usuario_id', user_id)
                .eq('estado_id', 1)
                .execute()
            )
            if not props_q.data:
                props_q = (
                    client.table('usuario_habitante')
                    .select('propiedad_id')
                    .eq('usuario_id', user_id)
                    .eq('estado', '1')
                    .execute()
                )

            if not props_q.data:
                return []

            # normalizar ids a int
            propiedad_ids = []
            for row in props_q.data:
                pid = row.get('propiedad_id')
                if pid is None:
                    continue
                try:
                    propiedad_ids.append(int(pid))
                except Exception:
                    continue

            if not propiedad_ids:
                return []

            # 2) traer reservas crudas (sin embed)
            res_q = (
                client.table('reserva')
                .select('id, propiedad_id, area_social_id, fecha, hora_inicio_id, hora_fin_id, total, created_at, fecha_vencimiento')
                .in_('propiedad_id', propiedad_ids)
                .order('fecha', desc=True)
                .execute()
            )
            if not res_q.data:
                return []

            reservas = [dict(r) for r in res_q.data]

            # 3) enriquecer con nombres/valores sin depender de FKs
            #    - áreas
            area_ids = sorted({int(r['area_social_id']) for r in reservas if r.get('area_social_id') is not None})
            area_map = {}
            if area_ids:
                areas_q = (
                    client.table('area_social')
                    .select('id, nombre')
                    .in_('id', area_ids)
                    .execute()
                )
                for a in (areas_q.data or []):
                    try:
                        area_map[int(a['id'])] = a.get('nombre')
                    except Exception:
                        continue

            #    - propiedades
            prop_ids = sorted({int(r['propiedad_id']) for r in reservas if r.get('propiedad_id') is not None})
            prop_map = {}
            if prop_ids:
                props2_q = (
                    client.table('propiedad')
                    .select('id, nro_casa')
                    .in_('id', prop_ids)
                    .execute()
                )
                for p in (props2_q.data or []):
                    try:
                        prop_map[int(p['id'])] = p.get('nro_casa')
                    except Exception:
                        continue

            #    - horas (catálogo)
            hora_ids = sorted({
                int(r['hora_inicio_id']) for r in reservas if r.get('hora_inicio_id') is not None
            } | {
                int(r['hora_fin_id']) for r in reservas if r.get('hora_fin_id') is not None
            })
            hora_map = {}
            if hora_ids:
                horas_q = (
                    client.table('hora')
                    .select('id, valor')
                    .in_('id', hora_ids)
                    .execute()
                )
                for h in (horas_q.data or []):
                    try:
                        hora_map[int(h['id'])] = h.get('valor')
                    except Exception:
                        continue

            # 4) flatten/enriquecer cada reserva
            out = []
            for r in reservas:
                try:
                    area_id = int(r['area_social_id']) if r.get('area_social_id') is not None else None
                except Exception:
                    area_id = None
                try:
                    pid = int(r['propiedad_id']) if r.get('propiedad_id') is not None else None
                except Exception:
                    pid = None
                try:
                    hi = int(r['hora_inicio_id']) if r.get('hora_inicio_id') is not None else None
                except Exception:
                    hi = None
                try:
                    hf = int(r['hora_fin_id']) if r.get('hora_fin_id') is not None else None
                except Exception:
                    hf = None

                r['area_social_nombre'] = area_map.get(area_id)
                r['nro_casa'] = prop_map.get(pid)
                r['hora_inicio_valor'] = hora_map.get(hi)
                r['hora_fin_valor'] = hora_map.get(hf)
                out.append(r)

            return out

        except Exception as e:
            print(f"Error getting reservas by user: {e}")
            print(traceback.format_exc())
            return []


    @staticmethod
    def create_reserva(data):
        """Create new reserva"""
        try:
            client = supabase_admin
            reserva_data = {
                'propiedad_id': data.get('propiedad_id'),
                'area_social_id': data.get('area_social_id'),
                'fecha': data.get('fecha'),
                'hora_inicio_id': data.get('hora_inicio_id'),
                'hora_fin_id': data.get('hora_fin_id'),
                # total, created_at, fecha_vencimiento: se setean por triggers
            }
            result = client.table('reserva').insert(reserva_data).execute()
            if result.data:
                return ReservaRepository.get_reserva_by_id(result.data[0]['id'])
            return None
        except Exception as e:
            print(f"Error creating reserva: {e}")
            print(traceback.format_exc())
            raise e

    @staticmethod
    def update_reserva(reserva_id, data):
        """Update reserva"""
        try:
            client = supabase_admin
            update_data = {}
            if 'area_social_id' in data:
                update_data['area_social_id'] = data['area_social_id']
            if 'fecha' in data:
                update_data['fecha'] = data['fecha']
            if 'hora_inicio_id' in data:
                update_data['hora_inicio_id'] = data['hora_inicio_id']
            if 'hora_fin_id' in data:
                update_data['hora_fin_id'] = data['hora_fin_id']

            if not update_data:
                return None

            result = client.table('reserva').update(update_data).eq('id', reserva_id).execute()
            if result.data:
                return ReservaRepository.get_reserva_by_id(reserva_id)
            return None
        except Exception as e:
            print(f"Error updating reserva: {e}")
            print(traceback.format_exc())
            raise e

    @staticmethod
    def delete_reserva(reserva_id):
        """Delete reserva"""
        try:
            client = supabase_admin
            result = client.table('reserva').delete().eq('id', reserva_id).execute()
            return len(result.data) > 0
        except Exception as e:
            print(f"Error deleting reserva: {e}")
            print(traceback.format_exc())
            raise e

    # -------------------------
    # USUARIO ↔ PROPIEDADES
    # -------------------------

    @staticmethod
    def get_user_propiedades(user_id):
        """
        Get properties asociadas a un usuario:
        - Devuelve propiedades donde el usuario aparece en usuario_habitante
          con estado = 1. Incluye info básica de la propiedad.
        """
        try:
            client = supabase_admin

            result = (
                client.table('usuario_habitante')
                .select(
                    '''
                    propiedad_id, estado,
                    propiedad:propiedad_id (id, nro_casa)
                    '''
                )
                .eq('usuario_id', user_id)  # <--- UUID del usuario
                .eq('estado', 1)
                .execute()
            )

            if result.data:
                propiedades = []
                for item in result.data:
                    if item.get('propiedad'):
                        prop = dict(item['propiedad'])
                        propiedades.append(prop)
                return propiedades

            return []
        except Exception as e:
            print(f"Error getting user propiedades: {e}")
            print(traceback.format_exc())
            return []

    @staticmethod
    def validate_user_can_reserve(user_id, propiedad_id):
        """
        Valida que el usuario puede reservar a nombre de la propiedad:
        - Debe existir (usuario_id, propiedad_id, estado=1). Tolerante a estado='1'.
        """
        try:
            client = supabase_admin

            # Normalizar propiedad_id
            try:
                pid = int(propiedad_id)
            except Exception:
                return False, "propiedad_id inválido"

            # Primero intenta con estado numérico 1
            result = (
                client.table('usuario_habitante')
                .select('usuario_id, propiedad_id, estado')
                .eq('usuario_id', user_id)
                .eq('propiedad_id', pid)
                .eq('estado', 1)
                .limit(1)
                .execute()
            )

            # Fallback si estado está almacenado como '1' texto
            if not result.data:
                result = (
                    client.table('usuario_habitante')
                    .select('usuario_id, propiedad_id, estado')
                    .eq('usuario_id', user_id)
                    .eq('propiedad_id', pid)
                    .eq('estado', '1')
                    .limit(1)
                    .execute()
                )

            if not result.data:
                return False, "No tienes permisos para reservar en esta propiedad"

            return True, "Usuario autorizado"

        except Exception as e:
            print(f"Error validating user reservation permissions: {e}")
            return False, f"Error de validación: {str(e)}"

    # -------------------------
    # CATÁLOGO HORAS
    # -------------------------

    @staticmethod
    def get_all_horas():
        """Get all available hours (catalog 0-23)"""
        try:
            client = supabase_admin
            result = client.table('hora').select('id, valor').order('id').execute()
            if result.data:
                return [dict(hora) for hora in result.data]
            return []
        except Exception as e:
            print(f"Error getting hours: {e}")
            print(traceback.format_exc())
            return []