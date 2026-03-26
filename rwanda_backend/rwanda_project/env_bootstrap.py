"""
Load rwanda_backend/.env before DJANGO_SETTINGS_MODULE is read.

Without this, manage.py and wsgi.py set the default settings module before
python-dotenv runs (dotenv is loaded inside settings.py), so variables like
DJANGO_SETTINGS_MODULE in .env were ignored.
"""
from pathlib import Path

from dotenv import load_dotenv

_BACKEND_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_BACKEND_ROOT / ".env")
