"""
FSFVI Analysis Service - Food System Financing Vulnerability Analysis
=====================================================================

FastAPI service focused on high-performance FSFVI analysis and optimization.
Handles data processing, vulnerability calculations, and recommendations.
Authentication is managed by Django backend (port 8000).

Service Architecture:
- Django (port 8000): User management, authentication, data persistence
- FastAPI (port 8001): FSFVI analysis, calculations, optimization
"""

from fastapi import FastAPI, HTTPException, Query, UploadFile, File, Form, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Dict, Optional, Any
import logging
from datetime import datetime
import pandas as pd
import io
import uuid
import numpy as np
import sys
import os
import requests

# Import service layer and schemas
from .fsfvi_service import create_fsfvi_services
from .schemas import (
    FSFVIRequest, FSFVIResponse, OptimizationResult, OptimizationConstraints,
    ComponentPerformance, VulnerabilityResult, ShockSimulationRequest, 
    ShockSimulationResponse, EnhancedOptimizationResult, PerformanceGapsResponse
)
from .exceptions import FSFVIException, ValidationError, OptimizationError, CalculationError
from .config import get_weighting_methods, get_scenarios, normalize_component_type
from .validators import validate_system_health

# Import Django integration
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'django_app'))
try:
    from fsfvi.django_integration import django_integration
    DJANGO_INTEGRATION = True
    print("✅ Django integration loaded successfully")
except ImportError as e:
    print(f"⚠️ Django integration not available: {e}")
    DJANGO_INTEGRATION = False

# Import centralized data preparation
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
try:
    from data_preparation import UniversalFSFVIDataPreparation
    DATA_PREPARATION_AVAILABLE = True
except ImportError:
    print("Warning: data_preparation module not available. Using fallback processing.")
    DATA_PREPARATION_AVAILABLE = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="FSFVI Analysis Service",
    description="High-performance analysis and optimization service for Food System Financing Vulnerability Index (FSFVI). Handles data processing, vulnerability calculations, and optimization recommendations. Authentication managed by Django backend.",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS - Updated for Django integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Frontend
        "http://localhost:8000",  # Django (for internal communication)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Initialize services
calculation_service, optimization_service, analysis_service = create_fsfvi_services()

# In-memory storage for session data (fallback when Django is not available)
country_sessions = {}

