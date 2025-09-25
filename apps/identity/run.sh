#!/usr/bin/env bash
# Ejecuta el servicio Identity.
# Compatible con Git Bash en Windows.
# Guarda este archivo con finales de línea LF (Unix) para evitar /usr/bin/env errores.

set -euo pipefail

# --- Funciones auxiliares ----------------------------------------------------

log() { printf '[run.sh] %s\n' "$*" >&2; }

activate_venv() {
  if [ -n "${VIRTUAL_ENV:-}" ]; then
    log "Venv ya activo: $VIRTUAL_ENV"
    return 0
  fi
  for CAND in "si2e/Scripts/activate" ".venv/Scripts/activate" "venv/Scripts/activate"; do
    if [ -f "$CAND" ]; then
      # shellcheck disable=SC1090
      # (ruta dinámica)
      . "$CAND"
      log "Activado venv ($CAND)"
      return 0
    fi
  done
  log "No se encontró entorno virtual (si2e/.venv/venv). Crea uno primero."
  exit 1
}

load_env_file() {
  local FILE=$1
  [ -f "$FILE" ] || return 0
  log "Cargando variables desde $FILE"
  # Lectura segura: ignora líneas vacías o comentarios; soporta valores con '='.
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ''|'#'*) continue ;;
    esac
    if ! grep -q '=' <<<"$line"; then
      continue
    fi
    var_name="${line%%=*}"
    var_val="${line#*=}"
    # Recortar espacios
    var_name="$(echo "$var_name" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    var_val="$(echo "$var_val" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
    # Eliminar comillas envolventes si existen
    var_val="${var_val%\"}"
    var_val="${var_val#\"}"
    var_val="${var_val%\'}"
    var_val="${var_val#\'}"
    # Export
    export "${var_name}=${var_val}"
  done <"$FILE"
}

# --- Flujo -------------------------------------------------------------------

activate_venv

# Cargar .env locales (el segundo NO pisa variables ya definidas)
[ -f "apps/identity/.env" ] && load_env_file "apps/identity/.env"
[ -f "apps/identity/.env.local" ] && load_env_file "apps/identity/.env.local"

export PYTHONPATH="."

PORT="${IDENTITY_PORT:-8010}"

PY_BIN="$(command -v python || true)"
if [ -z "$PY_BIN" ]; then
  log "Python no encontrado en PATH."
  exit 1
fi

log "Python: $PY_BIN"
log "Virtual env: ${VIRTUAL_ENV:-<none>}"
log "Puerto: $PORT"
log "Iniciando Uvicorn..."

exec "$PY_BIN" -m uvicorn apps.identity.main:app \
  --host 0.0.0.0 \
  --port "$PORT" \
  --reload