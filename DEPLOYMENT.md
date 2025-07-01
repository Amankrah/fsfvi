# FSFVI Deployment Guide

## Quick Setup

### Development Environment

1. **Clone and setup:**
   ```bash
   git clone <repository-url>
   cd fsfvi
   cp development.env.template backend/.env
   ```

2. **Backend setup:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Django setup:**
   ```bash
   cd django_app
   python manage.py migrate
   python manage.py createsuperuser
   python manage.py runserver 8000
   ```

4. **FastAPI setup (new terminal):**
   ```bash
   cd backend/fastapi_app
   source ../venv/bin/activate
   uvicorn main:app --host 127.0.0.1 --port 8001 --reload
   ```

5. **Frontend setup (new terminal):**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

**Access:**
- Frontend: http://localhost:3000
- Django Admin: http://localhost:8000/admin
- FastAPI Docs: http://localhost:8001/docs

---

## Production Deployment on AWS (fsfvi.ai)

### Prerequisites

- AWS EC2 instance (Ubuntu 20.04+)
- Domain pointed to your Elastic IP (16.170.24.245)
- SSH access to the server

### Automated Deployment

1. **Upload your code to server:**
   ```bash
   # On your server
   sudo mkdir -p /var/www/fsfvi
   sudo chown $USER:$USER /var/www/fsfvi
   cd /var/www/fsfvi
   
   # Upload/clone your code here
   git clone <your-repository> .
   ```

2. **Configure production environment:**
   ```bash
   cd /var/www/fsfvi
   cp production.env.template backend/.env
   
   # Edit the .env file with your production values
   nano backend/.env
   ```

3. **Run deployment script:**
   ```bash
   cd backend
   chmod +x deploy.sh
   ./deploy.sh
   ```

The script will automatically:
- Install system dependencies (Python, Nginx, Redis, etc.)
- Setup virtual environment and install Python packages
- Configure SQLite database with proper permissions
- Setup Nginx with SSL (Let's Encrypt)
- Configure Supervisor for process management
- Setup automated backups
- Configure firewall

### Manual Configuration Steps

**Important:** After deployment, update these manually:

1. **Change Django secret key** in `backend/.env`:
   ```bash
   python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
   ```

2. **Change admin password:**
   ```bash
   cd /var/www/fsfvi/backend/django_app
   source ../venv/bin/activate
   python manage.py changepassword admin
   ```

3. **Test deployment:**
   ```bash
   curl -k https://fsfvi.ai
   ```

### Service Management

```bash
# Check service status
sudo supervisorctl status

# Restart services
sudo supervisorctl restart fsfvi-django
sudo supervisorctl restart fsfvi-fastapi
sudo supervisorctl restart fsfvi-celery

# Nginx
sudo systemctl reload nginx

# View logs
sudo tail -f /var/log/fsfvi-django.log
sudo tail -f /var/log/fsfvi-fastapi.log
```

### Database Backup

- **Automatic:** Daily backups at 2 AM to `/var/backups/fsfvi/`
- **Manual:** Run `/usr/local/bin/fsfvi-backup.sh`

### Architecture

```
Internet → Nginx (443/80) → Django (8000) + FastAPI (8001)
                         ↓
                   SQLite Database + Redis Cache
```

**Security Features:**
- HTTPS with Let's Encrypt SSL
- Security headers (HSTS, XSS protection, etc.)
- Firewall configuration
- Proper file permissions
- Rate limiting

---

## Environment Variables

### Development
```env
ENVIRONMENT=development
DEBUG=True
DJANGO_SECRET_KEY=development-key
```

### Production
```env
ENVIRONMENT=production
DEBUG=False
DJANGO_SECRET_KEY=your-secure-production-key
AUTH_SERVICE_URL=https://fsfvi.ai
```

## Troubleshooting

1. **SSL Certificate Issues:**
   ```bash
   sudo certbot renew --dry-run
   ```

2. **Permission Issues:**
   ```bash
   sudo chown -R $USER:www-data /var/www/fsfvi/backend/django_app/
   sudo chmod -R 775 /var/www/fsfvi/backend/django_app/media/
   ```

3. **Database Issues:**
   ```bash
   cd /var/www/fsfvi/backend/django_app
   python manage.py migrate
   ```

For issues, check logs: `sudo tail -f /var/log/fsfvi-*.log` 