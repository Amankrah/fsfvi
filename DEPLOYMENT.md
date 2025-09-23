# FSFVI Production Deployment Guide for fsfvi.ai

## Prerequisites

- AWS EC2 instance (Ubuntu 20.04+) at **16.170.24.245**
- Domain **fsfvi.ai** pointed to your Elastic IP
- RSA key pair `fsfvi_aws_key.pem` (located in `backend/` directory)

## Step 1: SSH into AWS Server

```bash
# Navigate to backend directory where the key is located
cd backend

# Set proper permissions for the SSH key
chmod 400 fsfvi_aws_key.pem

# SSH into your AWS instance
ssh -i fsfvi_aws_key.pem ubuntu@16.170.24.245
```

## Step 2: Clone Repository and Setup

```bash
# On your AWS server
sudo mkdir -p /var/www/fsfvi
sudo chown $USER:$USER /var/www/fsfvi
cd /var/www/fsfvi

# Clone the repository
git clone https://github.com/Amankrah/fsfvi.git .

# Configure production environment
cp production.env.template backend/.env

# Edit the .env file with your production values
nano backend/.env
```

**Important:** Update these values in `backend/.env`:
- `DJANGO_SECRET_KEY` - Generate a new secure key
- `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD` - Your email credentials
- Other production-specific settings

## Step 3: Run Automated Deployment

```bash
cd backend
chmod +x deploy.sh
./deploy.sh
```

The deployment script will automatically:
- Install system dependencies (Python, Nginx, Redis, SQLite, etc.)
- Setup Python virtual environment and install packages
- Configure SQLite database with proper permissions
- Setup Nginx with SSL certificates (Let's Encrypt)
- Configure Supervisor for process management
- Setup automated daily database backups
- Configure firewall (UFW)
- Start all services

## Step 4: Post-Deployment Security

**After deployment completes, immediately:**

1. **Generate and set a new Django secret key:**
   ```bash
   cd /var/www/fsfvi/backend/django_app
   source ../venv/bin/activate
   python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
   ```
   Copy the output and update `DJANGO_SECRET_KEY` in `backend/.env`

2. **Change the default admin password:**
   ```bash
   python manage.py changepassword admin
   ```

3. **Restart services to apply changes:**
   ```bash
   sudo supervisorctl restart all
   ```

## Step 5: Verify Deployment

```bash
# Test HTTPS connection
curl -I https://fsfvi.ai

# Check service status
sudo supervisorctl status

# View logs if needed
sudo tail -f /var/log/fsfvi-django.log
sudo tail -f /var/log/fsfvi-fastapi.log
sudo tail -f /var/log/fsvi-frontend.log
```

**Your FSFVI application should now be live at:** `https://fsfvi.ai`

---

## Production Architecture

```
Internet → Nginx (443/80) → Django (8000) + FastAPI (8001)
                         ↓
                   SQLite Database + Redis Cache
```

## Service Management Commands

```bash
# Check all services
sudo supervisorctl status

# Restart individual services
sudo supervisorctl restart fsfvi-django
sudo supervisorctl restart fsfvi-fastapi
sudo supervisorctl restart fsfvi-frontend

# Reload Nginx
sudo systemctl reload nginx

# View real-time logs
sudo tail -f /var/log/fsfvi-django.log
sudo tail -f /var/log/fsfvi-fastapi.log
sudo tail -f /var/log/fsfvi-celery.log
```

## Database Backup

- **Automatic:** Daily backups at 2:00 AM to `/var/backups/fsfvi/`
- **Manual backup:** `/usr/local/bin/fsfvi-backup.sh`
- **View backups:** `ls -la /var/backups/fsfvi/`

## SSL Certificate Management

Certificates auto-renew via cron job. Manual renewal:
```bash
sudo certbot renew --dry-run
sudo systemctl reload nginx
```

## Security Features Enabled

✅ HTTPS with Let's Encrypt SSL certificates  
✅ Security headers (HSTS, XSS protection, etc.)  
✅ Firewall configured (UFW)  
✅ Proper file permissions for SQLite  
✅ Rate limiting on API endpoints  
✅ Production-only CORS origins  

## Troubleshooting

**SSL Issues:**
```bash
sudo certbot certificates
sudo certbot renew --force-renewal
```

**Permission Issues:**
```bash
sudo chown -R $USER:www-data /var/www/fsfvi/backend/django_app/
sudo chmod 664 /var/www/fsfvi/backend/django_app/db.sqlite3
```

**Service Issues:**
```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl restart all
```

**View detailed logs:**
```bash
sudo journalctl -u supervisor -f
sudo nginx -t  # Test nginx configuration
```

---

## Future Updates

To deploy updates:
```bash
cd /var/www/fsfvi
git pull origin main
cd backend/django_app
source ../venv/bin/activate
python manage.py migrate
python manage.py collectstatic --noinput
sudo supervisorctl restart all
sudo systemctl reload nginx
``` 


curl -X POST https://fsfvi.ai/django-api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "SecurePassword123!"
  }' \
  -v


  sudo certbot --nginx -d fsfvi.ai -d www.fsfvi.ai --non-interactive

  sudo netstat -tlnp | grep nginx

  sudo cat /etc/nginx/sites-available/fsfvi.ai