# FSFVI Frontend

Modern, responsive frontend for the FSFVI Government Budget Analysis Platform built with Next.js 15, React 19, and TypeScript.

## Features

- **Landing Page**: Beautiful marketing site with features, pricing, and CTAs
- **Authentication**: Login and registration with JWT support
- **Dashboard**: Comprehensive dashboard with quick stats and actions
- **Budget Calculator**: Interactive budget allocation calculator with real-time results
- **API Key Management**: Create, view, and revoke API keys with scope-based permissions
- **Analytics Dashboard**: Usage metrics, endpoint breakdown, and activity logs
- **Demo Page**: Public demo for unauthenticated users
- **Settings**: User profile, security, and API preferences

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: Radix UI primitives
- **Icons**: Lucide React
- **Forms**: React Hook Form with Zod validation
- **HTTP Client**: Axios with interceptors
- **State Management**: React hooks and local storage

## Project Structure

```
fsfvi-frontend/
├── app/
│   ├── dashboard/
│   │   ├── analytics/        # Usage analytics
│   │   ├── api-keys/         # API key management
│   │   ├── calculator/       # Budget calculator
│   │   ├── settings/         # User settings
│   │   └── page.tsx          # Dashboard home
│   ├── demo/                 # Public demo page
│   ├── login/                # Login page
│   ├── register/             # Registration page
│   ├── layout.tsx            # Root layout
│   └── page.tsx              # Landing page
├── components/
│   ├── ui/                   # Reusable UI components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── toast.tsx
│   │   └── toaster.tsx
│   └── DashboardLayout.tsx   # Dashboard shell
├── hooks/
│   └── use-toast.ts          # Toast notifications hook
├── lib/
│   ├── api.ts                # API client and functions
│   └── utils.ts              # Utility functions
├── .env.local                # Environment variables
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- FSFVI Backend running on http://localhost:8080

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8080
NEXT_PUBLIC_APP_NAME=FSFVI
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

## Available Pages

### Public Pages
- `/` - Landing page with features and pricing
- `/demo` - Interactive demo without authentication
- `/login` - User login
- `/register` - Government registration

### Protected Pages (Requires Authentication)
- `/dashboard` - Dashboard home
- `/dashboard/calculator` - Budget calculator
- `/dashboard/api-keys` - API key management
- `/dashboard/analytics` - Usage analytics
- `/dashboard/settings` - User settings

## API Integration

The frontend integrates with the FSFVI backend API through the `lib/api.ts` module:

### Authentication
```typescript
import { authAPI } from '@/lib/api';

// Login
const response = await authAPI.login({ email, password });
localStorage.setItem('fsfvi_token', response.data.access_token);

// Register
await authAPI.register(registrationData);

// Logout
await authAPI.logout();
```

### Budget Calculations
```typescript
import { budgetAPI } from '@/lib/api';

// Calculate budget allocation
const result = await budgetAPI.calculate({
  total_revenue: 10000000,
  fiscal_year: 2025,
  departments: [
    { name: 'Education', requested_amount: 3500000, priority: 9, category: 'education' }
  ]
});

// Other endpoints
await budgetAPI.calculateGrowthRate(currentBudget, previousBudget);
await budgetAPI.calculateDebtRatio(totalDebt, annualRevenue);
await budgetAPI.projectBudget(currentBudget, growthRate, years);
```

### API Key Management
```typescript
import { apiKeyAPI } from '@/lib/api';

// Create API key
const result = await apiKeyAPI.create('My Key', ['budget:calculate', 'budget:read']);

// List API keys
const keys = await apiKeyAPI.list();

// Revoke API key
await apiKeyAPI.revoke(keyId);
```

## Components

### UI Components
All UI components are located in `components/ui/` and are built with Tailwind CSS and Radix UI:
- `Button` - Various button styles and sizes
- `Card` - Card container with header, content, footer
- `Input` - Form input field
- `Label` - Form label
- `Select` - Dropdown select
- `Toast` - Toast notifications

### Custom Components
- `DashboardLayout` - Dashboard shell with sidebar navigation
- `Toaster` - Toast notification provider

## Styling

The project uses Tailwind CSS with a custom configuration. Colors and design tokens can be customized in `tailwind.config.ts`.

### Color Palette
- Primary: Blue (600)
- Secondary: Purple (600)
- Success: Green (600)
- Warning: Yellow (600)
- Error: Red (600)

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:8080` |
| `NEXT_PUBLIC_APP_NAME` | Application name | `FSFVI` |
| `NEXT_PUBLIC_APP_URL` | Frontend URL | `http://localhost:3000` |

## Features in Detail

### Authentication Flow
1. User logs in with email/password
2. Backend returns JWT access token and refresh token
3. Tokens stored in localStorage
4. Axios interceptor adds Authorization header to all requests
5. Automatic redirect to login on 401 errors

### Budget Calculator
- Add multiple departments with custom budgets
- Set priority levels (1-10) for each department
- Choose from predefined categories
- Real-time calculation results
- Fiscal health scoring
- Funding status indicators
- Detailed recommendations

### API Key Management
- Create keys with custom scopes
- View all active keys
- Copy keys to clipboard
- Revoke keys when needed
- Usage tracking per key
- Secure key display with toggle visibility

## Development

### Code Style
- TypeScript for type safety
- React functional components with hooks
- Client components for interactivity
- Server components where possible for performance

### Best Practices
- Use the `useToast` hook for notifications
- Handle loading states in forms
- Validate user input before API calls
- Display meaningful error messages
- Keep components focused and reusable

## Deployment

### Vercel (Recommended)
```bash
vercel --prod
```

### Docker
```bash
docker build -t fsfvi-frontend .
docker run -p 3000:3000 fsfvi-frontend
```

### Environment Variables in Production
Make sure to set these in your deployment platform:
- `NEXT_PUBLIC_API_URL` - Your production backend URL
- `NEXT_PUBLIC_APP_URL` - Your production frontend URL

## License

Copyright © 2025 FSFVI. All rights reserved.

## Support

For issues and questions:
- Check the documentation
- Review existing issues
- Create a new issue with detailed information
