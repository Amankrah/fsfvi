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
import os

# Import service layer and schemas - SINGLE SOURCE OF TRUTH
from fsfvi_service import create_fsfvi_services
from schemas import FSFVIRequest, FSFVIResponse, OptimizationResult, OptimizationConstraints
from exceptions import FSFVIException, ValidationError, OptimizationError, CalculationError
from config import get_weighting_methods, get_scenarios
from validators import validate_system_health

# Import Django integration
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'django_app'))
try:
    from fsfvi.django_integration import django_integration
    DJANGO_INTEGRATION = True
    print("✅ Django integration loaded successfully")
except ImportError as e:
    print(f"⚠️ Django integration not available: {e}")
    DJANGO_INTEGRATION = False

# Environment detection
ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')
IS_PRODUCTION = ENVIRONMENT == 'production'

# Configure logging
logging.basicConfig(level=logging.INFO if IS_PRODUCTION else logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="FSFVI Analysis Service",
    description="Streamlined FSFVI Analysis API - All business logic in service layer",
    version="3.1.0",
    docs_url="/docs" if not IS_PRODUCTION else None,  # Disable docs in production
    redoc_url="/redoc" if not IS_PRODUCTION else None,
)

# Environment-specific CORS configuration
if IS_PRODUCTION:
    # Production CORS - Strict settings for fsfvi.ai
    allowed_origins = [
        "https://fsfvi.ai",
        "https://www.fsfvi.ai",
        f"https://{os.getenv('BACKEND_PORT', '8000')}.fsfvi.ai",
        f"https://{os.getenv('API_PORT', '8001')}.fsfvi.ai",
    ]
    
    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
        max_age=3600,  # Cache preflight requests for 1 hour
    )
    
    # Production authentication service URL
    AUTH_SERVICE_URL = os.getenv('AUTH_SERVICE_URL', 'https://fsfvi.ai')
    
    logger.info(f"🔒 Production mode: CORS configured for {allowed_origins}")
    
else:
    # Development CORS - Permissive for local development
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://localhost:8000", 
            "http://127.0.0.1:3000",
            "http://127.0.0.1:8000"
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Development authentication service URL
    AUTH_SERVICE_URL = 'http://localhost:8000'
    
    logger.info("🔧 Development mode: Permissive CORS enabled")

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

