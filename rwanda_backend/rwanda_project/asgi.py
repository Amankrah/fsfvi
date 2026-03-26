"""
ASGI config for rwanda_project project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

import rwanda_project.env_bootstrap  # noqa: F401 — load .env before settings module

from django.core.asgi import get_asgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "rwanda_project.settings")

application = get_asgi_application()
