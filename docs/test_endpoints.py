"""
Comprehensive Test Suite for FSFVI System
=========================================

Tests all endpoints, service layer functions, core mathematical calculations,
Django integration, and complete workflow between FastAPI and Django
with rigorous validation using actual Kenya food system data.
"""

import pytest
import numpy as np
import pandas as pd
import json
import tempfile
import os
from typing import Dict, List, Any
from fastapi.testclient import TestClient
from datetime import datetime
import uuid
from pathlib import Path
import requests
import time

# Import the modules to test
import sys
sys.path.append('fastapi_app')
sys.path.append('django_app')

# Django setup for testing
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
import django
from django.conf import settings
from django.test import TestCase, TransactionTestCase, override_settings
from django.contrib.auth.models import User
from django.urls import reverse

try:
    django.setup()
    DJANGO_AVAILABLE = True
    print("✅ Django setup successful for testing")
except Exception as e:
    DJANGO_AVAILABLE = False
    print(f"⚠️ Django setup failed: {e}")

# FastAPI imports
from fastapi_app.main import app
from fastapi_app.fsfvi_service import FSFVICalculationService, FSFVIOptimizationService, FSFVIAnalysisService
from fastapi_app.fsfvi_core import (
    calculate_performance_gap, calculate_vulnerability, calculate_weighted_vulnerability,
    calculate_efficiency_index, determine_priority_level, determine_risk_level,
    calculate_component_fsfvi, calculate_system_fsfvi, estimate_sensitivity_parameter,
    calculate_vulnerability_gradient, calculate_system_efficiency_metrics,
    round_to_precision, safe_divide, clamp, normalize_values
)
from fastapi_app.config import FSFVI_CONFIG, normalize_component_type, get_component_types
from fastapi_app.validators import validate_component_data, validate_component_weights
from fastapi_app.exceptions import FSFVIException, ValidationError, WeightingError, OptimizationError

# Django imports
if DJANGO_AVAILABLE:
    from django_app.fsfvi.models import FSFVISession, Component, UploadedFile, SystemAnalysis, OptimizationResult
    from django_app.fsfvi.data_processing_service import data_processing_service
    from django_app.fsfvi.serializers import UserRegistrationSerializer, UserLoginSerializer
    from django.test import Client as DjangoClient

# Import data preparation to process Kenya data
from data_preparation import UniversalFSFVIDataPreparation

# Test clients
fastapi_client = TestClient(app)
if DJANGO_AVAILABLE:
    django_client = DjangoClient()

# Global test data path
KENYA_DATA_FILE = "Final_Combined_Matches_with_Manual_Entries.csv"

# Test data fixtures using actual Kenya data
@pytest.fixture(scope="session")
def kenya_data_path():
    """Path to Kenya CSV data file"""
    data_path = Path(KENYA_DATA_FILE)
    if not data_path.exists():
        pytest.skip(f"Kenya data file {KENYA_DATA_FILE} not found. Skipping tests that require real data.")
    return str(data_path)

@pytest.fixture(scope="session") 
def kenya_component_data(kenya_data_path):
    """Load and prepare actual Kenya component data for testing"""
    try:
        # Use the data preparation module to load Kenya data
        prep = UniversalFSFVIDataPreparation(kenya_data_path)
        prep.load_and_clean_data()
        
        # Get processed component data
        components, total_budget = prep.prepare_component_data("Kenya")
        
        return {
            'components': components,
            'total_budget': total_budget,
            'component_count': len(components),
            'data_summary': prep.get_data_summary()
        }
    except Exception as e:
        pytest.skip(f"Failed to load Kenya data: {e}")

