# Authentication System Cleanup Recommendations

## Current Issues

### 1. **Redundant Authentication Endpoints**
- Django has auth endpoints at port 8000: `/auth/register/`, `/auth/login/`, `/auth/logout/`
- FastAPI has auth endpoints at port 8001: `/auth/register`, `/auth/login`, `/auth/profile`
- This creates confusion and maintenance overhead

### 2. **Conflicting Implementation**
- FastAPI has Django integration but also has fallback mock authentication
- Unclear which service should be the primary authentication provider
- Token management is handled differently in both services

## Recommended Solution

### **Primary Authentication Service: Django (Port 8000)**
**Rationale:**
- Django has proper user models, database integration, and Django REST Framework
- Better security features and session management
- Established patterns for user management
- Database persistence and proper validation

### **FastAPI Role: FSFVI Analysis Service (Port 8001)**
**Rationale:**
- Focus on what FastAPI does best: high-performance data processing
- Delegate authentication to Django
- Validate tokens received from Django

## Implementation Plan

### 1. **Clean Up FastAPI Authentication (Recommended Changes)**

#### Remove from FastAPI (`backend/fastapi_app/main.py`):
```python
# REMOVE these endpoints:
@app.post("/auth/register")
@app.post("/auth/login") 
@app.get("/auth/profile")
@app.get("/auth/sessions")

# REMOVE the mock authentication logic
async def get_current_user(authorization: HTTPAuthorizationCredentials = Depends(security)):
    # Remove all the mock user logic
```

#### Update FastAPI Authentication to validate Django tokens:
```python
import requests
from fastapi import HTTPException

async def get_current_user(authorization: HTTPAuthorizationCredentials = Depends(security)):
    """Validate token with Django backend"""
    token = authorization.credentials
    
    try:
        # Validate token with Django
        response = requests.get(
            'http://localhost:8000/auth/profile/',
            headers={'Authorization': f'Token {token}'},
            timeout=5
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            raise HTTPException(status_code=401, detail="Invalid token")
            
    except requests.RequestException:
        raise HTTPException(status_code=503, detail="Authentication service unavailable")
```

### 2. **Update Frontend API Configuration**

#### Primary Authentication URLs (Django - Port 8000):
```typescript
// frontend/src/lib/api.ts
const AUTH_BASE_URL = 'http://localhost:8000';
const DATA_BASE_URL = 'http://localhost:8001'; // FastAPI for data processing

export const authAPI = {
  register: async (userData: RegisterData) => {
    const response = await axios.post(`${AUTH_BASE_URL}/auth/register/`, userData);
    return response.data;
  },
  
  login: async (credentials: LoginData) => {
    const response = await axios.post(`${AUTH_BASE_URL}/auth/login/`, credentials);
    return response.data;
  },
  
  logout: async () => {
    const response = await axios.post(`${AUTH_BASE_URL}/auth/logout/`);
    return response.data;
  },
  
  getProfile: async () => {
    const response = await axios.get(`${AUTH_BASE_URL}/auth/profile/`);
    return response.data;
  },
};

export const dataAPI = {
  // FastAPI endpoints for FSFVI analysis
  uploadData: async (formData: FormData, token: string) => {
    const response = await axios.post(`${DATA_BASE_URL}/upload_data`, formData, {
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  
  analyzeDistribution: async (sessionId: string, token: string) => {
    const response = await axios.post(`${DATA_BASE_URL}/analyze_current_distribution`, 
      { session_id: sessionId },
      { headers: { 'Authorization': `Token ${token}` } }
    );
    return response.data;
  },
  
  // ... other FSFVI analysis endpoints
};
```

### 3. **Update Django CORS Settings**

```python
# backend/django_app/settings.py
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Frontend
    "http://localhost:8001",  # FastAPI (for internal communication)
]

# Allow FastAPI to validate tokens
CORS_ALLOW_CREDENTIALS = True
```

### 4. **Update FastAPI CORS**

```python
# backend/fastapi_app/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Frontend
        "http://localhost:8000",  # Django (for internal communication)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Benefits of This Approach

1. **Clear Separation of Concerns:**
   - Django: User management, authentication, sessions, data persistence
   - FastAPI: High-performance FSFVI analysis, data processing

2. **Simplified Frontend:**
   - Single authentication flow through Django
   - Analysis requests go to FastAPI with Django-issued tokens

3. **Better Security:**
   - Centralized user management
   - Consistent token validation
   - Proper session handling

4. **Easier Maintenance:**
   - No duplicate authentication logic
   - Clear service boundaries
   - Single source of truth for user data

## Current Frontend Implementation

The frontend has been built to work with Django authentication:
- Login/Register forms connect to Django endpoints (port 8000)
- Token storage and management via Django
- Dashboard and protected routes work with Django authentication
- Ready to integrate with FastAPI for FSFVI analysis

## Next Steps

1. **Test the current authentication flow** with Django backend
2. **Clean up FastAPI authentication** as recommended above  
3. **Update frontend to use FastAPI for data analysis** while keeping Django for auth
4. **Test the complete flow**: Auth with Django → Analysis with FastAPI

 