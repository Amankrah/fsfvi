# Food System Financing Vulnerability Index (FSFVI) Backend

A comprehensive performance gap analysis system for food system financing vulnerability assessment, built with FastAPI for calculations and Django for data management. This system implements the 3FS (Financing for Food Systems) methodology with enhanced domain modeling and separation of concerns.

## 🏗️ Enhanced System Architecture

The FSFVI system now features improved domain modeling based on the 3FS methodology:

### Core Domain Models

1. **FoodSystem** - Represents food systems at various administrative levels (national, subnational, local, cross-border)
2. **FoodSystemComponent** - Components based on 3FS methodology:
   - Agricultural Development and Value Chains
   - Infrastructure for Food Systems  
   - Nutrition and Health
   - Social Assistance
   - Climate Change and Natural Resources
   - Governance and Institutions
   - Research and Innovation
   - Markets and Trade

3. **PerformanceMetric** - Individual performance measurements with categories:
   - Access, Availability, Utilization, Stability
   - Sustainability, Nutrition, Safety, Affordability

4. **FinancialAllocation** - Detailed financial tracking:
   - Allocation types: domestic_public, international_development, private_sector, etc.
   - Expenditure classification: specific vs supportive
   - Quarterly tracking and project lifecycle management

5. **ComponentVulnerability** - Calculated vulnerability scores linking performance gaps and financial allocations

6. **FSFVICalculation** - Comprehensive calculation results with metadata and quality tracking

### Mathematical Framework

The system implements the complete 3FS mathematical framework:

1. **Performance Gap Calculation (Equation 1)**
   ```
   δᵢ = |xᵢ - x̄ᵢ| / xᵢ
   ```
   Where:
   - δᵢ = normalized performance gap for component i
   - xᵢ = observed performance value
   - x̄ᵢ = benchmark performance value

2. **Component Vulnerability (Equation 2)**
   ```
   νᵢ(fᵢ) = δᵢ · 1/(1 + αᵢfᵢ)
   ```
   Where:
   - νᵢ = vulnerability score for component i
   - fᵢ = financial allocation to component i
   - αᵢ = sensitivity parameter

3. **Overall FSFVI Score (Equation 3)**
   ```
   FSFVI = Σωᵢ · νᵢ(fᵢ)
   ```
   Where:
   - FSFVI = overall system vulnerability score
   - ωᵢ = component weight

4. **Optimization Constraints (Equations 4-7)**
   - Budget constraint: Σfᵢ ≤ F
   - Non-negative allocation: fᵢ ≥ 0
   - Priority preservation: fᵢ ≥ fⱼ if δᵢ ≥ δⱼ
   - Objective: Minimize Σωᵢ·νᵢ(fᵢ)

5. **Gap Analysis Metrics (Equations 8-10)**
   - GapFSFVI: Absolute FSFVI improvement
   - Gap Ratio: Percentage FSFVI improvement
   - Efficiency Index: Resource allocation efficiency

## 🚀 Quick Start

### Prerequisites

- Python 3.9+
- PostgreSQL 12+ (or SQLite for development)
- Redis (for caching and background tasks)

### Installation

1. **Clone and setup environment:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. **Environment configuration:**
   ```bash
   # Create .env file
   cat > .env << EOF
   DEBUG=True
   USE_SQLITE=True
   DJANGO_SECRET_KEY=your-secret-key
   DB_NAME=fsfvi_db
   DB_USER=fsfvi_user
   DB_PASSWORD=fsfvi_password
   DB_HOST=localhost
   DB_PORT=5432
   REDIS_URL=redis://127.0.0.1:6379/1
   EOF
   ```

3. **Database setup:**
   ```bash
   # Django setup
   python manage.py makemigrations
   python manage.py migrate
   python manage.py createsuperuser
   ```

4. **Start services:**
   ```bash
   # Terminal 1: FastAPI calculation engine
   cd fastapi_app
   python -m uvicorn main:app --reload --port 8000
   
   # Terminal 2: Django data management
   cd django_app
   python manage.py runserver 8001
   
   # Terminal 3: Celery worker (optional, for background tasks)
   celery -A django_app worker --loglevel=info
   ```

## 📊 Enhanced API Endpoints

### FastAPI Calculation Engine (Port 8000)