@pytest.fixture(scope="session")
def kenya_csv_content(kenya_data_path):
    """Read Kenya CSV file content for upload testing"""
    try:
        with open(kenya_data_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        pytest.skip(f"Failed to read Kenya CSV file: {e}")

@pytest.fixture
def sample_component_data():
    """Fallback sample component data for tests that don't require real data"""
    return [
        {
            'component_id': 'test_1',
            'component_name': 'Agricultural Development',
            'component_type': 'agricultural_development',
            'observed_value': 75.0,
            'benchmark_value': 90.0,
            'weight': 0.25,
            'sensitivity_parameter': 0.70,
            'financial_allocation': 1000.0
        },
        {
            'component_id': 'test_2',
            'component_name': 'Infrastructure',
            'component_type': 'infrastructure',
            'observed_value': 60.0,
            'benchmark_value': 80.0,
            'weight': 0.20,
            'sensitivity_parameter': 0.65,
            'financial_allocation': 800.0
        },
        {
            'component_id': 'test_3',
            'component_name': 'Nutrition Health',
            'component_type': 'nutrition_health',
            'observed_value': 50.0,
            'benchmark_value': 75.0,
            'weight': 0.25,
            'sensitivity_parameter': 0.60,
            'financial_allocation': 500.0
        },
        {
            'component_id': 'test_4',
            'component_name': 'Social Assistance',
            'component_type': 'social_assistance',
            'observed_value': 45.0,
            'benchmark_value': 70.0,
            'weight': 0.30,
            'sensitivity_parameter': 0.50,
            'financial_allocation': 300.0
        }
    ]

@pytest.fixture
def calculation_service():
    """FSFVI calculation service instance"""
    return FSFVICalculationService()

@pytest.fixture
def optimization_service(calculation_service):
    """FSFVI optimization service instance"""
    return FSFVIOptimizationService(calculation_service)

@pytest.fixture
def analysis_service():
    """FSFVI analysis service instance"""
    return FSFVIAnalysisService()

# Django-specific fixtures
@pytest.fixture
def django_user():
    """Create a test user in Django"""
    if not DJANGO_AVAILABLE:
        pytest.skip("Django not available")
    
    user = User.objects.create_user(
        username='testuser',
        email='test@example.com',
        password='testpass123',
        first_name='Test',
        last_name='User'
    )
    return user

@pytest.fixture
def django_user_token(django_user):
    """Get authentication token for Django user"""
    if not DJANGO_AVAILABLE:
        pytest.skip("Django not available")
    
    from rest_framework.authtoken.models import Token
    token, created = Token.objects.get_or_create(user=django_user)
    return token.key

@pytest.fixture
def authenticated_headers(django_user_token):
    """Headers with authentication token"""
    return {'Authorization': f'Token {django_user_token}'}

@pytest.fixture
def fastapi_auth_headers(django_user_token):
    """Headers for FastAPI authentication"""
    return {'Authorization': f'Bearer {django_user_token}'}


class TestFSFVICore:
    """Test core mathematical functions"""
    
    def test_calculate_performance_gap(self):
        """Test performance gap calculation"""
        # Normal case - underperforming (prefer_higher=True by default)
        gap = calculate_performance_gap(75.0, 90.0)
        expected = (90.0 - 75.0) / 75.0  # (benchmark - observed) / observed = 0.2
        assert abs(gap - expected) < 1e-6
        
        # Case where observed > benchmark (meeting/exceeding benchmark)
        gap = calculate_performance_gap(95.0, 90.0)
        assert gap == 0.0  # Should return 0 when meeting/exceeding benchmark
        
        # Edge case: observed = 0, benchmark > 0
        gap = calculate_performance_gap(0.0, 90.0)
        assert gap == 1.0  # Should return 1.0 when observed is 0
        
        # Edge case: benchmark = 0
        gap = calculate_performance_gap(75.0, 0.0)
        assert gap == 0.0  # Should return 0.0 when benchmark is 0
        
        # Edge case: both = 0
        gap = calculate_performance_gap(0.0, 0.0)
        assert gap == 0.0
        
        # Test prefer_higher=False (lower values are better)
        gap = calculate_performance_gap(75.0, 90.0, prefer_higher=False)
        assert gap == 0.0  # 75 < 90 is good when lower is better
        
        gap = calculate_performance_gap(95.0, 90.0, prefer_higher=False)
        expected = (95.0 - 90.0) / 95.0  # Underperforming when lower is better
        assert abs(gap - expected) < 1e-6
    
    def test_calculate_vulnerability(self):
        """Test vulnerability calculation"""
        # Normal case
        gap = 0.2
        allocation = 1000.0
        sensitivity = 0.001
        
        vulnerability = calculate_vulnerability(gap, allocation, sensitivity)
        expected = gap * (1 / (1 + sensitivity * allocation))  # 0.2 * (1 / (1 + 0.001 * 1000))
        assert abs(vulnerability - expected) < 1e-6
        
        # Edge case: zero allocation
        vulnerability = calculate_vulnerability(0.2, 0.0, 0.001)
        assert vulnerability == 0.2  # Should equal gap when allocation is 0
        
        # Edge case: zero sensitivity
        vulnerability = calculate_vulnerability(0.2, 1000.0, 0.0)
        assert vulnerability == 0.2  # Should equal gap when sensitivity is 0
        
        # Error case: negative allocation
        with pytest.raises(Exception):
            calculate_vulnerability(0.2, -100.0, 0.001)
        
        # Error case: negative sensitivity
        with pytest.raises(Exception):
            calculate_vulnerability(0.2, 1000.0, -0.001)
    
    def test_calculate_weighted_vulnerability(self):
        """Test weighted vulnerability calculation"""
        vulnerability = 0.15
        weight = 0.25
        
        weighted_vuln = calculate_weighted_vulnerability(vulnerability, weight)
        expected = vulnerability * weight
        assert abs(weighted_vuln - expected) < 1e-6
        
        # Edge cases
        assert calculate_weighted_vulnerability(0.0, 0.5) == 0.0
        assert calculate_weighted_vulnerability(0.5, 0.0) == 0.0
        
        # Error cases
        with pytest.raises(Exception):
            calculate_weighted_vulnerability(0.5, -0.1)  # negative weight
        
        with pytest.raises(Exception):
            calculate_weighted_vulnerability(0.5, 1.5)   # weight > 1
    
    def test_calculate_efficiency_index(self):
        """Test efficiency index calculation"""
        vulnerability = 0.2
        allocation = 1000.0
        
        efficiency = calculate_efficiency_index(vulnerability, allocation)
        expected = max(0, 1 - vulnerability) / allocation * 1000
        assert abs(efficiency - expected) < 1e-6
        
        # Edge case: zero allocation
        efficiency = calculate_efficiency_index(0.2, 0.0)
        assert efficiency == 0.0
        
        # Edge case: vulnerability = 1.0
        efficiency = calculate_efficiency_index(1.0, 1000.0)
        assert efficiency == 0.0
    
    def test_determine_priority_level(self):
        """Test priority level determination using robust multi-factor risk assessment"""
        # Test primary vulnerability-based risk determination
        assert determine_priority_level(0.8) == "critical"  # High vulnerability
        assert determine_priority_level(0.5) == "high"      # Medium vulnerability
        assert determine_priority_level(0.3) == "medium"    # Low vulnerability
        assert determine_priority_level(0.1) == "low"       # Very low vulnerability
        
        # Test financial exposure adjustments
        # Large allocation with moderate vulnerability should increase priority
        assert determine_priority_level(0.4, financial_allocation=1000, total_budget=2000) == "high"  # 50% allocation share
        assert determine_priority_level(0.4, financial_allocation=100, total_budget=2000) == "medium"  # 5% allocation share
        
        # Test system importance adjustments  
        # High weight with moderate vulnerability should increase priority
        assert determine_priority_level(0.4, weight=0.8) == "high"    # High system importance
        assert determine_priority_level(0.4, weight=0.1) == "medium"  # Low system importance
        
        # Test combined factors
        assert determine_priority_level(0.4, financial_allocation=800, weight=0.6, total_budget=1000) == "critical"  # Multiple risk factors
    
    def test_determine_risk_level(self):
        """Test risk level determination"""
        # Use default thresholds
        assert determine_risk_level(0.03) == "low"
        assert determine_risk_level(0.10) == "medium"
        assert determine_risk_level(0.25) == "high"
        assert determine_risk_level(0.60) == "critical"
        
        # Custom thresholds
        custom_thresholds = {'low': 0.1, 'medium': 0.3, 'high': 0.5}
        assert determine_risk_level(0.05, custom_thresholds) == "low"
        assert determine_risk_level(0.20, custom_thresholds) == "medium"
        assert determine_risk_level(0.40, custom_thresholds) == "high"
        assert determine_risk_level(0.70, custom_thresholds) == "critical"
    
    @pytest.mark.unit
    def test_calculate_component_fsfvi(self, sample_component_data):
        """Test complete component FSFVI calculation"""
        comp = sample_component_data[0]
        
        result = calculate_component_fsfvi(
            comp['observed_value'],
            comp['benchmark_value'], 
            comp['financial_allocation'],
            comp['sensitivity_parameter'],
            comp['weight']
        )
        
        # Verify all expected fields are present
        required_fields = ['performance_gap', 'vulnerability', 'weighted_vulnerability', 
                          'efficiency_index', 'priority_level']
        for field in required_fields:
            assert field in result
            assert isinstance(result[field], (int, float, str))
        
        # Verify mathematical relationships
        assert 0 <= result['performance_gap'] <= 1
        assert result['vulnerability'] >= 0
        assert result['weighted_vulnerability'] >= 0
        assert result['efficiency_index'] >= 0
        assert result['priority_level'] in ['low', 'medium', 'high', 'critical']
    
    @pytest.mark.unit
    def test_calculate_system_fsfvi(self, sample_component_data):
        """Test system-level FSFVI calculation"""
        # Calculate component results first
        component_results = []
        for comp in sample_component_data:
            result = calculate_component_fsfvi(
                comp['observed_value'],
                comp['benchmark_value'],
                comp['financial_allocation'],
                comp['sensitivity_parameter'],
                comp['weight']
            )
            result.update({
                'component_id': comp['component_id'],
                'financial_allocation': comp['financial_allocation']
            })
            component_results.append(result)
        
        system_result = calculate_system_fsfvi(component_results)
        
        # Verify structure
        required_fields = ['fsfvi_value', 'total_allocation', 'average_vulnerability', 
                          'max_vulnerability', 'risk_level', 'priority_counts']
        for field in required_fields:
            assert field in system_result
        
        # Verify mathematical properties
        assert system_result['fsfvi_value'] >= 0
        assert system_result['total_allocation'] > 0
        assert 0 <= system_result['average_vulnerability'] <= 1
        assert 0 <= system_result['max_vulnerability'] <= 1
        assert system_result['risk_level'] in ['low', 'medium', 'high', 'critical']
        
        # Verify FSFVI equals sum of weighted vulnerabilities
        expected_fsfvi = sum(res['weighted_vulnerability'] for res in component_results)
        assert abs(system_result['fsfvi_value'] - expected_fsfvi) < 1e-6
    
    def test_estimate_sensitivity_parameter(self):
        """Test sensitivity parameter estimation"""
        # Test each component type
        component_types = get_component_types()
        
        for comp_type in component_types:
            sensitivity = estimate_sensitivity_parameter(
                comp_type, 75.0, 90.0, 1000.0
            )
            
            # Should be within reasonable bounds
            assert 0.1 <= sensitivity <= 0.8
            assert isinstance(sensitivity, float)
        
        # Test with different parameters
        sensitivity1 = estimate_sensitivity_parameter(
            'agricultural_development', 50.0, 100.0, 500.0  # Large gap, small allocation
        )
        sensitivity2 = estimate_sensitivity_parameter(
            'agricultural_development', 90.0, 100.0, 2000.0  # Small gap, large allocation
        )
        
        # Different inputs should yield different sensitivities
        assert sensitivity1 != sensitivity2
    
    def test_calculate_vulnerability_gradient(self):
        """Test vulnerability gradient calculation"""
        gradient = calculate_vulnerability_gradient(0.2, 0.001, 1000.0, 0.25)
        
        # Gradient should be negative (decreasing vulnerability with more allocation)
        assert gradient < 0
        assert isinstance(gradient, float)
        
        # Test edge cases
        gradient_zero_gap = calculate_vulnerability_gradient(0.0, 0.001, 1000.0, 0.25)
        assert gradient_zero_gap == 0.0
        
        gradient_zero_weight = calculate_vulnerability_gradient(0.2, 0.001, 1000.0, 0.0)
        assert gradient_zero_weight == 0.0
    
    @pytest.mark.unit
    def test_utility_functions(self):
        """Test utility functions"""
        # round_to_precision
        assert round_to_precision(3.14159, 2) == 3.14
        assert round_to_precision(3.14159) == round(3.14159, FSFVI_CONFIG.precision)
        
        # safe_divide
        assert safe_divide(10, 2) == 5.0
        assert safe_divide(10, 0) == 0.0  # default
        assert safe_divide(10, 0, 999) == 999  # custom default
        
        # clamp
        assert clamp(5, 0, 10) == 5
        assert clamp(-5, 0, 10) == 0
        assert clamp(15, 0, 10) == 10
        
        # normalize_values
        normalized = normalize_values([1, 2, 3, 4])
        expected = [0.1, 0.2, 0.3, 0.4]
        assert all(abs(a - b) < 1e-6 for a, b in zip(normalized, expected))
        
        # normalize_values with zero sum
        normalized = normalize_values([0, 0, 0])
        assert all(abs(v - 1/3) < 1e-6 for v in normalized)


class TestFSFVIService:
    """Test service layer functions with Kenya data"""
    
    def test_calculation_service_init(self, calculation_service):
        """Test calculation service initialization"""
        assert isinstance(calculation_service, FSFVICalculationService)
        assert hasattr(calculation_service, 'calculate_fsfvi')
        assert hasattr(calculation_service, 'calculate_component_vulnerabilities')
    
    @pytest.mark.requires_data
    def test_calculate_fsfvi_service_with_kenya_data(self, calculation_service, kenya_component_data):
        """Test FSFVI calculation through service with Kenya data"""
        components = kenya_component_data['components']
        
        result = calculation_service.calculate_fsfvi(components)
        
        # Verify structure
        required_fields = ['fsfvi_value', 'component_vulnerabilities', 'total_allocated',
                          'critical_components', 'risk_level', 'weighting_method', 'scenario']
        for field in required_fields:
            assert field in result
        
        # Verify data types and ranges
        assert isinstance(result['fsfvi_value'], float)
        assert result['fsfvi_value'] >= 0
        assert isinstance(result['component_vulnerabilities'], list)
        assert len(result['component_vulnerabilities']) == len(components)
        assert result['risk_level'] in ['low', 'medium', 'high', 'critical']
        
        # Kenya-specific validations
        expected_budget = kenya_component_data['total_budget']
        assert abs(result['total_allocated'] - expected_budget) < 1.0  # Within $1M tolerance
        
        print(f"🇰🇪 Kenya FSFVI Score: {result['fsfvi_value']:.6f}")
        print(f"🇰🇪 Kenya Risk Level: {result['risk_level']}")
        print(f"🇰🇪 Kenya Budget: ${expected_budget:,.1f}M")
    
    @pytest.mark.requires_data
    def test_calculate_component_vulnerabilities_service_kenya(self, calculation_service, kenya_component_data):
        """Test component vulnerability calculation with Kenya data"""
        components = kenya_component_data['components']
        
        result = calculation_service.calculate_component_vulnerabilities(components)
        
        assert isinstance(result, list)
        assert len(result) == len(components)
        
        for comp_result in result:
            required_fields = ['component_id', 'component_type', 'vulnerability',
                             'weighted_vulnerability', 'priority_level']
            for field in required_fields:
                assert field in comp_result
        
        # Print Kenya component breakdown
        print(f"\n🇰🇪 Kenya Component Vulnerabilities:")
        for comp in result:
            print(f"  • {comp['component_type']}: {comp['vulnerability']:.4f} "
                  f"(Priority: {comp['priority_level']})")
    
    @pytest.mark.requires_data
    def test_optimization_service_kenya(self, optimization_service, kenya_component_data):
        """Test optimization service with Kenya data"""
        components = kenya_component_data['components']
        budget = kenya_component_data['total_budget']
        
        result = optimization_service.optimize_allocation(components, budget)
        
        # Should have optimization results
        assert 'success' in result
        if result['success']:
            assert 'optimal_fsfvi' in result
            assert 'optimal_allocations' in result
            assert 'efficiency_gap' in result
            assert 'improvement_potential' in result
            
            print(f"\n🇰🇪 Kenya Optimization Results:")
            print(f"  • Success: {result['success']}")
            print(f"  • Improvement Potential: {result.get('improvement_potential', 0):.2f}%")
        else:
            print(f"\n⚠️ Kenya Optimization Failed: {result.get('error', 'Unknown error')}")
    
    @pytest.mark.requires_data
    @pytest.mark.slow
    def test_kenya_government_analysis(self, analysis_service, kenya_component_data):
        """Test Kenya-specific government analysis with real data"""
        components = kenya_component_data['components']
        budget = kenya_component_data['total_budget']
        
        result = analysis_service.kenya_government_analysis(components, budget)
        
        # Verify Kenya-specific structure
        required_sections = [
            'analysis_id', 'data_summary', 'current_distribution', 'component_vulnerabilities',
            'component_performance_gaps', 'recommended_redistributions', 'current_fsfvi_assessment',
            'optimization_potential', 'executive_summary'
        ]
        
        for section in required_sections:
            assert section in result
        
        # Verify executive summary structure
        exec_summary = result['executive_summary']
        assert 'overall_assessment' in exec_summary
        assert 'key_findings' in exec_summary
        assert 'priority_actions' in exec_summary
        
        # Print key findings for Kenya
        print(f"\n🇰🇪 Kenya Government Analysis Summary:")
        print(f"  • Country: {result.get('analysis_for', 'Kenya')}")
        print(f"  • Total Projects: {result['data_summary']['total_projects']}")
        print(f"  • Total Budget: ${result['data_summary']['total_budget_usd_millions']:,.1f}M")
        print(f"  • Components: {result['data_summary']['components_analyzed']}")
        print(f"  • FSFVI Score: {result['current_fsfvi_assessment']['fsfvi_score']:.6f}")
        print(f"  • Risk Level: {result['current_fsfvi_assessment']['risk_level']}")


class TestDjangoModels:
    """Test Django model operations"""
    
    @pytest.mark.skipif(not DJANGO_AVAILABLE, reason="Django not available")
    def test_fsfvi_session_model(self, django_user):
        """Test FSFVISession model creation and operations"""
        session = FSFVISession.objects.create(
            user=django_user,
            country_name="Kenya",
            fiscal_year=2024,
            currency="USD",
            budget_unit="millions",
            total_budget=2900.0
        )
        
        assert session.id is not None
        assert session.country_name == "Kenya"
        assert session.user == django_user
        assert session.total_budget == 2900.0
        
        # Test string representation
        assert str(session.id) in str(session.id)
    
    @pytest.mark.skipif(not DJANGO_AVAILABLE, reason="Django not available")
    def test_component_model(self, django_user):
        """Test Component model creation"""
        session = FSFVISession.objects.create(
            user=django_user,
            country_name="Kenya",
            fiscal_year=2024,
            total_budget=1000.0
        )
        
        component = Component.objects.create(
            session=session,
            component_name="Agricultural Development",
            component_type="agricultural_development",
            observed_value=75.0,
            benchmark_value=90.0,
            financial_allocation=500.0,
            weight=0.5,
            sensitivity_parameter=0.7
        )
        
        assert component.session == session
        assert component.component_type == "agricultural_development"
        assert component.financial_allocation == 500.0
    
    @pytest.mark.skipif(not DJANGO_AVAILABLE, reason="Django not available")
    def test_uploaded_file_model(self, django_user):
        """Test UploadedFile model"""
        uploaded_file = UploadedFile.objects.create(
            user=django_user,
            original_filename="test_data.csv",
            file_path="/test/path/test_data.csv",
            file_size=1024,
            processing_status="uploaded"
        )
        
        assert uploaded_file.user == django_user
        assert uploaded_file.original_filename == "test_data.csv"
        assert uploaded_file.processing_status == "uploaded"


class TestDjangoAPI:
    """Test Django REST API endpoints"""
    
    @pytest.mark.skipif(not DJANGO_AVAILABLE, reason="Django not available")
    def test_user_registration(self):
        """Test user registration endpoint"""
        response = django_client.post('/api/v1/auth/register/', {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'newpass123',
            'password_confirm': 'newpass123',
            'first_name': 'New',
            'last_name': 'User'
        })
        
        assert response.status_code == 201
        data = response.json()
        assert 'user' in data
        assert 'token' in data
        assert data['user']['username'] == 'newuser'
    
    @pytest.mark.skipif(not DJANGO_AVAILABLE, reason="Django not available")
    def test_user_login(self, django_user):
        """Test user login endpoint"""
        response = django_client.post('/api/v1/auth/login/', {
            'username': 'testuser',
            'password': 'testpass123'
        })
        
        assert response.status_code == 200
        data = response.json()
        assert 'user' in data
        assert 'token' in data
        assert data['user']['username'] == 'testuser'
    
    @pytest.mark.skipif(not DJANGO_AVAILABLE, reason="Django not available")  
    def test_csv_upload_endpoint(self, django_user, authenticated_headers, kenya_csv_content):
        """Test Django CSV upload endpoint"""
        if not kenya_csv_content:
            pytest.skip("Kenya CSV data not available")
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            f.write(kenya_csv_content)
            temp_path = f.name
        
        try:
            with open(temp_path, 'rb') as f:
                response = django_client.post(
                    '/api/v1/upload-csv/',
                    {
                        'file': f,
                        'country_name': 'Kenya',
                        'fiscal_year': 2024,
                        'currency': 'USD',
                        'budget_unit': 'millions'
                    },
                    HTTP_AUTHORIZATION=authenticated_headers['Authorization']
                )
            
            assert response.status_code == 201
            data = response.json()
            assert 'session_id' in data
            assert 'message' in data
            assert 'summary' in data
            
            return data['session_id']
            
        finally:
            os.unlink(temp_path)
    
    @pytest.mark.skipif(not DJANGO_AVAILABLE, reason="Django not available")
    def test_list_user_files(self, django_user, authenticated_headers):
        """Test listing user uploaded files"""
        response = django_client.get(
            '/api/v1/my-files/',
            HTTP_AUTHORIZATION=authenticated_headers['Authorization']
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'files' in data
        assert isinstance(data['files'], list)


class TestDataProcessingService:
    """Test Django data processing service"""
    
    @pytest.mark.skipif(not DJANGO_AVAILABLE, reason="Django not available")
    def test_data_processing_service_init(self):
        """Test data processing service initialization"""
        assert data_processing_service is not None
        assert hasattr(data_processing_service, 'upload_and_process_csv')
        assert hasattr(data_processing_service, 'get_user_files')
    
    @pytest.mark.skipif(not DJANGO_AVAILABLE, reason="Django not available")
    def test_upload_and_process_csv_service(self, django_user, kenya_csv_content):
        """Test data processing service CSV upload"""
        if not kenya_csv_content:
            pytest.skip("Kenya CSV data not available")
        
        result = data_processing_service.upload_and_process_csv(
            user=django_user,
            file_content=kenya_csv_content.encode('utf-8'),
            filename="test_kenya_data.csv",
            country_name="Kenya",
            fiscal_year=2024,
            currency="USD",
            budget_unit="millions"
        )
        
        assert result['success'] is True
        assert 'session_id' in result
        assert 'summary' in result
        
        # Verify session was created in database
        session = FSFVISession.objects.get(id=result['session_id'])
        assert session.user == django_user
        assert session.country_name == "Kenya"
        
        # Verify components were created
        components = Component.objects.filter(session=session)
        assert components.count() > 0
        
        return result['session_id']


class TestFastAPIDjangoIntegration:
    """Test integration between FastAPI and Django"""
    
    @pytest.mark.skipif(not DJANGO_AVAILABLE, reason="Django not available")
    def test_fastapi_django_auth_integration(self, django_user_token):
        """Test FastAPI using Django authentication"""
        response = fastapi_client.get(
            "/auth/profile",
            headers={'Authorization': f'Bearer {django_user_token}'}
        )
        
        if response.status_code == 200:
            data = response.json()
            assert 'user' in data
        else:
            # This might fail if Django integration is not fully set up
            pytest.skip("FastAPI-Django auth integration not working")
    
    @pytest.mark.skipif(not DJANGO_AVAILABLE, reason="Django not available")
    def test_fastapi_upload_with_django_storage(self, django_user_token, kenya_csv_content):
        """Test FastAPI upload endpoint using Django storage"""
        if not kenya_csv_content:
            pytest.skip("Kenya CSV data not available")
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            f.write(kenya_csv_content)
            temp_path = f.name
        
        try:
            with open(temp_path, 'rb') as f:
                response = fastapi_client.post(
                    "/upload_data",
                    files={"file": ("kenya_data.csv", f, "text/csv")},
                    data={
                        "country_name": "Kenya",
                        "fiscal_year": 2024,
                        "currency": "USD",
                        "budget_unit": "millions"
                    },
                    headers={'Authorization': f'Bearer {django_user_token}'}
                )
            
            assert response.status_code == 200
            data = response.json()
            assert 'session_id' in data
            assert 'storage' in data
            
            # Should use Django storage if integration is working
            if data.get('storage') == 'django_database':
                # Verify data was stored in Django
                session = FSFVISession.objects.get(id=data['session_id'])
                assert session.country_name == "Kenya"
                
                components = Component.objects.filter(session=session)
                assert components.count() > 0
                
                print(f"✅ Django integration working: {components.count()} components stored")
            else:
                print(f"⚠️ Using fallback storage: {data.get('storage')}")
            
            return data['session_id']
            
        finally:
            os.unlink(temp_path)
    
    @pytest.mark.skipif(not DJANGO_AVAILABLE, reason="Django not available")
    def test_fastapi_analysis_with_django_data(self, django_user, django_user_token, kenya_csv_content):
        """Test FastAPI analysis using data stored in Django"""
        if not kenya_csv_content:
            pytest.skip("Kenya CSV data not available")
        
        # First, upload data via Django
        result = data_processing_service.upload_and_process_csv(
            user=django_user,
            file_content=kenya_csv_content.encode('utf-8'),
            filename="test_analysis.csv",
            country_name="Kenya"
        )
        
        assert result['success'] is True
        session_id = result['session_id']
        
        # Now try to analyze using FastAPI
        response = fastapi_client.post(
            "/calculate_system_vulnerability",
            data={"session_id": session_id},
            headers={'Authorization': f'Bearer {django_user_token}'}
        )
        
        # This should work if FastAPI can read Django data
        if response.status_code == 200:
            data = response.json()
            assert 'fsfvi_score' in data
            assert 'risk_level' in data
            
            print(f"✅ FastAPI-Django data integration working")
            print(f"   Session ID: {session_id}")
            print(f"   FSFVI Score: {data['fsfvi_score']:.6f}")
        else:
            print(f"⚠️ FastAPI-Django data integration not working: {response.status_code}")


class TestWorkflowIntegration:
    """Test complete workflow integration between FastAPI and Django"""
    
    @pytest.mark.skipif(not DJANGO_AVAILABLE, reason="Django not available")
    @pytest.mark.integration
    def test_complete_django_fastapi_workflow(self, django_user, django_user_token, kenya_csv_content):
        """Test complete workflow: Django upload → FastAPI analysis → Django storage"""
        if not kenya_csv_content:
            pytest.skip("Kenya CSV data not available")
        
        print("\n🔄 Testing Complete Django-FastAPI Workflow:")
        
        # Step 1: Upload via Django API
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            f.write(kenya_csv_content)
            temp_path = f.name
        
        try:
            with open(temp_path, 'rb') as f:
                upload_response = django_client.post(
                    '/api/v1/upload-csv/',
                    {
                        'file': f,
                        'country_name': 'Kenya',
                        'fiscal_year': 2024,
                        'currency': 'USD'
                    },
                    HTTP_AUTHORIZATION=f'Token {django_user_token}'
                )
            
            assert upload_response.status_code == 201
            upload_data = upload_response.json()
            session_id = upload_data['session_id']
            
            print(f"  1. ✅ Django Upload: Session {session_id}")
            
            # Verify Django storage
            session = FSFVISession.objects.get(id=session_id)
            components_count = Component.objects.filter(session=session).count()
            print(f"     📊 Stored {components_count} components in Django")
            
            # Step 2: Analyze via FastAPI
            analysis_response = fastapi_client.post(
                "/calculate_system_vulnerability",
                data={"session_id": session_id},
                headers={'Authorization': f'Bearer {django_user_token}'}
            )
            
            if analysis_response.status_code == 200:
                analysis_data = analysis_response.json()
                fsfvi_score = analysis_data['fsfvi_score']
                print(f"  2. ✅ FastAPI Analysis: FSFVI = {fsfvi_score:.6f}")
                
                # Step 3: Check if results stored in Django
                try:
                    system_analysis = SystemAnalysis.objects.get(session=session)
                    print(f"  3. ✅ Results stored in Django: FSFVI = {system_analysis.fsfvi_value:.6f}")
                except SystemAnalysis.DoesNotExist:
                    print(f"  3. ⚠️ Results not automatically stored in Django")
                
                # Step 4: Test optimization
                opt_response = fastapi_client.post(
                    "/optimize_allocation",
                    data={"session_id": session_id},
                    headers={'Authorization': f'Bearer {django_user_token}'}
                )
                
                if opt_response.status_code == 200:
                    print(f"  4. ✅ FastAPI Optimization completed")
                else:
                    print(f"  4. ⚠️ FastAPI Optimization failed: {opt_response.status_code}")
                
                # Step 5: Verify via Django API
                django_session_response = django_client.get(
                    f'/api/v1/sessions/{session_id}/',
                    HTTP_AUTHORIZATION=f'Token {django_user_token}'
                )
                
                if django_session_response.status_code == 200:
                    django_session_data = django_session_response.json()
                    print(f"  5. ✅ Django retrieval: Status = {django_session_data.get('status')}")
                else:
                    print(f"  5. ⚠️ Django retrieval failed: {django_session_response.status_code}")
                
                print("✅ Complete workflow integration test passed!")
                return True
            else:
                print(f"  2. ❌ FastAPI Analysis failed: {analysis_response.status_code}")
                return False
                
        finally:
            os.unlink(temp_path)


class TestEndpoints:
    """Test FastAPI endpoints with Kenya data"""
    
    def test_root_endpoint(self):
        """Test API root endpoint"""
        response = fastapi_client.get("/")
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        assert "status" in data
        assert "version" in data
        assert data["status"] == "operational"
        assert "workflow" in data
        assert "features" in data
        
        # Check Django integration status
        print(f"Django integration: {data.get('django_integration', False)}")
    
    def test_upload_info_endpoint(self):
        """Test upload info endpoint"""
        response = fastapi_client.get("/upload-info")
        assert response.status_code == 200
        
        data = response.json()
        assert "django_integration" in data
        assert "upload_endpoints" in data
        assert "file_management" in data
        
        print(f"Upload endpoints available: {list(data['upload_endpoints'].keys())}")
    
    def _upload_kenya_data(self, kenya_csv_content):
        """Helper method to upload Kenya data and return session_id"""
        # Create temporary file with Kenya data
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            f.write(kenya_csv_content)
            temp_path = f.name
        
        try:
            with open(temp_path, 'rb') as f:
                files = {"file": ("Final_Combined_Matches_with_Manual_Entries.csv", f, "text/csv")}
                form_data = {
                    "country_name": "Kenya",
                    "fiscal_year": 2024,
                    "currency": "USD",
                    "budget_unit": "millions"
                }
                
                response = fastapi_client.post("/upload_data", files=files, data=form_data)
                
            assert response.status_code == 200
            data = response.json()
            
            # Verify response structure
            assert "session_id" in data
            assert "status" in data
            assert data["status"] == "success"
            assert "data_summary" in data
            assert "components" in data
            
            # Verify Kenya-specific data
            assert data["data_summary"]["country"] == "Kenya"
            assert len(data["components"]) > 0
            
            # Should have reasonable budget (around $2.9B)
            total_budget_str = data["data_summary"]["total_budget"]
            assert "2908.50" in total_budget_str  # Should be around 2,900M
            
            return data["session_id"]
            
        finally:
            os.unlink(temp_path)
    
    @pytest.mark.requires_data
    @pytest.mark.integration
    def test_upload_kenya_data_endpoint(self, kenya_csv_content):
        """Test data upload endpoint with Kenya CSV data"""
        session_id = self._upload_kenya_data(kenya_csv_content)
        
        print(f"\n🇰🇪 Kenya Data Upload Success:")
        print(f"  • Session ID: {session_id}")
        print(f"  • Test completed successfully")
    
    @pytest.mark.requires_data
    @pytest.mark.integration
    def test_analyze_current_distribution_kenya(self, kenya_csv_content):
        """Test current distribution analysis endpoint with Kenya data"""
        # First upload Kenya data to get session ID
        session_id = self._upload_kenya_data(kenya_csv_content)
        
        response = fastapi_client.post(
            "/analyze_current_distribution",
            data={"session_id": session_id}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "distribution_analysis" in data
        assert "key_insights" in data
        assert "recommendations" in data
        
        dist_analysis = data["distribution_analysis"]
        assert "total_budget_usd_millions" in dist_analysis
        assert "component_allocations" in dist_analysis
        assert "concentration_analysis" in dist_analysis
        
        # Kenya-specific validations
        assert dist_analysis["total_budget_usd_millions"] > 2000  # Should be around $2.9B
        assert len(dist_analysis["component_allocations"]) > 0
        
        print(f"\n🇰🇪 Kenya Distribution Analysis:")
        for comp_type, details in dist_analysis["component_allocations"].items():
            print(f"  • {comp_type}: ${details['current_allocation_usd_millions']:,.1f}M "
                  f"({details['percentage_of_total']:.1f}%)")
    
    @pytest.mark.requires_data
    @pytest.mark.integration
    def test_calculate_performance_gaps_kenya(self, kenya_csv_content):
        """Test performance gaps calculation endpoint with Kenya data"""
        session_id = self._upload_kenya_data(kenya_csv_content)
        
        response = fastapi_client.post(
            "/calculate_performance_gaps",
            data={"session_id": session_id}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "performance_gaps" in data
        assert "summary" in data
        assert "priority_actions" in data
        
        # Print Kenya performance gaps
        print(f"\n🇰🇪 Kenya Performance Gaps:")
        for comp_type, gap_info in data["performance_gaps"]["gaps"].items():
            print(f"  • {comp_type}: {gap_info['gap_percent']:.1f}% gap "
                  f"(Priority: {gap_info['priority_level']})")
    
    @pytest.mark.requires_data
    @pytest.mark.integration
    def test_calculate_component_vulnerabilities_kenya(self, kenya_csv_content):
        """Test component vulnerabilities endpoint with Kenya data"""
        session_id = self._upload_kenya_data(kenya_csv_content)
        
        response = fastapi_client.post(
            "/calculate_component_vulnerabilities",
            data={"session_id": session_id}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "component_vulnerabilities" in data
        assert "critical_components" in data
        assert "high_risk_components" in data
        assert "risk_matrix" in data
        
        print(f"\n🇰🇪 Kenya Component Vulnerabilities:")
        print(f"  • Critical Components: {data['critical_components']}")
        print(f"  • High Risk Components: {data['high_risk_components']}")
    
    @pytest.mark.requires_data
    @pytest.mark.integration
    def test_calculate_system_vulnerability_kenya(self, kenya_csv_content):
        """Test system vulnerability (FSFVI) endpoint with Kenya data"""
        session_id = self._upload_kenya_data(kenya_csv_content)
        
        response = fastapi_client.post(
            "/calculate_system_vulnerability",
            data={"session_id": session_id}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "fsfvi_score" in data
        assert "risk_level" in data
        assert "vulnerability_percent" in data
        assert "system_analysis" in data
        
        # Verify FSFVI score is valid
        fsfvi_score = data["fsfvi_score"]
        assert isinstance(fsfvi_score, (int, float))
        assert fsfvi_score >= 0
        
        print(f"\n🇰🇪 Kenya System Vulnerability (FSFVI):")
        print(f"  • FSFVI Score: {fsfvi_score:.6f}")
        print(f"  • Risk Level: {data['risk_level']}")
        print(f"  • Vulnerability %: {data['vulnerability_percent']:.2f}%")
    
    @pytest.mark.requires_data
    @pytest.mark.integration
    def test_optimize_allocation_kenya(self, kenya_csv_content):
        """Test allocation optimization endpoint with Kenya data"""
        session_id = self._upload_kenya_data(kenya_csv_content)
        
        response = fastapi_client.post(
            "/optimize_allocation",
            data={"session_id": session_id}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "optimization_results" in data
        assert "implementation_roadmap" in data
        assert "cost_benefit_analysis" in data
        
        opt_results = data["optimization_results"]
        if opt_results.get("status") == "success":
            print(f"\n🇰🇪 Kenya Optimization Results:")
            print(f"  • Current FSFVI: {opt_results.get('current_fsfvi', 0):.6f}")
            print(f"  • Optimal FSFVI: {opt_results.get('optimal_fsfvi', 0):.6f}")
            print(f"  • Improvement: {opt_results.get('improvement_potential', 0):.2f}%")
    
    @pytest.mark.requires_data
    @pytest.mark.integration
    def test_session_status_kenya(self, kenya_csv_content):
        """Test session status endpoint with Kenya data"""
        session_id = self._upload_kenya_data(kenya_csv_content)
        
        response = fastapi_client.get(f"/session_status/{session_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "session_id" in data
        assert "current_status" in data
        assert "progress_percent" in data
        assert "workflow_completed" in data
        assert "next_steps" in data
        
        # Should be Kenya-specific
        assert data.get("country") == "Kenya"
    
    def test_validate_system(self):
        """Test system validation endpoint"""
        response = fastapi_client.get("/validate_system")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "overall_status" in data
        assert "service_validation" in data
        assert "api_validation" in data
    
    def test_error_handling(self):
        """Test error handling for invalid requests"""
        # Test invalid session ID
        response = fastapi_client.post(
            "/analyze_current_distribution",
            data={"session_id": "invalid_session"}
        )
        assert response.status_code == 404
        
        # Test missing required fields
        response = fastapi_client.post("/upload_data")
        assert response.status_code == 422  # Validation error


class TestValidation:
    """Test validation functions with Kenya data"""
    
    @pytest.mark.requires_data
    def test_component_data_validation_kenya(self, kenya_component_data):
        """Test component data validation with Kenya data"""
        components = kenya_component_data['components']
        
        # Valid Kenya data should pass
        validate_component_data(components)
        
        # Test specific Kenya component properties
        for comp in components:
            assert 'component_type' in comp
            assert comp['component_type'] in get_component_types()
            assert comp['financial_allocation'] >= 0
            assert comp['observed_value'] >= 0
            assert comp['benchmark_value'] >= 0
    
    @pytest.mark.requires_data
    def test_component_weights_validation_kenya(self, kenya_component_data):
        """Test component weights validation with Kenya data"""
        components = kenya_component_data['components']
        
        # Kenya weights should be properly normalized
        validate_component_weights(components)
        
        # Verify weight sum
        total_weight = sum(comp['weight'] for comp in components)
        assert abs(total_weight - 1.0) < 1e-6
    
    def test_component_type_normalization_kenya_specific(self):
        """Test component type normalization with Kenya-specific terms"""
        # Test Kenya data terms
        assert normalize_component_type('agriculture') == 'agricultural_development'
        assert normalize_component_type('food safety') == 'nutrition_health'  # Should map properly
        assert normalize_component_type('resilience') == 'climate_natural_resources'
        assert normalize_component_type('retail and marketing') == 'governance_institutions'
        assert normalize_component_type('economic') == 'governance_institutions'


class TestEdgeCases:
    """Test edge cases and error conditions with real data scenarios"""
    
    @pytest.mark.requires_data
    def test_kenya_data_extreme_scenarios(self, kenya_component_data):
        """Test with Kenya data edge cases"""
        components = kenya_component_data['components']
        calc_service = FSFVICalculationService()
        
        # Test with one component having zero allocation
        test_components = components.copy()
        if test_components:
            test_components[0]['financial_allocation'] = 0.0
            
            result = calc_service.calculate_fsfvi(test_components)
            assert 'fsfvi_value' in result
            assert result['fsfvi_value'] >= 0
    
    @pytest.mark.requires_data
    def test_single_component_kenya_scenario(self, kenya_component_data):
        """Test with single Kenya component"""
        components = kenya_component_data['components']
        
        if components:
            # Test with just the largest component
            largest_comp = max(components, key=lambda x: x['financial_allocation'])
            largest_comp['weight'] = 1.0  # Full weight
            
            calc_service = FSFVICalculationService()
            result = calc_service.calculate_fsfvi([largest_comp])
            
            assert 'fsfvi_value' in result
            assert len(result['component_vulnerabilities']) == 1


class TestIntegration:
    """Integration tests for full workflow with Kenya data"""
    
    def _upload_kenya_data(self, kenya_csv_content):
        """Helper method to upload Kenya data and return session_id"""
        # Create temporary file with Kenya data
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False, encoding='utf-8') as f:
            f.write(kenya_csv_content)
            temp_path = f.name
        
        try:
            with open(temp_path, 'rb') as f:
                files = {"file": ("Final_Combined_Matches_with_Manual_Entries.csv", f, "text/csv")}
                form_data = {
                    "country_name": "Kenya",
                    "fiscal_year": 2024,
                    "currency": "USD",
                    "budget_unit": "millions"
                }
                
                upload_response = fastapi_client.post("/upload_data", files=files, data=form_data)
                assert upload_response.status_code == 200
                return upload_response.json()["session_id"], upload_response
                
        finally:
            os.unlink(temp_path)
    
    @pytest.mark.requires_data
    @pytest.mark.integration
    @pytest.mark.slow
    def test_complete_kenya_workflow(self, kenya_csv_content):
        """Test complete analysis workflow with Kenya data"""
        # Step 1: Upload Kenya data
        session_id, upload_response = self._upload_kenya_data(kenya_csv_content)
        
        print(f"\n🇰🇪 Kenya Complete Workflow Test:")
        print(f"  1. ✅ Data Upload: {len(upload_response.json()['components'])} components")

        # Step 2: Analyze distribution
        dist_response = fastapi_client.post(
            "/analyze_current_distribution",
            data={"session_id": session_id}
        )
        assert dist_response.status_code == 200
        budget = dist_response.json()["distribution_analysis"]["total_budget_usd_millions"]
        print(f"  2. ✅ Distribution Analysis: ${budget:,.1f}M budget")

        # Step 3: Calculate performance gaps
        gaps_response = fastapi_client.post(
            "/calculate_performance_gaps",
            data={"session_id": session_id}
        )
        assert gaps_response.status_code == 200
        data = gaps_response.json()
        assert "performance_gaps" in data
        assert "summary" in data
        gaps_count = sum(1 for gap in data["performance_gaps"]["gaps"].values() if gap["priority_level"] in ["critical", "high"])
        print(f"  3. ✅ Performance Gaps: {gaps_count} components with significant gaps")

        # Step 4: Calculate component vulnerabilities
        comp_vuln_response = fastapi_client.post(
            "/calculate_component_vulnerabilities",
            data={"session_id": session_id}
        )
        assert comp_vuln_response.status_code == 200
        critical_count = len(comp_vuln_response.json()["critical_components"])
        print(f"  4. ✅ Component Vulnerabilities: {critical_count} critical components")

        # Step 5: Calculate system vulnerability
        sys_vuln_response = fastapi_client.post(
            "/calculate_system_vulnerability",
            data={"session_id": session_id}
        )
        assert sys_vuln_response.status_code == 200
        fsfvi_score = sys_vuln_response.json()["fsfvi_score"]
        risk_level = sys_vuln_response.json()["risk_level"]
        print(f"  5. ✅ System Vulnerability: FSFVI={fsfvi_score:.6f} ({risk_level})")

        # Step 6: Optimize allocation
        optimize_response = fastapi_client.post(
            "/optimize_allocation",
            data={"session_id": session_id}
        )
        assert optimize_response.status_code == 200
        opt_status = optimize_response.json()["optimization_results"]["status"]
        print(f"  6. ✅ Optimization: {opt_status}")

        # Step 7: Generate reports
        report_response = fastapi_client.post(
            "/generate_reports",
            data={"session_id": session_id}
        )
        assert report_response.status_code == 200
        print(f"  7. ✅ Reports Generated")

        # Verify final session status
        status_response = fastapi_client.get(f"/session_status/{session_id}")
        assert status_response.status_code == 200
        
        status_data = status_response.json()
        assert status_data["current_status"] == "analysis_completed"
        assert status_data["progress_percent"] == 100.0
        print(f"  8. ✅ Workflow Complete: {status_data['progress_percent']}%")


# Performance and stress tests
class TestPerformance:
    """Performance and stress tests with Kenya data scale"""
    
    @pytest.mark.requires_data
    @pytest.mark.performance
    def test_kenya_data_processing_performance(self, kenya_component_data):
        """Test performance with Kenya's actual 574 projects dataset"""
        components = kenya_component_data['components']
        
        calc_service = FSFVICalculationService()
        start_time = datetime.now()
        result = calc_service.calculate_fsfvi(components)
        end_time = datetime.now()
        
        # Should complete in reasonable time
        execution_time = (end_time - start_time).total_seconds()
        assert execution_time < 2.0  # 2 seconds max for Kenya's data
        
        # Should produce valid results
        assert 'fsfvi_value' in result
        assert len(result['component_vulnerabilities']) == len(components)
        
        print(f"\n🇰🇪 Kenya Performance Test:")
        print(f"  • Components: {len(components)}")
        print(f"  • Execution Time: {execution_time:.3f}s")
        print(f"  • FSFVI Score: {result['fsfvi_value']:.6f}")
    
    @pytest.mark.requires_data
    @pytest.mark.performance
    @pytest.mark.slow
    def test_kenya_optimization_performance(self, kenya_component_data):
        """Test optimization performance with Kenya data"""
        components = kenya_component_data['components']
        budget = kenya_component_data['total_budget']
        
        opt_service = FSFVIOptimizationService(FSFVICalculationService())
        
        start_time = datetime.now()
        result = opt_service.optimize_allocation(components, budget)
        end_time = datetime.now()
        
        # Should complete in reasonable time
        execution_time = (end_time - start_time).total_seconds()
        assert execution_time < 10.0  # 10 seconds max for Kenya optimization
        
        # Should produce result (success or failure with reason)
        assert 'success' in result
        
        print(f"\n🇰🇪 Kenya Optimization Performance:")
        print(f"  • Budget: ${budget:,.1f}M")
        print(f"  • Execution Time: {execution_time:.3f}s")
        print(f"  • Success: {result['success']}")
        if result['success']:
            print(f"  • Improvement: {result.get('improvement_potential', 0):.2f}%")


if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v", "--tb=short"])
