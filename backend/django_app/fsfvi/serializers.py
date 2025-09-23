from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from .models import (
    FSFVISession, Component, SystemAnalysis, OptimizationResult, 
    ComponentOptimization, ScenarioAnalysis, Report, WeightAdjustment, UploadedFile
)

# User Authentication Serializers
class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ('username', 'email', 'first_name', 'last_name', 'password', 'password_confirm')
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("Passwords don't match")
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        user = User.objects.create_user(**validated_data)
        return user

class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            user = authenticate(username=username, password=password)
            if not user:
                raise serializers.ValidationError('Invalid credentials')
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled')
            attrs['user'] = user
        else:
            raise serializers.ValidationError('Must include username and password')
        
        return attrs

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name', 'date_joined')
        read_only_fields = ('id', 'date_joined')

# FSFVI Model Serializers
class UploadedFileSerializer(serializers.ModelSerializer):
    file_size_mb = serializers.SerializerMethodField()
    
    class Meta:
        model = UploadedFile
        fields = ('id', 'original_filename', 'file_size', 'file_size_mb', 'uploaded_at', 
                 'processing_status', 'processing_log', 'error_message', 
                 'total_records', 'component_types_found', 'data_quality_score')
        read_only_fields = ('id', 'uploaded_at', 'processing_status', 'processing_log', 
                           'error_message', 'total_records', 'component_types_found', 
                           'data_quality_score')
    
    def get_file_size_mb(self, obj):
        return round(obj.file_size / (1024 * 1024), 2) if obj.file_size else 0

class ComponentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Component
        fields = '__all__'
        read_only_fields = ('component_id',)

class FSFVISessionSerializer(serializers.ModelSerializer):
    components = ComponentSerializer(many=True, read_only=True)
    user = UserSerializer(read_only=True)
    uploaded_file = UploadedFileSerializer(read_only=True)
    
    class Meta:
        model = FSFVISession
        fields = '__all__'
        read_only_fields = ('id', 'user', 'created_at', 'updated_at')

class FSFVISessionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FSFVISession
        fields = ('country_name', 'fiscal_year', 'currency', 'budget_unit', 
                 'total_budget', 'method_used', 'scenario')

class SystemAnalysisSerializer(serializers.ModelSerializer):
    session = FSFVISessionSerializer(read_only=True)
    
    class Meta:
        model = SystemAnalysis
        fields = '__all__'
        read_only_fields = ('created_at',)

class ComponentOptimizationSerializer(serializers.ModelSerializer):
    component = ComponentSerializer(read_only=True)
    
    class Meta:
        model = ComponentOptimization
        fields = '__all__'

class OptimizationResultSerializer(serializers.ModelSerializer):
    session = FSFVISessionSerializer(read_only=True)
    component_optimizations = ComponentOptimizationSerializer(many=True, read_only=True)
    
    class Meta:
        model = OptimizationResult
        fields = '__all__'
        read_only_fields = ('created_at',)

class ScenarioAnalysisSerializer(serializers.ModelSerializer):
    session = FSFVISessionSerializer(read_only=True)
    
    class Meta:
        model = ScenarioAnalysis
        fields = '__all__'
        read_only_fields = ('created_at',)

class ReportSerializer(serializers.ModelSerializer):
    session = FSFVISessionSerializer(read_only=True)
    
    class Meta:
        model = Report
        fields = '__all__'
        read_only_fields = ('created_at',)

class WeightAdjustmentSerializer(serializers.ModelSerializer):
    session = FSFVISessionSerializer(read_only=True)
    component = ComponentSerializer(read_only=True)
    
    class Meta:
        model = WeightAdjustment
        fields = '__all__'
        read_only_fields = ('created_at',)

# Summary Serializers
class SessionSummarySerializer(serializers.ModelSerializer):
    components_count = serializers.SerializerMethodField()
    latest_analysis = serializers.SerializerMethodField()
    optimization_status = serializers.SerializerMethodField()
    
    class Meta:
        model = FSFVISession
        fields = ('id', 'country_name', 'fiscal_year', 'currency', 'budget_unit',
                 'total_budget', 'status', 'created_at', 'updated_at',
                 'components_count', 'latest_analysis', 'optimization_status')
    
    def get_components_count(self, obj):
        return obj.components.count()
    
    def get_latest_analysis(self, obj):
        analysis = obj.system_analysis if hasattr(obj, 'system_analysis') else None
        return {
            'fsfvi_value': analysis.fsfvi_value if analysis else None,
            'risk_level': analysis.risk_level if analysis else None,
            'analyzed_at': analysis.created_at if analysis else None
        }
    
    def get_optimization_status(self, obj):
        optimization = obj.optimization if hasattr(obj, 'optimization') else None
        return {
            'has_optimization': optimization is not None,
            'improvement_potential': optimization.improvement_potential if optimization else None,
            'optimized_at': optimization.created_at if optimization else None
        }
