#!/bin/bash

# FSFVI Production Deployment Script for fsfvi.ai
# Run this script on your AWS EC2 instance

set -e  # Exit on any error

echo "🚀 Starting FSFVI Production Deployment for fsfvi.ai"

# Configuration
PROJECT_DIR="/var/www/fsfvi"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
VENV_DIR="$BACKEND_DIR/venv"
DJANGO_DIR="$BACKEND_DIR/django_app"
FASTAPI_DIR="$BACKEND_DIR/fastapi_app"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to ensure virtual environment is activated
activate_venv() {
    if [ ! -f "$VENV_DIR/bin/activate" ]; then
        print_error "Virtual environment not found at $VENV_DIR"
        exit 1
    fi
    
    source $VENV_DIR/bin/activate
    
    if [ "$VIRTUAL_ENV" != "$VENV_DIR" ]; then
        print_error "Failed to activate virtual environment"
        exit 1
    fi
    
    print_status "Virtual environment active: $VIRTUAL_ENV"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# 1. System Dependencies
print_status "Installing system dependencies..."
sudo apt update
sudo apt install -y python3-pip python3-venv python3-dev nginx redis-server supervisor certbot python3-certbot-nginx sqlite3 curl

# Install Node.js 18.x for frontend
print_status "Installing Node.js for frontend..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version
npm --version

# 2. Verify project structure
print_status "Verifying project structure..."

# Check if we're in the right directory
if [ ! -f "$PROJECT_DIR/backend/requirements.txt" ]; then
    print_error "Project structure not found. Make sure you're in /var/www/fsfvi and the repository is cloned."
    print_error "Expected file: $PROJECT_DIR/backend/requirements.txt"
    exit 1
fi

if [ ! -f "$PROJECT_DIR/production.env.template" ]; then
    print_error "Production environment template not found at $PROJECT_DIR/production.env.template"
    exit 1
fi

print_status "Project structure verified ✓"

# 3. Create project directory permissions
print_status "Setting up project directory permissions..."
sudo chown -R $USER:$USER $PROJECT_DIR

# 4. Setup Python virtual environment
print_status "Creating Python virtual environment..."
cd $BACKEND_DIR

# Remove existing venv if it exists
if [ -d "$VENV_DIR" ]; then
    print_warning "Removing existing virtual environment..."
    rm -rf $VENV_DIR
fi

# Create new virtual environment
python3 -m venv $VENV_DIR

# Verify venv was created
if [ ! -f "$VENV_DIR/bin/activate" ]; then
    print_error "Failed to create virtual environment"
    exit 1
fi

# Activate virtual environment
activate_venv

# 5. Install Python dependencies
print_status "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Verify key packages are installed
python -c "import django; print(f'Django {django.get_version()} installed')"
python -c "import fastapi; print(f'FastAPI installed')"

# 6. Environment configuration
print_status "Setting up environment configuration..."
if [ ! -f "$BACKEND_DIR/.env" ]; then
    print_warning "No .env file found. Creating from production template..."
    cp $PROJECT_DIR/production.env.template $BACKEND_DIR/.env
    print_warning "Please edit .env file with your production values before continuing!"
    read -p "Press enter when you've updated the .env file..."
fi

# 7. Setup SQLite database directory with proper permissions
print_status "Setting up SQLite database..."
mkdir -p $DJANGO_DIR/data
sudo chown $USER:www-data $DJANGO_DIR/data
sudo chmod 775 $DJANGO_DIR/data

# 8. Django setup
print_status "Running Django migrations and setup..."
cd $DJANGO_DIR

# Ensure virtual environment is still activated
activate_venv

# Clear Django cache and old static files
print_status "Clearing Django cache and static files..."
rm -rf staticfiles
rm -rf __pycache__
find . -name "*.pyc" -delete
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true

# Set Django settings module and verify Django can be imported
export DJANGO_SETTINGS_MODULE="settings"
python -c "import django; django.setup()" || {
    print_error "Django setup failed - virtual environment issue"
    exit 1
}

# Set Django settings and run Django commands
export DJANGO_SETTINGS_MODULE="settings"
python manage.py collectstatic --noinput --clear
python manage.py migrate
python manage.py loaddata fixtures/initial_data.json 2>/dev/null || print_warning "No initial data fixtures found"

# Set proper permissions for SQLite database
if [ -f "$DJANGO_DIR/db.sqlite3" ]; then
    sudo chown $USER:www-data $DJANGO_DIR/db.sqlite3
    sudo chmod 664 $DJANGO_DIR/db.sqlite3
fi

# 9. Create Django superuser (if needed)
print_status "Creating Django superuser (if needed)..."

# Ensure virtual environment is activated
activate_venv

# Set Django settings module
export DJANGO_SETTINGS_MODULE="settings"

python manage.py shell << EOF
from django.contrib.auth.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@fsfvi.ai', 'change-this-password')
    print("Superuser 'admin' created")
else:
    print("Superuser already exists")
EOF

# 9.1. Frontend Build and Deployment
print_status "Building and deploying frontend..."
cd $FRONTEND_DIR

# Clear existing cache and builds
print_status "Clearing frontend cache and old builds..."
rm -rf .next
rm -rf node_modules/.cache
npm cache clean 2>/dev/null || rm -rf ~/.npm/_cacache 2>/dev/null || true

# Create production environment file
if [ ! -f "$FRONTEND_DIR/.env.production" ]; then
    print_status "Creating frontend production environment file..."
    cp $FRONTEND_DIR/production.env.template $FRONTEND_DIR/.env.production
fi

# Install frontend dependencies (fresh install)
print_status "Installing frontend dependencies (fresh install)..."
rm -rf node_modules
npm ci

# Build the frontend
print_status "Building frontend for production..."
npm run build:production

# Clear and recreate directory for built frontend
print_status "Preparing frontend deployment directory..."
sudo rm -rf /var/www/html/fsfvi
sudo mkdir -p /var/www/html/fsfvi
sudo chown $USER:www-data /var/www/html/fsfvi

# Copy built files to web directory
print_status "Deploying frontend files..."
sudo cp -r $FRONTEND_DIR/.next/standalone/* /var/www/html/fsfvi/
sudo cp -r $FRONTEND_DIR/.next/standalone/.next /var/www/html/fsfvi/
sudo cp -r $FRONTEND_DIR/.next/static /var/www/html/fsfvi/.next/
sudo cp -r $FRONTEND_DIR/public /var/www/html/fsfvi/

# Set proper permissions
sudo chown -R $USER:www-data /var/www/html/fsfvi
sudo chmod -R 755 /var/www/html/fsfvi

print_status "Frontend build and deployment completed ✓"

# 10. Nginx configuration - Single unified configuration
print_status "Configuring Nginx with unified configuration..."

# Create upstream definitions for better load balancing and maintenance
sudo tee /etc/nginx/sites-available/fsfvi.ai > /dev/null << EOF
# Upstream definitions for better maintainability
upstream django_backend {
    server 127.0.0.1:8000;
}

upstream fastapi_backend {
    server 127.0.0.1:8001;
}

upstream frontend_backend {
    server 127.0.0.1:3000;
}

# HTTP server - redirect to HTTPS
server {
    listen 80;
    server_name fsfvi.ai www.fsfvi.ai 16.170.24.245;

    # Allow Let's Encrypt challenges
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # Redirect all other HTTP traffic to HTTPS
    location / {
        return 301 https://\$server_name\$request_uri;
    }
}

# HTTPS server with complete routing
server {
    listen 443 ssl http2;
    server_name fsfvi.ai www.fsfvi.ai;

    # SSL configuration - will be managed by certbot
    ssl_certificate /etc/letsencrypt/live/fsfvi.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fsfvi.ai/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header X-Frame-Options DENY always;
    add_header X-Content-Type-Options nosniff always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Common proxy settings
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_redirect off;
    proxy_read_timeout 300;
    proxy_connect_timeout 300;
    proxy_send_timeout 300;
    
    # Static files with cache
    location /_next/static/ {
        alias /var/www/html/fsfvi/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # Django static files (REST Framework expects /static/ path)
    location ~ ^/static/(rest_framework|admin)/ {
        alias $DJANGO_DIR/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # Frontend static files (everything else under /static/)
    location /static/ {
        alias /var/www/html/fsfvi/public/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # Django static and media files (alternative path)
    location /django-static/ {
        alias $DJANGO_DIR/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    location /media/ {
        alias $DJANGO_DIR/media/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # Django Admin - handle both with and without trailing slash
    location /admin {
        proxy_pass http://django_backend;
    }
    
    location /admin/ {
        proxy_pass http://django_backend;
    }
    
    
    
    # Django REST Framework API - handle both with and without trailing slash
    location /django-api {
        proxy_pass http://django_backend;
    }
    
    location /django-api/ {
        proxy_pass http://django_backend;
    }
    
    # FastAPI routes - handle both with and without trailing slash
    location /api {
        proxy_pass http://fastapi_backend;
    }
    
    location /api/ {
        proxy_pass http://fastapi_backend/;
    }
    
    # Health checks - handle both with and without trailing slash
    location /health {
        proxy_pass http://django_backend;
    }
    
    location /health/ {
        proxy_pass http://django_backend;
    }
    
    location /api/health {
        proxy_pass http://fastapi_backend;
    }
    
    # Frontend - all other routes go to Next.js (including /auth/)
    location / {
        proxy_pass http://frontend_backend;
        
        # WebSocket support for Next.js dev features
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass \$http_upgrade;
    }
    
    # Error pages
    error_page 502 503 504 /50x.html;
    location = /50x.html {
        root /var/www/html;
        internal;
    }
}
EOF

# Enable the site and test configuration
sudo ln -sf /etc/nginx/sites-available/fsfvi.ai /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
if ! sudo nginx -t; then
    print_error "Nginx configuration test failed"
    exit 1
fi

print_status "Nginx configuration completed ✓"

# Create a simple error page
sudo mkdir -p /var/www/html
sudo tee /var/www/html/50x.html > /dev/null << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>FSFVI - Service Temporarily Unavailable</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; margin-top: 100px; }
        h1 { color: #333; }
        p { color: #666; }
    </style>
</head>
<body>
    <h1>Service Temporarily Unavailable</h1>
    <p>FSFVI services are starting up. Please try again in a moment.</p>
    <p>If this problem persists, please contact support.</p>
</body>
</html>
EOF

# Start nginx with initial configuration
sudo systemctl reload nginx

# 11. Supervisor configuration for services
print_status "Configuring Supervisor for service management..."

# Django/Gunicorn configuration
sudo tee /etc/supervisor/conf.d/fsfvi-django.conf > /dev/null << EOF
[program:fsfvi-django]
command=$VENV_DIR/bin/gunicorn --workers 3 --bind 127.0.0.1:8000 --timeout 300 wsgi:application
directory=$DJANGO_DIR
user=$USER
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/fsfvi-django.log
environment=ENVIRONMENT="production",DJANGO_SETTINGS_MODULE="settings"
EOF

# FastAPI configuration
sudo tee /etc/supervisor/conf.d/fsfvi-fastapi.conf > /dev/null << EOF
[program:fsfvi-fastapi]
command=$VENV_DIR/bin/uvicorn main:app --host 127.0.0.1 --port 8001 --workers 2
directory=$FASTAPI_DIR
user=$USER
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/fsfvi-fastapi.log
environment=ENVIRONMENT="production"
EOF

# Next.js frontend configuration
sudo tee /etc/supervisor/conf.d/fsfvi-frontend.conf > /dev/null << EOF
[program:fsfvi-frontend]
command=/usr/bin/node server.js
directory=/var/www/html/fsfvi
user=$USER
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/fsfvi-frontend.log
environment=NODE_ENV="production",PORT="3000"
EOF

# 12. SSL Certificate with Let's Encrypt
print_status "Setting up SSL certificate with Let's Encrypt..."

# First, ensure nginx is running with HTTP config for Let's Encrypt challenge
print_status "Testing HTTP configuration before SSL..."
curl -I http://fsfvi.ai/ || print_warning "HTTP test failed - continuing with SSL setup"

# Get SSL certificate - let certbot modify nginx configuration automatically
sudo certbot --nginx -d fsfvi.ai -d www.fsfvi.ai --non-interactive --agree-tos --email dishdevinfo@gmail.com

# Verify SSL certificate was installed
if [ -f "/etc/letsencrypt/live/fsfvi.ai/fullchain.pem" ]; then
    print_status "SSL certificate installed successfully ✓"
    
    # Test configuration and reload
    sudo nginx -t && sudo systemctl reload nginx
    print_status "HTTPS configuration activated ✓"
else
    print_error "SSL certificate installation failed"
    print_warning "Continuing with HTTP-only configuration"
fi

# 13. Start services
print_status "Starting services..."
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start all
sudo systemctl enable nginx redis-server supervisor
sudo systemctl start nginx redis-server supervisor

# Clear nginx cache
print_status "Clearing nginx cache..."
sudo systemctl reload nginx
# Clear any nginx proxy cache if configured
sudo rm -rf /var/cache/nginx/* 2>/dev/null || true

# 14. Firewall configuration
print_status "Configuring firewall..."
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw --force enable

# 15. Setup automatic SSL renewal
print_status "Setting up automatic SSL certificate renewal..."
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -

# 16. Create backup script for SQLite database
print_status "Setting up database backup..."
sudo tee /usr/local/bin/fsfvi-backup.sh > /dev/null << EOF
#!/bin/bash
BACKUP_DIR="/var/backups/fsfvi"
DATE=\$(date +%Y%m%d_%H%M%S)
mkdir -p \$BACKUP_DIR
sqlite3 $DJANGO_DIR/db.sqlite3 ".backup \$BACKUP_DIR/fsfvi_backup_\$DATE.sqlite3"
# Keep only last 7 days of backups
find \$BACKUP_DIR -name "fsfvi_backup_*.sqlite3" -mtime +7 -delete
EOF

sudo chmod +x /usr/local/bin/fsfvi-backup.sh

# Setup daily backup
echo "0 2 * * * /usr/local/bin/fsfvi-backup.sh" | sudo crontab -

print_status "✅ FSFVI Production Deployment Complete!"
print_status "Your FSFVI application is now running at https://fsfvi.ai"
print_status ""
print_status "Services deployed:"
print_status "- Frontend (Next.js): https://fsfvi.ai → port 3000"
print_status "- Backend (Django): https://fsfvi.ai/django-api/auth/, /dashboard/, /admin/ → port 8000"
print_status "- API (FastAPI): https://fsfvi.ai/api/ → port 8001"
print_status ""
print_status "Next steps:"
print_status "1. Update backend/.env with actual production values"
print_status "2. Update frontend/.env.production if needed"
print_status "3. Change default superuser password: python manage.py changepassword admin"
print_status "4. Test the deployment: curl -k https://fsfvi.ai"
print_status "5. Monitor logs: sudo tail -f /var/log/fsfvi-*.log"
print_status ""
print_status "Service management commands:"
print_status "- sudo supervisorctl status"
print_status "- sudo supervisorctl restart fsfvi-frontend"
print_status "- sudo supervisorctl restart fsfvi-django"
print_status "- sudo supervisorctl restart fsfvi-fastapi"
print_status "- sudo systemctl reload nginx"
print_status ""
print_status "Database backup:"
print_status "- Manual backup: /usr/local/bin/fsfvi-backup.sh"
print_status "- Backups location: /var/backups/fsfvi/" 