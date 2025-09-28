# backendapi/pases_temporales/views.py
from rest_framework.decorators import api_view
from rest_framework.response import Response
from .validators import validate_crear_pase, validate_validar_pase
from .schema import CrearPaseIn, ValidarPaseIn
from .services import crear_pase, validar_pase
from .repo import list_passes, revoke_pass
from .errors import AppError
from .security import require_auth_local, require_any_role_ids_local, ALLOWED_SECURITY_ROLE_IDS

def _ok(data, code=200):  return Response(data, status=code)
def _bad(msg, code=400):  return Response({"success": False, "error": msg}, status=code)

@api_view(["POST"])
@require_auth_local
@require_any_role_ids_local(ALLOWED_SECURITY_ROLE_IDS)
def crear(request):
    try:
        payload = request.data or {}
        payload["created_by"] = request.user_id
        validate_crear_pase(payload)
        dto = CrearPaseIn(**payload)
        out = crear_pase(dto)
        return _ok({
            "success": True,
            "pass": {
                "id": out.pass_id,
                "code": out.pass_code,
                "status": out.pass_status,
                "start_at": out.start_at,
                "expires_at": out.expires_at,
                "max_uses": out.max_uses,
            }
        }, 201)
    except AppError as e:
        return _bad(str(e), e.http_status)
    except Exception as e:
        return _bad(f"Excepción en crear: {e}", 500)

@api_view(["POST"])
@require_auth_local
@require_any_role_ids_local(ALLOWED_SECURITY_ROLE_IDS)
def validar(request):
    try:
        payload = request.data or {}
        payload["by_user"] = request.user_id
        validate_validar_pase(payload)
        dto = ValidarPaseIn(**payload)
        out = validar_pase(dto)
        return _ok({
            "ok": out.ok,
            "status": out.status,
            "remaining_uses": out.remaining_uses,
            "expires_at": out.expires_at,
        })
    except AppError as e:
        return _bad(str(e), e.http_status)
    except Exception as e:
        return _bad(f"Excepción en validar: {e}", 500)

@api_view(["GET"])
@require_auth_local
@require_any_role_ids_local(ALLOWED_SECURITY_ROLE_IDS)
def listar(request):
    try:
        filters = {
            "status": request.GET.get("status"),
            "visitor_id": request.GET.get("visitor_id"),
            "from": request.GET.get("from"),
            "to": request.GET.get("to"),
        }
        data = list_passes(filters)
        return _ok({"items": data})
    except AppError as e:
        return _bad(str(e), e.http_status)
    except Exception as e:
        return _bad(f"Excepción en listar: {e}", 500)

@api_view(["POST"])
@require_auth_local
@require_any_role_ids_local(ALLOWED_SECURITY_ROLE_IDS)
def revocar(request, pass_id: str):
    try:
        updated = revoke_pass(pass_id, request.user_id)
        return _ok({"success": True, "pass": updated})
    except AppError as e:
        return _bad(str(e), e.http_status)
    except Exception as e:
        return _bad(f"Excepción en revocar: {e}", 500)
