from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apps.identity.app.core.config import get_settings
from apps.identity.app.api.routes.visitors import router as visitors_router

# (Opcional) importa verify_api_key si quisieras aplicarlo globalmente
# from apps.identity.app.core.security import verify_api_key
# from fastapi import Depends

settings = get_settings()

app = FastAPI(
    title="Identity Service",
    # Si quieres exigir API key en TODAS las rutas descomenta:
    # dependencies=[Depends(verify_api_key)]
)

# --- Aquí va el middleware CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ------------------------------------

@app.get("/health")
def health():
    return {"ok": True, "service": "identity"}

# Incluye el router (en visitors el endpoint enroll ya valida API key individualmente)
app.include_router(visitors_router)