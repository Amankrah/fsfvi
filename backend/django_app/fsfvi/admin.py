from django.contrib import admin
from .models import (
    FSFVISession, UploadedFile, Component, SystemAnalysis, 
    OptimizationResult, ComponentOptimization, ScenarioAnalysis,
    Report, WeightAdjustment
)


@admin.register(FSFVISession)
class FSFVISessionAdmin(admin.ModelAdmin):
    list_display = ['country_name', 'fiscal_year', 'user', 'total_budget', 'status', 'created_at']
    list_filter = ['country_name', 'fiscal_year', 'status', 'currency', 'created_at']
    search_fields = ['country_name', 'user__username']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(UploadedFile)
class UploadedFileAdmin(admin.ModelAdmin):
    list_display = ['original_filename', 'user', 'processing_status', 'file_size', 'uploaded_at']
    list_filter = ['processing_status', 'uploaded_at', 'user']
    search_fields = ['original_filename', 'user__username']
    readonly_fields = ['id', 'file_size', 'uploaded_at']


@admin.register(Component)
class ComponentAdmin(admin.ModelAdmin):
    list_display = ['component_name', 'component_type', 'session', 'financial_allocation', 'weight']
    list_filter = ['component_type', 'session__country_name', 'priority_level']
    search_fields = ['component_name', 'session__country_name']
    readonly_fields = ['component_id']


@admin.register(SystemAnalysis)
class SystemAnalysisAdmin(admin.ModelAdmin):
    list_display = ['session', 'fsfvi_value', 'risk_level', 'average_vulnerability', 'created_at']
    list_filter = ['risk_level', 'created_at', 'session__country_name']
    search_fields = ['session__country_name']
    readonly_fields = ['created_at']


@admin.register(OptimizationResult)
class OptimizationResultAdmin(admin.ModelAdmin):
    list_display = ['session', 'optimization_method', 'original_fsfvi', 'optimized_fsfvi', 'improvement_potential']
    list_filter = ['optimization_method', 'created_at', 'session__country_name']
    search_fields = ['session__country_name']
    readonly_fields = ['created_at']


@admin.register(ComponentOptimization)
class ComponentOptimizationAdmin(admin.ModelAdmin):
    list_display = ['component', 'original_allocation', 'optimized_allocation', 'allocation_change_percent']
    list_filter = ['implementation_complexity', 'reallocation_priority']
    search_fields = ['component__component_name', 'optimization__session__country_name']


@admin.register(ScenarioAnalysis)
class ScenarioAnalysisAdmin(admin.ModelAdmin):
    list_display = ['session', 'scenario_name', 'shock_magnitude', 'baseline_fsfvi', 'scenario_fsfvi']
    list_filter = ['scenario_name', 'created_at', 'session__country_name']
    search_fields = ['scenario_name', 'session__country_name']
    readonly_fields = ['created_at']


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ['session', 'report_type', 'created_at']
    list_filter = ['report_type', 'created_at', 'session__country_name']
    search_fields = ['session__country_name', 'report_type']
    readonly_fields = ['created_at']


@admin.register(WeightAdjustment)
class WeightAdjustmentAdmin(admin.ModelAdmin):
    list_display = ['component', 'original_weight', 'adjusted_weight', 'adjustment_reason', 'created_at']
    list_filter = ['priority_setting', 'created_at', 'session__country_name']
    search_fields = ['component__component_name', 'adjustment_reason']
    readonly_fields = ['created_at'] 