# Authentication dependency with environment-aware URL
async def get_current_user(authorization: HTTPAuthorizationCredentials = Depends(security)):
    """Validate token with Django backend"""
    token = authorization.credentials
    
    try:
        response = requests.get(
            f'{AUTH_SERVICE_URL}/auth/profile/',
            headers={'Authorization': f'Token {token}'},
            timeout=10 if IS_PRODUCTION else 5,
            verify=IS_PRODUCTION  # SSL verification in production only
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(status_code=401, detail="Invalid token")
            
    except requests.RequestException as e:
        logger.error(f"Authentication service error: {e}")
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
        logger.info(f"Starting optimization: budget=${optimized_budget:.1f}M, method={method}, components={len(components)}")
        optimization_result = optimization_service.optimize_allocation(
            components=components,
            budget=optimized_budget,
            method=method,
            scenario="normal_operations",
            constraints=parsed_constraints
        )
        logger.info(f"Optimization completed: success={optimization_result.get('success', False)}, iterations={optimization_result.get('iterations', 0)}")
        
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


@app.post("/multi_year_optimization", summary="Multi-Year Budget Planning")
async def multi_year_optimization(
    session_id: str = Form(...),
    budget_scenarios: str = Form(...),  # JSON string of {year: budget}
    target_fsfvi: Optional[float] = Form(default=None),
    target_year: Optional[int] = Form(default=None),
    method: str = Form(default="hybrid"),
    scenario: str = Form(default="normal_operations"),
    constraints: Optional[str] = Form(default=None),
    current_user: dict = Depends(get_current_user)
):
    """Multi-year optimization for government fiscal planning"""
    try:
        # Get session data
        session_data = await _get_session_data(session_id, current_user['id'])
        components = await _get_session_components(session_id)
        
        # Parse inputs
        import json
        budget_scenarios_dict = json.loads(budget_scenarios)
        parsed_constraints = json.loads(constraints) if constraints else {}
        
        # Convert year keys to integers
        budget_scenarios_dict = {int(year): budget for year, budget in budget_scenarios_dict.items()}
        
        # Delegate to service layer
        result = optimization_service.multi_year_optimization(
            components=components,
            budget_scenarios=budget_scenarios_dict,
            target_fsfvi=target_fsfvi,
            target_year=target_year,
            method=method,
            scenario=scenario,
            constraints=parsed_constraints
        )
        
        # Save results and update session
        await _save_optimization_results(session_id, result)
        await _update_session_status(session_id, current_user['id'], 'multi_year_planning_completed')
        
        return {
            "session_id": session_id,
            "country": session_data['country_name'],
            "multi_year_plan": result,
            "analysis_type": "multi_year_optimization"
        }
        
    except Exception as e:
        logger.error(f"Multi-year optimization error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Multi-year optimization failed: {str(e)}")


@app.post("/scenario_comparison", summary="Crisis Scenario Comparison")
async def scenario_comparison(
    session_id: str = Form(...),
    scenarios: str = Form(...),  # JSON array of scenario names
    methods: str = Form(...),    # JSON array of method names
    budget: Optional[float] = Form(default=None),
    constraints: Optional[str] = Form(default=None),
    current_user: dict = Depends(get_current_user)
):
    """Compare optimization across different crisis scenarios"""
    try:
        # Get session data
        session_data = await _get_session_data(session_id, current_user['id'])
        components = await _get_session_components(session_id)
        
        # Parse inputs
        import json
        scenarios_list = json.loads(scenarios)
        methods_list = json.loads(methods)
        parsed_constraints = json.loads(constraints) if constraints else {}
        
        # Use session budget if not provided
        if budget is None:
            budget = session_data.get('total_budget', 0)
        
        # Delegate to service layer
        result = optimization_service.scenario_comparison_optimization(
            components=components,
            budget=budget,
            scenarios=scenarios_list,
            methods=methods_list,
            constraints=parsed_constraints
        )
        
        # Save results and update session
        await _save_optimization_results(session_id, result)
        await _update_session_status(session_id, current_user['id'], 'scenario_comparison_completed')
        
        return {
            "session_id": session_id,
            "country": session_data['country_name'],
            "scenario_comparison": result,
            "analysis_type": "scenario_comparison"
        }
        
    except Exception as e:
        logger.error(f"Scenario comparison error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Scenario comparison failed: {str(e)}")


@app.post("/budget_sensitivity_analysis", summary="Budget Impact Analysis")
async def budget_sensitivity_analysis(
    session_id: str = Form(...),
    base_budget: float = Form(...),
    budget_variations: str = Form(...),  # JSON array of variation percentages
    method: str = Form(default="hybrid"),
    scenario: str = Form(default="normal_operations"),
    constraints: Optional[str] = Form(default=None),
    current_user: dict = Depends(get_current_user)
):
    """Analyze marginal returns and optimal budget levels"""
    try:
        # Get session data
        session_data = await _get_session_data(session_id, current_user['id'])
        components = await _get_session_components(session_id)
        
        # Parse inputs
        import json
        variations_list = json.loads(budget_variations)
        parsed_constraints = json.loads(constraints) if constraints else {}
        
        # Delegate to service layer
        result = optimization_service.budget_sensitivity_analysis(
            components=components,
            base_budget=base_budget,
            budget_variations=variations_list,
            method=method,
            scenario=scenario,
            constraints=parsed_constraints
        )
        
        # Save results and update session
        await _save_optimization_results(session_id, result)
        await _update_session_status(session_id, current_user['id'], 'budget_sensitivity_completed')
        
        return {
            "session_id": session_id,
            "country": session_data['country_name'],
            "budget_sensitivity": result,
            "analysis_type": "budget_sensitivity_analysis"
        }
        
    except Exception as e:
        logger.error(f"Budget sensitivity analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Budget sensitivity analysis failed: {str(e)}")


@app.post("/interactive_optimization", summary="Interactive Allocation Adjustment")
async def interactive_optimization(
    session_id: str = Form(...),
    user_adjustments: str = Form(...),  # JSON object of component adjustments
    method: str = Form(default="hybrid"),
    scenario: str = Form(default="normal_operations"),
    constraints: Optional[str] = Form(default=None),
    current_user: dict = Depends(get_current_user)
):
    """Interactive optimization with user allocation adjustments"""
    try:
        # Get session data
        session_data = await _get_session_data(session_id, current_user['id'])
        components = await _get_session_components(session_id)
        
        # Parse inputs
        import json
        adjustments_dict = json.loads(user_adjustments)
        parsed_constraints = json.loads(constraints) if constraints else {}
        
        # Delegate to service layer using proper interactive optimization method
        result = optimization_service.interactive_optimization(
            components=components,
            user_adjustments=adjustments_dict,
            method=method,
            scenario=scenario,
            constraints=parsed_constraints
        )
        
        # Save results and update session
        await _save_optimization_results(session_id, result)
        await _update_session_status(session_id, current_user['id'], 'interactive_optimization_completed')
        
        return {
            "session_id": session_id,
            "country": session_data['country_name'],
            "interactive_optimization": result,
            "analysis_type": "interactive_optimization"
        }
        
    except Exception as e:
        logger.error(f"Interactive optimization error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Interactive optimization failed: {str(e)}")


@app.post("/target_based_optimization", summary="Target Achievement Optimization")
async def target_based_optimization(
    session_id: str = Form(...),
    target_fsfvi: float = Form(...),
    target_year: int = Form(...),
    method: str = Form(default="hybrid"),
    scenario: str = Form(default="normal_operations"),
    constraints: Optional[str] = Form(default=None),
    current_user: dict = Depends(get_current_user)
):
    """Optimize to achieve specific FSFVI target by target year"""
    try:
        # Get session data
        session_data = await _get_session_data(session_id, current_user['id'])
        components = await _get_session_components(session_id)
        
        # Parse constraints
        import json
        parsed_constraints = json.loads(constraints) if constraints else {}
        parsed_constraints['target_fsfvi'] = target_fsfvi
        parsed_constraints['target_year'] = target_year
        
        # Use current budget as base
        budget = session_data.get('total_budget', 0)
        
        # Delegate to service layer using proper target-based optimization method
        result = optimization_service.target_based_optimization(
            components=components,
            budget=budget,
            target_fsfvi=target_fsfvi,
            target_year=target_year,
            method=method,
            scenario=scenario,
            constraints=parsed_constraints
        )
        
        # Save results and update session
        await _save_optimization_results(session_id, result)
        await _update_session_status(session_id, current_user['id'], 'target_optimization_completed')
        
        return {
            "session_id": session_id,
            "country": session_data['country_name'],
            "target_optimization": result,
            "analysis_type": "target_based_optimization"
        }
        
    except Exception as e:
        logger.error(f"Target-based optimization error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Target-based optimization failed: {str(e)}")


@app.post("/crisis_resilience_assessment", summary="Crisis Resilience Assessment")
async def crisis_resilience_assessment(
    session_id: str = Form(...),
    test_scenarios: Optional[str] = Form(default='["climate_shock", "financial_crisis", "pandemic_disruption", "cyber_threats"]'),
    method: str = Form(default="hybrid"),
    current_user: dict = Depends(get_current_user)
):
    """Assess food system resilience across crisis scenarios"""
    try:
        # Get session data
        session_data = await _get_session_data(session_id, current_user['id'])
        components = await _get_session_components(session_id)
        
        # Parse test scenarios
        import json
        scenarios_list = json.loads(test_scenarios)
        
        # Calculate baseline FSFVI
        baseline_result = calculation_service.calculate_fsfvi(
            components=components,
            method=method,
            scenario='normal_operations'
        )
        baseline_fsfvi = baseline_result['fsfvi_value']
        
        # Test resilience across scenarios
        scenario_results = {}
        resilience_scores = []
        
        for scenario in scenarios_list:
            try:
                scenario_result = calculation_service.calculate_fsfvi(
                    components=components,
                    method=method,
                    scenario=scenario
                )
                
                # Calculate impact and resilience
                scenario_fsfvi = scenario_result['fsfvi_value']
                impact = (scenario_fsfvi - baseline_fsfvi) / baseline_fsfvi if baseline_fsfvi > 0 else 0
                resilience = max(0, 1 - abs(impact))  # Higher resilience = lower impact
                
                scenario_results[scenario] = {
                    'fsfvi_score': scenario_fsfvi,
                    'impact_percent': impact * 100,
                    'resilience_score': resilience,
                    'severity': 'high' if abs(impact) > 0.1 else 'medium' if abs(impact) > 0.05 else 'low'
                }
                
                resilience_scores.append(resilience)
                
            except Exception as e:
                logger.warning(f"Crisis resilience calculation failed for {scenario}: {e}")
                scenario_results[scenario] = {'error': str(e)}
        
        # Overall resilience assessment
        overall_resilience = sum(resilience_scores) / len(resilience_scores) if resilience_scores else 0.5
        
        result = {
            'baseline_fsfvi': baseline_fsfvi,
            'scenario_results': scenario_results,
            'overall_resilience_score': overall_resilience,
            'resilience_level': 'high' if overall_resilience > 0.7 else 'medium' if overall_resilience > 0.4 else 'low',
            'most_vulnerable_scenario': min(scenario_results.keys(), 
                                          key=lambda x: scenario_results[x].get('resilience_score', 0.5)
                                          if 'error' not in scenario_results[x] else 0.5),
            'analysis_type': 'crisis_resilience_assessment',
            'recommendations': _generate_resilience_recommendations(overall_resilience, scenario_results)
        }
        
        # Save results and update session
        await _save_optimization_results(session_id, result)
        await _update_session_status(session_id, current_user['id'], 'resilience_assessment_completed')
        
        return {
            "session_id": session_id,
            "country": session_data['country_name'],
            "resilience_assessment": result,
            "analysis_type": "crisis_resilience_assessment"
        }
        
    except Exception as e:
        logger.error(f"Crisis resilience assessment error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Crisis resilience assessment failed: {str(e)}")


def _generate_resilience_recommendations(overall_resilience: float, scenario_results: Dict) -> List[str]:
    """Generate resilience improvement recommendations"""
    recommendations = []
    
    if overall_resilience < 0.5:
        recommendations.extend([
            "Critical: Strengthen food system resilience across all components",
            "Establish emergency response protocols and contingency funding",
            "Diversify food system infrastructure to reduce single points of failure"
        ])
    elif overall_resilience < 0.7:
        recommendations.extend([
            "Moderate resilience: Focus on most vulnerable scenarios",
            "Develop scenario-specific response strategies",
            "Improve early warning and monitoring systems"
        ])
    else:
        recommendations.extend([
            "Strong resilience: Maintain current preparedness levels",
            "Consider regional leadership role in crisis response",
            "Share best practices with neighboring food systems"
        ])
    
    # Scenario-specific recommendations
    for scenario, result in scenario_results.items():
        if 'error' not in result and result.get('resilience_score', 0) < 0.4:
            recommendations.append(f"Address specific vulnerabilities to {scenario.replace('_', ' ')}")
    
    return recommendations[:5]  # Limit to top 5 recommendations



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
                "primary_method": get_weighting_methods()[0] if get_weighting_methods() else "hybrid",
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
                    "social_protection_equity": 0.0025,
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
            }
        },
        "mathematical_validation": {
            "bounds_checking": "All methods enforce αᵢ ∈ [0.0005, 0.005]",
            "dimensionality": "Units verified: αᵢ [1/millions_USD] × fᵢ [millions_USD] = dimensionless",
            "vulnerability_range": "Produces υᵢ ∈ [0,1] for typical allocation ranges",
            "system_properties": "Ensures FSFVI ∈ [0,1] with realistic values [0.01, 0.5]"
        }
    }





