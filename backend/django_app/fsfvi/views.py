from django.contrib.auth.models import User
from django.contrib.auth import login, logout
from rest_framework import generics, status, viewsets, permissions
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Avg, Max
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import (
    FSFVISession, Component, SystemAnalysis, OptimizationResult,
    ComponentOptimization, ScenarioAnalysis, Report, WeightAdjustment, UploadedFile
)
from .data_processing_service import data_processing_service
from .serializers import (
    UserRegistrationSerializer, UserLoginSerializer, UserSerializer,
    FSFVISessionSerializer, FSFVISessionCreateSerializer, ComponentSerializer,
    SystemAnalysisSerializer, OptimizationResultSerializer, ComponentOptimizationSerializer,
    ScenarioAnalysisSerializer, ReportSerializer, WeightAdjustmentSerializer,
    SessionSummarySerializer, UploadedFileSerializer
)

# Authentication Views
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'user': UserSerializer(user).data,
            'token': token.key,
            'message': 'User registered successfully'
        }, status=status.HTTP_201_CREATED)

class LoginView(generics.GenericAPIView):
    serializer_class = UserLoginSerializer
    permission_classes = [AllowAny]
    
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        
        login(request, user)
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'user': UserSerializer(user).data,
            'token': token.key,
            'message': 'Login successful'
        })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Logout and delete user token"""
    try:
        request.user.auth_token.delete()
    except:
        pass
    logout(request)
    return Response({'message': 'Logged out successfully'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile(request):
    """Get current user profile"""
    return Response(UserSerializer(request.user).data)

# FSFVI Data Views
class FSFVISessionViewSet(viewsets.ModelViewSet):
    serializer_class = FSFVISessionSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['country_name', 'fiscal_year', 'currency', 'status', 'method_used']
    search_fields = ['country_name', 'scenario']
    ordering_fields = ['created_at', 'updated_at', 'total_budget']
    ordering = ['-created_at']
    
    def get_queryset(self):
        return FSFVISession.objects.filter(user=self.request.user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return FSFVISessionCreateSerializer
        elif self.action == 'list':
            return SessionSummarySerializer
        return FSFVISessionSerializer
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['get'])
    def components(self, request, pk=None):
        """Get all components for a session"""
        session = self.get_object()
        components = session.components.all()
        serializer = ComponentSerializer(components, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def analysis(self, request, pk=None):
        """Get system analysis for a session"""
        session = self.get_object()
        try:
            analysis = session.system_analysis
            serializer = SystemAnalysisSerializer(analysis)
            return Response(serializer.data)
        except SystemAnalysis.DoesNotExist:
            return Response({'detail': 'No analysis found for this session'}, 
                          status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['get'])
    def optimization(self, request, pk=None):
        """Get optimization results for a session"""
        session = self.get_object()
        try:
            optimization = session.optimization
            serializer = OptimizationResultSerializer(optimization)
            return Response(serializer.data)
        except OptimizationResult.DoesNotExist:
            return Response({'detail': 'No optimization found for this session'}, 
                          status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['get'])
    def reports(self, request, pk=None):
        """Get all reports for a session"""
        session = self.get_object()
        reports = session.reports.all()
        serializer = ReportSerializer(reports, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def scenarios(self, request, pk=None):
        """Get all scenario analyses for a session"""
        session = self.get_object()
        scenarios = session.scenarios.all()
        serializer = ScenarioAnalysisSerializer(scenarios, many=True)
        return Response(serializer.data)

class ComponentViewSet(viewsets.ModelViewSet):
    serializer_class = ComponentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['component_type', 'priority_level']
    search_fields = ['component_name', 'component_type']
    ordering_fields = ['component_name', 'vulnerability', 'weighted_vulnerability']
    
    def get_queryset(self):
        return Component.objects.filter(session__user=self.request.user)

class SystemAnalysisViewSet(viewsets.ModelViewSet):
    serializer_class = SystemAnalysisSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['risk_level']
    ordering_fields = ['created_at', 'fsfvi_value', 'average_vulnerability']
    ordering = ['-created_at']
    
    def get_queryset(self):
        return SystemAnalysis.objects.filter(session__user=self.request.user)

class OptimizationResultViewSet(viewsets.ModelViewSet):
    serializer_class = OptimizationResultSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['optimization_method']
    ordering_fields = ['created_at', 'improvement_potential', 'efficiency_index']
    ordering = ['-created_at']
    
    def get_queryset(self):
        return OptimizationResult.objects.filter(session__user=self.request.user)

class ScenarioAnalysisViewSet(viewsets.ModelViewSet):
    serializer_class = ScenarioAnalysisSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['scenario_name']
    search_fields = ['scenario_name']
    ordering_fields = ['created_at', 'shock_magnitude', 'scenario_fsfvi']
    ordering = ['-created_at']
    
    def get_queryset(self):
        return ScenarioAnalysis.objects.filter(session__user=self.request.user)

class ReportViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['report_type']
    search_fields = ['report_type', 'executive_summary']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        return Report.objects.filter(session__user=self.request.user)

class WeightAdjustmentViewSet(viewsets.ModelViewSet):
    serializer_class = WeightAdjustmentSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['priority_setting']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        return WeightAdjustment.objects.filter(session__user=self.request.user)

# Dashboard and Analytics Views
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_summary(request):
    """Get dashboard summary for current user"""
    user = request.user
    
    # Get user's sessions
    sessions = FSFVISession.objects.filter(user=user)
    
    # Calculate statistics
    total_sessions = sessions.count()
    active_sessions = sessions.filter(status='active').count()
    completed_sessions = sessions.exclude(status='active').count()
    
    # Get latest sessions
    recent_sessions = sessions.order_by('-created_at')[:5]
    
    # Get analysis statistics
    analyses = SystemAnalysis.objects.filter(session__user=user)
    avg_fsfvi = analyses.aggregate(avg_fsfvi=Avg('fsfvi_value'))['avg_fsfvi'] or 0
    
    # Risk level distribution
    risk_distribution = analyses.values('risk_level').annotate(count=Count('risk_level'))
    
    # Get component distribution from the most recent session
    component_distribution = []
    latest_session = sessions.order_by('-created_at').first()
    
    if latest_session:
        components = latest_session.components.all()
        total_budget = latest_session.total_budget
        
        for component in components:
            component_distribution.append({
                'component_type': component.component_type,
                'component_name': component.component_name,
                'allocation': component.financial_allocation,
                'percentage': round((component.financial_allocation / total_budget * 100), 1) if total_budget > 0 else 0,
                'vulnerability': component.vulnerability if component.vulnerability else None,
                'priority_level': component.priority_level or 'medium'
            })
    
    # Calculate additional statistics
    total_countries = sessions.values('country_name').distinct().count()
    total_budget_analyzed = sessions.aggregate(total=Avg('total_budget'))['total'] or 0
    
    return Response({
        'user': UserSerializer(user).data,
        'statistics': {
            'total_sessions': total_sessions,
            'active_sessions': active_sessions,
            'completed_sessions': completed_sessions,
            'average_fsfvi': round(avg_fsfvi, 2),
            'total_analyses': analyses.count(),
            'total_countries': total_countries,
            'total_budget_analyzed': round(total_budget_analyzed, 1),
            'risk_distribution': list(risk_distribution)
        },
        'recent_sessions': SessionSummarySerializer(recent_sessions, many=True).data,
        'component_distribution': {
            'session_id': str(latest_session.id) if latest_session else None,
            'country_name': latest_session.country_name if latest_session else None,
            'total_budget': latest_session.total_budget if latest_session else 0,
            'components': component_distribution
        }
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def analytics_overview(request):
    """Get detailed analytics for user's sessions"""
    user = request.user
    
    # Time-based analysis
    sessions_by_month = (FSFVISession.objects
                        .filter(user=user)
                        .extra(select={'month': "strftime('%%Y-%%m', created_at)"})
                        .values('month')
                        .annotate(count=Count('id'))
                        .order_by('month'))
    
    # Country analysis
    countries_analyzed = (FSFVISession.objects
                         .filter(user=user)
                         .values('country_name')
                         .annotate(
                             session_count=Count('id'),
                             avg_fsfvi=Avg('system_analysis__fsfvi_value'),
                             latest_analysis=Max('created_at')
                         )
                         .order_by('-session_count'))
    
    # Component performance across sessions
    component_performance = (Component.objects
                           .filter(session__user=user)
                           .values('component_type')
                           .annotate(
                               avg_vulnerability=Avg('vulnerability'),
                               avg_efficiency=Avg('efficiency_index'),
                               total_allocation=Avg('financial_allocation')
                           ))
    
    return Response({
        'temporal_analysis': {
            'sessions_by_month': list(sessions_by_month)
        },
        'geographical_analysis': {
            'countries': list(countries_analyzed)
        },
        'component_analysis': {
            'performance_by_type': list(component_performance)
        }
    })

