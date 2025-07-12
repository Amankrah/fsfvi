from django.contrib.auth.models import User
from django.contrib.auth import login, logout
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
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
@method_decorator(csrf_exempt, name='dispatch')
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

@method_decorator(csrf_exempt, name='dispatch')
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

@csrf_exempt
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
@csrf_exempt
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

@csrf_exempt
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
@csrf_exempt
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

@csrf_exempt
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

@csrf_exempt
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

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Simple health check endpoint for monitoring and load balancer"""
    from django.db import connection
    from django.core.cache import cache
    import redis
    from datetime import datetime
    
    health_status = {
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'service': 'django-backend',
        'version': '1.0.0',
        'checks': {}
    }
    
    try:
        # Database check
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            health_status['checks']['database'] = 'healthy'
    except Exception as e:
        health_status['checks']['database'] = f'unhealthy: {str(e)}'
        health_status['status'] = 'degraded'
    
    try:
        # Cache/Redis check
        cache.set('health_check', 'ok', 10)
        if cache.get('health_check') == 'ok':
            health_status['checks']['cache'] = 'healthy'
        else:
            health_status['checks']['cache'] = 'unhealthy: cache test failed'
            health_status['status'] = 'degraded'
    except Exception as e:
        health_status['checks']['cache'] = f'unhealthy: {str(e)}'
        health_status['status'] = 'degraded'
    
    try:
        # Django models check
        from .models import FSFVISession
        session_count = FSFVISession.objects.count()
        health_status['checks']['models'] = 'healthy'
        health_status['data'] = {'total_sessions': session_count}
    except Exception as e:
        health_status['checks']['models'] = f'unhealthy: {str(e)}'
        health_status['status'] = 'degraded'
    
    # Return appropriate HTTP status
    status_code = 200 if health_status['status'] == 'healthy' else 503
    return Response(health_status, status=status_code)

@csrf_exempt
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_dummy_data(request):
    """Upload and process dummy data for testing"""
    try:
        # Get additional parameters
        country_name = request.data.get('country_name', 'Sample Country')
        fiscal_year = int(request.data.get('fiscal_year', 2024))
        currency = request.data.get('currency', 'USD')
        budget_unit = request.data.get('budget_unit', 'millions')
        
        # Get dummy data from FastAPI
        import requests
        fastapi_url = "http://localhost:8001/dummy_data"
        
        try:
            response = requests.get(fastapi_url)
            response.raise_for_status()
            dummy_data = response.json()
        except requests.RequestException as e:
            return Response({
                'error': f'Failed to fetch dummy data from FastAPI: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Create a virtual file from the dummy data
        from django.core.files.base import ContentFile
        csv_content = dummy_data['csv_content']
        virtual_file = ContentFile(csv_content.encode('utf-8'), name='dummy_data_sample.csv')
        
        # Process the dummy data using the existing service
        result = data_processing_service.upload_and_process_csv(
            user=request.user,
            file_content=virtual_file.read(),
            filename='dummy_data_sample.csv',
            country_name=country_name,
            fiscal_year=fiscal_year,
            currency=currency,
            budget_unit=budget_unit
        )
        
        if result['success']:
            return Response({
                'message': 'Dummy data uploaded and processed successfully',
                'session_id': result['session_id'],
                'uploaded_file_id': result['uploaded_file_id'],
                'summary': result['summary'],
                'components': result['components'],
                'data_info': {
                    'rows': dummy_data['rows'],
                    'columns': dummy_data['columns'],
                    'preview': dummy_data['data_preview']
                },
                'next_step': 'Use session_id to proceed with analysis'
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                'error': result['error'],
                'session_id': result.get('session_id'),
                'uploaded_file_id': result.get('uploaded_file_id')
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return Response({'error': f'Dummy data upload failed: {str(e)}'}, 
                       status=status.HTTP_500_INTERNAL_SERVER_ERROR)


