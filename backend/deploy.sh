#!/bin/bash

# FSFVI Production Deployment Script for fsfvi.ai
# Run this script on your AWS EC2 instance

set -e  # Exit on any error

echo "🚀 Starting FSFVI Production Deployment for fsfvi.ai"

# Configuration
PROJECT_DIR="/var/www/fsfvi"
BACKEND_DIR="$PROJECT_DIR/backend"
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
sudo apt install -y python3-pip python3-venv python3-dev nginx redis-server supervisor certbot python3-certbot-nginx sqlite3

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
chown $USER:www-data $DJANGO_DIR/data
chmod 775 $DJANGO_DIR/data

# 8. Django setup
print_status "Running Django migrations and setup..."
cd $DJANGO_DIR

# Ensure virtual environment is still activated
activate_venv

# Verify Django can be imported
python -c "import django; django.setup()" || {
    print_error "Django setup failed - virtual environment issue"
    exit 1
}

# Run Django commands
python manage.py collectstatic --noinput
python manage.py migrate
python manage.py loaddata fixtures/initial_data.json 2>/dev/null || print_warning "No initial data fixtures found"

# Set proper permissions for SQLite database
if [ -f "$DJANGO_DIR/db.sqlite3" ]; then
    chown $USER:www-data $DJANGO_DIR/db.sqlite3
    chmod 664 $DJANGO_DIR/db.sqlite3
fi

# 9. Create Django superuser (if needed)
print_status "Creating Django superuser (if needed)..."

# Ensure virtual environment is activated
activate_venv

python manage.py shell << EOF
from django.contrib.auth.models import User
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@fsfvi.ai', 'change-this-password')
    print("Superuser 'admin' created")
else:
    print("Superuser already exists")
EOF

# 10. Nginx configuration
print_status "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/fsfvi.ai > /dev/null << EOF
server {
    listen 80;
    server_name fsfvi.ai www.fsfvi.ai 16.170.24.245;
    
    # Redirect HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name fsfvi.ai www.fsfvi.ai;
    
    # SSL Configuration (will be handled by certbot)
    ssl_certificate /etc/letsencrypt/live/fsfvi.ai/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fsfvi.ai/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
    
    # Static files
    location /static/ {
        alias $DJANGO_DIR/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location /media/ {
        alias $DJANGO_DIR/media/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Django backend
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_redirect off;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
    }
    
    # FastAPI service
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_redirect off;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
    }
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/fsfvi.ai /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

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
environment=ENVIRONMENT="production"
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

# Celery worker configuration
sudo tee /etc/supervisor/conf.d/fsfvi-celery.conf > /dev/null << EOF
[program:fsfvi-celery]
command=$VENV_DIR/bin/celery -A fsfvi worker --loglevel=info
directory=$DJANGO_DIR
user=$USER
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/fsfvi-celery.log
environment=ENVIRONMENT="production"
EOF

# 12. SSL Certificate with Let's Encrypt
print_status "Setting up SSL certificate with Let's Encrypt..."
sudo certbot --nginx -d fsfvi.ai -d www.fsfvi.ai --non-interactive --agree-tos --email admin@fsfvi.ai

# 13. Start services
print_status "Starting services..."
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start all
sudo systemctl enable nginx redis-server supervisor
sudo systemctl start nginx redis-server supervisor

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

chmod +x /usr/local/bin/fsfvi-backup.sh

# Setup daily backup
echo "0 2 * * * /usr/local/bin/fsfvi-backup.sh" | sudo crontab -

print_status "✅ FSFVI Production Deployment Complete!"
print_status "Your FSFVI application is now running at https://fsfvi.ai"
print_status ""
print_status "Next steps:"
print_status "1. Update your .env file with actual production values"
print_status "2. Change default superuser password: python manage.py changepassword admin"
print_status "3. Test the deployment: curl -k https://fsfvi.ai"
print_status "4. Monitor logs: sudo tail -f /var/log/fsfvi-*.log"
print_status ""
print_status "Service management commands:"
print_status "- sudo supervisorctl status"
print_status "- sudo supervisorctl restart fsfvi-django"
print_status "- sudo supervisorctl restart fsfvi-fastapi"
print_status "- sudo systemctl reload nginx"
print_status ""
print_status "Database backup:"
print_status "- Manual backup: /usr/local/bin/fsfvi-backup.sh"
print_status "- Backups location: /var/backups/fsfvi/" 