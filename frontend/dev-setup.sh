#!/bin/bash

# FSFVI Frontend Development Setup Script

set -e

echo "🚀 Setting up FSFVI Frontend for Development"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18.x or later."
    exit 1
fi

NODE_VERSION=$(node --version)
print_status "Node.js version: $NODE_VERSION"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm."
    exit 1
fi

NPM_VERSION=$(npm --version)
print_status "npm version: $NPM_VERSION"

# Create environment file if it doesn't exist
if [ ! -f ".env.local" ]; then
    print_status "Creating development environment file..."
    cp development.env.template .env.local
    print_status "Created .env.local from template. Please review and update as needed."
else
    print_warning ".env.local already exists. Skipping environment setup."
fi

# Install dependencies
print_status "Installing dependencies..."
npm install

# Check if backend is running
print_status "Checking if backend services are running..."

# Check Django backend
if curl -s http://localhost:8000/ > /dev/null 2>&1; then
    print_status "✅ Django backend is running on port 8000"
else
    print_warning "❌ Django backend is not running on port 8000"
    print_warning "Please start the Django backend first:"
    print_warning "cd ../backend/django_app && python manage.py runserver"
fi

# Check FastAPI service
if curl -s http://localhost:8001/docs > /dev/null 2>&1; then
    print_status "✅ FastAPI service is running on port 8001"
else
    print_warning "❌ FastAPI service is not running on port 8001"
    print_warning "Please start the FastAPI service:"
    print_warning "cd ../backend/fastapi_app && uvicorn main:app --reload --port 8001"
fi

print_status "✅ Frontend development setup complete!"
print_status ""
print_status "To start development:"
print_status "1. npm run dev          # Start development server"
print_status "2. Open http://localhost:3000"
print_status ""
print_status "Available scripts:"
print_status "- npm run dev           # Development server with hot reload"
print_status "- npm run build         # Build for production"
print_status "- npm run start         # Start production server"
print_status "- npm run lint          # Run ESLint"
print_status ""
print_status "Backend services should be running:"
print_status "- Django: http://localhost:8000"
print_status "- FastAPI: http://localhost:8001" 