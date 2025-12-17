# Government API Integration Guide

## FSFVI Budget Calculation API - Integration Documentation

This guide explains how government systems can integrate with the FSFVI Budget Calculation API to perform budget analysis and planning.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Getting Started](#getting-started)
3. [API Endpoints](#api-endpoints)
4. [Code Examples](#code-examples)
5. [Rate Limits](#rate-limits)
6. [Error Handling](#error-handling)

---

## Authentication

All Budget API endpoints require API Key authentication.

### API Key Format

- **Header:** `X-API-Key`
- **Value:** Your government-specific API key (provided during onboarding)

### Scopes

Different endpoints require different permission scopes:

- `budget:read` - Read-only operations (growth rate, debt ratio)
- `budget:calculate` - Full calculation operations (allocations, projections)

---

## Getting Started

### 1. Obtain API Credentials

Contact the FSFVI administrator to:
- Register your government entity
- Receive your API key
- Configure your access tier and scopes

### 2. Test Connection

```bash
curl -X GET https://api.fsfvi.org/api/v1/budget/health \
  -H "X-API-Key: your-api-key-here"
```

Expected Response:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "FSFVI Budget Calculation API",
    "version": "v1"
  }
}
```

---

## API Endpoints

### 1. Calculate Budget Allocation

**Endpoint:** `POST /api/v1/budget/calculate`
**Scope Required:** `budget:calculate`

Calculates optimal budget allocation across departments using priority-weighted algorithm.

**Request Body:**
```json
{
  "total_revenue": 1000000.0,
  "fiscal_year": 2025,
  "departments": [
    {
      "name": "Healthcare",
      "requested_amount": 400000.0,
      "priority": 10,
      "category": "healthcare"
    },
    {
      "name": "Education",
      "requested_amount": 350000.0,
      "priority": 9,
      "category": "education"
    },
    {
      "name": "Infrastructure",
      "requested_amount": 300000.0,
      "priority": 7,
      "category": "infrastructure"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "analysis": {
      "total_revenue": 1000000.0,
      "total_requested": 1050000.0,
      "total_allocated": 1000000.0,
      "surplus_deficit": 0.0,
      "fiscal_health_score": 95.2,
      "allocations": [
        {
          "department": "Healthcare",
          "allocated_amount": 380000.0,
          "percentage_of_total": 38.0,
          "funding_status": "fully_funded"
        }
      ],
      "recommendations": [
        "Budget surplus of $0.00. Consider allocating to emergency reserves."
      ]
    },
    "metadata": {
      "government_id": "uuid-here",
      "response_time_ms": 45,
      "api_version": "v1"
    }
  }
}
```

---

### 2. Calculate Growth Rate

**Endpoint:** `POST /api/v1/budget/growth-rate`
**Scope Required:** `budget:read`

**Request Body:**
```json
{
  "current_budget": 1100000.0,
  "previous_budget": 1000000.0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "growth_rate_percentage": 10.0,
    "current_budget": 1100000.0,
    "previous_budget": 1000000.0
  }
}
```

---

### 3. Calculate Debt Ratio

**Endpoint:** `POST /api/v1/budget/debt-ratio`
**Scope Required:** `budget:read`

**Request Body:**
```json
{
  "total_debt": 500000.0,
  "annual_revenue": 1000000.0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "debt_to_revenue_ratio_percentage": 50.0,
    "total_debt": 500000.0,
    "annual_revenue": 1000000.0,
    "health_status": "healthy"
  }
}
```

Health Status Values:
- `healthy` - Ratio < 60%
- `moderate` - Ratio 60-90%
- `high_risk` - Ratio > 90%

---

### 4. Project Future Budget

**Endpoint:** `POST /api/v1/budget/projection`
**Scope Required:** `budget:calculate`

**Request Body:**
```json
{
  "current_budget": 1000000.0,
  "annual_growth_rate": 3.5,
  "years": 5
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "projections": {
      "1": 1035000.0,
      "2": 1071225.0,
      "3": 1108717.88,
      "4": 1147523.0,
      "5": 1187686.11
    },
    "parameters": {
      "current_budget": 1000000.0,
      "annual_growth_rate": 3.5,
      "years": 5
    }
  }
}
```

---

## Code Examples

### Python Example

```python
import requests
import json

class FsfviBudgetClient:
    def __init__(self, api_key: str, base_url: str = "https://api.fsfvi.org"):
        self.api_key = api_key
        self.base_url = base_url
        self.headers = {
            "X-API-Key": api_key,
            "Content-Type": "application/json"
        }

    def calculate_budget(self, total_revenue: float, departments: list, fiscal_year: int):
        """Calculate optimal budget allocation"""
        endpoint = f"{self.base_url}/api/v1/budget/calculate"

        payload = {
            "total_revenue": total_revenue,
            "fiscal_year": fiscal_year,
            "departments": departments
        }

        response = requests.post(endpoint, headers=self.headers, json=payload)
        response.raise_for_status()

        return response.json()

    def calculate_growth_rate(self, current_budget: float, previous_budget: float):
        """Calculate budget growth rate"""
        endpoint = f"{self.base_url}/api/v1/budget/growth-rate"

        payload = {
            "current_budget": current_budget,
            "previous_budget": previous_budget
        }

        response = requests.post(endpoint, headers=self.headers, json=payload)
        response.raise_for_status()

        return response.json()

# Usage
client = FsfviBudgetClient(api_key="your-api-key-here")

departments = [
    {
        "name": "Healthcare",
        "requested_amount": 400000.0,
        "priority": 10,
        "category": "healthcare"
    },
    {
        "name": "Education",
        "requested_amount": 350000.0,
        "priority": 9,
        "category": "education"
    }
]

result = client.calculate_budget(
    total_revenue=1000000.0,
    departments=departments,
    fiscal_year=2025
)

print(f"Fiscal Health Score: {result['data']['analysis']['fiscal_health_score']}")
for allocation in result['data']['analysis']['allocations']:
    print(f"{allocation['department']}: ${allocation['allocated_amount']:,.2f} ({allocation['percentage_of_total']:.1f}%)")
```

---

### JavaScript/Node.js Example

```javascript
const axios = require('axios');

class FsfviBudgetClient {
    constructor(apiKey, baseUrl = 'https://api.fsfvi.org') {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
        this.headers = {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json'
        };
    }

    async calculateBudget(totalRevenue, departments, fiscalYear) {
        const endpoint = `${this.baseUrl}/api/v1/budget/calculate`;

        const payload = {
            total_revenue: totalRevenue,
            fiscal_year: fiscalYear,
            departments: departments
        };

        const response = await axios.post(endpoint, payload, { headers: this.headers });
        return response.data;
    }

    async projectBudget(currentBudget, growthRate, years) {
        const endpoint = `${this.baseUrl}/api/v1/budget/projection`;

        const payload = {
            current_budget: currentBudget,
            annual_growth_rate: growthRate,
            years: years
        };

        const response = await axios.post(endpoint, payload, { headers: this.headers });
        return response.data;
    }
}

// Usage
const client = new FsfviBudgetClient('your-api-key-here');

const departments = [
    {
        name: 'Healthcare',
        requested_amount: 400000.0,
        priority: 10,
        category: 'healthcare'
    },
    {
        name: 'Education',
        requested_amount: 350000.0,
        priority: 9,
        category: 'education'
    }
];

client.calculateBudget(1000000.0, departments, 2025)
    .then(result => {
        console.log(`Fiscal Health Score: ${result.data.analysis.fiscal_health_score}`);
        result.data.analysis.allocations.forEach(allocation => {
            console.log(`${allocation.department}: $${allocation.allocated_amount.toFixed(2)} (${allocation.percentage_of_total.toFixed(1)}%)`);
        });
    })
    .catch(error => {
        console.error('API Error:', error.response?.data || error.message);
    });
```

---

### C# Example

```csharp
using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

public class FsfviBudgetClient
{
    private readonly HttpClient _httpClient;
    private readonly string _baseUrl;

    public FsfviBudgetClient(string apiKey, string baseUrl = "https://api.fsfvi.org")
    {
        _baseUrl = baseUrl;
        _httpClient = new HttpClient();
        _httpClient.DefaultRequestHeaders.Add("X-API-Key", apiKey);
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
    }

    public async Task<BudgetAnalysisResponse> CalculateBudgetAsync(BudgetRequest request)
    {
        var endpoint = $"{_baseUrl}/api/v1/budget/calculate";
        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync(endpoint, content);
        response.EnsureSuccessStatusCode();

        var responseJson = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<BudgetAnalysisResponse>(responseJson);
    }

    public async Task<GrowthRateResponse> CalculateGrowthRateAsync(double currentBudget, double previousBudget)
    {
        var endpoint = $"{_baseUrl}/api/v1/budget/growth-rate";
        var request = new { current_budget = currentBudget, previous_budget = previousBudget };
        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        var response = await _httpClient.PostAsync(endpoint, content);
        response.EnsureSuccessStatusCode();

        var responseJson = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<GrowthRateResponse>(responseJson);
    }
}

// Usage
var client = new FsfviBudgetClient("your-api-key-here");

var budgetRequest = new BudgetRequest
{
    TotalRevenue = 1000000.0,
    FiscalYear = 2025,
    Departments = new[]
    {
        new Department
        {
            Name = "Healthcare",
            RequestedAmount = 400000.0,
            Priority = 10,
            Category = "healthcare"
        }
    }
};

var result = await client.CalculateBudgetAsync(budgetRequest);
Console.WriteLine($"Fiscal Health Score: {result.Data.Analysis.FiscalHealthScore}");
```

---

## Rate Limits

Rate limits are enforced based on your government's tier:

| Tier | Daily Quota | Monthly Quota |
|------|-------------|---------------|
| Basic | 1,000 | 30,000 |
| Standard | 10,000 | 300,000 |
| Premium | 100,000 | 3,000,000 |
| Enterprise | Unlimited | Unlimited |

### Rate Limit Headers

Response headers include:
- `X-RateLimit-Limit` - Your quota limit
- `X-RateLimit-Remaining` - Remaining requests
- `X-RateLimit-Reset` - Unix timestamp when quota resets

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": "Daily API quota exceeded"
}
```

**Status Code:** 429 Too Many Requests

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Error message describing what went wrong"
}
```

### Common Error Codes

| Status Code | Meaning | Common Cause |
|-------------|---------|--------------|
| 400 | Bad Request | Invalid request body or parameters |
| 401 | Unauthorized | Missing or invalid API key |
| 403 | Forbidden | Insufficient scopes for the endpoint |
| 404 | Not Found | Invalid endpoint URL |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error |

### Error Handling Best Practices

```python
try:
    result = client.calculate_budget(...)
except requests.exceptions.HTTPError as e:
    if e.response.status_code == 429:
        # Rate limit exceeded - implement backoff
        print("Rate limit exceeded. Please try again later.")
    elif e.response.status_code == 401:
        # Authentication error
        print("Invalid API key. Please check your credentials.")
    elif e.response.status_code == 403:
        # Permission error
        print("Insufficient permissions. Contact administrator.")
    else:
        print(f"API Error: {e.response.json()['error']}")
```

---

## Support

For technical support, API key requests, or tier upgrades:

- **Email:** api-support@fsfvi.org
- **Documentation:** https://docs.fsfvi.org
- **Status Page:** https://status.fsfvi.org

---

## Changelog

### v1.0.0 (2025-01-13)
- Initial release
- Budget allocation calculation
- Growth rate analysis
- Debt ratio calculation
- Budget projection
