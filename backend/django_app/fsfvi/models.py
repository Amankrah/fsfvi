from django.db import models
from django.contrib.auth.models import User
import uuid
import json
import os

class FSFVISession(models.Model):
    """Stores a complete FSFVI analysis session"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    country_name = models.CharField(max_length=100)
    fiscal_year = models.IntegerField()
    currency = models.CharField(max_length=10, default="USD")
    budget_unit = models.CharField(max_length=20, default="millions")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    status = models.CharField(max_length=20, default="active")
    
    # Analysis metadata
    total_budget = models.FloatField()
    method_used = models.CharField(max_length=50, default="hybrid")
    scenario = models.CharField(max_length=50, default="normal_operations")
    
    class Meta:
        app_label = 'fsfvi'
        ordering = ['-created_at']

class UploadedFile(models.Model):
    """Stores metadata about uploaded CSV files"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    session = models.OneToOneField(FSFVISession, on_delete=models.CASCADE, related_name='uploaded_file', null=True, blank=True)
    original_filename = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)  # Path to uploaded CSV
    file_size = models.BigIntegerField()  # File size in bytes
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    # Processing status
    processing_status = models.CharField(max_length=20, default="uploaded", choices=[
        ('uploaded', 'Uploaded'),
        ('processing', 'Processing'),
        ('processed', 'Processed'),
        ('error', 'Error')
    ])
    processing_log = models.TextField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    
    # Data summary from processing
    total_records = models.IntegerField(null=True, blank=True)
    component_types_found = models.JSONField(null=True, blank=True)
    data_quality_score = models.FloatField(null=True, blank=True)
    
    def get_file_path(self):
        """Get the full file path"""
        return self.file_path
    
    def delete_file(self):
        """Delete the physical file"""
        try:
            if os.path.exists(self.file_path):
                os.remove(self.file_path)
                return True
        except Exception as e:
            print(f"Error deleting file {self.file_path}: {e}")
        return False
    
    class Meta:
        app_label = 'fsfvi'
        ordering = ['-uploaded_at']

class Component(models.Model):
    """Stores individual component data"""
    session = models.ForeignKey(FSFVISession, on_delete=models.CASCADE, related_name='components')
    component_id = models.UUIDField(default=uuid.uuid4, editable=False)
    component_name = models.CharField(max_length=100)
    component_type = models.CharField(max_length=50)
    observed_value = models.FloatField()
    benchmark_value = models.FloatField()
    financial_allocation = models.FloatField()
    weight = models.FloatField()
    sensitivity_parameter = models.FloatField()
    
    # Performance metrics
    performance_gap = models.FloatField(null=True)
    vulnerability = models.FloatField(null=True)
    weighted_vulnerability = models.FloatField(null=True)
    efficiency_index = models.FloatField(null=True)
    priority_level = models.CharField(max_length=20, null=True)
    
    class Meta:
        app_label = 'fsfvi'
        ordering = ['component_type', 'component_name']

class SystemAnalysis(models.Model):
    """Stores system-level FSFVI analysis results"""
    session = models.OneToOneField(FSFVISession, on_delete=models.CASCADE, related_name='system_analysis')
    fsfvi_value = models.FloatField()
    total_allocation = models.FloatField()
    average_vulnerability = models.FloatField()
    max_vulnerability = models.FloatField()
    risk_level = models.CharField(max_length=20)
    priority_counts = models.JSONField()  # Stores counts by priority level
    
    # Additional metrics
    allocation_concentration = models.FloatField(null=True)
    vulnerability_concentration = models.FloatField(null=True)
    diversification_index = models.FloatField(null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        app_label = 'fsfvi'

class OptimizationResult(models.Model):
    """Stores optimization results"""
    session = models.OneToOneField(FSFVISession, on_delete=models.CASCADE, related_name='optimization')
    original_fsfvi = models.FloatField()
    optimized_fsfvi = models.FloatField()
    improvement_potential = models.FloatField()
    reallocation_intensity = models.FloatField()
    optimization_method = models.CharField(max_length=50)
    constraints = models.JSONField(null=True)
    
    # Efficiency metrics
    absolute_gap = models.FloatField()
    gap_ratio = models.FloatField()
    efficiency_index = models.FloatField()
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        app_label = 'fsfvi'

class ComponentOptimization(models.Model):
    """Stores optimized allocations for each component"""
    optimization = models.ForeignKey(OptimizationResult, on_delete=models.CASCADE, related_name='component_optimizations')
    component = models.ForeignKey(Component, on_delete=models.CASCADE)
    original_allocation = models.FloatField()
    optimized_allocation = models.FloatField()
    allocation_change = models.FloatField()
    allocation_change_percent = models.FloatField()
    implementation_complexity = models.CharField(max_length=20, null=True)
    reallocation_priority = models.CharField(max_length=20, null=True)
    
    class Meta:
        app_label = 'fsfvi'
        ordering = ['-allocation_change_percent']

class ScenarioAnalysis(models.Model):
    """Stores scenario simulation results"""
    session = models.ForeignKey(FSFVISession, on_delete=models.CASCADE, related_name='scenarios')
    scenario_name = models.CharField(max_length=50)
    shock_magnitude = models.FloatField()
    baseline_fsfvi = models.FloatField()
    scenario_fsfvi = models.FloatField()
    impact_analysis = models.JSONField()
    recovery_analysis = models.JSONField(null=True)
    resilience_assessment = models.JSONField(null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        app_label = 'fsfvi'
        ordering = ['-created_at']

class Report(models.Model):
    """Stores generated reports"""
    session = models.ForeignKey(FSFVISession, on_delete=models.CASCADE, related_name='reports')
    report_type = models.CharField(max_length=50)
    report_data = models.JSONField()
    executive_summary = models.TextField(null=True)
    technical_details = models.JSONField(null=True)
    visualizations = models.JSONField(null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        app_label = 'fsfvi'
        ordering = ['-created_at']

class WeightAdjustment(models.Model):
    """Stores weight adjustment history"""
    session = models.ForeignKey(FSFVISession, on_delete=models.CASCADE, related_name='weight_adjustments')
    component = models.ForeignKey(Component, on_delete=models.CASCADE)
    original_weight = models.FloatField()
    adjusted_weight = models.FloatField()
    adjustment_reason = models.TextField(null=True)
    priority_setting = models.CharField(max_length=20, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        app_label = 'fsfvi'
        ordering = ['-created_at']
