"""
Production settings for AWS EC2 (nginx + gunicorn + SQLite).

Use:
  export DJANGO_SETTINGS_MODULE=rwanda_project.settings_production

Required environment variables (see deployment.md):
  DJANGO_SECRET_KEY, DJANGO_ALLOWED_HOSTS, FSFI_JWT_SECRET, FSFI_ENCRYPTION_KEY,
  CORS_ALLOWED_ORIGINS, and optionally DB_NAME for SQLite path.
"""

import os

from .settings import *  # noqa: F401,F403

DEBUG = False

_hosts = os.getenv("DJANGO_ALLOWED_HOSTS", "").strip()
if not _hosts:
    raise ValueError(
        "DJANGO_ALLOWED_HOSTS must be set (comma-separated) when using settings_production."
    )
ALLOWED_HOSTS = [h.strip() for h in _hosts.split(",") if h.strip()]

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
    CSRF_TRUSTED_ORIGINS = [
        o.strip()
        for o in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
        if o.strip()
    ]

STATIC_ROOT = BASE_DIR / "staticfiles"

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