#### 1. Calculate FSFVI Score
```http
POST /calculate/fsfvi
Content-Type: application/json

{
  "food_system_id": "550e8400-e29b-41d4-a716-446655440000",
  "food_system_name": "Kenya National Food System",
  "food_system_code": "KE-NATIONAL",
  "country": "Kenya",
  "administrative_level": "national",
  "fiscal_year": 2024,
  "measurement_date": "2024-01-15",
  "total_budget": 500000000.00,
  "components": [
    {
      "component_id": "agri_dev_001",
      "component_name": "Agricultural Development",
      "component_type": "agricultural_development",
      "weight": 0.3,
      "sensitivity_parameter": 1.2
    }
  ],
  "performance_metrics": [
    {
      "metric_id": "prod_efficiency_001",
      "metric_name": "Production Efficiency",
      "metric_code": "PROD_EFF",
      "category": "availability",
      "observed_value": 75.5,
      "unit": "percentage",
      "measurement_date": "2024-01-15",
      "data_quality_score": 0.95
    }
  ],
  "benchmarks": [
    {
      "benchmark_id": "bench_001",
      "metric_code": "PROD_EFF",
      "benchmark_value": 92.0,
      "benchmark_type": "global_best",
      "data_source": "FAO Global Database"
    }
  ],
  "financial_allocations": [
    {
      "allocation_id": "alloc_001",
      "component_id": "agri_dev_001",
      "amount": 150000000.00,
      "currency": "USD",
      "allocation_type": "domestic_public",
      "expenditure_type": "specific",
      "fiscal_year": 2024,
      "funding_source": "Ministry of Agriculture"
    }
  ]
}
```

**Enhanced Response:**
```json
{
  "food_system_id": "550e8400-e29b-41d4-a716-446655440000",
  "food_system_name": "Kenya National Food System",
  "calculation_date": "2024-01-15T10:30:00Z",
  "fiscal_year": 2024,
  "fsfvi_value": 0.456789,
  "optimal_fsfvi_value": null,
  "total_budget": 500000000.00,
  "currency": "USD",
  "component_vulnerabilities": [
    {
      "component_id": "agri_dev_001",
      "component_name": "Agricultural Development",
      "component_type": "agricultural_development",
      "financial_allocation": 150000000.00,
      "allocation_type": "domestic_public",
      "fiscal_year": 2024,
      "performance_gaps": [
        {
          "metric_id": "prod_efficiency_001",
          "metric_name": "Production Efficiency",
          "component_id": "agri_dev_001",
          "component_name": "Agricultural Development",
          "component_type": "agricultural_development",
          "observed_value": 75.5,
          "benchmark_value": 92.0,
          "weight": 0.3,
          "sensitivity_parameter": 1.2,
          "absolute_gap": 16.5,
          "relative_gap": 21.85,
          "normalized_gap": 0.2185,
          "gap_direction": "underperforming",
          "confidence_level": 0.95
        }
      ],
      "vulnerability_score": 0.001843,
      "weighted_contribution": 0.000553,
      "risk_level": "medium"
    }
  ],
  "total_financial_allocation": 500000000.00,
  "average_gap": 0.189,
  "critical_components": [],
  "overall_risk_level": "medium",
  "vulnerability_distribution": {
    "agricultural_development": 45.2,
    "infrastructure": 30.8,
    "nutrition_health": 24.0
  },
  "data_quality_overall": 0.95,
  "calculation_status": "completed",
  "processing_time_seconds": 2.34
}
```

#### 2. Optimize Resource Allocation
```http
POST /optimize/allocation
Content-Type: application/json

{
  "food_system_data": {
    // Same structure as FSFVI calculation
  },
  "constraints": {
    "total_budget": 600000000.00,
    "min_allocation_per_component": 20000000.00,
    "priority_component_types": ["agricultural_development", "nutrition_health"],
    "preserve_gap_priorities": true,
    "min_domestic_share": 0.6,
    "max_external_dependence": 0.4
  },
  "optimization_objective": "minimize_fsfvi",
  "include_sensitivity_analysis": true
}
```

#### 3. Comprehensive Gap Analysis
```http
POST /analyze/gaps
Content-Type: application/json

{
  "food_system_data": {
    // Same structure as FSFVI calculation
  },
  "benchmark_types": ["global_best", "regional_average"],
  "include_peer_comparison": true,
  "include_trend_analysis": true,
  "include_scenario_analysis": true,
  "analysis_depth": "comprehensive",
  "peer_selection_criteria": {
    "administrative_level": "national",
    "region": "Sub-Saharan Africa"
  },
  "max_peers": 5
}
```

