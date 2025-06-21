"""
FSFVI Analysis Service - Food System Financing Vulnerability Analysis
=====================================================================

FastAPI service focused on high-performance FSFVI analysis and optimization.
Handles data processing, vulnerability calculations, and recommendations.
Authentication is managed by Django backend (port 8000).

STREAMLINED ARCHITECTURE:
- API Layer (this file): HTTP endpoints only, no business logic
- Service Layer: All business logic and orchestration
- Core Layer: Pure mathematical functions
- Integration Layer: Database and external services
"""

from fastapi import FastAPI, HTTPException, Query, UploadFile, File, Form, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Dict, Optional, Any
import logging
from datetime import datetime
import uuid
import requests
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Import service layer and schemas - SINGLE SOURCE OF TRUTH
from fsfvi_service import create_fsfvi_services
from schemas import FSFVIRequest, FSFVIResponse, OptimizationResult, OptimizationConstraints
from exceptions import FSFVIException, ValidationError, OptimizationError, CalculationError
from config import get_weighting_methods, get_scenarios
from validators import validate_system_health

# Import Django integration
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'django_app'))
try:
    from fsfvi.django_integration import django_integration
    DJANGO_INTEGRATION = True
    print("✅ Django integration loaded successfully")
except ImportError as e:
    print(f"⚠️ Django integration not available: {e}")
    DJANGO_INTEGRATION = False

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="FSFVI Analysis Service",
    description="Streamlined FSFVI Analysis API - All business logic in service layer",
    version="3.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Initialize services - SINGLE POINT OF INITIALIZATION
calculation_service, optimization_service, analysis_service = create_fsfvi_services()

# Thread pool for Django operations
thread_pool = ThreadPoolExecutor(max_workers=4)

async def run_django_operation(operation, *args, **kwargs):
    """Run Django ORM operation in thread pool"""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(thread_pool, operation, *args, **kwargs)

# Authentication dependency
async def get_current_user(authorization: HTTPAuthorizationCredentials = Depends(security)):
    """Validate token with Django backend"""
    token = authorization.credentials
    
    try:
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


# ============================================================================
# STREAMLINED API ENDPOINTS - NO BUSINESS LOGIC, ONLY HTTP CONCERNS
# ============================================================================

@app.get("/", summary="API Health Check")
async def root():
    """API health check and system overview"""
    return {
        "message": "Streamlined FSFVI Analysis API v3.1",
        "status": "operational",
        "architecture": "streamlined_single_responsibility",
        "django_integration": DJANGO_INTEGRATION,
        "workflow": [
            "1. Authenticate via Django (http://localhost:8000/auth/)",
            "2. Upload Data (/upload_data)",
            "3. Run Individual Analysis Steps:",
            "   - Analyze Current Distribution (/analyze_current_distribution)",
            "   - Calculate Performance Gaps (/calculate_performance_gaps)",
            "   - Calculate Component Vulnerabilities (/calculate_component_vulnerabilities)",
            "   - Calculate System Vulnerability (/calculate_system_vulnerability)",
            "4. OR Run Complete Analysis (/analyze_system)",
            "5. Optimize Allocation (/optimize_allocation)",
            "6. Generate Reports (/generate_reports)"
        ],
        "features": {
            "streamlined_architecture": "Business logic in service layer only",
            "weighting_methods": get_weighting_methods(),
            "scenarios": get_scenarios(),
            "django_integration": DJANGO_INTEGRATION
        }
    }


