"""
Django settings for core project.

Optimizado para despliegue en Render.
"""

from pathlib import Path
import os
import environ
import dj_database_url  # 👈 para conectar DB con DATABASE_URL

# ====== Paths ======
BASE_DIR = Path(__file__).resolve().parent.parent

# ====== Environment ======
env = environ.Env(
    DEBUG=(bool, False)
)
# Leer variables desde archivo .env en local
environ.Env.read_env(os.path.join(BASE_DIR, ".env"))

# ====== Seguridad ======
SECRET_KEY = env("SECRET_KEY")  # ⚠️ definido en .env o en Render
DEBUG = env.bool("DEBUG", default=False)
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1", ".onrender.com"])

# ====== Aplicaciones ======
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "corsheaders",
    "drf_spectacular",  # Para documentación OpenAPI
    "backendapi",
]

# ====== Middleware ======
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",  # 👈 CORS primero
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # 👈 servir archivos estáticos
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

# ====== Templates ======
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"

# ====== Base de Datos ======
# ====== Base de Datos ======
DATABASES = {
    "default": dj_database_url.config(
        default=os.environ.get("DATABASE_URL"),
        conn_max_age=600,
    )
}



# ====== Validaciones de Password ======
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# ====== Internacionalización ======
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# ====== Archivos estáticos ======
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# ====== Primary Key por defecto ======
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# ====== CORS ======
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",   # desarrollo local (Vite default)
    "http://127.0.0.1:5173",
    "http://localhost:5175",   # en caso de que uses este puerto
    "http://127.0.0.1:5175",
    "https://smart-condominium-web.vercel.app",  # 👈 dominio real en Vercel
]

# 👉 Solo para debug: permitir todos (desactivar en prod)
# CORS_ALLOW_ALL_ORIGINS = True

# ====== Django REST Framework ======
REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_AUTHENTICATION_CLASSES': [],
    'DEFAULT_PERMISSION_CLASSES': [],
}

# ====== DRF Spectacular (OpenAPI) ======
SPECTACULAR_SETTINGS = {
    'TITLE': 'SmartCondominium API',
    'DESCRIPTION': 'API para gestión de condominios inteligentes',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}