# File Upload and Processing Views
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_csv_file(request):
    """Upload and process CSV file"""
    try:
        # Check if file is provided
        if 'file' not in request.FILES:
            return Response({'error': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        uploaded_file = request.FILES['file']
        
        # Validate file type
        if not uploaded_file.name.endswith('.csv'):
            return Response({'error': 'Only CSV files are allowed'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get additional parameters
        country_name = request.data.get('country_name', 'Unknown Country')
        fiscal_year = int(request.data.get('fiscal_year', 2024))
        currency = request.data.get('currency', 'USD')
        budget_unit = request.data.get('budget_unit', 'millions')
        
        # Read file content
        file_content = uploaded_file.read()
        
        # Process the file using data processing service
        result = data_processing_service.upload_and_process_csv(
            user=request.user,
            file_content=file_content,
            filename=uploaded_file.name,
            country_name=country_name,
            fiscal_year=fiscal_year,
            currency=currency,
            budget_unit=budget_unit
        )
        
        if result['success']:
            return Response({
                'message': result['message'],
                'session_id': result['session_id'],
                'uploaded_file_id': result['uploaded_file_id'],
                'summary': result['summary'],
                'components': result['components'],
                'next_step': 'Use session_id to proceed with analysis'
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                'error': result['error'],
                'session_id': result.get('session_id'),
                'uploaded_file_id': result.get('uploaded_file_id')
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({'error': f'Upload failed: {str(e)}'}, 
                       status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_uploaded_files(request):
    """Get all uploaded files for current user"""
    try:
        files = data_processing_service.get_user_files(request.user)
        return Response({'files': files})
    except Exception as e:
        return Response({'error': f'Failed to retrieve files: {str(e)}'}, 
                       status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_session_with_file(request, session_id):
    """Get session information including uploaded file details"""
    try:
        session_data = data_processing_service.get_session_with_file_info(session_id, request.user)
        
        if session_data:
            return Response(session_data)
        else:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        return Response({'error': f'Failed to retrieve session: {str(e)}'}, 
                       status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def reprocess_uploaded_file(request, session_id):
    """Reprocess an uploaded file"""
    try:
        result = data_processing_service.reprocess_file(session_id, request.user)
        
        if result['success']:
            return Response({
                'message': 'File reprocessed successfully',
                'summary': result['summary'],
                'components': result['components_summary']
            })
        else:
            return Response({'error': result['error']}, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({'error': f'Reprocessing failed: {str(e)}'}, 
                       status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_session_and_file(request, session_id):
    """Delete session and associated uploaded file"""
    try:
        success = data_processing_service.delete_file_and_session(session_id, request.user)
        
        if success:
            return Response({'message': 'Session and file deleted successfully'})
        else:
            return Response({'error': 'Session not found'}, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        return Response({'error': f'Deletion failed: {str(e)}'}, 
                       status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Uploaded File ViewSet
class UploadedFileViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = UploadedFileSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['processing_status']
    ordering_fields = ['uploaded_at', 'file_size']
    ordering = ['-uploaded_at']
    
    def get_queryset(self):
        return UploadedFile.objects.filter(user=self.request.user)

# Utility Functions for FastAPI Integration
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_session_from_fastapi(request):
    """Create FSFVI session from FastAPI data"""
    data = request.data
    
    # Create session
    session_data = {
        'country_name': data.get('country_name'),
        'fiscal_year': data.get('fiscal_year', 2024),
        'currency': data.get('currency', 'USD'),
        'budget_unit': data.get('budget_unit', 'millions'),
        'total_budget': data.get('total_budget', 0),
        'method_used': data.get('method_used', 'hybrid'),
        'scenario': data.get('scenario', 'normal_operations')
    }
    
    session_serializer = FSFVISessionCreateSerializer(data=session_data)
    session_serializer.is_valid(raise_exception=True)
    session = session_serializer.save(user=request.user)
    
    # Create components
    components_data = data.get('components', [])
    for comp_data in components_data:
        comp_data['session'] = session.id
        component_serializer = ComponentSerializer(data=comp_data)
        component_serializer.is_valid(raise_exception=True)
        component_serializer.save()
    
    return Response({
        'session_id': str(session.id),
        'message': 'Session created successfully',
        'session': FSFVISessionSerializer(session).data
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_analysis_results(request):
    """Save analysis results from FastAPI"""
    data = request.data
    session_id = data.get('session_id')
    
    try:
        session = FSFVISession.objects.get(id=session_id, user=request.user)
        
        # Create or update system analysis
        analysis_data = data.get('analysis', {})
        analysis_data['session'] = session.id
        
        analysis, created = SystemAnalysis.objects.get_or_create(
            session=session,
            defaults=analysis_data
        )
        
        if not created:
            for key, value in analysis_data.items():
                if key != 'session':
                    setattr(analysis, key, value)
            analysis.save()
        
        return Response({
            'message': 'Analysis results saved successfully',
            'analysis_id': analysis.id
        })
        
    except FSFVISession.DoesNotExist:
        return Response({'error': 'Session not found'}, 
                       status=status.HTTP_404_NOT_FOUND)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def save_optimization_results(request):
    """Save optimization results from FastAPI"""
    data = request.data
    session_id = data.get('session_id')
    
    try:
        session = FSFVISession.objects.get(id=session_id, user=request.user)
        
        # Create optimization result
        optimization_data = data.get('optimization', {})
        optimization_data['session'] = session.id
        
        optimization, created = OptimizationResult.objects.get_or_create(
            session=session,
            defaults=optimization_data
        )
        
        if not created:
            for key, value in optimization_data.items():
                if key != 'session':
                    setattr(optimization, key, value)
            optimization.save()
        
        # Save component optimizations
        component_optimizations = data.get('component_optimizations', [])
        for comp_opt_data in component_optimizations:
            comp_opt_data['optimization'] = optimization.id
            ComponentOptimization.objects.update_or_create(
                optimization=optimization,
                component_id=comp_opt_data.get('component_id'),
                defaults=comp_opt_data
            )
        
        return Response({
            'message': 'Optimization results saved successfully',
            'optimization_id': optimization.id
        })
        
    except FSFVISession.DoesNotExist:
        return Response({'error': 'Session not found'}, 
                       status=status.HTTP_404_NOT_FOUND)

# API Documentation Endpoints for Developers
@api_view(['GET'])
@permission_classes([AllowAny])
def api_documentation_overview(request):
    """
    Comprehensive API documentation overview for government developers
    """
    return Response({
        'fsfvi_api_documentation': {
            'overview': {
                'title': 'FSFVI Analysis API',
                'version': '3.1.0',
                'description': 'Complete API for Food System Financing Vulnerability Index analysis',
                'target_users': 'Government agencies, international organizations, research institutions',
                'architecture': 'Hybrid Django + FastAPI system for optimal performance'
            },
            'api_endpoints': {
                'authentication': {
                    'base_url': 'http://localhost:8000',
                    'endpoints': {
                        'register': 'POST /auth/register/',
                        'login': 'POST /auth/login/',
                        'logout': 'POST /auth/logout/',
                        'profile': 'GET /auth/profile/'
                    }
                },
                'data_management': {
                    'base_url': 'http://localhost:8000', 
                    'endpoints': {
                        'upload_csv': 'POST /upload-csv/',
                        'user_files': 'GET /my-files/',
                        'session_info': 'GET /sessions/{session_id}/file-info/',
                        'reprocess': 'POST /sessions/{session_id}/reprocess/',
                        'delete_session': 'DELETE /sessions/{session_id}/delete/'
                    }
                },
                'analysis_engine': {
                    'base_url': 'http://localhost:8001',
                    'endpoints': {
                        'upload_data': 'POST /upload_data',
                        'analyze_system': 'POST /analyze_system',
                        'current_distribution': 'POST /analyze_current_distribution',
                        'performance_gaps': 'POST /calculate_performance_gaps',
                        'component_vulnerabilities': 'POST /calculate_component_vulnerabilities',
                        'system_vulnerability': 'POST /calculate_system_vulnerability',
                        'optimize_allocation': 'POST /optimize_allocation',
                        'generate_reports': 'POST /generate_reports'
                    }
                },
                'system_information': {
                    'base_url': 'http://localhost:8001',
                    'endpoints': {
                        'health_check': 'GET /',
                        'validate_system': 'GET /validate_system',
                        'sensitivity_info': 'GET /explain_sensitivity_parameters'
                    }
                }
            },
            'workflows': {
                'basic_analysis': {
                    'steps': [
                        '1. Authenticate with Django backend',
                        '2. Upload CSV data via FastAPI',
                        '3. Run system analysis',
                        '4. Retrieve results',
                        '5. Optional: Run optimization'
                    ],
                    'estimated_time': '2-5 minutes depending on data size'
                },
                'comprehensive_analysis': {
                    'steps': [
                        '1. Data upload and validation',
                        '2. Current distribution analysis',
                        '3. Performance gap calculation',
                        '4. Component vulnerability assessment',
                        '5. System-level FSFVI calculation',
                        '6. Allocation optimization',
                        '7. Report generation'
                    ],
                    'estimated_time': '5-15 minutes for complete workflow'
                }
            },
            'data_requirements': {
                'mandatory_data': [
                    'Component names (unique identifiers)',
                    'Financial allocations (in consistent units)',
                    'Current performance values',
                    'Target/benchmark performance values'
                ],
                'optional_data': [
                    'Component type classifications',
                    'Custom weighting factors',
                    'Sensitivity parameters'
                ],
                'data_quality': {
                    'minimum_components': 2,
                    'maximum_components': 50,
                    'budget_range': '$1M - $1T',
                    'data_completeness': '100% for required fields'
                }
            },
            'output_formats': {
                'analysis_results': {
                    'fsfvi_score': 'Float [0,1] - Overall system vulnerability',
                    'risk_level': 'String - Low/Medium/High/Critical classification',
                    'component_vulnerabilities': 'Array of component-specific results',
                    'performance_gaps': 'Performance analysis by component',
                    'optimization_recommendations': 'Suggested allocation improvements'
                },
                'visualization_data': {
                    'charts': 'Data formatted for common charting libraries',
                    'tables': 'Structured data for tabular display',
                    'maps': 'Geographic visualization support where applicable'
                }
            },
            'error_handling': {
                'common_errors': {
                    '400': 'Invalid input data - check CSV format and content',
                    '401': 'Authentication required - verify token',
                    '404': 'Session not found - check session ID',
                    '500': 'Server error - contact support'
                },
                'debugging': {
                    'logs': 'Detailed error logs available',
                    'validation': 'Input validation with specific error messages',
                    'support': 'System health checks and diagnostics available'
                }
            }
        },
        'integration_support': {
            'code_examples': 'Available at /api/developer/integration-guide/',
            'data_format': 'Detailed format specification at /api/developer/data-format/',
            'response_format': 'Response format reference at /api/developer/response-format/',
            'interactive_docs': 'FastAPI documentation at http://localhost:8001/docs'
        },
        'deployment_guidance': {
            'development': {
                'django_server': 'python manage.py runserver 8000',
                'fastapi_server': 'uvicorn main:app --host 0.0.0.0 --port 8001',
                'requirements': 'Install requirements.txt dependencies'
            },
            'production': {
                'web_server': 'Use Nginx or Apache as reverse proxy',
                'application_server': 'Deploy with Gunicorn/uWSGI for Django, Uvicorn for FastAPI',
                'database': 'PostgreSQL recommended for production',
                'security': 'HTTPS, proper authentication, rate limiting',
                'monitoring': 'Health checks, logging, performance monitoring'
            },
            'scaling': {
                'horizontal': 'Load balancer with multiple app instances',
                'vertical': 'Increase CPU/memory for analysis workloads',
                'caching': 'Redis for session and result caching',
                'database': 'Connection pooling and read replicas'
            }
        }
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def deployment_guide(request):
    """
    Detailed deployment guide for production environments
    """
    return Response({
        'deployment_guide': {
            'overview': {
                'architecture': 'Django + FastAPI microservices architecture',
                'components': ['Django backend (port 8000)', 'FastAPI analysis engine (port 8001)', 'Database (PostgreSQL)', 'File storage', 'Web server (Nginx)'],
                'requirements': 'Python 3.9+, PostgreSQL 12+, Redis (optional but recommended)'
            },
            'environment_setup': {
                'development': {
                    'python_version': '3.9 or higher',
                    'database': 'SQLite (included) or PostgreSQL',
                    'dependencies': 'pip install -r requirements.txt',
                    'environment_variables': {
                        'DEBUG': 'True',
                        'SECRET_KEY': 'django-secret-key',
                        'DATABASE_URL': 'optional for PostgreSQL',
                        'CORS_ALLOWED_ORIGINS': 'http://localhost:3000'
                    },
                    'startup_commands': [
                        'cd backend/django_app && python manage.py migrate',
                        'python manage.py runserver 8000',
                        'cd backend/fastapi_app && uvicorn main:app --port 8001'
                    ]
                },
                'production': {
                    'server_requirements': {
                        'cpu': '2+ cores for basic deployment, 4+ cores for high load',
                        'memory': '4GB minimum, 8GB+ recommended',
                        'storage': '50GB+ with backup strategy',
                        'network': 'Stable internet connection for API access'
                    },
                    'python_environment': {
                        'version': 'Python 3.9+',
                        'virtual_environment': 'Required - use venv or conda',
                        'dependencies': 'pip install -r requirements.txt --no-cache-dir'
                    },
                    'database_setup': {
                        'postgresql_config': {
                            'version': 'PostgreSQL 12+',
                            'database_name': 'fsfvi_production',
                            'user_setup': 'Create dedicated database user',
                            'connection_pooling': 'Recommended for high load',
                            'backup_strategy': 'Daily automated backups required'
                        },
                        'environment_variables': {
                            'DATABASE_URL': 'postgresql://user:password@host:port/dbname',
                            'DATABASE_SSL': 'True for cloud deployments'
                        }
                    },
                    'application_servers': {
                        'django': {
                            'server': 'Gunicorn or uWSGI',
                            'configuration': 'gunicorn --bind 127.0.0.1:8000 wsgi:application',
                            'workers': '2-4 workers recommended',
                            'timeout': '60 seconds for analysis operations'
                        },
                        'fastapi': {
                            'server': 'Uvicorn with Gunicorn workers',
                            'configuration': 'gunicorn -k uvicorn.workers.UvicornWorker --bind 127.0.0.1:8001 main:app',
                            'workers': '2-4 workers for CPU-intensive analysis',
                            'worker_class': 'uvicorn.workers.UvicornWorker'
                        }
                    },
                    'web_server': {
                        'nginx_config': '''
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Django backend
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # FastAPI analysis engine
    location /analysis/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Increase timeout for analysis operations
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
    
    # Static files
    location /static/ {
        alias /path/to/static/files/;
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
    
    # Media files
    location /media/ {
        alias /path/to/media/files/;
        expires 30d;
        add_header Cache-Control "private";
    }
}
                        '''
                    }
                }
            },
            'security_considerations': {
                'authentication': {
                    'token_security': 'Use strong, randomly generated tokens',
                    'token_expiration': 'Implement token expiration and refresh',
                    'password_policy': 'Enforce strong password requirements',
                    'multi_factor': 'Consider 2FA for administrative access'
                },
                'api_security': {
                    'https_only': 'Force HTTPS in production',
                    'cors_configuration': 'Restrict CORS to known domains',
                    'rate_limiting': 'Implement rate limiting per user/IP',
                    'input_validation': 'Strict validation on all inputs',
                    'file_upload_security': 'Validate and scan uploaded files'
                },
                'data_protection': {
                    'encryption_at_rest': 'Encrypt sensitive data in database',
                    'encryption_in_transit': 'Use TLS 1.2+ for all communications',
                    'data_retention': 'Implement data retention policies',
                    'audit_logging': 'Log all API access and data changes',
                    'backup_security': 'Encrypt and secure database backups'
                }
            },
            'monitoring_and_maintenance': {
                'health_checks': {
                    'application_health': 'Monitor application uptime and responsiveness',
                    'database_health': 'Monitor database connections and performance',
                    'disk_space': 'Monitor available disk space for uploads and logs',
                    'memory_usage': 'Monitor memory usage for analysis operations'
                },
                'logging': {
                    'application_logs': 'Django and FastAPI application logs',
                    'access_logs': 'Web server access logs',
                    'error_logs': 'Centralized error logging and alerting',
                    'audit_logs': 'User activity and data access logs'
                },
                'backup_strategy': {
                    'database_backup': 'Daily automated database backups',
                    'file_backup': 'Regular backup of uploaded files',
                    'configuration_backup': 'Version control for configuration files',
                    'disaster_recovery': 'Documented recovery procedures'
                },
                'performance_optimization': {
                    'database_optimization': 'Regular database maintenance and indexing',
                    'caching_strategy': 'Implement Redis for session and result caching',
                    'static_file_serving': 'Use CDN for static file delivery',
                    'analysis_optimization': 'Monitor and optimize analysis algorithms'
                }
            },
            'troubleshooting': {
                'common_issues': {
                    'database_connection': 'Check DATABASE_URL and connection settings',
                    'file_permissions': 'Ensure proper file permissions for uploads',
                    'memory_errors': 'Monitor memory usage during large analyses',
                    'timeout_errors': 'Increase timeout settings for long operations'
                },
                'debugging_tools': {
                    'django_debug_toolbar': 'For development debugging',
                    'log_analysis': 'Use log aggregation tools for production',
                    'performance_profiling': 'Profile analysis operations for optimization',
                    'health_endpoints': 'Use /validate_system for system health checks'
                }
            }
        }
    })

@api_view(['GET'])
@permission_classes([AllowAny])
def integration_examples(request):
    """
    Complete integration examples for different programming languages and frameworks
    """
    return Response({
        'integration_examples': {
            'overview': 'Code examples for integrating FSFVI API into existing government systems',
            'authentication_flow': {
                'description': 'All API calls require authentication via Django backend',
                'flow': [
                    '1. Register system account via POST /auth/register/',
                    '2. Login to obtain token via POST /auth/login/',
                    '3. Include token in Authorization header for all subsequent requests',
                    '4. Refresh token as needed to maintain session'
                ]
            },
            'python_examples': {
                'simple_analysis': '''
import requests
import json
import time

def run_fsfvi_analysis(csv_file_path, country_name, username, password):
    """Complete FSFVI analysis workflow"""
    
    # Configuration
    django_url = "http://localhost:8000"
    fastapi_url = "http://localhost:8001"
    
    # Step 1: Authenticate
    auth_response = requests.post(f"{django_url}/auth/login/", 
        json={"username": username, "password": password})
    
    if auth_response.status_code != 200:
        raise Exception(f"Authentication failed: {auth_response.json()}")
    
    token = auth_response.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # Step 2: Upload data
    with open(csv_file_path, 'rb') as file:
        files = {"file": file}
        data = {
            "country_name": country_name,
            "fiscal_year": 2024,
            "currency": "USD"
        }
        upload_response = requests.post(f"{fastapi_url}/upload_data",
            headers=headers, files=files, data=data)
    
    if upload_response.status_code != 200:
        raise Exception(f"Upload failed: {upload_response.json()}")
    
    session_id = upload_response.json()["session_id"]
    print(f"Data uploaded successfully. Session ID: {session_id}")
    
    # Step 3: Run comprehensive analysis
    analysis_data = {
        "session_id": session_id,
        "method": "hybrid",
        "scenario": "normal_operations",
        "include_optimization_preview": True
    }
    
    analysis_response = requests.post(f"{fastapi_url}/analyze_system",
        headers=headers, data=analysis_data)
    
    if analysis_response.status_code != 200:
        raise Exception(f"Analysis failed: {analysis_response.json()}")
    
    results = analysis_response.json()
    
    # Step 4: Extract key metrics
    system_fsfvi = results.get("system_fsfvi", {})
    fsfvi_score = system_fsfvi.get("fsfvi_value", 0)
    risk_level = system_fsfvi.get("risk_level", "unknown")
    
    print(f"Analysis complete for {country_name}")
    print(f"FSFVI Score: {fsfvi_score:.4f}")
    print(f"Risk Level: {risk_level}")
    
    return {
        "session_id": session_id,
        "fsfvi_score": fsfvi_score,
        "risk_level": risk_level,
        "full_results": results
    }

# Usage
results = run_fsfvi_analysis("food_system_budget.csv", "Ghana", "api_user", "secure_password")
                ''',
                'batch_analysis': '''
import requests
import pandas as pd
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

class FSFVIBatchProcessor:
    def __init__(self, django_url="http://localhost:8000", fastapi_url="http://localhost:8001"):
        self.django_url = django_url
        self.fastapi_url = fastapi_url
        self.token = None
    
    def authenticate(self, username, password):
        """Authenticate and store token"""
        response = requests.post(f"{self.django_url}/auth/login/",
            json={"username": username, "password": password})
        
        if response.status_code == 200:
            self.token = response.json()["token"]
            return True
        return False
    
    def process_country(self, country_data):
        """Process a single country's data"""
        country_name = country_data["country"]
        csv_path = country_data["csv_path"]
        
        headers = {"Authorization": f"Bearer {self.token}"}
        
        try:
            # Upload data
            with open(csv_path, 'rb') as file:
                files = {"file": file}
                data = {
                    "country_name": country_name,
                    "fiscal_year": 2024,
                    "currency": "USD"
                }
                upload_response = requests.post(f"{self.fastapi_url}/upload_data",
                    headers=headers, files=files, data=data)
            
            if upload_response.status_code != 200:
                return {"country": country_name, "error": "Upload failed", 
                       "details": upload_response.json()}
            
            session_id = upload_response.json()["session_id"]
            
            # Run analysis
            analysis_data = {
                "session_id": session_id,
                "method": "hybrid",
                "scenario": "normal_operations"
            }
            
            analysis_response = requests.post(f"{self.fastapi_url}/analyze_system",
                headers=headers, data=analysis_data)
            
            if analysis_response.status_code != 200:
                return {"country": country_name, "error": "Analysis failed",
                       "details": analysis_response.json()}
            
            results = analysis_response.json()
            system_fsfvi = results.get("system_fsfvi", {})
            
            return {
                "country": country_name,
                "session_id": session_id,
                "fsfvi_score": system_fsfvi.get("fsfvi_value", 0),
                "risk_level": system_fsfvi.get("risk_level", "unknown"),
                "total_budget": system_fsfvi.get("total_allocation_millions", 0),
                "critical_components": len(system_fsfvi.get("critical_components", [])),
                "timestamp": time.time()
            }
            
        except Exception as e:
            return {"country": country_name, "error": str(e)}
    
    def process_multiple_countries(self, countries_data, max_workers=3):
        """Process multiple countries in parallel"""
        results = []
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_country = {
                executor.submit(self.process_country, country_data): country_data["country"]
                for country_data in countries_data
            }
            
            for future in as_completed(future_to_country):
                country = future_to_country[future]
                try:
                    result = future.result()
                    results.append(result)
                    print(f"Completed analysis for {country}")
                except Exception as e:
                    results.append({"country": country, "error": str(e)})
                    print(f"Error processing {country}: {e}")
        
        return results

# Usage example
processor = FSFVIBatchProcessor()
processor.authenticate("batch_user", "secure_password")

countries = [
    {"country": "Ghana", "csv_path": "ghana_food_budget.csv"},
    {"country": "Kenya", "csv_path": "kenya_food_budget.csv"},
    {"country": "Nigeria", "csv_path": "nigeria_food_budget.csv"}
]

results = processor.process_multiple_countries(countries)

# Save results to CSV
df = pd.DataFrame(results)
df.to_csv("fsfvi_batch_results.csv", index=False)
print("Batch analysis complete. Results saved to fsfvi_batch_results.csv")
                '''
            },
            'javascript_examples': {
                'node_integration': '''
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class FSFVIClient {
    constructor(djangoUrl = 'http://localhost:8000', fastapiUrl = 'http://localhost:8001') {
        this.djangoUrl = djangoUrl;
        this.fastapiUrl = fastapiUrl;
        this.token = null;
    }
    
    async authenticate(username, password) {
        try {
            const response = await axios.post(`${this.djangoUrl}/auth/login/`, {
                username,
                password
            });
            
            this.token = response.data.token;
            return true;
        } catch (error) {
            console.error('Authentication failed:', error.response?.data || error.message);
            return false;
        }
    }
    
    async uploadData(filePath, countryName, fiscalYear = 2024, currency = 'USD') {
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath));
        formData.append('country_name', countryName);
        formData.append('fiscal_year', fiscalYear.toString());
        formData.append('currency', currency);
        
        try {
            const response = await axios.post(`${this.fastapiUrl}/upload_data`, formData, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    ...formData.getHeaders()
                }
            });
            
            return response.data;
        } catch (error) {
            throw new Error(`Upload failed: ${error.response?.data?.detail || error.message}`);
        }
    }
    
    async analyzeSystem(sessionId, method = 'hybrid', scenario = 'normal_operations') {
        const formData = new FormData();
        formData.append('session_id', sessionId);
        formData.append('method', method);
        formData.append('scenario', scenario);
        
        try {
            const response = await axios.post(`${this.fastapiUrl}/analyze_system`, formData, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    ...formData.getHeaders()
                }
            });
            
            return response.data;
        } catch (error) {
            throw new Error(`Analysis failed: ${error.response?.data?.detail || error.message}`);
        }
    }
    
    async runCompleteAnalysis(filePath, countryName) {
        console.log(`Starting FSFVI analysis for ${countryName}`);
        
        // Upload data
        const uploadResult = await this.uploadData(filePath, countryName);
        const sessionId = uploadResult.session_id;
        console.log(`Data uploaded. Session ID: ${sessionId}`);
        
        // Run analysis
        const analysisResult = await this.analyzeSystem(sessionId);
        console.log(`Analysis complete for ${countryName}`);
        
        const systemFsfvi = analysisResult.system_fsfvi || {};
        
        return {
            country: countryName,
            sessionId,
            fsfviScore: systemFsfvi.fsfvi_value || 0,
            riskLevel: systemFsfvi.risk_level || 'unknown',
            results: analysisResult
        };
    }
}

// Usage example
async function main() {
    const client = new FSFVIClient();
    
    // Authenticate
    const authenticated = await client.authenticate('api_user', 'secure_password');
    if (!authenticated) {
        console.error('Authentication failed');
        return;
    }
    
    try {
        // Run analysis
        const result = await client.runCompleteAnalysis('food_budget.csv', 'Ghana');
        
        console.log('Analysis Results:');
        console.log(`Country: ${result.country}`);
        console.log(`FSFVI Score: ${result.fsfviScore.toFixed(4)}`);
        console.log(`Risk Level: ${result.riskLevel}`);
        
    } catch (error) {
        console.error('Analysis failed:', error.message);
    }
}

main();
                ''',
                'react_integration': '''
import React, { useState, useCallback } from 'react';
import axios from 'axios';

const FSFVIAnalysis = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [token, setToken] = useState(null);
    const [analysisResults, setAnalysisResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    const authenticate = useCallback(async (username, password) => {
        try {
            const response = await axios.post('http://localhost:8000/auth/login/', {
                username,
                password
            });
            
            setToken(response.data.token);
            setIsAuthenticated(true);
            setError(null);
            return true;
        } catch (err) {
            setError('Authentication failed');
            return false;
        }
    }, []);
    
    const uploadAndAnalyze = useCallback(async (file, countryName) => {
        if (!token) {
            setError('Not authenticated');
            return;
        }
        
        setLoading(true);
        setError(null);
        
        try {
            // Upload file
            const formData = new FormData();
            formData.append('file', file);
            formData.append('country_name', countryName);
            formData.append('fiscal_year', '2024');
            formData.append('currency', 'USD');
            
            const uploadResponse = await axios.post(
                'http://localhost:8001/upload_data',
                formData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            
            const sessionId = uploadResponse.data.session_id;
            
            // Run analysis
            const analysisFormData = new FormData();
            analysisFormData.append('session_id', sessionId);
            analysisFormData.append('method', 'hybrid');
            analysisFormData.append('scenario', 'normal_operations');
            
            const analysisResponse = await axios.post(
                'http://localhost:8001/analyze_system',
                analysisFormData,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data'
                    }
                }
            );
            
            setAnalysisResults(analysisResponse.data);
            
        } catch (err) {
            setError(`Analysis failed: ${err.response?.data?.detail || err.message}`);
        } finally {
            setLoading(false);
        }
    }, [token]);
    
    return (
        <div className="fsfvi-analysis">
            <h2>FSFVI Analysis Integration</h2>
            
            {!isAuthenticated ? (
                <AuthenticationForm onAuthenticate={authenticate} />
            ) : (
                <div>
                    <AnalysisForm 
                        onSubmit={uploadAndAnalyze} 
                        loading={loading} 
                    />
                    
                    {error && (
                        <div className="error">
                            <p>Error: {error}</p>
                        </div>
                    )}
                    
                    {analysisResults && (
                        <AnalysisResults results={analysisResults} />
                    )}
                </div>
            )}
        </div>
    );
};

const AuthenticationForm = ({ onAuthenticate }) => {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        await onAuthenticate(credentials.username, credentials.password);
    };
    
    return (
        <form onSubmit={handleSubmit}>
            <div>
                <label>Username:</label>
                <input
                    type="text"
                    value={credentials.username}
                    onChange={(e) => setCredentials(prev => ({...prev, username: e.target.value}))}
                    required
                />
            </div>
            <div>
                <label>Password:</label>
                <input
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials(prev => ({...prev, password: e.target.value}))}
                    required
                />
            </div>
            <button type="submit">Authenticate</button>
        </form>
    );
};

export default FSFVIAnalysis;
                '''
            }
        }
    })