@app.get("/api/developer/data-format", summary="Data Format Specification")
async def data_format_specification():
    """
    Detailed specification of expected data formats for FSFVI analysis
    """
    return {
        "csv_format": {
            "overview": "FSFVI accepts CSV files with food system component data",
            "encoding": "UTF-8",
            "separator": "Comma (,)",
            "header_required": True,
            "required_columns": {
                "component_name": {
                    "description": "Name/identifier of the food system component",
                    "type": "String",
                    "example": "Agricultural Research and Development",
                    "constraints": "Must be unique within the file"
                },
                "financial_allocation": {
                    "description": "Budget allocation for this component",
                    "type": "Numeric (Float)",
                    "unit": "Millions in specified currency",
                    "example": 125.5,
                    "constraints": "Must be positive number"
                },
                "observed_value": {
                    "description": "Current performance metric value",
                    "type": "Numeric (Float)",
                    "example": 75.2,
                    "constraints": "Must be non-negative"
                },
                "benchmark_value": {
                    "description": "Target or ideal performance value",
                    "type": "Numeric (Float)",
                    "example": 95.0,
                    "constraints": "Should be >= observed_value for meaningful analysis"
                }
            },
            "optional_columns": {
                "component_type": {
                    "description": "Standardized component type classification",
                    "type": "String",
                    "allowed_values": [
                        "agricultural_development",
                        "infrastructure",
                        "nutrition_health",
                        "social_protection_equity",
                        "climate_natural_resources",
                        "governance_institutions"
                    ],
                    "default": "Automatically assigned based on component_name"
                },
                "weight": {
                    "description": "Custom importance weight for this component",
                    "type": "Numeric (Float)",
                    "range": "0.0 to 1.0",
                    "default": "Equal weighting (1/n where n is number of components)"
                },
                "sensitivity_parameter": {
                    "description": "Component-specific sensitivity to financial allocation",
                    "type": "Numeric (Float)",
                    "range": "0.0005 to 0.005",
                    "default": "Automatically estimated based on component type"
                }
            }
        },
        "data_validation": {
            "file_checks": [
                "File size limit: 10MB",
                "Valid CSV format with UTF-8 encoding",
                "Minimum 2 components required",
                "Maximum 50 components supported"
            ],
            "data_checks": [
                "All required columns present",
                "No missing values in required columns",
                "Numeric columns contain valid numbers",
                "Component names are unique",
                "Financial allocations are positive",
                "Performance values are non-negative"
            ],
            "business_logic_checks": [
                "Total budget allocation is reasonable (>$1M, <$1T)",
                "Performance gaps are logical (benchmark >= observed)",
                "Component types are recognized or can be classified",
                "Data quality score above minimum threshold"
            ]
        },
        "example_data": {
            "minimal_csv": '''component_name,financial_allocation,observed_value,benchmark_value
Agricultural Research,150.5,72.3,85.0
Food Distribution,89.2,68.5,80.0
Nutrition Programs,45.8,55.2,75.0
Rural Infrastructure,203.1,60.1,70.0''',
            "full_csv": '''component_name,component_type,financial_allocation,observed_value,benchmark_value,weight
Agricultural Research,agricultural_development,150.5,72.3,85.0,0.3
Food Distribution,infrastructure,89.2,68.5,80.0,0.2
Nutrition Programs,nutrition_health,45.8,55.2,75.0,0.2
Rural Infrastructure,infrastructure,203.1,60.1,70.0,0.15
Social Safety Nets,social_protection_equity,67.4,45.8,65.0,0.1
Climate Adaptation,climate_natural_resources,34.2,52.1,60.0,0.05'''
        },
        "common_errors": {
            "missing_columns": "Ensure all required columns are present with exact names",
            "invalid_numbers": "Check for non-numeric values in numeric columns",
            "negative_allocations": "All financial allocations must be positive",
            "duplicate_components": "Each component name must be unique",
            "empty_file": "File must contain at least 2 data rows",
            "encoding_issues": "Save file as UTF-8 to avoid character encoding errors"
        },
        "best_practices": {
            "data_preparation": [
                "Verify data accuracy before upload",
                "Use consistent units (millions in specified currency)",
                "Ensure component names are descriptive and unique",
                "Include realistic benchmark values based on best practices"
            ],
            "component_selection": [
                "Focus on major budget components (>1% of total budget)",
                "Group small components into logical categories",
                "Ensure comprehensive coverage of food system domains",
                "Align with national food security frameworks"
            ],
            "performance_metrics": [
                "Use quantifiable, outcome-based metrics",
                "Ensure metrics are comparable across components",
                "Set realistic but ambitious benchmark values",
                "Document metric definitions and sources"
            ]
        }
    }


