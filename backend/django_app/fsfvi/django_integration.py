"""
Django Integration Service for FastAPI
Provides database operations for the FSFVI system
"""

import os
import sys
import django
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

# Setup Django environment
def setup_django():
    """Setup Django environment for standalone usage"""
    # Add Django app to path
    django_app_path = os.path.dirname(os.path.dirname(__file__))
    if django_app_path not in sys.path:
        sys.path.append(django_app_path)
    
    # Configure Django settings
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'settings')
    django.setup()

# Initialize Django
try:
    setup_django()
except:
    pass  # Django may already be configured

from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from .models import (
    FSFVISession, Component, SystemAnalysis, OptimizationResult,
    ComponentOptimization, ScenarioAnalysis, Report, WeightAdjustment, UploadedFile
)
from .data_processing_service import data_processing_service

class DjangoFSFVIIntegration:
    """Service class for Django database operations from FastAPI"""
    
    def __init__(self):
        self.setup_complete = True
    
    # User Management
    def authenticate_user(self, username: str, password: str) -> Optional[Dict]:
        """Authenticate user and return user data"""
        try:
            user = authenticate(username=username, password=password)
            if user and user.is_active:
                return {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'is_authenticated': True
                }
            return None
        except Exception as e:
            print(f"Authentication error: {e}")
            return None
    
    def get_user_by_id(self, user_id: int) -> Optional[Dict]:
        """Get user by ID"""
        try:
            user = User.objects.get(id=user_id)
            return {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name
            }
        except User.DoesNotExist:
            return None
    
    def create_user(self, username: str, email: str, password: str, 
                   first_name: str = '', last_name: str = '') -> Optional[Dict]:
        """Create a new user"""
        try:
            user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                first_name=first_name,
                last_name=last_name
            )
            return {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name
            }
        except Exception as e:
            print(f"User creation error: {e}")
            return None
    
    # Session Management
    def create_session(self, user_id: int, session_data: Dict) -> Optional[str]:
        """Create a new FSFVI session"""
        try:
            user = User.objects.get(id=user_id)
            session = FSFVISession.objects.create(
                user=user,
                country_name=session_data.get('country_name'),
                fiscal_year=session_data.get('fiscal_year', 2024),
                currency=session_data.get('currency', 'USD'),
                budget_unit=session_data.get('budget_unit', 'millions'),
                total_budget=session_data.get('total_budget', 0),
                method_used=session_data.get('method_used', 'hybrid'),
                scenario=session_data.get('scenario', 'normal_operations'),
                status='active'
            )
            return str(session.id)
        except Exception as e:
            print(f"Session creation error: {e}")
            return None
    
    def get_session(self, session_id: str, user_id: int) -> Optional[Dict]:
        """Get session by ID and user"""
        try:
            session = FSFVISession.objects.get(id=session_id, user_id=user_id)
            
            session_data = {
                'id': str(session.id),
                'country_name': session.country_name,
                'fiscal_year': session.fiscal_year,
                'currency': session.currency,
                'budget_unit': session.budget_unit,
                'total_budget': session.total_budget,
                'method_used': session.method_used,
                'scenario': session.scenario,
                'status': session.status,
                'created_at': session.created_at.isoformat(),
                'updated_at': session.updated_at.isoformat()
            }
            
            return session_data
        except FSFVISession.DoesNotExist:
            logger.warning(f"Django Integration: Session {session_id} not found for user {user_id}")
            return None
    
    def update_session_status(self, session_id: str, user_id: int, status: str) -> bool:
        """Update session status"""
        try:
            session = FSFVISession.objects.get(id=session_id, user_id=user_id)
            session.status = status
            session.save()
            return True
        except FSFVISession.DoesNotExist:
            return False
    
    def get_user_sessions(self, user_id: int) -> List[Dict]:
        """Get all sessions for a user"""
        try:
            sessions = FSFVISession.objects.filter(user_id=user_id).order_by('-created_at')
            
            sessions_data = []
            for session in sessions:
                session_data = {
                    'id': str(session.id),
                    'country_name': session.country_name,
                    'fiscal_year': session.fiscal_year,
                    'currency': session.currency,
                    'budget_unit': session.budget_unit,
                    'total_budget': session.total_budget,
                    'method_used': session.method_used,
                    'scenario': session.scenario,
                    'status': session.status,
                    'created_at': session.created_at.isoformat(),
                    'updated_at': session.updated_at.isoformat(),
                    'component_count': session.components.count(),
                    'has_uploaded_file': hasattr(session, 'uploaded_file') and session.uploaded_file is not None
                }
                sessions_data.append(session_data)
            
            return sessions_data
        except Exception as e:
            logger.error(f"Error getting user sessions: {e}")
            return []
    
    # File Upload Integration
    def upload_and_process_csv(self, user, file_content: bytes, filename: str,
                              country_name: str, fiscal_year: int = 2024,
                              currency: str = "USD", budget_unit: str = "millions") -> Dict[str, Any]:
        """Upload and process CSV file using Django data processing service"""
        try:
            return data_processing_service.upload_and_process_csv(
                user=user,
                file_content=file_content,
                filename=filename,
                country_name=country_name,
                fiscal_year=fiscal_year,
                currency=currency,
                budget_unit=budget_unit
            )
        except Exception as e:
            print(f"Error in upload_and_process_csv: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def get_user_uploaded_files(self, user_id: int) -> List[Dict]:
        """Get all uploaded files for a user"""
        try:
            user = User.objects.get(id=user_id)
            return data_processing_service.get_user_files(user)
        except User.DoesNotExist:
            return []
        except Exception as e:
            print(f"Error getting user files: {e}")
            return []
    
    def get_session_with_file_info(self, session_id: str, user_id: int) -> Optional[Dict]:
        """Get session information including uploaded file details"""
        try:
            user = User.objects.get(id=user_id)
            return data_processing_service.get_session_with_file_info(session_id, user)
        except User.DoesNotExist:
            return None
        except Exception as e:
            print(f"Error getting session with file info: {e}")
            return None
    
    # Component Management
    def create_components(self, session_id: str, components_data: List[Dict]) -> bool:
        """Create components for a session"""
        try:
            session = FSFVISession.objects.get(id=session_id)
            
            # Delete existing components
            Component.objects.filter(session=session).delete()
            
            # Create new components
            components = []
            for comp_data in components_data:
                component = Component(
                    session=session,
                    component_name=comp_data.get('component_name'),
                    component_type=comp_data.get('component_type'),
                    observed_value=comp_data.get('observed_value', 0),
                    benchmark_value=comp_data.get('benchmark_value', 0),
                    financial_allocation=comp_data.get('financial_allocation', 0),
                    weight=comp_data.get('weight', 0),
                    sensitivity_parameter=comp_data.get('sensitivity_parameter', 0)
                )
                components.append(component)
            
            Component.objects.bulk_create(components)
            return True
        except Exception as e:
            print(f"Component creation error: {e}")
            return False
    
    def update_component_results(self, session_id: str, component_results: List[Dict]) -> bool:
        """Update component analysis results"""
        try:
            session = FSFVISession.objects.get(id=session_id)
            
            for comp_result in component_results:
                component_id = comp_result.get('component_id')
                if component_id:
                    Component.objects.filter(
                        session=session,
                        component_id=component_id
                    ).update(
                        performance_gap=comp_result.get('performance_gap'),
                        vulnerability=comp_result.get('vulnerability'),
                        weighted_vulnerability=comp_result.get('weighted_vulnerability'),
                        efficiency_index=comp_result.get('efficiency_index'),
                        priority_level=comp_result.get('priority_level')
                    )
            return True
        except Exception as e:
            print(f"Component update error: {e}")
            return False
    
    def get_session_components(self, session_id: str) -> List[Dict]:
        """Get all components for a session"""
        try:
            components = Component.objects.filter(session_id=session_id)
            component_list = []
            for comp in components:
                component_data = {
                    'component_id': str(comp.component_id),
                    'component_name': comp.component_name,
                    'component_type': comp.component_type,
                    'observed_value': comp.observed_value,
                    'benchmark_value': comp.benchmark_value,
                    'financial_allocation': comp.financial_allocation,
                    'weight': comp.weight,
                    'sensitivity_parameter': comp.sensitivity_parameter,
                    'performance_gap': comp.performance_gap,
                    'vulnerability': comp.vulnerability,
                    'weighted_vulnerability': comp.weighted_vulnerability,
                    'efficiency_index': comp.efficiency_index,
                    'priority_level': comp.priority_level
                }
                component_list.append(component_data)
            
            # Calculate total budget for verification
            total_from_db = sum(comp.financial_allocation or 0 for comp in components)
            logger.info(f"Django Integration: Retrieved {components.count()} components, total budget: ${total_from_db:.1f}M")
            
            return component_list
        except Exception as e:
            print(f"Error getting components: {e}")
            return []
    
    # System Analysis
    def save_system_analysis(self, session_id: str, analysis_data: Dict) -> bool:
        """Save system analysis results"""
        try:
            session = FSFVISession.objects.get(id=session_id)
            
            # Update or create system analysis
            analysis, created = SystemAnalysis.objects.update_or_create(
                session=session,
                defaults={
                    'fsfvi_value': analysis_data.get('fsfvi_value', 0),
                    'total_allocation': analysis_data.get('total_allocation', 0),
                    'average_vulnerability': analysis_data.get('average_vulnerability', 0),
                    'max_vulnerability': analysis_data.get('max_vulnerability', 0),
                    'risk_level': analysis_data.get('risk_level', 'unknown'),
                    'priority_counts': analysis_data.get('priority_counts', {}),
                    'allocation_concentration': analysis_data.get('allocation_concentration'),
                    'vulnerability_concentration': analysis_data.get('vulnerability_concentration'),
                    'diversification_index': analysis_data.get('diversification_index')
                }
            )
            return True
        except Exception as e:
            print(f"System analysis save error: {e}")
            return False
    
    def get_system_analysis(self, session_id: str) -> Optional[Dict]:
        """Get system analysis for a session"""
        try:
            analysis = SystemAnalysis.objects.get(session_id=session_id)
            return {
                'fsfvi_value': analysis.fsfvi_value,
                'total_allocation': analysis.total_allocation,
                'average_vulnerability': analysis.average_vulnerability,
                'max_vulnerability': analysis.max_vulnerability,
                'risk_level': analysis.risk_level,
                'priority_counts': analysis.priority_counts,
                'allocation_concentration': analysis.allocation_concentration,
                'vulnerability_concentration': analysis.vulnerability_concentration,
                'diversification_index': analysis.diversification_index,
                'created_at': analysis.created_at.isoformat()
            }
        except SystemAnalysis.DoesNotExist:
            return None
    
    # Optimization Results
    def save_optimization_results(self, session_id: str, optimization_data: Dict, 
                                 component_optimizations: List[Dict] = None) -> bool:
        """Save optimization results"""
        try:
            session = FSFVISession.objects.get(id=session_id)
            
            # Create or update optimization result
            optimization, created = OptimizationResult.objects.update_or_create(
                session=session,
                defaults={
                    'original_fsfvi': optimization_data.get('original_fsfvi', 0),
                    'optimized_fsfvi': optimization_data.get('optimized_fsfvi', 0),
                    'improvement_potential': optimization_data.get('improvement_potential', 0),
                    'reallocation_intensity': optimization_data.get('reallocation_intensity', 0),
                    'optimization_method': optimization_data.get('optimization_method', 'hybrid'),
                    'constraints': optimization_data.get('constraints', {}),
                    'absolute_gap': optimization_data.get('absolute_gap', 0),
                    'gap_ratio': optimization_data.get('gap_ratio', 0),
                    'efficiency_index': optimization_data.get('efficiency_index', 0)
                }
            )
            
            # Save component optimizations
            if component_optimizations:
                # Delete existing component optimizations
                ComponentOptimization.objects.filter(optimization=optimization).delete()
                
                for comp_opt in component_optimizations:
                    try:
                        component = Component.objects.get(
                            session=session,
                            component_id=comp_opt.get('component_id')
                        )
                        ComponentOptimization.objects.create(
                            optimization=optimization,
                            component=component,
                            original_allocation=comp_opt.get('original_allocation', 0),
                            optimized_allocation=comp_opt.get('optimized_allocation', 0),
                            allocation_change=comp_opt.get('allocation_change', 0),
                            allocation_change_percent=comp_opt.get('allocation_change_percent', 0),
                            implementation_complexity=comp_opt.get('implementation_complexity'),
                            reallocation_priority=comp_opt.get('reallocation_priority')
                        )
                    except Component.DoesNotExist:
                        continue
                        
            return True
        except Exception as e:
            print(f"Optimization save error: {e}")
            return False
    
    # Scenario Analysis
    def save_scenario_analysis(self, session_id: str, scenario_data: Dict) -> bool:
        """Save scenario analysis results"""
        try:
            session = FSFVISession.objects.get(id=session_id)
            
            ScenarioAnalysis.objects.create(
                session=session,
                scenario_name=scenario_data.get('scenario_name'),
                shock_magnitude=scenario_data.get('shock_magnitude', 0),
                baseline_fsfvi=scenario_data.get('baseline_fsfvi', 0),
                scenario_fsfvi=scenario_data.get('scenario_fsfvi', 0),
                impact_analysis=scenario_data.get('impact_analysis', {}),
                recovery_analysis=scenario_data.get('recovery_analysis', {}),
                resilience_assessment=scenario_data.get('resilience_assessment', {})
            )
            return True
        except Exception as e:
            print(f"Scenario analysis save error: {e}")
            return False
    
    # Reports
    def save_report(self, session_id: str, report_data: Dict) -> bool:
        """Save generated report"""
        try:
            session = FSFVISession.objects.get(id=session_id)
            
            Report.objects.create(
                session=session,
                report_type=report_data.get('report_type', 'comprehensive'),
                report_data=report_data.get('report_data', {}),
                executive_summary=report_data.get('executive_summary'),
                technical_details=report_data.get('technical_details', {}),
                visualizations=report_data.get('visualizations', {})
            )
            return True
        except Exception as e:
            print(f"Report save error: {e}")
            return False
    
    # Weight Adjustments
    def save_weight_adjustment(self, session_id: str, component_id: str, 
                              adjustment_data: Dict) -> bool:
        """Save weight adjustment"""
        try:
            session = FSFVISession.objects.get(id=session_id)
            component = Component.objects.get(session=session, component_id=component_id)
            
            WeightAdjustment.objects.create(
                session=session,
                component=component,
                original_weight=adjustment_data.get('original_weight', 0),
                adjusted_weight=adjustment_data.get('adjusted_weight', 0),
                adjustment_reason=adjustment_data.get('adjustment_reason'),
                priority_setting=adjustment_data.get('priority_setting')
            )
            return True
        except Exception as e:
            print(f"Weight adjustment save error: {e}")
            return False

# Singleton instance
django_integration = DjangoFSFVIIntegration() 