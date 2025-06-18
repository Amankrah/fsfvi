"""
Pytest configuration for FSFVI system tests
"""
import os
import sys
from pathlib import Path
import pytest

# Add the Django app to Python path
backend_dir = Path(__file__).parent
django_app_dir = backend_dir / 'django_app'
fastapi_app_dir = backend_dir / 'fastapi_app'

sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(django_app_dir))
sys.path.insert(0, str(fastapi_app_dir))

# Set Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'django_app.settings')

def pytest_configure(config):
    """Configure Django for pytest"""
    import django
    django.setup()

# FastAPI test client fixture
@pytest.fixture
def fastapi_client():
    """Create FastAPI test client"""
    from fastapi.testclient import TestClient
    from fastapi_app.main import app
    return TestClient(app)

# Django database fixture
@pytest.fixture
def django_db_setup():
    """Setup Django database for testing"""
    from django.core.management import call_command
    call_command('migrate', verbosity=0, interactive=False)

# Test user fixture
@pytest.fixture
def test_user(django_user_model):
    """Create a test user"""
    return django_user_model.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123'
    )

# Sample CSV data fixture
@pytest.fixture
def sample_csv_content():
    """Sample CSV data for testing"""
    return """Component Name,Component Type,Observed Value,Benchmark Value,Financial Allocation,Weight,Sensitivity Parameter
Health Facilities,Infrastructure,75.0,90.0,1000000,0.25,0.8
Education Systems,Social,80.0,95.0,800000,0.20,0.7
Water Supply,Infrastructure,70.0,85.0,600000,0.15,0.9
Transportation,Infrastructure,65.0,80.0,1200000,0.30,0.6
Energy Grid,Infrastructure,85.0,90.0,400000,0.10,0.5""" 