### Django Data Management API (Port 8001)

#### Enhanced Data Models

1. **Food Systems**: `/api/food-systems/`
2. **Food System Components**: `/api/food-system-components/`
3. **Performance Metrics**: `/api/performance-metrics/`
4. **Benchmarks**: `/api/benchmarks/`
5. **Financial Allocations**: `/api/financial-allocations/`
6. **Component Vulnerabilities**: `/api/component-vulnerabilities/`
7. **FSFVI Calculations**: `/api/fsfvi-calculations/`
8. **Optimization Results**: `/api/optimization-results/`
9. **Gap Analysis Reports**: `/api/gap-analysis-reports/`

## 🔧 Enhanced Configuration

### 3FS Component Types
```python
COMPONENT_TYPES = [
    ('agricultural_development', 'Agricultural Development and Value Chains'),
    ('infrastructure', 'Infrastructure for Food Systems'),
    ('nutrition_health', 'Nutrition and Health'),
    ('social_assistance', 'Social Assistance'),
    ('climate_natural_resources', 'Climate Change and Natural Resources'),
    ('governance_institutions', 'Governance and Institutions'),
    ('research_innovation', 'Research and Innovation'),
    ('market_trade', 'Markets and Trade'),
]
```

### Financial Allocation Types
```python
ALLOCATION_TYPES = [
    ('domestic_public', 'Domestic Public Financing'),
    ('international_development', 'International Development Finance'),
    ('private_sector', 'Private Sector Investment'),
    ('multilateral', 'Multilateral Organizations'),
    ('bilateral', 'Bilateral Cooperation'),
    ('climate_finance', 'Climate Finance'),
    ('emergency_response', 'Emergency Response Funding'),
]
```

### Performance Metric Categories
```python
METRIC_CATEGORIES = [
    ('access', 'Access'),
    ('availability', 'Availability'),
    ('utilization', 'Utilization'),
    ('stability', 'Stability'),
    ('sustainability', 'Sustainability'),
    ('nutrition', 'Nutrition'),
    ('safety', 'Safety'),
    ('affordability', 'Affordability'),
]
```

## 📈 Enhanced Usage Examples

### Python SDK Usage with New Models

