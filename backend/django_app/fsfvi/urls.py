from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.authtoken.views import obtain_auth_token

from . import views

# Create router for ViewSets
router = DefaultRouter()
router.register(r'sessions', views.FSFVISessionViewSet, basename='session')
router.register(r'components', views.ComponentViewSet, basename='component')
router.register(r'analyses', views.SystemAnalysisViewSet, basename='analysis')
router.register(r'optimizations', views.OptimizationResultViewSet, basename='optimization')
router.register(r'scenarios', views.ScenarioAnalysisViewSet, basename='scenario')
router.register(r'reports', views.ReportViewSet, basename='report')
router.register(r'weight-adjustments', views.WeightAdjustmentViewSet, basename='weight-adjustment')
router.register(r'uploaded-files', views.UploadedFileViewSet, basename='uploaded-file')

urlpatterns = [
    # Health check endpoint (only public endpoint outside django-api)
    path('health/', views.health_check, name='health-check'),
    
    # ALL Django endpoints under django-api/ prefix to avoid conflicts with FastAPI
    path('django-api/', include([
        # Dashboard and Analytics
        path('dashboard/', views.dashboard_summary, name='dashboard'),
        path('analytics/', views.analytics_overview, name='analytics'),
        
        # Authentication endpoints
        path('auth/register/', views.RegisterView.as_view(), name='register'),
        path('auth/login/', views.LoginView.as_view(), name='login'),
        path('auth/logout/', views.logout_view, name='logout'),
        path('auth/profile/', views.user_profile, name='user-profile'),
        path('auth/token/', obtain_auth_token, name='api-token-auth'),
        
        # File Upload and Processing endpoints
        path('upload-csv/', views.upload_csv_file, name='upload-csv'),
        path('upload-dummy-data/', views.upload_dummy_data, name='upload-dummy-data'),
        path('my-files/', views.get_user_uploaded_files, name='user-files'),
        path('sessions/<str:session_id>/file-info/', views.get_session_with_file, name='session-file-info'),
        path('sessions/<str:session_id>/reprocess/', views.reprocess_uploaded_file, name='reprocess-file'),
        path('sessions/<str:session_id>/delete/', views.delete_session_and_file, name='delete-session'),
        
        # FastAPI Integration endpoints
        path('fastapi/create-session/', views.create_session_from_fastapi, name='create-session-fastapi'),
        path('fastapi/save-analysis/', views.save_analysis_results, name='save-analysis-fastapi'),
        path('fastapi/save-optimization/', views.save_optimization_results, name='save-optimization-fastapi'),
        
        # Include router URLs (sessions, components, analyses, etc.)
        path('', include(router.urls)),
    ])),
] 
