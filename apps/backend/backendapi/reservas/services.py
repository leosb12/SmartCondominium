from .repositories import ReservaRepository
import traceback

class ReservaService:
    """Service layer for reserva business logic"""

    # -------------------------
    # ÁREAS SOCIALES
    # -------------------------

    @staticmethod
    def get_all_areas_sociales():
        """Get all areas sociales"""
        return ReservaRepository.get_all_areas_sociales()

    @staticmethod
    def get_area_social_by_id(area_id):
        """Get area social by ID"""
        return ReservaRepository.get_area_social_by_id(area_id)

    @staticmethod
    def create_area_social(data):
        """Create new area social"""
        return ReservaRepository.create_area_social(data)

    @staticmethod
    def update_area_social(area_id, data):
        """Update area social"""
        return ReservaRepository.update_area_social(area_id, data)

    @staticmethod
    def delete_area_social(area_id):
        """Delete area social"""
        return ReservaRepository.delete_area_social(area_id)

    # -------------------------
    # RESERVAS
    # -------------------------

    @staticmethod
    def get_all_reservas():
        """Get all reservas with area social info"""
        return ReservaRepository.get_all_reservas()

    @staticmethod
    def get_reserva_by_id(reserva_id):
        """Get reserva by ID with area social info"""
        return ReservaRepository.get_reserva_by_id(reserva_id)

    @staticmethod
    def get_reservas_by_user(usuario_id):
        """
        Get reservas visibles para el usuario:
        - Incluye reservas de todas las propiedades donde el usuario
          está en usuario_habitante con estado=1.
        """
        return ReservaRepository.get_reservas_by_user(usuario_id)

    @staticmethod
    def get_user_propiedades(usuario_id):
        """Get properties for a user (estado=1 en usuario_habitante)"""
        return ReservaRepository.get_user_propiedades(usuario_id)

    @staticmethod
    def get_all_horas():
        """Get all available hours"""
        return ReservaRepository.get_all_horas()

    @staticmethod
    def create_reserva(data, usuario_id=None):
        """
        Create new reserva with validation:
        - Si tenemos usuario (ideal: lo provee el view), validar que
          (usuario_id, propiedad_id, estado=1) exista en usuario_habitante.
        - Delegar el insert al repo (triggers calculan total/fechas).
        - Mapear errores de solape a un mensaje claro.
        """
        try:
            propiedad_id = data.get('propiedad_id')

            # Validación opcional (no rompe si el view aún no envía usuario_id)
            uid = data.get('usuario_id') or usuario_id
            if uid and propiedad_id is not None:
                ok, msg = ReservaRepository.validate_user_can_reserve(uid, propiedad_id)
                if not ok:
                    # El view debería traducir esto a HTTP 403
                    return {
                        "error": True,
                        "code": "NO_AUTORIZADO_PARA_PROPIEDAD",
                        "detail": msg
                    }

            created = ReservaRepository.create_reserva(data)
            return created

        except Exception as e:
            # Detectar el error de EXCLUDE (solape)
            err_msg = str(e)
            # Postgres típicamente: "violates exclusion constraint \"reserva_no_solapada\""
            if "exclusion constraint" in err_msg or "reserva_no_solapada" in err_msg:
                return {
                    "error": True,
                    "code": "RESERVA_SOLAPADA",
                    "detail": "Ya existe una reserva que se cruza en esa fecha y horas."
                }
            # Otros errores
            print("Error in create_reserva:", err_msg)
            print(traceback.format_exc())
            return {
                "error": True,
                "code": "ERROR_AL_CREAR_RESERVA",
                "detail": err_msg
            }

    @staticmethod
    def update_reserva(reserva_id, data):
        """
        Update reserva with validation:
        - De momento delegamos la validación de horas/total a los triggers y CHECKs.
        - El view debería controlar permisos (admin o dueño del flujo).
        """
        try:
            updated = ReservaRepository.update_reserva(reserva_id, data)
            return updated
        except Exception as e:
            err_msg = str(e)
            if "exclusion constraint" in err_msg or "reserva_no_solapada" in err_msg:
                return {
                    "error": True,
                    "code": "RESERVA_SOLAPADA",
                    "detail": "Ya existe una reserva que se cruza en esa fecha y horas."
                }
            print("Error in update_reserva:", err_msg)
            print(traceback.format_exc())
            return {
                "error": True,
                "code": "ERROR_AL_ACTUALIZAR_RESERVA",
                "detail": err_msg
            }

    @staticmethod
    def delete_reserva(reserva_id):
        """Delete reserva"""
        return ReservaRepository.delete_reserva(reserva_id)