@app.post("/upload_data", summary="Upload and Process Food System Data")
async def upload_data(
    file: UploadFile = File(...),
    country_name: str = Form(...),
    fiscal_year: int = Form(default=2024),
    currency: str = Form(default="USD"),
    budget_unit: str = Form(default="millions"),
    current_user: dict = Depends(get_current_user)
):
    """Upload and process food system data - DELEGATES TO SERVICE LAYER"""
    try:
        # Read file content
        content = await file.read()
        
        # Delegate to service layer for ALL business logic
        if DJANGO_INTEGRATION:
            # Use Django integration service
            from fsfvi.data_processing_service import data_processing_service
            from django.contrib.auth.models import User
            
            user = User.objects.get(id=current_user['id'])
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
                    "data_summary": result['summary'],
                    "components": result['components'],
                    "next_step": "Call /analyze_system with this session_id"
                }
            else:
                raise HTTPException(status_code=400, detail=result['error'])
        else:
            # Delegate to analysis service for fallback processing
            result = await analysis_service.process_uploaded_data(
                content, file.filename, country_name, fiscal_year, currency, budget_unit, current_user['id']
            )
            return result
            
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@app.post("/analyze_system", summary="Complete System Analysis")
async def analyze_system(
    session_id: str = Form(...),
    method: str = Form(default="hybrid"),
    scenario: str = Form(default="normal_operations"),
    include_optimization_preview: bool = Form(default=True),
    current_user: dict = Depends(get_current_user)
):
    """
    Perform complete system analysis including:
    - Current distribution analysis
    - Performance gaps calculation  
    - Component vulnerabilities
    - System-level FSFVI
    - Optimization preview
    
    DELEGATES ALL LOGIC TO SERVICE LAYER
    """
    try:
        # Get session data
        session_data = await _get_session_data(session_id, current_user['id'])
        components = await _get_session_components(session_id)
        
        # Delegate COMPLETE analysis to service layer
        analysis_result = analysis_service.comprehensive_system_analysis(
            components=components,
            session_data=session_data,
            method=method,
            scenario=scenario,
            include_optimization_preview=include_optimization_preview
        )
        
        # Update session status
        await _update_session_status(session_id, current_user['id'], 'system_analyzed')
        
        # Structure system vulnerability data consistently  
        # Update session_data with corrected total_budget if needed
        if analysis_result.get('total_budget', 0) > 0:
            session_data = {**session_data, 'total_budget': analysis_result['total_budget']}
        
        system_vulnerability_data = _structure_system_vulnerability_response(
            analysis_result['system_fsfvi'], session_data, session_id
        ) if analysis_result.get('system_fsfvi') else {}
        
        return {
            "session_id": session_id,
            "country": session_data.get('country_name', 'Unknown'),
            "analysis_type": "comprehensive_system_analysis",
            "timestamp": datetime.now().isoformat(),
            "next_step": "Call /optimize_allocation for detailed optimization",
            
            # Core analysis results
            "performance_gaps": analysis_result.get('performance_gaps'),
            "component_vulnerabilities": analysis_result.get('enhanced_component_vulnerabilities'),
            "distribution_analysis": analysis_result.get('distribution_analysis'),
            "optimization_preview": analysis_result.get('optimization_preview'),
            
            # Structured system vulnerability data
            **system_vulnerability_data
        }
        
    except Exception as e:
        logger.error(f"System analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"System analysis failed: {str(e)}")


@app.post("/optimize_allocation", summary="Optimize Resource Allocation")
async def optimize_allocation(
    session_id: str = Form(...),
    method: str = Form(default="hybrid"),
    budget_change_percent: float = Form(default=0.0),
    constraints: Optional[str] = Form(default=None),
    current_user: dict = Depends(get_current_user)
):
    """Optimize financial allocation - DELEGATES TO SERVICE LAYER"""
    try:
        # Get session data
        session_data = await _get_session_data(session_id, current_user['id'])
        components = await _get_session_components(session_id)
        
        # Parse constraints
        parsed_constraints = None
        if constraints:
            import json
            parsed_constraints = json.loads(constraints)
        
        # Calculate optimized budget
        current_budget = session_data['total_budget']
        optimized_budget = current_budget * (1 + budget_change_percent / 100)
        
        # Delegate ALL optimization logic to service layer
        optimization_result = optimization_service.optimize_allocation(
            components=components,
            budget=optimized_budget,
            method=method,
            scenario="normal_operations",
            constraints=parsed_constraints
        )
        
        # Save results
        await _save_optimization_results(session_id, optimization_result)
        await _update_session_status(session_id, current_user['id'], 'optimization_completed')
        
        return {
            "session_id": session_id,
            "country": session_data['country_name'],
            "optimization_results": optimization_result,
            "next_step": "Call /generate_reports for comprehensive reporting"
        }
        
    except Exception as e:
        logger.error(f"Optimization error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")


@app.post("/analyze_current_distribution", summary="Analyze Current Distribution Only")
async def analyze_current_distribution(
    session_id: str = Form(...),
    include_visualizations: bool = Form(default=True),
    current_user: dict = Depends(get_current_user)
):
    """Analyze current budget distribution only - DEDICATED ENDPOINT"""
    try:
        # Get session data
        session_data = await _get_session_data(session_id, current_user['id'])
        components = await _get_session_components(session_id)
        
        # Delegate to analysis service for distribution analysis
        distribution_analysis = analysis_service._analyze_current_distribution(
            components, session_data.get('total_budget', 0)
        )
        
        # Update session status
        await _update_session_status(session_id, current_user['id'], 'distribution_analyzed')
        
        return {
            "session_id": session_id,
            "country": session_data.get('country_name', 'Unknown'),
            "analysis_type": "current_distribution",
            "timestamp": datetime.now().isoformat(),
            "distribution_analysis": distribution_analysis,
            "key_insights": [
                f"Total budget: ${distribution_analysis.get('total_budget_usd_millions', 0):.1f}M",
                f"Budget utilization: {distribution_analysis.get('budget_utilization_percent', 0):.1f}%",
                f"Largest allocation: {distribution_analysis.get('largest_allocation', 'N/A')}",
                f"Allocation concentration: {distribution_analysis.get('allocation_concentration', {}).get('concentration_level', 'Unknown')}"
            ],
            "recommendations": [
                "Review allocation patterns for optimization opportunities",
                "Consider rebalancing if concentration is too high",
                "Ensure budget utilization is maximized"
            ],
            "next_step": "Calculate performance gaps to identify improvement areas"
        }
        
    except Exception as e:
        logger.error(f"Distribution analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Distribution analysis failed: {str(e)}")


@app.post("/calculate_performance_gaps", summary="Calculate Performance Gaps Only")
async def calculate_performance_gaps(
    session_id: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    """Calculate performance gaps only - DEDICATED ENDPOINT"""
    try:
        # Get session data
        session_data = await _get_session_data(session_id, current_user['id'])
        components = await _get_session_components(session_id)
        
        # Delegate to analysis service for performance gaps calculation
        performance_gaps = analysis_service._calculate_performance_gaps_analysis(components)
        
        # Update session status
        await _update_session_status(session_id, current_user['id'], 'performance_gaps_calculated')
        
        return {
            "session_id": session_id,
            "country": session_data.get('country_name', 'Unknown'),
            "analysis_type": "performance_gaps",
            "timestamp": datetime.now().isoformat(),
            # Return the complete performance gaps structure expected by PerformanceGapAnalysis
            **performance_gaps
        }
        
    except Exception as e:
        logger.error(f"Performance gaps calculation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Performance gaps calculation failed: {str(e)}")


@app.post("/calculate_system_vulnerability", summary="Calculate System FSFVI Only")
async def calculate_system_vulnerability(
    session_id: str = Form(...),
    method: str = Form(default="hybrid"),
    scenario: str = Form(default="normal_operations"),
    current_user: dict = Depends(get_current_user)
):
    """Calculate system-level FSFVI vulnerability - DEDICATED ENDPOINT"""
    try:
        # Get session data
        session_data = await _get_session_data(session_id, current_user['id'])
        components = await _get_session_components(session_id)
        
        # Calculate total budget from components if not in session
        component_budget_sum = sum(comp.get('financial_allocation', 0) for comp in components)
        logger.info(f"Sum of component financial_allocations: ${component_budget_sum:.1f}M")
        
        if session_data.get('total_budget', 0) == 0:
            if component_budget_sum > 0:
                session_data = {**session_data, 'total_budget': component_budget_sum}
                logger.info(f"Updated session with calculated budget: ${component_budget_sum:.1f}M")
            else:
                logger.warning("Both session total_budget and component allocations are zero! Check Django data.")
        
        # Delegate to calculation service for complete system FSFVI calculation
        system_result = calculation_service.calculate_fsfvi(
            components=components,
            method=method,
            scenario=scenario
        )
        
        # Update session status
        await _update_session_status(session_id, current_user['id'], 'system_vulnerability_calculated')
        
        # The calculation service already returns comprehensive results from fsfvi_core
        # Just need to structure them for frontend compatibility
        total_budget = session_data.get('total_budget', 0)
        
        # Extract and structure results for SystemVulnerabilityOverview
        response_data = _structure_system_vulnerability_response(
            system_result, session_data, session_id
        )
        
        return response_data
        
    except Exception as e:
        logger.error(f"System vulnerability calculation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"System vulnerability calculation failed: {str(e)}")


@app.post("/calculate_component_vulnerabilities", summary="Calculate Component Vulnerabilities Only")
async def calculate_component_vulnerabilities(
    session_id: str = Form(...),
    method: str = Form(default="hybrid"),
    scenario: str = Form(default="normal_operations"),
    current_user: dict = Depends(get_current_user)
):
    """Calculate component vulnerabilities only - DEDICATED ENDPOINT"""
    try:
        # Get session data
        session_data = await _get_session_data(session_id, current_user['id'])
        components = await _get_session_components(session_id)
        
        # Delegate to calculation service
        vulnerability_result = calculation_service.calculate_component_vulnerabilities(
            components=components,
            method=method,
            scenario=scenario
        )
        
        # Update session status
        await _update_session_status(session_id, current_user['id'], 'vulnerabilities_calculated')
        
        # Structure the response for ComponentVulnerabilityDetails compatibility
        enhanced_response = {
            'component_vulnerabilities': {
                'components': vulnerability_result.get('vulnerabilities', {}),
                'critical_components': vulnerability_result.get('critical_components', []),
                'high_risk_components': vulnerability_result.get('high_risk_components', []),
                'recommendations': vulnerability_result.get('recommendations', [])
            },
            'summary': vulnerability_result.get('summary', {}),
            'mathematical_context': vulnerability_result.get('mathematical_context', {}),
            'country': session_data.get('country_name', 'Unknown'),
            'analysis_type': 'component_vulnerability_analysis'
        }
        
        return {
            "session_id": session_id,
            "country": session_data.get('country_name', 'Unknown'),
            "vulnerability_analysis": vulnerability_result,
            # Enhanced structure for ComponentVulnerabilityDetails
            **enhanced_response
        }
        
    except Exception as e:
        logger.error(f"Vulnerability calculation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Vulnerability calculation failed: {str(e)}")


@app.post("/generate_reports", summary="Generate Comprehensive Reports")
async def generate_reports(
    session_id: str = Form(...),
    report_type: str = Form(default="comprehensive"),
    include_visualizations: bool = Form(default=True),
    current_user: dict = Depends(get_current_user)
):
    """Generate comprehensive reports - DELEGATES TO SERVICE LAYER"""
    try:
        # Get session data
        session_data = await _get_session_data(session_id, current_user['id'])
        
        # Delegate report generation to analysis service
        report = analysis_service.generate_comprehensive_report(
            session_id=session_id,
            session_data=session_data,
            report_type=report_type,
            include_visualizations=include_visualizations
        )
        
        # Update session status
        await _update_session_status(session_id, current_user['id'], 'reports_generated')
        
        return {
            "session_id": session_id,
            "country": session_data['country_name'],
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


@app.get("/session_status/{session_id}", summary="Get Session Status")
async def get_session_status(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get session status - DELEGATES TO SERVICE LAYER"""
    try:
        # Delegate to analysis service
        status = analysis_service.get_session_status(session_id, current_user['id'])
        return status
        
    except Exception as e:
        logger.error(f"Session status error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Session status retrieval failed: {str(e)}")



@app.get("/validate_system", summary="Validate System Health")
async def validate_system():
    """System health validation - DELEGATES TO VALIDATORS"""
    try:
        health_report = validate_system_health()
        
        # Add API-level validation
        health_report['api_validation'] = {
            'django_integration': DJANGO_INTEGRATION,
            'services_initialized': True,
            'timestamp': datetime.now().isoformat()
        }
        
        # Add sensitivity parameter scaling check
        from fsfvi_core import estimate_sensitivity_parameter
        test_sensitivity = estimate_sensitivity_parameter(
            "agricultural_development", 100.0, 150.0, 1000.0
        )
        health_report['scaling_validation'] = {
            'test_sensitivity_parameter': test_sensitivity,
            'sensitivity_properly_scaled': 0.0001 <= test_sensitivity <= 0.001,
            'scaling_note': 'Sensitivity parameters scaled for financial allocations in millions USD'
        }
        
        return health_report
        
    except Exception as e:
        logger.error(f"System validation error: {str(e)}")
        return {
            'overall_status': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }


@app.get("/explain_sensitivity_parameters", summary="Explain Sensitivity Parameter Estimation")
async def explain_sensitivity_parameters():
    """
    Comprehensive explanation of sensitivity parameter estimation in FSFVI system
    
    This endpoint provides detailed documentation of how sensitivity parameters are calculated,
    their mathematical foundation, and the complete flow through the system.
    """
    return {
        "sensitivity_parameter_system": {
            "overview": "Sensitivity parameters (αᵢ) control diminishing returns in FSFVI vulnerability calculation",
            "mathematical_foundation": {
                "core_formula": "υᵢ(fᵢ) = δᵢ · 1/(1 + αᵢfᵢ)",
                "variables": {
                    "υᵢ": "Component vulnerability [0,1] (dimensionless)",
                    "δᵢ": "Performance gap [0,1] (dimensionless ratio)",
                    "αᵢ": "Sensitivity parameter [1/financial_units]",
                    "fᵢ": "Financial allocation [financial_units, typically millions USD]",
                    "αᵢfᵢ": "Dimensionless financial effectiveness factor"
                },
                "unit_analysis": {
                    "requirement": "αᵢ must have units [1/financial_units] to make αᵢfᵢ dimensionless",
                    "for_millions_usd": "αᵢ ∈ [0.0005, 0.005] produces meaningful vulnerabilities",
                    "scaling_principle": "Higher αᵢ → faster vulnerability reduction with funding"
                }
            },
            "estimation_flow": {
                "step_1": "Component data input (performance values, allocations)",
                "step_2": "Check existing sensitivity parameter (detect old scale > 0.1)",
                "step_3": "Call _ensure_sensitivity_parameter() in fsfvi_service.py",
                "step_4": "Route to _estimate_sensitivity_with_method() based on config",
                "step_5": "Apply configured estimation method (empirical, ml, bayesian, etc.)",
                "step_6": "Apply bounds checking and validation [0.0005, 0.005]",
                "step_7": "Use in vulnerability calculation υᵢ(fᵢ) = δᵢ/(1 + αᵢfᵢ)",
                "step_8": "Aggregate to system FSFVI = Σᵢ ωᵢ·υᵢ(fᵢ)"
            },
            "current_configuration": {
                "primary_method": FSFVI_CONFIG.sensitivity_estimation_method,
                "fallback_method": FSFVI_CONFIG.sensitivity_estimation_fallback,
                "scaling_fixed": "Yes - parameters scaled for millions USD allocations",
                "old_scale_detection": "Automatically detects and replaces old scale values > 0.1"
            }
        },
        "estimation_methods": {
            "hardcoded": {
                "description": "Component-specific base values with adjustments",
                "base_values": {
                    "agricultural_development": 0.0015,
                    "infrastructure": 0.0018,
                    "nutrition_health": 0.0020,
                    "social_assistance": 0.0025,
                    "climate_natural_resources": 0.0008,
                    "governance_institutions": 0.0006
                },
                "adjustments": [
                    "Scale economy bonus for large allocations (>$100M)",
                    "Structural penalty for poor performance (gap > 0.5)",
                    "Complexity penalty for very large programs (>$500M)"
                ],
                "advantages": ["Fast", "Reliable", "No data requirements"],
                "limitations": ["Not adaptive", "Fixed assumptions"]
            },
            "empirical": {
                "description": "Historical effectiveness analysis with country context",
                "methodology": [
                    "Historical allocation-performance relationship analysis",
                    "Cross-sectional estimation when history unavailable",
                    "Country context adjustments (GDP, governance, capacity)",
                    "Theoretical bounds validation"
                ],
                "formula": "αᵢ = weighted_average(historical_αᵢ, cross_sectional_αᵢ, theoretical_αᵢ)",
                "advantages": ["Data-driven", "Country-specific", "More accurate"],
                "limitations": ["Requires quality historical data", "Computationally intensive"]
            },
            "ml": {
                "description": "Machine learning prediction from training data",
                "algorithm": "Gradient Boosting Regressor",
                "features": [
                    "Component type (one-hot encoded)",
                    "Performance gap and ratio",
                    "Log allocation and normalized intensity",
                    "Country context variables"
                ],
                "advantages": ["Highly accurate", "Learns complex patterns"],
                "limitations": ["Requires sklearn", "Needs large training dataset"]
            },
            "bayesian": {
                "description": "Probabilistic estimation with uncertainty",
                "process": [
                    "Define prior distribution by component type",
                    "Calculate likelihood from current performance",
                    "Bayesian update: posterior ∝ prior × likelihood",
                    "Return mean with confidence intervals"
                ],
                "advantages": ["Uncertainty quantification", "Principled updating"],
                "limitations": ["Complex interpretation", "Computational overhead"]
            },
            "adaptive": {
                "description": "Self-learning from performance history",
                "algorithm": [
                    "Exponential smoothing of historical estimates",
                    "Trend analysis of allocation effectiveness",
                    "Decay factors by update frequency",
                    "Performance-based adjustments"
                ],
                "advantages": ["Improves over time", "Self-correcting"],
                "limitations": ["Requires system usage history", "Gradual adaptation"]
            }
        },
        "redundancy_elimination": {
            "previous_issue": "Sensitivity estimation logic was duplicated in calculate_fsfvi() and calculate_component_vulnerabilities()",
            "solution": "Created centralized _ensure_sensitivity_parameter() method",
            "benefits": [
                "Single source of truth for sensitivity estimation",
                "Consistent old-scale detection across all calculations",
                "Easier maintenance and debugging",
                "Unified configuration and method selection"
            ],
            "current_flow": "All sensitivity estimation routes through single centralized function"
        },
        "mathematical_validation": {
            "bounds_checking": "All methods enforce αᵢ ∈ [0.0005, 0.005]",
            "dimensionality": "Units verified: αᵢ [1/millions_USD] × fᵢ [millions_USD] = dimensionless",
            "vulnerability_range": "Produces υᵢ ∈ [0,1] for typical allocation ranges",
            "system_properties": "Ensures FSFVI ∈ [0,1] with realistic values [0.01, 0.5]"
        },
        "performance_improvements": {
            "scaling_fix": "Eliminated scale mismatch that caused near-zero vulnerabilities",
            "old_scale_detection": "Automatically upgrades old parameters (>0.1) to new scale",
            "method_flexibility": "Configurable estimation methods for different use cases",
            "fallback_safety": "Robust fallback ensures system always has valid parameters"
        }
    }


# ============================================================================
# HELPER FUNCTIONS - MINIMAL, ONLY FOR DATA RETRIEVAL
# ============================================================================

async def _get_session_data(session_id: str, user_id: int) -> Dict[str, Any]:
    """Get session data - delegates to Django integration"""
    if DJANGO_INTEGRATION:
        session_data = await run_django_operation(
            django_integration.get_session, session_id, user_id
        )
        if not session_data:
            raise HTTPException(status_code=404, detail="Session not found")
        return session_data
    else:
        # Fallback to in-memory (would be implemented properly)
        raise HTTPException(status_code=503, detail="Session storage not available")


async def _get_session_components(session_id: str) -> List[Dict[str, Any]]:
    """Get session components - delegates to Django integration"""
    if DJANGO_INTEGRATION:
        components = await run_django_operation(
            django_integration.get_session_components, session_id
        )
        return components
    else:
        # Fallback to in-memory (would be implemented properly)
        raise HTTPException(status_code=503, detail="Component storage not available")


async def _update_session_status(session_id: str, user_id: int, status: str):
    """Update session status - delegates to Django integration"""
    if DJANGO_INTEGRATION:
        await run_django_operation(
            django_integration.update_session_status, session_id, user_id, status
        )


async def _save_optimization_results(session_id: str, optimization_result: Dict[str, Any]):
    """Save optimization results - delegates to Django integration"""
    if DJANGO_INTEGRATION:
        await run_django_operation(
            django_integration.save_optimization_results, session_id, optimization_result
        )


def _structure_system_vulnerability_response(
    system_result: Dict[str, Any], 
    session_data: Dict[str, Any], 
    session_id: str
) -> Dict[str, Any]:
    """
    Structure system vulnerability response for SystemVulnerabilityOverview component
    
    Args:
        system_result: Complete system FSFVI calculation results from fsfvi_core
        session_data: Session metadata (country, budget, etc.)
        session_id: Session identifier
        
    Returns:
        Clean, structured response for frontend consumption
    """
    # Get total budget from multiple sources for robustness
    total_budget = (
        session_data.get('total_budget', 0) or 
        system_result.get('total_allocation', 0) or
        system_result.get('total_allocation_millions', 0) * 1e6 or 
        0
    )
    
    # Log budget for debugging  
    logger.info(f"Total budget in _structure_system_vulnerability_response: ${total_budget:.1f}M (already in millions)")
    
    fsfvi_score = system_result.get('fsfvi_value', 0)
    risk_level = system_result.get('risk_level', 'unknown')
    
    # Core FSFVI results
    fsfvi_results = {
        'fsfvi_score': fsfvi_score,
        'vulnerability_percent': fsfvi_score * 100,
        'risk_level': risk_level,
        'financing_efficiency_percent': (1 - fsfvi_score) * 100
    }
    
    # Financial context - budget values are already in millions
    financial_context = {
        'total_budget_millions': total_budget if total_budget > 0 else 0,
        'budget_efficiency': 'high' if fsfvi_score < 0.1 else 'medium' if fsfvi_score < 0.2 else 'low',
        'optimization_potential': system_result.get('government_insights', {}).get('budget_optimization_potential', 
                                 'high' if fsfvi_score > 0.15 else 'medium' if fsfvi_score > 0.05 else 'low'),
        'intervention_urgency': system_result.get('government_insights', {}).get('intervention_urgency', 'medium')
    }
    
    # System analysis
    system_analysis = {
        'fsfvi_score': fsfvi_score,
        'risk_level': risk_level,
        'total_allocation_millions': system_result.get('total_allocation_millions', total_budget if total_budget > 0 else 0),
        'component_statistics': system_result.get('component_statistics', {}),
        'government_insights': system_result.get('government_insights', {}),
        'critical_components': [comp.get('name', comp.get('component_name', 'Unknown')) 
                               for comp in system_result.get('critical_components', [])],
        'high_priority_components': [comp.get('name', comp.get('component_name', 'Unknown')) 
                                   for comp in system_result.get('high_risk_components', [])]
    }
    
    # Mathematical interpretation
    mathematical_interpretation = {
        'score': fsfvi_score,
        'vulnerability_percent': fsfvi_score * 100,
        'interpretation': f"System shows {risk_level} vulnerability with {(fsfvi_score * 100):.2f}% financing inefficiency",
        'performance_category': 'excellent' if fsfvi_score < 0.05 else 'good' if fsfvi_score < 0.15 else 'fair' if fsfvi_score < 0.30 else 'poor',
        'formula_applied': 'FSFVI = Σᵢ ωᵢ·υᵢ(fᵢ) = Σᵢ ωᵢ·δᵢ·[1/(1+αᵢfᵢ)]'
    }
    
    # Executive summary
    critical_count = len(system_result.get('critical_components', []))
    executive_summary = {
        'overall_assessment': f"Food system shows {risk_level} vulnerability requiring {'immediate' if critical_count > 0 else 'strategic'} intervention",
        'key_metrics': {
            'fsfvi_score': f"{fsfvi_score:.6f}",
            'financing_efficiency': f"{((1 - fsfvi_score) * 100):.1f}%",
            'critical_components': critical_count,
            'total_budget': f"${total_budget:.1f}M" if total_budget > 0 else "N/A"
        },
        'immediate_actions_required': critical_count > 0,
        'system_stability': system_result.get('government_insights', {}).get('system_stability', 'unknown')
    }
    
    return {
        "session_id": session_id,
        "country": session_data.get('country_name', 'Unknown'),
        "analysis_type": "system_vulnerability",
        "timestamp": datetime.now().isoformat(),
        "fiscal_year": session_data.get('fiscal_year'),
        "currency": session_data.get('currency'),
        "weighting_method": system_result.get('weighting_method'),
        "scenario": system_result.get('scenario'),
        
        # Core system results
        "system_fsfvi": system_result,
        
        # Structured UI data
        "fsfvi_results": fsfvi_results,
        "financial_context": financial_context,
        "system_analysis": system_analysis,
        "mathematical_interpretation": mathematical_interpretation,
        "executive_summary": executive_summary
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) 