# data_preparation.py - Universal FSFVI v3.0 Data Preparation
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional, Any
from datetime import datetime
import json
import uuid
import sys
import os

# Add the fastapi_app directory to the path to access the centralized modules
sys.path.append(os.path.join(os.path.dirname(__file__), 'fastapi_app'))

try:
    from fastapi_app.config import normalize_component_type, get_component_types, ComponentType
    from fastapi_app.validators import validate_component_data, normalize_component_weights
    from fastapi_app.fsfvi_core import estimate_sensitivity_parameter
    from fastapi_app.exceptions import ValidationError, CalculationError
    FASTAPI_MODULES_AVAILABLE = True
except ImportError:
    print("⚠️  Warning: FastAPI modules not available. Using fallback functions.")
    FASTAPI_MODULES_AVAILABLE = False
    ComponentType = None

class UniversalFSFVIDataPreparation:
    """Universal data preparation for FSFVI v3.0 - works with any country's food system data"""
    
    def __init__(self, csv_path: str = None):
        self.csv_path = csv_path
        self.df = None
        # Use centralized component types instead of custom mapping
        self.standard_component_types = self._get_standard_component_types()
        
    def _get_standard_component_types(self) -> List[str]:
        """Get standard component types from centralized config"""
        if FASTAPI_MODULES_AVAILABLE:
            return get_component_types()
        else:
            # Fallback if modules not available
            return [
                'agricultural_development', 'infrastructure', 'nutrition_health',
                'social_protection_equity', 'climate_natural_resources', 'governance_institutions'
            ]
    
    def load_and_clean_data(self, file_path: str = None):
        """Load and clean CSV data for any country"""
        try:
            path = file_path or self.csv_path
            if not path:
                raise ValueError("No CSV file path provided")
                
            self.df = pd.read_csv(path)
            
            # Clean column names
            self.df.columns = self.df.columns.str.strip().str.lower().str.replace(' ', '_')
            
            # Handle missing values in numeric columns
            numeric_columns = ['expenditure', 'budget', 'allocation', 'value', 'target', 'benchmark']
            for col in self.df.columns:
                if any(keyword in col for keyword in numeric_columns):
                    self.df[col] = pd.to_numeric(self.df[col], errors='coerce').fillna(0)
            
            # Map to component types using centralized logic
            self._map_components()
            
            print(f"✅ Loaded and cleaned {len(self.df)} records from {path}")
            
        except Exception as e:
            print(f"❌ Error loading data: {e}")
            raise
    
    def _map_components(self):
        """Map subsectors to standard component types using centralized logic"""
        if 'component_type' not in self.df.columns:
            # Try to find subsector column
            subsector_cols = [col for col in self.df.columns if 'sector' in col or 'component' in col]
            
            if subsector_cols:
                self.df['component_type'] = self.df[subsector_cols[0]].fillna('agriculture').str.lower().apply(
                    self._normalize_component_type
                ).fillna('agricultural_development')
            else:
                # Default mapping
                self.df['component_type'] = 'agricultural_development'
    
    def _normalize_component_type(self, component_type: str) -> str:
        """Normalize component type using centralized logic"""
        if FASTAPI_MODULES_AVAILABLE:
            try:
                return normalize_component_type(component_type)
            except Exception:
                return 'agricultural_development'
        else:
            # Fallback mapping logic if centralized modules not available
            if pd.isna(component_type):
                return 'agricultural_development'
            
            component_type_lower = str(component_type).lower().strip()
            
            # Basic fallback mapping
            if any(word in component_type_lower for word in ['agriculture', 'agri', 'farming', 'crop', 'livestock']):
                return 'agricultural_development'
            elif any(word in component_type_lower for word in ['infrastructure', 'transport', 'roads', 'storage', 'irrigation']):
                return 'infrastructure'
            elif any(word in component_type_lower for word in ['nutrition', 'health', 'feeding', 'safety']):
                return 'nutrition_health'
            elif any(word in component_type_lower for word in ['social', 'assistance', 'livelihood', 'poverty']):
                return 'social_protection_equity'
            elif any(word in component_type_lower for word in ['climate', 'environment', 'forestry', 'resilience']):
                return 'climate_natural_resources'
            elif any(word in component_type_lower for word in ['governance', 'institution', 'policy', 'marketing']):
                return 'governance_institutions'
            else:
                return 'agricultural_development'
    
    def prepare_component_data(self, country_name: str = "Test Country") -> Tuple[List[Dict], float]:
        """Prepare component data for universal analysis with centralized validation"""
        if self.df is None:
            raise ValueError("No data loaded. Call load_and_clean_data() first.")
        
        # Identify expenditure and performance columns
        expenditure_cols = [col for col in self.df.columns if 'expenditure' in col or 'budget' in col]
        performance_cols = [col for col in self.df.columns if 'value' in col and 'benchmark' not in col]
        benchmark_cols = [col for col in self.df.columns if 'benchmark' in col or 'target' in col]
        
        expenditure_col = expenditure_cols[0] if expenditure_cols else None
        performance_col = performance_cols[0] if performance_cols else None
        benchmark_col = benchmark_cols[0] if benchmark_cols else None
        
        if not expenditure_col:
            raise ValueError("No expenditure/budget column found in data")
        
        # Aggregate by component type
        aggregation_dict = {expenditure_col: 'sum'}
        if performance_col:
            aggregation_dict[performance_col] = 'mean'
        if benchmark_col:
            aggregation_dict[benchmark_col] = 'mean'
        
        component_stats = self.df.groupby('component_type').agg(aggregation_dict).reset_index()
        
        # Only use components that actually exist in the data - do not force all 6 standard components
        total_budget = component_stats[expenditure_col].sum()
        existing_components = component_stats['component_type'].unique()
        
        print(f"📋 Found {len(existing_components)} actual component types in data:")
        for comp_type in existing_components:
            allocation = component_stats[component_stats['component_type'] == comp_type][expenditure_col].iloc[0]
            print(f"   • {comp_type}: ${allocation:,.1f}M")
        
        # Create components list only from actual data
        components = []
        for _, row in component_stats.iterrows():
            observed_value = float(row[performance_col]) if performance_col and not pd.isna(row[performance_col]) else 60.0
            benchmark_value = float(row[benchmark_col]) if benchmark_col and not pd.isna(row[benchmark_col]) else max(observed_value * 1.2, 80.0)
            financial_allocation = max(float(row[expenditure_col]), 0.1)
            
            component = {
                'component_id': str(uuid.uuid4()),
                'component_name': row['component_type'].replace('_', ' ').title(),
                'component_type': row['component_type'],
                'observed_value': observed_value,
                'benchmark_value': benchmark_value,
                'weight': 1.0/len(component_stats),  # Equal weights based on actual components count
                'sensitivity_parameter': self._estimate_sensitivity_parameter(
                    row['component_type'], observed_value, benchmark_value, financial_allocation
                ),
                'financial_allocation': financial_allocation
            }
            components.append(component)
        
        # Validate and normalize components using centralized validation
        try:
            if FASTAPI_MODULES_AVAILABLE:
                validate_component_data(components)
                normalize_component_weights(components)
            else:
                # Basic validation fallback
                self._basic_validation_fallback(components)
        except Exception as e:
            print(f"⚠️  Validation warning: {e}")
            # Continue with basic normalization
            self._normalize_weights_fallback(components)
        
        print(f"📋 Prepared {len(components)} components for {country_name}")
        print(f"💰 Total budget: ${total_budget:,.1f}M")
        
        return components, total_budget
    
    def _estimate_sensitivity_parameter(self, component_type: str, observed_value: float, benchmark_value: float, financial_allocation: float) -> float:
        """Estimate sensitivity parameter using centralized logic"""
        if FASTAPI_MODULES_AVAILABLE:
            try:
                return estimate_sensitivity_parameter(
                    component_type, observed_value, benchmark_value, financial_allocation
                )
            except Exception as e:
                print(f"⚠️  Warning: Centralized sensitivity estimation failed: {e}")
                return self._fallback_sensitivity(component_type)
        else:
            return self._fallback_sensitivity(component_type)
    
    def _fallback_sensitivity(self, component_type: str) -> float:
        """Fallback sensitivity values aligned with fsfvi_core.py defaults"""
        # These values are aligned with fsfvi_core.py base_sensitivity defaults
        sensitivity_map = {
            'agricultural_development': 0.70,  # Aligned with fsfvi_core.py
            'infrastructure': 0.65,           # Aligned with fsfvi_core.py
            'nutrition_health': 0.60,         # Aligned with fsfvi_core.py
            'social_protection_equity': 0.50,        # Aligned with fsfvi_core.py
            'climate_natural_resources': 0.30, # Aligned with fsfvi_core.py
            'governance_institutions': 0.25    # Aligned with fsfvi_core.py
        }
        return sensitivity_map.get(component_type, 0.40)  # Aligned default
    
    def _basic_validation_fallback(self, components: List[Dict]) -> None:
        """Basic validation when centralized validation is not available"""
        required_fields = ['component_type', 'observed_value', 'benchmark_value', 'financial_allocation']
        
        for i, comp in enumerate(components):
            comp_id = comp.get('component_id', f'component_{i}')
            
            # Check required fields
            for field in required_fields:
                if field not in comp:
                    raise ValueError(f"Component {comp_id} missing required field: {field}")
            
            # Check basic numeric constraints
            if comp['observed_value'] < 0:
                raise ValueError(f"Component {comp_id} has negative observed_value")
            if comp['benchmark_value'] < 0:
                raise ValueError(f"Component {comp_id} has negative benchmark_value")
            if comp['financial_allocation'] < 0:
                raise ValueError(f"Component {comp_id} has negative financial_allocation")
    
    def _normalize_weights_fallback(self, components: List[Dict]) -> None:
        """Fallback weight normalization"""
        weights = [comp.get('weight', 0.0) for comp in components]
        total_weight = sum(weights)
        
        if total_weight <= 0:
            # Assign equal weights
            equal_weight = 1.0 / len(components)
            for comp in components:
                comp['weight'] = equal_weight
        else:
            # Normalize existing weights
            for comp in components:
                comp['weight'] = comp.get('weight', 0.0) / total_weight
    
    def get_data_summary(self) -> Dict[str, Any]:
        """Get summary of loaded data"""
        if self.df is None:
            return {'status': 'no_data', 'message': 'No data loaded'}
        
        expenditure_cols = [col for col in self.df.columns if 'expenditure' in col or 'budget' in col]
        expenditure_col = expenditure_cols[0] if expenditure_cols else None
        
        summary = {
            'total_records': len(self.df),
            'total_budget': float(self.df[expenditure_col].sum()) if expenditure_col else 0,
            'component_types': self.df['component_type'].value_counts().to_dict() if 'component_type' in self.df.columns else {},
            'columns': list(self.df.columns),
            'data_quality': {
                'missing_values': self.df.isnull().sum().sum(),
                'duplicate_records': self.df.duplicated().sum()
            },
            'alignment_status': {
                'fastapi_modules_available': FASTAPI_MODULES_AVAILABLE,
                'centralized_validation_used': FASTAPI_MODULES_AVAILABLE,
                'centralized_component_mapping_used': FASTAPI_MODULES_AVAILABLE,
                'centralized_sensitivity_estimation_used': FASTAPI_MODULES_AVAILABLE
            }
        }
        
        return summary
    
    def export_processed_data(self, output_path: str = None) -> str:
        """Export processed data to CSV"""
        if self.df is None:
            raise ValueError("No data to export")
        
        if not output_path:
            output_path = f"processed_data_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        self.df.to_csv(output_path, index=False)
        print(f"📁 Exported processed data to {output_path}")
        return output_path
    
    def validate_against_system(self, components: List[Dict]) -> Dict[str, Any]:
        """Validate prepared components against the centralized FSFVI system"""
        validation_results = {
            'status': 'success',
            'warnings': [],
            'errors': [],
            'component_count': len(components),
            'total_weight': sum(comp.get('weight', 0) for comp in components),
            'alignment_checks': {}
        }
        
        try:
            if FASTAPI_MODULES_AVAILABLE:
                # Use centralized validation
                validate_component_data(components)
                validation_results['alignment_checks']['centralized_validation'] = 'passed'
            else:
                validation_results['warnings'].append('Centralized validation not available')
                validation_results['alignment_checks']['centralized_validation'] = 'fallback_used'
            
            # Check that all component types are valid (exist in our mapping system)
            # Note: Now we only validate that the types can be processed, not that we have all 6 standard types
            valid_component_types = []
            if FASTAPI_MODULES_AVAILABLE and ComponentType:
                valid_component_types = [ct.value for ct in ComponentType]
            else:
                valid_component_types = self.standard_component_types
            
            for comp in components:
                comp_type = comp['component_type']
                # This is fine - the component types should be normalized by now
                if comp_type not in valid_component_types:
                    validation_results['warnings'].append(f"Unusual component type: {comp_type}")
            
            # Check weight normalization
            total_weight = sum(comp.get('weight', 0) for comp in components)
            if not (0.999 <= total_weight <= 1.001):
                validation_results['warnings'].append(f"Weights sum to {total_weight:.6f}, should be 1.0")
            
            # Check that we have reasonable component coverage
            if len(components) < 2:
                validation_results['warnings'].append(f"Only {len(components)} component(s) found - may indicate poor data coverage")
            elif len(components) > 10:
                validation_results['warnings'].append(f"{len(components)} components found - unusually high diversity")
            
            validation_results['alignment_checks']['component_types'] = 'validated'
            validation_results['alignment_checks']['weight_normalization'] = 'checked'
            validation_results['alignment_checks']['coverage_assessment'] = 'completed'
            
        except Exception as e:
            validation_results['status'] = 'error'
            validation_results['errors'].append(str(e))
        
        return validation_results


