# 🌾 Food System Financing Vulnerability Index (FSFVI)

A comprehensive platform for analyzing food system vulnerabilities and optimizing financial allocations using the 3FS (Financing for Food Systems) methodology.

## 🎯 Overview

The FSFVI platform is designed to help governments, development organizations, and financial institutions assess food system vulnerabilities, optimize budget allocation, and develop strategic plans for food security. The system implements a sophisticated mathematical framework that combines performance gap analysis with financial optimization to deliver actionable insights for improving food system resilience.

### Key Features

- 🔍 **Vulnerability Assessment**: Analyze vulnerabilities across 8 food system components based on 3FS methodology
- 💰 **Financial Optimization**: AI-powered recommendations for optimal resource allocation
- 📊 **Performance Gap Analysis**: Comprehensive analysis of performance gaps against global benchmarks
- 🎯 **Strategic Planning**: Multi-year planning and roadmap development
- 🔒 **Enterprise Security**: Government-grade security and authentication
- 📈 **Real-time Analytics**: Interactive dashboards and reporting tools

## 🏗️ System Architecture

The FSFVI platform consists of four main components:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Kenya          │    │   Backend       │
│   (Next.js)     │◄───►   Frontend       │◄───►   (FastAPI +   │
│                 │    │   (Next.js)      │    │    Django)     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                         │
                                ▼                         │
                       ┌──────────────────┐              │
                       │   Kenya Backend  │◄─────────────┘
                       │   (Rust)         │
                       │   Authentication │
                       └──────────────────┘
```

### Component Overview

| Component | Technology | Purpose | Port |
|-----------|------------|---------|------|
| **Backend** | FastAPI + Django | Core calculations & data management | 8000-8001 |
| **Kenya Backend** | Rust + Actix-Web | Secure authentication for Kenya gov | 8080 |
| **Frontend** | Next.js + TypeScript | Main web interface | 3000 |
| **Kenya Frontend** | Next.js + TypeScript | Kenya-specific interface | 3001 |

## 🚀 Quick Start

### Prerequisites

- **Python 3.9+** (for backend)
- **Rust 1.70+** (for Kenya backend)
- **Node.js 18+** (for frontends)
- **PostgreSQL 12+** or SQLite (for databases)
- **Redis** (for caching, optional)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/fsfvi.git
   cd fsfvi
   ```

2. **Backend Setup (Core System)**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   
   # Setup environment
   cp .env.example .env
   # Edit .env with your configuration
   
   # Database setup
   python manage.py migrate
   python manage.py createsuperuser
   
   # Start services (separate terminals)
   # Terminal 1: FastAPI calculation engine
   cd fastapi_app && python -m uvicorn main:app --reload --port 8000
   
   # Terminal 2: Django data management
   cd django_app && python manage.py runserver 8001
   ```

3. **Kenya Backend Setup (Authentication)**
   ```bash
   cd kenya_backend
   cp .env.example .env
   # Edit .env with JWT_SECRET and database configuration
   
   cargo build
   cargo run  # Runs on port 8080
   
   # Note the temporary password displayed in logs on first run
   ```

4. **Frontend Setup (Main Interface)**
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   # Edit environment variables
   
   npm run dev  # Runs on port 3000
   ```

5. **Kenya Frontend Setup (Kenya-specific)**
   ```bash
   cd kenya-frontend
   npm install
   cp .env.local.example .env.local
   # Edit environment variables
   
   npm run dev  # Runs on port 3001
   ```

### Production Deployment