@app.get("/api/developer/response-format", summary="API Response Format Reference")
async def response_format_reference():
    """
    Comprehensive reference for all API response formats
    """
    return {
        "response_standards": {
            "http_status_codes": {
                "200": "Success - Request completed successfully",
                "201": "Created - Resource created successfully",
                "400": "Bad Request - Invalid input data",
                "401": "Unauthorized - Authentication required",
                "404": "Not Found - Resource not found",
                "500": "Internal Server Error - Server-side error"
            },
            "response_structure": {
                "success_format": {
                    "session_id": "string - Unique session identifier",
                    "country": "string - Country name",
                    "analysis_type": "string - Type of analysis performed",
                    "timestamp": "string - ISO format timestamp",
                    "data": "object - Analysis results and data"
                },
                "error_format": {
                    "error": "string - Error message",
                    "detail": "string - Detailed error description",
                    "status_code": "integer - HTTP status code"
                }
            }
        },
        "endpoint_responses": {
            "upload_data": {
                "success": {
                    "session_id": "uuid-string",
                    "status": "success", 
                    "message": "Data uploaded and processed successfully",
                    "summary": {
                        "total_components": "integer",
                        "total_budget": "float",
                        "data_quality_score": "float"
                    },
                    "components": ["array of component objects"]
                }
            },
            "analyze_system": {
                "success": {
                    "session_id": "uuid-string",
                    "country": "string",
                    "analysis_type": "comprehensive_system_analysis",
                    "performance_gaps": "object",
                    "component_vulnerabilities": "object", 
                    "distribution_analysis": "object",
                    "system_fsfvi": "object"
                }
            },
            "calculate_system_vulnerability": {
                "success": {
                    "session_id": "uuid-string",
                    "country": "string",
                    "fsfvi_results": {
                        "fsfvi_score": "float [0,1]",
                        "vulnerability_percent": "float [0,100]", 
                        "risk_level": "string [low|medium|high|critical]",
                        "financing_efficiency_percent": "float [0,100]"
                    },
                    "system_analysis": {
                        "total_allocation_millions": "float",
                        "component_statistics": "object",
                        "critical_components": "array of strings",
                        "government_insights": "object"
                    }
                }
            }
        },
        "data_types": {
            "fsfvi_score": {
                "type": "float",
                "range": "[0, 1]",
                "interpretation": "0 = no vulnerability, 1 = maximum vulnerability",
                "typical_range": "[0.01, 0.5] for real systems"
            },
            "performance_gap": {
                "type": "float", 
                "range": "[0, 1]",
                "calculation": "(benchmark - observed) / benchmark",
                "interpretation": "0 = no gap, 1 = maximum gap"
            },
            "vulnerability_score": {
                "type": "float",
                "range": "[0, 1]", 
                "calculation": "gap / (1 + sensitivity × allocation)",
                "interpretation": "Component-level vulnerability considering funding"
            },
            "risk_level": {
                "type": "string",
                "values": ["low", "medium", "high", "critical"],
                "thresholds": {
                    "low": "FSFVI < 0.1",
                    "medium": "0.1 ≤ FSFVI < 0.2", 
                    "high": "0.2 ≤ FSFVI < 0.4",
                    "critical": "FSFVI ≥ 0.4"
                }
            }
        },
        "mathematical_context": {
            "formulas": {
                "performance_gap": "δᵢ = (benchmark_value - observed_value) / benchmark_value",
                "component_vulnerability": "υᵢ = δᵢ × (1 / (1 + αᵢ × fᵢ))",
                "system_fsfvi": "FSFVI = Σᵢ (ωᵢ × υᵢ)",
                "financing_efficiency": "Efficiency = 1 - FSFVI"
            },
            "variables": {
                "δᵢ": "Performance gap for component i [0,1]",
                "υᵢ": "Vulnerability for component i [0,1]", 
                "αᵢ": "Sensitivity parameter for component i [0.0005,0.005]",
                "fᵢ": "Financial allocation for component i (millions USD)",
                "ωᵢ": "Weight for component i [0,1], Σωᵢ = 1",
                "FSFVI": "System-level Food System Financing Vulnerability Index [0,1]"
            }
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