# Note: Standalone functionality has been moved to Django endpoints
# Use Django's upload endpoint instead: /api/v1/upload-csv/
# Or FastAPI endpoint: /upload_data

def main():
    """
    DEPRECATED: This standalone functionality has been integrated into Django.
    
    Use these endpoints instead:
    - Django: POST /api/v1/upload-csv/
    - FastAPI: POST /upload_data
    
    For API documentation:
    - Django: http://localhost:8000/api/v1/
    - FastAPI: http://localhost:8001/docs
    """
    print("📊 Universal FSFVI v3.0 Data Preparation")
    print("🔗 Now integrated with Django web application!")
    print("")
    print("⚠️  This standalone script is deprecated.")
    print("   Please use the web endpoints instead:")
    print("")
    print("🌐 Django API:")
    print("   • Upload: POST http://localhost:8000/api/v1/upload-csv/")
    print("   • List files: GET http://localhost:8000/api/v1/my-files/")
    print("   • Documentation: http://localhost:8000/api/v1/")
    print("")
    print("🚀 FastAPI:")
    print("   • Upload: POST http://localhost:8001/upload_data")
    print("   • Documentation: http://localhost:8001/docs")
    print("")
    print("🔧 Authentication required for all endpoints.")


if __name__ == "__main__":
    main()