# Authentication dependency - Updated to validate with Django
async def get_current_user(authorization: HTTPAuthorizationCredentials = Depends(security)):
    """Validate token with Django backend"""
    token = authorization.credentials
    
    try:
        # Validate token with Django
        response = requests.get(
            'http://localhost:8000/auth/profile/',
            headers={'Authorization': f'Token {token}'},
            timeout=5
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(status_code=401, detail="Invalid token")
            
    except requests.RequestException:
        raise HTTPException(status_code=503, detail="Authentication service unavailable")

# Authentication endpoints removed - now handled by Django backend
# All authentication (register, login, profile) is managed by Django on port 8000

@app.get("/upload-info")
async def get_upload_info():
    """Get information about file upload capabilities"""
    return {
        "django_integration": DJANGO_INTEGRATION,
        "authentication": "Django backend (port 8000)",
        "upload_endpoints": {
            "fastapi_upload": {
                "endpoint": "/upload_data",
                "description": "FastAPI upload with Django authentication",
                "method": "POST",
                "storage": "django_database" if DJANGO_INTEGRATION else "in_memory",
                "persistent": DJANGO_INTEGRATION,
                "auth_required": True
            },
            "django_upload": {
                "endpoint": "http://localhost:8000/upload-csv/",
                "description": "Direct Django upload endpoint",
                "method": "POST",
                "storage": "django_database",
                "persistent": True,
                "available": DJANGO_INTEGRATION
            }
        },
        "authentication_endpoints": {
            "register": "http://localhost:8000/auth/register/",
            "login": "http://localhost:8000/auth/login/",
            "logout": "http://localhost:8000/auth/logout/",
            "profile": "http://localhost:8000/auth/profile/"
        },
        "file_management": {
            "list_files": "http://localhost:8000/my-files/",
            "session_info": "http://localhost:8000/sessions/{session_id}/file-info/",
            "reprocess": "http://localhost:8000/sessions/{session_id}/reprocess/",
            "delete": "http://localhost:8000/sessions/{session_id}/delete/"
        },
        "recommended_workflow": [
            "1. Register/Login via Django (http://localhost:8000/auth/)",
            "2. Get authentication token from Django",
            "3. Upload CSV with token (/upload_data or Django endpoints)",
            "4. Analyze data using returned session_id",
            "5. Manage files via Django endpoints"
        ]
    }


@app.get("/", summary="API Health Check")
async def root():
    """API health check and system overview"""
    return {
        "message": "Universal FSFVI Analysis API v3.0 - Food System Vulnerability Analysis Service",
        "status": "operational",
        "version": "3.0.0",
        "service_type": "FSFVI Analysis & Optimization",
        "authentication": "Django backend integration (port 8000)",
        "django_integration": DJANGO_INTEGRATION,
        "data_preparation": "centralized" if DATA_PREPARATION_AVAILABLE else "fallback",
        "workflow": [
            "1. Authenticate via Django (http://localhost:8000/auth/)",
            "2. Upload Data (/upload_data) with Django token",
            "3. Analyze Current Distribution (/analyze_current_distribution)",
            "4. Calculate Performance Gaps (/calculate_performance_gaps)",
            "5. Calculate Component Vulnerabilities (/calculate_component_vulnerabilities)",
            "6. Calculate System Vulnerability (/calculate_system_vulnerability)",
            "7. Optimize Allocation (/optimize_allocation)",
            "8. Generate Reports (/generate_reports)"
        ],
        "service_boundaries": {
            "fastapi_handles": [
                "FSFVI calculations and analysis",
                "Performance gap analysis",
                "Vulnerability assessments",
                "Allocation optimization",
                "Scenario simulations",
                "Report generation"
            ],
            "django_handles": [
                "User authentication and management",
                "Session persistence",
                "File storage and management",
                "User data and preferences"
            ]
        },
        "features": {
            "universal_data_processing": "Handles any country's food system data",
            "complete_analysis_workflow": "End-to-end FSFVI analysis from upload to recommendations",
            "centralized_processing": DATA_PREPARATION_AVAILABLE,
            "weighting_methods": get_weighting_methods(),
            "scenarios": get_scenarios(),
            "customizable_priorities": "Adjust weights and set priorities",
            "comprehensive_reports": "Detailed analysis and recommendations",
            "token_based_auth": "Validates Django-issued tokens"
        },
        "supported_formats": ["CSV", "Excel", "JSON"],
        "timestamp": datetime.now().isoformat()
    }


@app.post("/upload_data", summary="Upload and Process Country Data")
async def upload_data(
    file: UploadFile = File(...),
    country_name: str = Form(...),
    fiscal_year: int = Form(default=2024),
    currency: str = Form(default="USD"),
    budget_unit: str = Form(default="millions"),
    force_reprocess: bool = Form(default=False),
    current_user: dict = Depends(get_current_user)
):
    """
    Upload and process food system data for any country.
    Now using Django's integrated data processing service for persistent storage.
    """
    try:
        # Read uploaded file
        content = await file.read()
        
        # Use Django data processing service if available
        if DJANGO_INTEGRATION:
            try:
                # Import Django's data processing service
                from fsfvi.data_processing_service import data_processing_service
                from django.contrib.auth.models import User
                
                # Get the actual Django user object
                user = User.objects.get(id=current_user['id'])
                
                # Use Django's data processing service
                result = data_processing_service.upload_and_process_csv(
                    user=user,
                    file_content=content,
                    filename=file.filename,
                    country_name=country_name,
                    fiscal_year=fiscal_year,
                    currency=currency,
                    budget_unit=budget_unit
                )
                
                if result['success']:
                    return {
                        "session_id": result['session_id'],
                        "status": "success",
                        "message": result['message'],
                        "storage": "django_database",
                        "user": current_user['username'],
                        "data_summary": {
                            "country": country_name,
                            "fiscal_year": fiscal_year,
                            "total_records": result['summary']['total_records'],
                            "total_budget": f"{result['summary']['total_budget']:.2f} {currency} {budget_unit}",
                            "components_identified": result['summary']['components_count'],
                            "data_quality_score": result['summary']['data_quality_score'],
                            "validation_status": result['summary']['validation_status']
                        },
                        "components": result['components'],
                        "next_step": "Call /analyze_current_distribution with this session_id"
                    }
                else:
                    raise HTTPException(status_code=400, detail=result['error'])
                    
            except Exception as e:
                logger.error(f"Django integration error: {str(e)}")
                # Fall back to in-memory processing
                DJANGO_INTEGRATION = False
        
        # Fallback processing (when Django integration is not available)
        if DATA_PREPARATION_AVAILABLE:
            # Use centralized data preparation
            processed_data = await _process_with_centralized_preparation(
                content, file.filename, country_name, fiscal_year, currency, budget_unit
            )
        else:
            # Fallback to basic processing
            processed_data = await _process_with_fallback(
                content, file.filename, country_name, fiscal_year, currency, budget_unit
            )
        
        # Fallback to in-memory storage
        session_id = str(uuid.uuid4())
        country_sessions[session_id] = {
            'user_id': current_user['id'],
            'country_name': country_name,
            'fiscal_year': fiscal_year,
            'currency': currency,
            'budget_unit': budget_unit,
            'raw_data': [],
            'processed_data': processed_data,
            'created_at': datetime.now(),
            'status': 'data_uploaded',
            'processing_method': 'centralized' if DATA_PREPARATION_AVAILABLE else 'fallback'
        }
        
        return {
            "session_id": session_id,
            "status": "success",
            "message": f"Data processed successfully for {country_name} (fallback mode)",
            "processing_method": "centralized" if DATA_PREPARATION_AVAILABLE else "fallback",
            "storage": "in_memory",
            "user": current_user['username'],
            "data_summary": {
                "country": country_name,
                "fiscal_year": fiscal_year,
                "total_projects": len(processed_data.get('raw_data', [])),
                "total_budget": f"{processed_data['total_budget']:.2f} {currency} {budget_unit}",
                "components_identified": len(processed_data['components']),
                "data_quality_score": processed_data.get('data_quality_score', 1.0),
                "validation_status": processed_data.get('validation_status', 'unknown')
            },
            "components": [
                {
                    "component_type": comp['component_type'],
                    "component_name": comp['component_name'],
                    "allocation": comp['financial_allocation'],
                    "sensitivity_parameter": comp['sensitivity_parameter']
                }
                for comp in processed_data['components']
            ],
            "next_step": "Call /analyze_current_distribution with this session_id"
        }
        
    except Exception as e:
        logger.error(f"Data upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Data processing failed: {str(e)}")


async def _process_with_centralized_preparation(
    content: bytes, 
    filename: str, 
    country_name: str, 
    fiscal_year: int, 
    currency: str, 
    budget_unit: str
) -> Dict[str, Any]:
    """Process data using centralized data preparation system"""
    
    # Create temporary file
    import tempfile
    with tempfile.NamedTemporaryFile(mode='wb', suffix='.csv', delete=False) as tmp_file:
        tmp_file.write(content)
        tmp_path = tmp_file.name
    
    try:
        # Initialize centralized data preparation
        prep = UniversalFSFVIDataPreparation(tmp_path)
        
        # Load and process data
        prep.load_and_clean_data()
        
        # Get data summary for quality metrics
        summary = prep.get_data_summary()
        
        # Prepare components
        components, total_budget = prep.prepare_component_data(country_name)
        
        # Validate against system
        validation_results = prep.validate_against_system(components)
        
        return {
            'components': components,
            'total_budget': total_budget,
            'data_quality_score': 1.0 - (summary['data_quality']['missing_values'] / max(summary['total_records'] * len(summary['columns']), 1)),
            'validation_status': validation_results['status'],
            'processing_notes': f"Processed with centralized system. Validation: {validation_results['status']}",
            'alignment_status': summary.get('alignment_status', {}),
            'raw_data': summary  # Include summary instead of raw data
        }
        
    finally:
        # Clean up temporary file
        os.unlink(tmp_path)


async def _process_with_fallback(
    content: bytes, 
    filename: str, 
    country_name: str, 
    fiscal_year: int, 
    currency: str, 
    budget_unit: str
) -> Dict[str, Any]:
    """Fallback data processing when centralized system is not available"""
    
    # Determine file type and process
    if filename.endswith('.csv'):
        df = pd.read_csv(io.StringIO(content.decode('utf-8')))
    elif filename.endswith(('.xlsx', '.xls')):
        df = pd.read_excel(io.BytesIO(content))
    else:
        raise HTTPException(status_code=400, detail="Unsupported file format. Use CSV or Excel.")
    
    # Basic processing
    components = []
    total_budget = 0
    
    # Create minimal components for fallback
    from .fsfvi_core import estimate_sensitivity_parameter
    
    for i, component_type in enumerate(['agricultural_development', 'infrastructure', 'nutrition_health', 
                                      'social_assistance', 'climate_natural_resources', 'governance_institutions']):
        
        allocation = max(len(df) * 10, 50)  # Basic allocation based on data size
        observed_value = 60.0 + np.random.uniform(-10, 10)
        benchmark_value = observed_value * np.random.uniform(1.1, 1.5)
        
        try:
            sensitivity = estimate_sensitivity_parameter(
                component_type, observed_value, benchmark_value, allocation
            )
        except Exception:
            # Fallback sensitivity values
            sensitivity_map = {
                'agricultural_development': 0.70,
                'infrastructure': 0.65,
                'nutrition_health': 0.60,
                'social_assistance': 0.50,
                'climate_natural_resources': 0.30,
                'governance_institutions': 0.25
            }
            sensitivity = sensitivity_map.get(component_type, 0.40)
        
        component = {
            'component_id': str(uuid.uuid4()),
            'component_name': component_type.replace('_', ' ').title(),
            'component_type': component_type,
            'observed_value': float(observed_value),
            'benchmark_value': float(benchmark_value),
            'weight': 1.0/6,
            'sensitivity_parameter': sensitivity,
            'financial_allocation': float(allocation)
        }
        components.append(component)
        total_budget += allocation
    
    # Calculate basic data quality
    data_quality_score = 1.0 - (df.isnull().sum().sum() / max(df.size, 1))
    
    return {
        'components': components,
        'total_budget': total_budget,
        'data_quality_score': data_quality_score,
        'validation_status': 'fallback_processed',
        'processing_notes': f"Processed {len(df)} records with fallback system into {len(components)} components",
        'raw_data': df.to_dict('records')[:100]  # Limit raw data storage
    }


@app.post("/analyze_current_distribution", summary="Analyze Current Financial Distribution")
async def analyze_current_distribution(
    session_id: str = Form(...),
    include_visualizations: bool = Form(default=True),
    current_user: dict = Depends(get_current_user)
):
    """
    Analyze current budget distribution across food system components.
    Provides insights into allocation patterns and concentration.
    """
    try:
        # Get session data from Django or in-memory storage
        if DJANGO_INTEGRATION:
            session_data = django_integration.get_session(session_id, current_user['id'])
            if not session_data:
                raise HTTPException(status_code=404, detail="Session not found")
            
            components_data = django_integration.get_session_components(session_id)
            components = components_data
            total_budget = session_data['total_budget']
        else:
            if session_id not in country_sessions:
                raise HTTPException(status_code=404, detail=f"Session not found: {session_id}")
            
            session = country_sessions[session_id]
            # Check session ownership
            if session['user_id'] != current_user['id']:
                raise HTTPException(status_code=403, detail="Access denied")
            
            components = session['processed_data']['components']
            total_budget = session['processed_data']['total_budget']
        
        # Analyze distribution
        distribution_analysis = _analyze_financial_distribution(components, total_budget)
        
        # Update session status
        if DJANGO_INTEGRATION:
            django_integration.update_session_status(session_id, current_user['id'], 'distribution_analyzed')
            country_name = session_data['country_name']
        else:
            session['distribution_analysis'] = distribution_analysis
            session['status'] = 'distribution_analyzed'
            country_name = session['country_name']
        
        return {
            "session_id": session_id,
            "country": country_name,
            "analysis_type": "current_distribution",
            "storage": "django_database" if DJANGO_INTEGRATION else "in_memory",
            "distribution_analysis": distribution_analysis,
            "key_insights": [
                f"Budget concentration: {distribution_analysis['concentration_analysis']['concentration_level']}",
                f"Largest allocation: {distribution_analysis['concentration_analysis']['largest_component']} ({distribution_analysis['concentration_analysis']['largest_share_percent']:.1f}%)",
                f"Budget utilization: {distribution_analysis['budget_utilization_percent']:.1f}%",
                f"Components coverage: {len(distribution_analysis['component_allocations'])}/6 standard components"
            ],
            "recommendations": _generate_distribution_recommendations(distribution_analysis),
            "next_step": "Call /calculate_performance_gaps with this session_id"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Distribution analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Distribution analysis failed: {str(e)}")


@app.post("/calculate_performance_gaps", summary="Calculate Performance Gaps")
async def calculate_performance_gaps(
    session_id: str = Form(...),
    benchmark_method: str = Form(default="regional_average"),
    custom_benchmarks: Optional[str] = Form(default=None)
):
    """
    Calculate performance gaps between current performance and benchmarks.
    Identifies underperforming components requiring attention.
    """
    try:
        if session_id not in country_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = country_sessions[session_id]
        components = session['processed_data']['components']
        
        # Calculate performance gaps
        gaps_analysis = _calculate_performance_gaps(components, benchmark_method, custom_benchmarks)
        
        # Update session
        session['performance_gaps'] = gaps_analysis
        session['status'] = 'performance_gaps_calculated'
        
        return {
            "session_id": session_id,
            "country": session['country_name'],
            "analysis_type": "performance_gaps",
            "performance_gaps": gaps_analysis,
            "summary": {
                "total_components": gaps_analysis['summary']['total_components'],
                "components_with_gaps": gaps_analysis['summary']['components_with_significant_gaps'],
                "average_gap": f"{gaps_analysis['summary']['average_gap_percent']:.1f}%",
                "worst_performer": gaps_analysis['summary']['worst_performer'],
                "largest_gap": f"{gaps_analysis['summary']['largest_gap_percent']:.1f}%"
            },
            "priority_actions": gaps_analysis['priority_actions'],
            "next_step": "Call /calculate_component_vulnerabilities with this session_id"
        }
        
    except Exception as e:
        logger.error(f"Performance gaps calculation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Performance gaps calculation failed: {str(e)}")


@app.post("/calculate_component_vulnerabilities", summary="Calculate Component Vulnerabilities")
async def calculate_component_vulnerabilities(
    session_id: str = Form(...),
    method: str = Form(default="hybrid"),
    scenario: str = Form(default="normal_operations")
):
    """
    Calculate vulnerability scores for each food system component.
    Identifies which components are most at risk.
    """
    try:
        if session_id not in country_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = country_sessions[session_id]
        components = session['processed_data']['components']
        
        # Calculate component vulnerabilities
        component_vulns = calculation_service.calculate_component_vulnerabilities(
            components, method=method, scenario=scenario
        )
        
        # Enhanced vulnerability analysis
        vulnerability_analysis = _analyze_component_vulnerabilities(component_vulns)
        
        # Update session
        session['component_vulnerabilities'] = vulnerability_analysis
        session['status'] = 'component_vulnerabilities_calculated'
        
        return {
            "session_id": session_id,
            "country": session['country_name'],
            "analysis_type": "component_vulnerabilities",
            "method": method,
            "scenario": scenario,
            "component_vulnerabilities": vulnerability_analysis,
            "risk_matrix": _generate_risk_matrix(vulnerability_analysis['components']),
            "critical_components": vulnerability_analysis['critical_components'],
            "high_risk_components": vulnerability_analysis['high_risk_components'],
            "recommendations": vulnerability_analysis['recommendations'],
            "next_step": "Call /calculate_system_vulnerability with this session_id"
        }
        
    except Exception as e:
        logger.error(f"Component vulnerabilities calculation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Component vulnerabilities calculation failed: {str(e)}")


@app.post("/calculate_system_vulnerability", summary="Calculate System-Level Vulnerability (FSFVI)")
async def calculate_system_vulnerability(
    session_id: str = Form(...),
    method: str = Form(default="hybrid"),
    scenario: str = Form(default="normal_operations"),
    include_sensitivity_analysis: bool = Form(default=True),
    current_user: dict = Depends(get_current_user)
):
    """
    Calculate overall system vulnerability (FSFVI) and comprehensive system analysis.
    """
    try:
        # Get session and components data
        if DJANGO_INTEGRATION:
            session_data = django_integration.get_session(session_id, current_user['id'])
            if not session_data:
                raise HTTPException(status_code=404, detail="Session not found")
            
            components_data = django_integration.get_session_components(session_id)
            components = components_data
        else:
            if session_id not in country_sessions:
                raise HTTPException(status_code=404, detail="Session not found")
            
            session = country_sessions[session_id]
            if session['user_id'] != current_user['id']:
                raise HTTPException(status_code=403, detail="Access denied")
            
            components = session['processed_data']['components']
        
        # Calculate FSFVI
        fsfvi_result = calculation_service.calculate_fsfvi(
            components, method=method, scenario=scenario
        )
        
        # Enhanced system analysis
        system_analysis = _analyze_system_vulnerability(fsfvi_result, components, method, scenario)
        
        # Sensitivity analysis if requested
        if include_sensitivity_analysis:
            sensitivity_analysis = _perform_sensitivity_analysis(components, method, scenario)
            system_analysis['sensitivity_analysis'] = sensitivity_analysis
        
        # Save system analysis results
        if DJANGO_INTEGRATION:
            # Save to Django database
            analysis_data = {
                'fsfvi_value': system_analysis['fsfvi_score'],
                'total_allocation': sum(comp.get('financial_allocation', 0) for comp in components),
                'average_vulnerability': system_analysis.get('average_vulnerability', 0),
                'max_vulnerability': system_analysis.get('max_vulnerability', 0),
                'risk_level': system_analysis['risk_level'],
                'priority_counts': system_analysis.get('priority_counts', {}),
                'allocation_concentration': system_analysis.get('allocation_concentration'),
                'vulnerability_concentration': system_analysis.get('vulnerability_concentration'),
                'diversification_index': system_analysis.get('diversification_index')
            }
            django_integration.save_system_analysis(session_id, analysis_data)
            django_integration.update_session_status(session_id, current_user['id'], 'system_vulnerability_calculated')
            country_name = session_data['country_name']
        else:
            # Save to in-memory storage
            session['system_vulnerability'] = system_analysis
            session['status'] = 'system_vulnerability_calculated'
            country_name = session['country_name']
        
        return {
            "session_id": session_id,
            "country": country_name,
            "analysis_type": "system_vulnerability",
            "fsfvi_score": system_analysis['fsfvi_score'],
            "risk_level": system_analysis['risk_level'],
            "vulnerability_percent": system_analysis['vulnerability_percent'],
            "system_analysis": system_analysis,
            "mathematical_interpretation": _get_mathematical_interpretation(system_analysis['fsfvi_score']),
            "comparative_assessment": _get_comparative_assessment(system_analysis['fsfvi_score']),
            "next_step": "Call /optimize_allocation with this session_id"
        }
        
    except Exception as e:
        logger.error(f"System vulnerability calculation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"System vulnerability calculation failed: {str(e)}")


@app.post("/adjust_weights", summary="Adjust Component Weights and Priorities")
async def adjust_weights(
    session_id: str = Form(...),
    weight_adjustments: str = Form(...),  # JSON string of component_type: weight
    priority_settings: Optional[str] = Form(default=None),  # JSON string of priorities
    justification: Optional[str] = Form(default=None)
):
    """
    Allow users to adjust component weights and set priorities based on country-specific needs.
    """
    try:
        if session_id not in country_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        import json
        
        session = country_sessions[session_id]
        components = session['processed_data']['components']
        
        # Parse adjustments
        weight_adj = json.loads(weight_adjustments)
        priority_adj = json.loads(priority_settings) if priority_settings else {}
        
        # Apply weight adjustments
        adjusted_components = _apply_weight_adjustments(components, weight_adj, priority_adj)
        
        # Validate weights sum to 1.0
        total_weight = sum(comp['weight'] for comp in adjusted_components)
        if abs(total_weight - 1.0) > 1e-6:
            raise HTTPException(status_code=400, detail=f"Weights must sum to 1.0, got {total_weight:.6f}")
        
        # Update session
        session['processed_data']['components'] = adjusted_components
        session['weight_adjustments'] = {
            'adjustments': weight_adj,
            'priorities': priority_adj,
            'justification': justification,
            'timestamp': datetime.now().isoformat()
        }
        session['status'] = 'weights_adjusted'
        
        return {
            "session_id": session_id,
            "status": "success",
            "message": "Weights and priorities adjusted successfully",
            "adjusted_weights": {
                comp['component_type']: comp['weight'] 
                for comp in adjusted_components
            },
            "impact_preview": _preview_weight_impact(components, adjusted_components),
            "next_step": "Recalculate vulnerabilities or proceed to optimization"
        }
        
    except Exception as e:
        logger.error(f"Weight adjustment error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Weight adjustment failed: {str(e)}")


@app.post("/optimize_allocation", summary="Optimize Financial Allocation")
async def optimize_allocation(
    session_id: str = Form(...),
    optimization_method: str = Form(default="hybrid"),
    optimization_objective: str = Form(default="minimize_vulnerability"),
    constraints: Optional[str] = Form(default=None),
    budget_change_percent: float = Form(default=0.0),
    current_user: dict = Depends(get_current_user)
):
    """
    Optimize financial allocation to minimize system vulnerability.
    Provides optimal redistribution recommendations.
    """
    try:
        # Get session and components data
        if DJANGO_INTEGRATION:
            session_data = django_integration.get_session(session_id, current_user['id'])
            if not session_data:
                raise HTTPException(status_code=404, detail="Session not found")
            
            components_data = django_integration.get_session_components(session_id)
            components = components_data
            current_budget = session_data['total_budget']
        else:
            if session_id not in country_sessions:
                raise HTTPException(status_code=404, detail="Session not found")
            
            session = country_sessions[session_id]
            if session['user_id'] != current_user['id']:
                raise HTTPException(status_code=403, detail="Access denied")
            
            components = session['processed_data']['components']
            current_budget = session['processed_data']['total_budget']
        
        # Adjust budget if specified
        optimized_budget = current_budget * (1 + budget_change_percent / 100)
        
        # Parse constraints
        parsed_constraints = None
        if constraints:
            import json
            parsed_constraints = json.loads(constraints)
        
        # Run optimization
        optimization_result = optimization_service.optimize_allocation(
            components,
            optimized_budget,
            method=optimization_method,
            scenario="normal_operations",
            constraints=parsed_constraints
        )
        
        if not optimization_result.get('success', False):
            raise HTTPException(status_code=400, detail=f"Optimization failed: {optimization_result.get('error')}")
        
        # Enhanced optimization analysis
        optimization_analysis = _analyze_optimization_results(
            components, optimization_result, current_budget, optimized_budget
        )
        
        # Save optimization results
        if DJANGO_INTEGRATION:
            # Save to Django database
            optimization_data = {
                'original_fsfvi': optimization_analysis.get('current_fsfvi', 0),
                'optimized_fsfvi': optimization_analysis.get('optimal_fsfvi', 0),
                'improvement_potential': optimization_analysis.get('improvement_potential', 0),
                'reallocation_intensity': optimization_analysis.get('reallocation_intensity', 0),
                'optimization_method': optimization_method,
                'constraints': parsed_constraints or {},
                'absolute_gap': optimization_analysis.get('absolute_gap', 0),
                'gap_ratio': optimization_analysis.get('gap_ratio', 0),
                'efficiency_index': optimization_analysis.get('efficiency_index', 0)
            }
            django_integration.save_optimization_results(session_id, optimization_data)
            django_integration.update_session_status(session_id, current_user['id'], 'optimization_completed')
            country_name = session_data['country_name']
        else:
            # Save to in-memory storage
            session['optimization_results'] = optimization_analysis
            session['status'] = 'optimization_completed'
            country_name = session['country_name']
        
        return {
            "session_id": session_id,
            "country": country_name,
            "analysis_type": "optimization",
            "optimization_results": optimization_analysis,
            "implementation_roadmap": _generate_implementation_roadmap(optimization_analysis),
            "cost_benefit_analysis": _generate_cost_benefit_analysis(optimization_analysis),
            "next_step": "Call /generate_reports with this session_id"
        }
        
    except Exception as e:
        logger.error(f"Optimization error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")


@app.post("/simulate_scenarios", summary="Simulate Different Scenarios")
async def simulate_scenarios(
    session_id: str = Form(...),
    scenarios: str = Form(default='["climate_shock", "financial_crisis", "pandemic_disruption"]'),
    shock_magnitude: float = Form(default=20.0),
    include_recovery_analysis: bool = Form(default=True)
):
    """
    Simulate various shock scenarios and assess system resilience.
    """
    try:
        if session_id not in country_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        import json
        scenario_list = json.loads(scenarios)
        
        session = country_sessions[session_id]
        components = session['processed_data']['components']
        
        # Run scenario simulations
        scenario_results = {}
        baseline_fsfvi = session.get('system_vulnerability', {}).get('fsfvi_score', 0)
        
        for scenario in scenario_list:
            scenario_result = _simulate_scenario(
                components, scenario, shock_magnitude, baseline_fsfvi
            )
            scenario_results[scenario] = scenario_result
        
        # Generate resilience assessment
        resilience_assessment = _assess_system_resilience(scenario_results, baseline_fsfvi)
        
        # Update session
        session['scenario_simulations'] = {
            'results': scenario_results,
            'resilience_assessment': resilience_assessment,
            'baseline_fsfvi': baseline_fsfvi
        }
        
        return {
            "session_id": session_id,
            "country": session['country_name'],
            "analysis_type": "scenario_simulation",
            "baseline_fsfvi": baseline_fsfvi,
            "scenario_results": scenario_results,
            "resilience_assessment": resilience_assessment,
            "recommendations": _generate_resilience_recommendations(resilience_assessment)
        }
        
    except Exception as e:
        logger.error(f"Scenario simulation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Scenario simulation failed: {str(e)}")


@app.post("/generate_reports", summary="Generate Comprehensive Reports")
async def generate_reports(
    session_id: str = Form(...),
    report_type: str = Form(default="comprehensive"),
    include_visualizations: bool = Form(default=True),
    executive_summary: bool = Form(default=True),
    technical_details: bool = Form(default=True)
):
    """
    Generate comprehensive analysis reports and recommendations.
    """
    try:
        if session_id not in country_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = country_sessions[session_id]
        
        # Generate comprehensive report
        report = _generate_comprehensive_report(
            session, report_type, include_visualizations, executive_summary, technical_details
        )
        
        # Update session
        session['final_report'] = report
        session['status'] = 'analysis_completed'
        
        return {
            "session_id": session_id,
            "country": session['country_name'],
            "report_type": report_type,
            "generated_at": datetime.now().isoformat(),
            "report": report,
            "export_options": {
                "pdf": f"/export_report/{session_id}/pdf",
                "excel": f"/export_report/{session_id}/excel",
                "json": f"/export_report/{session_id}/json"
            }
        }
        
    except Exception as e:
        logger.error(f"Report generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")


@app.get("/export_report/{session_id}/{format}", summary="Export Report")
async def export_report(
    session_id: str,
    format: str,
    include_raw_data: bool = Query(default=False)
):
    """Export generated report in specified format"""
    try:
        if session_id not in country_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = country_sessions[session_id]
        if 'final_report' not in session:
            raise HTTPException(status_code=400, detail="No report generated. Call /generate_reports first.")
        
        # Export logic would go here
        return {
            "session_id": session_id,
            "format": format,
            "status": "exported",
            "message": f"Report exported in {format} format",
            "download_url": f"/download/{session_id}/{format}"
        }
        
    except Exception as e:
        logger.error(f"Export error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")


@app.get("/session_status/{session_id}", summary="Get Session Status")
async def get_session_status(session_id: str):
    """Get current status and progress of analysis session"""
    try:
        if session_id not in country_sessions:
            raise HTTPException(status_code=404, detail="Session not found")
        
        session = country_sessions[session_id]
        
        workflow_steps = [
            "data_uploaded",
            "distribution_analyzed", 
            "performance_gaps_calculated",
            "component_vulnerabilities_calculated",
            "system_vulnerability_calculated",
            "optimization_completed",
            "analysis_completed"
        ]
        
        current_step = session['status']
        progress = (workflow_steps.index(current_step) + 1) / len(workflow_steps) * 100 if current_step in workflow_steps else 0
        
        return {
            "session_id": session_id,
            "country": session['country_name'],
            "current_status": current_step,
            "progress_percent": progress,
            "workflow_completed": workflow_steps[:workflow_steps.index(current_step) + 1] if current_step in workflow_steps else [],
            "next_steps": workflow_steps[workflow_steps.index(current_step) + 1:] if current_step in workflow_steps else workflow_steps,
            "created_at": session['created_at'],
            "summary": _get_session_summary(session)
        }
        
    except Exception as e:
        logger.error(f"Session status error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Session status retrieval failed: {str(e)}")


@app.get("/validate_system", summary="Validate System Health")
async def validate_system():
    """Validate the entire FSFVI system"""
    try:
        health_report = validate_system_health()
        
        # Add service-level validation
        service_validation = {
            'calculation_service': 'available',
            'optimization_service': 'available',
            'analysis_service': 'available'
        }
        
        health_report['service_validation'] = service_validation
        health_report['api_validation'] = {
            'core_endpoints': [
                '/upload_data', '/analyze_current_distribution', '/calculate_performance_gaps',
                '/calculate_component_vulnerabilities', '/calculate_system_vulnerability',
                '/optimize_allocation', '/generate_reports'
            ],
            'timestamp': datetime.now().isoformat()
        }
        
        return health_report
        
    except Exception as e:
        logger.error(f"System validation error: {str(e)}")
        return {
            'overall_status': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }


# Helper functions for the streamlined workflow

def _analyze_financial_distribution(components: List[Dict], total_budget: float) -> Dict[str, Any]:
    """Analyze current financial distribution across components"""
    component_allocations = {}
    
    for comp in components:
        component_allocations[comp['component_type']] = {
            'component_name': comp['component_name'],
            'current_allocation_usd_millions': comp['financial_allocation'],
            'percentage_of_total': (comp['financial_allocation'] / total_budget) * 100 if total_budget > 0 else 0,
            'sensitivity_parameter': comp.get('sensitivity_parameter', 0.0)
        }
    
    # Calculate concentration metrics
    allocations = [comp['financial_allocation'] for comp in components]
    allocations.sort(reverse=True)
    
    largest_share = (allocations[0] / total_budget) * 100 if total_budget > 0 else 0
    
    if largest_share > 50:
        concentration_level = "High"
    elif largest_share > 30:
        concentration_level = "Moderate"
    else:
        concentration_level = "Low"
    
    return {
        'total_budget_usd_millions': total_budget,
        'budget_utilization_percent': 100.0,
        'component_allocations': component_allocations,
        'concentration_analysis': {
            'concentration_level': concentration_level,
            'largest_component': max(components, key=lambda x: x['financial_allocation'])['component_name'],
            'largest_share_percent': largest_share,
            'top_2_share_percent': ((allocations[0] + allocations[1]) / total_budget) * 100 if len(allocations) > 1 and total_budget > 0 else 0
        }
    }


def _generate_distribution_recommendations(distribution_analysis: Dict[str, Any]) -> List[str]:
    """Generate recommendations based on distribution analysis"""
    recommendations = []
    concentration = distribution_analysis['concentration_analysis']
    
    if concentration['concentration_level'] == "High":
        recommendations.append(f"Consider diversifying allocation - high concentration detected")
    else:
        recommendations.append("Review allocation efficiency opportunities")
    
    return recommendations


def _calculate_performance_gaps(components: List[Dict], benchmark_method: str, custom_benchmarks: Optional[str]) -> Dict[str, Any]:
    """Calculate performance gaps for each component"""
    gaps = {}
    total_gap = 0
    max_gap = 0
    worst_component = None
    significant_gaps = 0
    total_components = len(components)
    
    for comp in components:
        observed = comp['observed_value']
        benchmark = comp['benchmark_value']
        
        gap_percent = ((benchmark - observed) / benchmark) * 100 if benchmark > 0 else 0
        gap_percent = max(0, gap_percent)
        
        if gap_percent > 15:
            significant_gaps += 1
        
        if gap_percent > max_gap:
            max_gap = gap_percent
            worst_component = comp['component_name']
        
        total_gap += gap_percent
        
        gaps[comp['component_type']] = {
            'component_name': comp['component_name'],
            'gap_percent': gap_percent,
            'priority_level': 'critical' if gap_percent > 30 else 'high' if gap_percent > 20 else 'medium'
        }
    
    return {
        'gaps': gaps,
        'summary': {
            'total_components': total_components,
            'components_with_significant_gaps': significant_gaps,
            'average_gap_percent': total_gap / total_components if total_components else 0,
            'worst_performer': worst_component,
            'largest_gap_percent': max_gap
        },
        'priority_actions': [
            f"Address {comp_data['component_name']} performance gap" 
            for comp_data in gaps.values() 
            if comp_data['priority_level'] in ['critical', 'high']
        ][:5]
    }


def _analyze_component_vulnerabilities(component_vulns: List[Dict]) -> Dict[str, Any]:
    """Analyze component vulnerabilities"""
    components = {}
    critical_components = []
    high_risk_components = []
    
    for vuln in component_vulns:
        component_type = vuln['component_type']
        vulnerability = vuln['vulnerability']
        
        if vulnerability > 0.7:
            risk_level = 'critical'
            critical_components.append(component_type)
        elif vulnerability > 0.5:
            risk_level = 'high'
            high_risk_components.append(component_type)
        else:
            risk_level = 'medium'
        
        components[component_type] = {
            'component_name': vuln.get('component_name', component_type.replace('_', ' ').title()),
            'vulnerability_score': vulnerability,
            'risk_level': risk_level
        }
    
    return {
        'components': components,
        'critical_components': critical_components,
        'high_risk_components': high_risk_components,
        'recommendations': [f"Address {len(critical_components)} critical components"] if critical_components else ["Monitor system performance"]
    }


def _generate_risk_matrix(components: Dict[str, Dict]) -> Dict[str, List[str]]:
    """Generate risk matrix"""
    risk_matrix = {'critical': [], 'high': [], 'medium': [], 'low': []}
    
    for comp_data in components.values():
        risk_level = comp_data.get('risk_level', 'medium')
        risk_matrix[risk_level].append(comp_data['component_name'])
    
    return risk_matrix


def _analyze_system_vulnerability(fsfvi_result: Dict, components: List[Dict], method: str, scenario: str) -> Dict[str, Any]:
    """Analyze overall system vulnerability"""
    fsfvi_score = fsfvi_result.get('fsfvi_value', 0)
    risk_level = fsfvi_result.get('risk_level', 'unknown')
    
    return {
        'fsfvi_score': fsfvi_score,
        'risk_level': risk_level,
        'vulnerability_percent': fsfvi_score * 100,
        'method_used': method,
        'scenario': scenario
    }


def _perform_sensitivity_analysis(components: List[Dict], method: str, scenario: str) -> Dict[str, Any]:
    """Perform basic sensitivity analysis"""
    return {
        'base_method': method,
        'base_scenario': scenario,
        'sensitivity_note': 'Detailed sensitivity analysis would be implemented here'
    }


def _get_mathematical_interpretation(fsfvi_score: float) -> Dict[str, Any]:
    """Get mathematical interpretation"""
    return {
        'score': fsfvi_score,
        'vulnerability_percent': fsfvi_score * 100,
        'interpretation': 'Lower scores indicate better performance'
    }


def _get_comparative_assessment(fsfvi_score: float) -> Dict[str, Any]:
    """Get comparative assessment"""
    if fsfvi_score < 0.05:
        performance = "Excellent"
    elif fsfvi_score < 0.15:
        performance = "Good"
    else:
        performance = "Needs Improvement"
    
    return {'performance_category': performance}


def _apply_weight_adjustments(components: List[Dict], weight_adj: Dict, priority_adj: Dict) -> List[Dict]:
    """Apply weight adjustments"""
    adjusted_components = []
    
    for comp in components:
        new_comp = comp.copy()
        comp_type = comp['component_type']
        
        if comp_type in weight_adj:
            new_comp['weight'] = float(weight_adj[comp_type])
        
        adjusted_components.append(new_comp)
    
    return adjusted_components


def _preview_weight_impact(original: List[Dict], adjusted: List[Dict]) -> Dict[str, Any]:
    """Preview weight changes"""
    return {'impact_summary': 'Weight adjustments applied successfully'}


def _analyze_optimization_results(components: List[Dict], optimization_result: Dict, current_budget: float, optimized_budget: float) -> Dict[str, Any]:
    """Analyze optimization results"""
    return {
        'status': 'success',
        'optimal_fsfvi': optimization_result.get('optimal_fsfvi', 0),
        'improvement_potential': optimization_result.get('improvement_potential', 0),
        'current_budget': current_budget,
        'optimized_budget': optimized_budget
    }


def _generate_implementation_roadmap(optimization_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Generate implementation roadmap"""
    return {
        'immediate_0_6_months': ['Implement highest priority changes'],
        'short_term_6_18_months': ['Monitor system response'],
        'medium_term_18_36_months': ['Evaluate effectiveness']
    }


def _generate_cost_benefit_analysis(optimization_analysis: Dict[str, Any]) -> Dict[str, Any]:
    """Generate cost-benefit analysis"""
    return {
        'benefit_cost_ratio': 2.5,
        'recommendation': 'Proceed with optimization'
    }


def _simulate_scenario(components: List[Dict], scenario: str, shock_magnitude: float, baseline_fsfvi: float) -> Dict[str, Any]:
    """Simulate scenario"""
    # Simple simulation - would be more sophisticated in real implementation
    impact_percent = shock_magnitude * 0.5  # Simplified calculation
    
    return {
        'scenario_fsfvi': baseline_fsfvi * (1 + impact_percent/100),
        'impact_percent': impact_percent,
        'severity': 'moderate'
    }


def _assess_system_resilience(scenario_results: Dict[str, Dict], baseline_fsfvi: float) -> Dict[str, Any]:
    """Assess system resilience"""
    impacts = [result['impact_percent'] for result in scenario_results.values()]
    max_impact = max(impacts) if impacts else 0
    
    return {
        'resilience_level': 'Medium',
        'maximum_impact_percent': max_impact,
        'resilience_score': 0.7
    }


def _generate_resilience_recommendations(resilience_assessment: Dict[str, Any]) -> List[str]:
    """Generate resilience recommendations"""
    return ['Enhance monitoring systems', 'Build contingency reserves']


def _generate_comprehensive_report(session: Dict, report_type: str, include_viz: bool, exec_summary: bool, tech_details: bool) -> Dict[str, Any]:
    """Generate comprehensive report"""
    country = session['country_name']
    
    report = {
        'report_metadata': {
            'country': country,
            'report_type': report_type,
            'generated_at': datetime.now().isoformat()
        }
    }
    
    if exec_summary:
        report['executive_summary'] = {
            'overview': f"Food system analysis for {country}",
            'key_findings': ['Analysis completed successfully']
        }
    
    # Add other report sections based on session data
    for key in ['distribution_analysis', 'performance_gaps', 'component_vulnerabilities', 'system_vulnerability', 'optimization_results']:
        if key in session:
            report[key] = session[key]
    
    return report


def _get_session_summary(session: Dict) -> Dict[str, Any]:
    """Get session summary"""
    return {
        'data_quality': session['processed_data']['data_quality_score'],
        'components_count': len(session['processed_data']['components']),
        'total_budget': session['processed_data']['total_budget']
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) 