"""
Settings: 環境変数
必須: DJANGO_SECRET_KEY
任意: DJANGO_DEBUG, ALLOWED_HOSTS, CSRF_TRUSTED_ORIGINS (https://...), CORS_ALLOWED_ORIGINS, TIME_ZONE, DATABASE_URL, FORCE_HTTPS
"""

import os
import urllib.parse as up
from pathlib import Path
from datetime import timedelta
from corsheaders.defaults import default_headers

# Helpers ----------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent

def env_bool(name, default=False):
    v = os.environ.get(name)
    if v is None:
        return default
    return str(v).lower() in ("1", "true", "yes", "on")

def env_list(name, default=None):
    raw = os.environ.get(name, "")
    if not raw:
        return default or []
    return [p.strip() for p in raw.split(",") if p.strip()]

# Core -------------------------------------------------------------
SECRET_KEY = os.environ.get("SECRET_KEY", "dev-secret-key-change-me")


DEBUG = True

TIME_ZONE = os.environ.get("TIME_ZONE", "UTC")
LANGUAGE_CODE = "en-us"

# Hosts / Origins --------------------------------------------------
# ALLOWED_HOSTS from env or sane dev defaults
env_hosts = env_list("ALLOWED_HOSTS")
if env_hosts:
    ALLOWED_HOSTS = env_hosts
else:
    ALLOWED_HOSTS = ["localhost", "127.0.0.1"]

# CSRF trusted origins (must include scheme: https://your-domain.com)
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS")

# CORS configuration - prefer explicit list in env; fallback to dev allowances
env_cors = env_list("CORS_ALLOWED_ORIGINS")
if env_cors:
    CORS_ALLOWED_ORIGINS = env_cors
    CORS_ALLOW_ALL_ORIGINS = False
else:
    # development-friendly fallback; DO NOT use in production
    CORS_ALLOWED_ORIGINS = []
    CORS_ALLOW_ALL_ORIGINS = DEBUG

# Basic apps & middleware -----------------------------------------
INSTALLED_APPS = [
    # django builtins
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # third party
    "rest_framework",
    "rest_framework_simplejwt",
    'rest_framework.authtoken',
    "corsheaders",
    "whitenoise.runserver_nostatic",  # ensures whitenoise works with runserver

    # local apps
    "todo_app",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",              # must be high
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",        # static files
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "todo_project.urls"
WSGI_APPLICATION = "todo_project.wsgi.application"
ASGI_APPLICATION = "todo_project.asgi.application"

# Templates --------------------------------------------------------
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# Database (sqlite by default; DATABASE_URL optional) -------------
DATABASES = {}
DATABASE_URL = os.environ.get("DATABASE_URL")

if DATABASE_URL:
    try:
        import dj_database_url
        DATABASES["default"] = dj_database_url.parse(
            DATABASE_URL, conn_max_age=600, ssl_require=not DEBUG
        )
    except ImportError:
        if DATABASE_URL.startswith("postgres"):
            p = up.urlparse(DATABASE_URL)
            DATABASES["default"] = {
                "ENGINE": "django.db.backends.postgresql",
                "NAME": p.path.lstrip("/"),
                "USER": p.username,
                "PASSWORD": p.password,
                "HOST": p.hostname,
                "PORT": p.port or 5432,
            }
        else:
            DATABASES["default"] = {
                "ENGINE": "django.db.backends.sqlite3",
                "NAME": str(BASE_DIR / "db.sqlite3"),
            }
else:
    DATABASES["default"] = {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": str(BASE_DIR / "db.sqlite3"),
    }

# Password validators ---------------------------------------------
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# REST framework + JWT -------------------------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=int(os.environ.get("SIMPLE_JWT_ACCESS_MINUTES", 60))),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=int(os.environ.get("SIMPLE_JWT_REFRESH_DAYS", 7))),
    "ROTATE_REFRESH_TOKENS": env_bool("SIMPLE_JWT_ROTATE_REFRESH", False),
    "AUTH_HEADER_TYPES": tuple(os.environ.get("SIMPLE_JWT_AUTH_HEADER_TYPES", "Bearer").split(",")),
}

# Internationalization -------------------------------------------
USE_I18N = True
USE_TZ = True
LANGUAGE_CODE = LANGUAGE_CODE
TIME_ZONE = TIME_ZONE

# Static & Media --------------------------------------------------
STATIC_URL = "/static/"
STATIC_ROOT = str(BASE_DIR / "staticfiles")
_static_dir = BASE_DIR / "static"
STATICFILES_DIRS = [str(_static_dir)] if _static_dir.exists() else []
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage" if not DEBUG else "whitenoise.storage.CompressedStaticFilesStorage"

MEDIA_URL = "/media/"
MEDIA_ROOT = str(BASE_DIR / "media")

# Security tweaks -------------------------------------------------
# Treat secure when behind a proxy that sets X-Forwarded-Proto
if env_bool("FORCE_HTTPS", False):
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True

# HSTS (only enable in production)
if not DEBUG and env_bool("ENABLE_HSTS", True):
    SECURE_HSTS_SECONDS = int(os.environ.get("SECURE_HSTS_SECONDS", 60 * 60 * 24 * 30))  # 30 days default
    SECURE_HSTS_INCLUDE_SUBDOMAINS = env_bool("SECURE_HSTS_INCLUDE_SUBDOMAINS", True)
    SECURE_HSTS_PRELOAD = env_bool("SECURE_HSTS_PRELOAD", False)

# CORS settings (already handled above)
CORS_ALLOW_HEADERS = list(default_headers) + ["authorization"]
CORS_ALLOW_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]

# Logging ---------------------------------------------------------
LOG_LEVEL = os.environ.get("DJANGO_LOG_LEVEL", "INFO").upper()
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "simple": {"format": "{levelname} {asctime} {name} {message}", "style": "{"},
    },
    "handlers": {
        "console": {"class": "logging.StreamHandler", "formatter": "simple"},
    },
    "root": {
        "handlers": ["console"],
        "level": LOG_LEVEL,
    },
}

# Misc ------------------------------------------------------------
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Informational dev prints (optional, harmless)
if DEBUG:
    # show configured hosts/origins in dev so you don't fish for errors
    print("DEBUG MODE ON")
    print("ALLOWED_HOSTS:", ALLOWED_HOSTS)
    print("CORS_ALLOWED_ORIGINS:", CORS_ALLOWED_ORIGINS)
    print("CSRF_TRUSTED_ORIGINS:", CSRF_TRUSTED_ORIGINS)