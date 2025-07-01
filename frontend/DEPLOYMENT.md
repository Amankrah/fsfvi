# FSFVI Frontend Deployment

This document explains how the FSFVI frontend is deployed to production.

## Architecture

The frontend is built as a Next.js standalone application and deployed alongside the Django backend.

### Production Stack
- **Frontend**: Next.js 15.x (standalone mode)
- **Hosting**: Nginx reverse proxy
- **Domain**: https://fsfvi.ai
- **Backend APIs**: 
  - Django: https://fsfvi.ai/auth/, /dashboard/, /admin/, etc.
  - FastAPI: https://fsfvi.ai/api/

## Environment Configuration

### Production Environment Variables
```bash
# Backend API URLs
NEXT_PUBLIC_API_URL=https://fsfvi.ai
NEXT_PUBLIC_FASTAPI_URL=https://fsfvi.ai/api

# Environment
NODE_ENV=production
NEXT_PUBLIC_ENVIRONMENT=production

# Domain configuration
NEXT_PUBLIC_DOMAIN=fsfvi.ai
NEXT_PUBLIC_PROTOCOL=https

# Feature flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_LOGGING=true

# Security
NEXT_PUBLIC_SECURE_COOKIES=true
```

### Development Environment Variables
```bash
# Backend API URLs (local development)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_FASTAPI_URL=http://localhost:8001

# Environment
NODE_ENV=development
NEXT_PUBLIC_ENVIRONMENT=development
```

## Deployment Process

The frontend deployment is handled by the main deployment script (`backend/deploy.sh`):

1. **Node.js Installation**: Installs Node.js 18.x
2. **Environment Setup**: Copies production environment template
3. **Dependencies**: Installs npm packages
4. **Build**: Creates optimized production build
5. **File Deployment**: Copies built files to `/var/www/html/fsfvi`
6. **Service Configuration**: Sets up Supervisor service for Next.js
7. **Nginx Configuration**: Configures reverse proxy routing

## File Structure (Production)

```
/var/www/html/fsfvi/
├── server.js              # Next.js standalone server
├── .next/
│   ├── static/            # Static assets
│   └── standalone/        # Standalone build files
├── public/                # Public assets
└── package.json           # Dependencies
```

## Nginx Configuration

The Nginx configuration routes requests as follows:

- **Frontend Routes**: `/` → Next.js server (port 3000)
- **Static Assets**: `/_next/static/` → Direct file serving
- **Django APIs**: `/auth/`, `/dashboard/`, `/admin/` → Django (port 8000)
- **FastAPI**: `/api/` → FastAPI service (port 8001)

## Service Management

The frontend runs as a Supervisor service:

```bash
# Check status
sudo supervisorctl status fsfvi-frontend

# Restart frontend
sudo supervisorctl restart fsfvi-frontend

# View logs
sudo tail -f /var/log/fsfvi-frontend.log
```

## Local Development

For local development:

1. Copy environment template:
   ```bash
   cp development.env.template .env.local
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

4. Access at: http://localhost:3000

## Build Commands

- **Development**: `npm run dev`
- **Production Build**: `npm run build:production`
- **Production Start**: `npm run start:production`

## Environment Files

- `production.env.template` → `.env.production` (production)
- `development.env.template` → `.env.local` (development)

## Troubleshooting

### Frontend not loading
1. Check Supervisor status: `sudo supervisorctl status fsfvi-frontend`
2. Check logs: `sudo tail -f /var/log/fsfvi-frontend.log`
3. Verify Nginx configuration: `sudo nginx -t`

### API calls failing
1. Check backend services are running
2. Verify environment variables in `.env.production`
3. Check Nginx proxy configuration

### Build issues
1. Ensure Node.js 18.x is installed
2. Clear npm cache: `npm cache clean --force`
3. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install` 