```python
import httpx
from datetime import date

# Initialize API client
api_client = httpx.Client(base_url="http://localhost:8000")

# Prepare comprehensive food system data
food_system_data = {
    "food_system_id": "ke-national-001",
    "food_system_name": "Kenya National Food System",
    "food_system_code": "KE-NATIONAL",
    "country": "Kenya",
    "region": "Sub-Saharan Africa",
    "administrative_level": "national",
    "fiscal_year": 2024,
    "measurement_date": date.today().isoformat(),
    "total_budget": 1000000000.00,
    
    "components": [
        {
            "component_id": "ke_agri_dev",
            "component_name": "Agricultural Development",
            "component_type": "agricultural_development",
            "weight": 0.25,
            "sensitivity_parameter": 1.0
        },
        {
            "component_id": "ke_infrastructure",
            "component_name": "Rural Infrastructure",
            "component_type": "infrastructure",
            "weight": 0.20,
            "sensitivity_parameter": 1.3
        },
        {
            "component_id": "ke_nutrition",
            "component_name": "Nutrition Programs",
            "component_type": "nutrition_health",
            "weight": 0.30,
            "sensitivity_parameter": 0.8
        },
        {
            "component_id": "ke_social_assist",
            "component_name": "Social Assistance",
            "component_type": "social_assistance",
            "weight": 0.25,
            "sensitivity_parameter": 1.5
        }
    ],
    
    "performance_metrics": [
        {
            "metric_id": "ke_crop_prod_001",
            "metric_name": "Crop Production Efficiency",
            "metric_code": "CROP_PROD_EFF",
            "category": "availability",
            "observed_value": 78.5,
            "unit": "index_score",
            "measurement_date": date.today().isoformat(),
            "data_quality_score": 0.92
        },
        {
            "metric_id": "ke_food_access_001",
            "metric_name": "Food Access Index",
            "metric_code": "FOOD_ACCESS",
            "category": "access",
            "observed_value": 65.2,
            "unit": "index_score",
            "measurement_date": date.today().isoformat(),
            "data_quality_score": 0.88
        }
    ],
    
    "benchmarks": [
        {
            "benchmark_id": "global_crop_prod",
            "metric_code": "CROP_PROD_EFF",
            "benchmark_value": 92.0,
            "benchmark_type": "global_best",
            "data_source": "FAO Global Agriculture Database"
        },
        {
            "benchmark_id": "regional_food_access",
            "metric_code": "FOOD_ACCESS",
            "benchmark_value": 85.0,
            "benchmark_type": "regional_average",
            "applicable_region": "Sub-Saharan Africa",
            "data_source": "IFPRI Regional Food Security Database"
        }
    ],
    
    "financial_allocations": [
        {
            "allocation_id": "ke_agri_budget_2024",
            "component_id": "ke_agri_dev",
            "amount": 250000000.00,
            "currency": "USD",
            "allocation_type": "domestic_public",
            "expenditure_type": "specific",
            "fiscal_year": 2024,
            "funding_source": "Ministry of Agriculture"
        },
        {
            "allocation_id": "ke_infra_budget_2024",
            "component_id": "ke_infrastructure",
            "amount": 200000000.00,
            "currency": "USD",
            "allocation_type": "international_development",
            "expenditure_type": "specific",
            "fiscal_year": 2024,
            "funding_source": "World Bank Rural Infrastructure Project"
        }
    ]
}

# Calculate FSFVI with enhanced analysis
response = api_client.post("/calculate/fsfvi", json=food_system_data)
fsfvi_result = response.json()

print(f"FSFVI Score: {fsfvi_result['fsfvi_value']:.6f}")
print(f"Overall Risk Level: {fsfvi_result['overall_risk_level']}")
print(f"Data Quality: {fsfvi_result['data_quality_overall']:.2f}")

# Component-wise analysis
for component in fsfvi_result['component_vulnerabilities']:
    print(f"\n{component['component_name']} ({component['component_type']}):")
    print(f"  Vulnerability Score: {component['vulnerability_score']:.6f}")
    print(f"  Risk Level: {component['risk_level']}")
    print(f"  Financial Allocation: ${component['financial_allocation']:,.2f}")
    
    for gap in component['performance_gaps']:
        print(f"  - {gap['metric_name']}: {gap['relative_gap']:.1f}% gap")

# Optimize allocation with enhanced constraints
optimization_request = {
    "food_system_data": food_system_data,
    "constraints": {
        "total_budget": 1200000000.00,  # Increased budget
        "min_allocation_per_component": 50000000.00,
        "priority_component_types": ["nutrition_health", "agricultural_development"],
        "preserve_gap_priorities": True,
        "min_domestic_share": 0.6,
        "max_external_dependence": 0.4
    },
    "optimization_objective": "minimize_fsfvi",
    "include_sensitivity_analysis": True
}

response = api_client.post("/optimize/allocation", json=optimization_request)
optimization_result = response.json()

print(f"\nOptimization Results:")
print(f"Current FSFVI: {optimization_result['current_fsfvi']:.6f}")
print(f"Optimized FSFVI: {optimization_result['optimized_fsfvi']:.6f}")
print(f"Improvement: {optimization_result['gap_ratio']:.2f}%")
print(f"Efficiency Index: {optimization_result['efficiency_index']:.2f}%")

# Component-specific recommendations
for comp_id, recommendations in optimization_result['component_specific_recommendations'].items():
    print(f"\nRecommendations for {comp_id}:")
    for rec in recommendations:
        print(f"  - {rec}")
```

## 🧪 Enhanced Testing

### Run Tests with New Models
```bash
# FastAPI tests
cd fastapi_app
pytest tests/ -v --cov=.

# Django tests
cd django_app
python manage.py test --settings=django_app.test_settings

# Integration tests
pytest tests/integration/ -v
```

## 📚 Enhanced Documentation

- **API Documentation**: Available at `http://localhost:8000/docs` (FastAPI) and `http://localhost:8001/admin/` (Django)
- **Model Documentation**: See enhanced model docstrings and field help_text
- **Migration Guide**: See `migration_guide.md` for upgrading from previous versions
- **3FS Methodology**: Integration with official 3FS framework and component classifications

## 🔄 Migration from Previous Version

If upgrading from the previous version, see the detailed [Migration Guide](migration_guide.md) which covers:

- Database migration steps
- API schema changes
- Client code updates
- Backward compatibility considerations

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement changes following the enhanced model structure
4. Add comprehensive tests
5. Update documentation
6. Submit a pull request

---

**Enhanced for comprehensive food system financing vulnerability analysis with 3FS methodology compliance** 🌾💰📊 