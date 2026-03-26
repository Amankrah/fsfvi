"""
Production settings for AWS EC2 (nginx + gunicorn + SQLite).

Selection (same idea as Next.js picking .env.production vs .env.local):

1. Set in ``rwanda_backend/.env`` (loaded first by ``env_bootstrap`` before Django starts)::

     DJANGO_SETTINGS_MODULE=rwanda_project.settings_production

2. Or export in the shell / systemd ``Environment`` / ``EnvironmentFile``.

``manage.py``, ``wsgi.py``, and ``asgi.py`` load ``.env`` via ``env_bootstrap``,
then apply the default ``rwanda_project.settings`` only if unset — so production
servers use ``.env`` only, no extra export needed for daily ``manage.py`` commands.

Required environment variables (see ``.env.example`` and deployment guide):
  DJANGO_SECRET_KEY, DJANGO_ALLOWED_HOSTS, FSFI_JWT_SECRET, FSFI_ENCRYPTION_KEY,
  CORS_ALLOWED_ORIGINS, and optionally DB_NAME for SQLite path.
"""

import os

from .settings import *  # noqa: F401,F403

DEBUG = False

if str(SECRET_KEY).startswith("django-insecure"):
    raise ValueError(
        "DJANGO_SECRET_KEY must be set in the environment for settings_production "
        "(do not use the Django insecure default)."
    )

_hosts = os.getenv("DJANGO_ALLOWED_HOSTS", "").strip()
if not _hosts:
    raise ValueError(
        "DJANGO_ALLOWED_HOSTS must be set (comma-separated) when using settings_production."
    )
ALLOWED_HOSTS = [h.strip() for h in _hosts.split(",") if h.strip()]

# Must list every browser origin that calls the API (subdomain + apex if both used). Not localhost defaults.
_cors = os.getenv("CORS_ALLOWED_ORIGINS", "").strip()
if not _cors:
    raise ValueError(
        "CORS_ALLOWED_ORIGINS must be set in production (comma-separated), e.g. "
        "https://rwanda.fsfvi.ai,https://fsfvi.ai — include the Next.js public URL(s)."
    )
CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors.split(",") if o.strip()]

# Behind nginx TLS termination / reverse proxy
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
USE_X_FORWARDED_HOST = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = os.getenv("DJANGO_SECURE_SSL_REDIRECT", "true").lower() == "true"
# Set e.g. 31536000 after you control HTTPS end-to-end (see Django HSTS docs).
SECURE_HSTS_SECONDS = int(os.getenv("DJANGO_SECURE_HSTS_SECONDS", "0"))
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

_csrf = os.getenv("CSRF_TRUSTED_ORIGINS", "").strip()
if _csrf:
    CSRF_TRUSTED_ORIGINS = [o.strip() for o in _csrf.split(",") if o.strip()]
else:
    CSRF_TRUSTED_ORIGINS = list(CORS_ALLOWED_ORIGINS)

STATIC_ROOT = BASE_DIR / "staticfiles"

# SQLite on a single host: longer timeout reduces "database is locked" under load.
if DATABASES["default"]["ENGINE"] == "django.db.backends.sqlite3":
    _opts = dict(DATABASES["default"].get("OPTIONS") or {})
    _opts.setdefault("timeout", 30)
    DATABASES["default"]["OPTIONS"] = _opts

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "verbose": {
            "format": "{levelname} {asctime} {module} {process:d} {thread:d} {message}",
            "style": "{",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": os.getenv("DJANGO_LOG_LEVEL", "INFO"),
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": os.getenv("DJANGO_LOG_LEVEL", "INFO"),
            "propagate": False,
        },
    },
}