See individual component README files for detailed production deployment instructions:
- [Backend Production Setup](backend/README.md#production)
- [Kenya Backend Production](kenya_backend/README.md#deployment)
- [Frontend Deployment](frontend/README.md#deployment)
- [Kenya Frontend Deployment](kenya-frontend/README.md#deployment)

## 🔬 3FS Methodology Implementation

The system implements the complete 3FS (Financing for Food Systems) framework:

### Food System Components

1. **Agricultural Development and Value Chains**
2. **Infrastructure for Food Systems**
3. **Nutrition and Health**
4. **Social Assistance**
5. **Climate Change and Natural Resources**
6. **Governance and Institutions**
7. **Research and Innovation**
8. **Markets and Trade**

### Mathematical Framework

#### Performance Gap Calculation
```
δᵢ = |xᵢ - x̄ᵢ| / xᵢ
```

#### Component Vulnerability
```
νᵢ(fᵢ) = δᵢ · 1/(1 + αᵢfᵢ)
```

#### Overall FSFVI Score
```
FSFVI = Σωᵢ · νᵢ(fᵢ)
```

#### Optimization Objective
```
Minimize: Σωᵢ·νᵢ(fᵢ)
Subject to: Σfᵢ ≤ F, fᵢ ≥ 0
```

## 📊 API Documentation

### Core Calculation Endpoints

- `POST /calculate/fsfvi` - Calculate FSFVI vulnerability scores
- `POST /optimize/allocation` - Optimize financial resource allocation
- `POST /analyze/gaps` - Comprehensive gap analysis
- `GET /benchmarks` - Access global benchmarks database

### Authentication Endpoints (Kenya Backend)

- `POST /api/auth/login` - Secure government authentication
- `POST /api/auth/change-password` - Password management
- `GET /api/auth/verify` - Token verification
- `POST /api/auth/logout` - Secure logout

### Data Management (Django API)

- `/api/food-systems/` - Food system management
- `/api/performance-metrics/` - Performance data
- `/api/financial-allocations/` - Budget allocation tracking
- `/api/fsfvi-calculations/` - Historical calculations

## 🔒 Security Features

### Kenya Government Security

- **Single Authorized User**: Designed for exclusive Kenya Government access
- **Multi-layer Authentication**: Enterprise-grade security architecture
- **Argon2 Password Hashing**: Industry-leading password security
- **JWT Token Management**: Secure session management with 8-hour expiration
- **Progressive Account Lockout**: Protection against brute force attacks
- **Comprehensive Audit Logging**: Complete security event tracking

### General Security

- **CORS Protection**: Restricted cross-origin requests
- **Rate Limiting**: API protection against abuse
- **Input Validation**: Comprehensive data validation
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content security policies

## 🧪 Testing

### Backend Testing
```bash
cd backend
# FastAPI tests
cd fastapi_app && pytest tests/ -v --cov=.

# Django tests
cd django_app && python manage.py test
```

### Kenya Backend Testing
```bash
cd kenya_backend
cargo test
```

### Frontend Testing
```bash
cd frontend
npm test
npm run test:e2e
```

## 📈 Usage Examples

### Python SDK Example

```python
import httpx

# Initialize API client
client = httpx.Client(base_url="http://localhost:8000")

# Calculate FSFVI for a food system
food_system_data = {
    "food_system_id": "kenya-national-001",
    "food_system_name": "Kenya National Food System",
    "country": "Kenya",
    "fiscal_year": 2024,
    "total_budget": 1000000000.00,
    "components": [...],
    "performance_metrics": [...],
    "financial_allocations": [...]
}

response = client.post("/calculate/fsfvi", json=food_system_data)
result = response.json()

print(f"FSFVI Score: {result['fsfvi_value']:.6f}")
print(f"Risk Level: {result['overall_risk_level']}")
```

### JavaScript Frontend Example

```javascript
// Authenticate with Kenya backend
const authResponse = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'kenya_government',
    password: 'secure_password'
  })
});

const { token } = await authResponse.json();

// Calculate FSFVI
const fsfviResponse = await fetch('/calculate/fsfvi', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(foodSystemData)
});

const fsfviResult = await fsfviResponse.json();
```

## 📚 Documentation

- **[API Documentation](http://localhost:8000/docs)** - Interactive FastAPI docs
- **[Django Admin](http://localhost:8001/admin/)** - Data management interface
- **[3FS Methodology Guide](docs/3FS-Methodology.pdf)** - Official methodology documentation
- **[Deployment Guide](DEPLOYMENT.md)** - Production deployment instructions
- **[Security Documentation](SECURITY_DOCUMENTATION.md)** - Comprehensive security guide

## 🌍 Regional Implementations

### Kenya Implementation

The Kenya-specific implementation includes:

- **Government-grade Security**: Rust-based authentication system
- **Custom UI/UX**: Kenya flag colors and governmental branding
- **Local Benchmarks**: Kenya-specific performance benchmarks
- **Regulatory Compliance**: Aligned with Kenya government requirements
- **Local Currency Support**: Kenya Shilling (KES) integration

### Extensible Architecture

The platform is designed for easy adaptation to other countries and regions:

- **Configurable Components**: Adaptable to different food system structures
- **Multi-currency Support**: Flexible financial allocation tracking
- **Localization Ready**: I18n support for multiple languages
- **Custom Benchmarking**: Region-specific benchmark integration
- **Modular Authentication**: Adaptable to different government requirements

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Follow coding standards** (see individual component guidelines)
4. **Add comprehensive tests**
5. **Update documentation**
6. **Commit changes** (`git commit -m 'Add amazing feature'`)
7. **Push to branch** (`git push origin feature/amazing-feature`)
8. **Create Pull Request**

### Development Guidelines

- **Backend**: Follow PEP 8 for Python, use type hints
- **Kenya Backend**: Follow Rust conventions, use `cargo fmt`
- **Frontend**: Use TypeScript, follow React best practices
- **Testing**: Maintain >80% code coverage
- **Documentation**: Update README files and inline docs

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **FAO** - For the 3FS methodology and global food system data
- **IFPRI** - For food security research and benchmarks
- **World Bank** - For financial data and development frameworks
- **Kenya Government** - For partnership and requirements specification

## 📞 Support

### Technical Support

- **Backend Issues**: Create GitHub issue with `backend` label
- **Frontend Issues**: Create GitHub issue with `frontend` label
- **Security Concerns**: Email security@fsfvi.ai (do not create public issues)
- **API Questions**: Check [API Documentation](http://localhost:8000/docs) first

### Contact Information

- **General Inquiries**: info@fsfvi.ai
- **Kenya Specific**: kenya@fsfvi.ai
- **Technical Support**: support@fsfvi.ai
- **Security Issues**: security@fsfvi.ai

## 🗺️ Roadmap

### Version 2.0 (Q4 2026)

- [ ] Multi-country support
- [ ] Advanced ML-based predictions
- [ ] Mobile applications
- [ ] Blockchain integration for transparency

### Version 1.5 (Q2 2025)

- [ ] Real-time data integration
- [ ] Advanced visualization tools
- [ ] Export/import capabilities
- [ ] Enhanced reporting features

---

**🌾 Built with passion for global food security** | **© 2025 FSFVI.ai - All rights reserved**
