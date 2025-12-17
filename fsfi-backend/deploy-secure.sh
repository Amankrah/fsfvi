#!/bin/bash

# FSFI Backend - Secure Deployment Script
# This script sets up a hardened EC2 instance for the FSFI backend

set -euo pipefail

echo "==================================="
echo "FSFI Secure Deployment Script"
echo "==================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    log_error "Please run as root (use sudo)"
    exit 1
fi

# Update system packages
log_info "Updating system packages..."
apt-get update -y
apt-get upgrade -y

# Install essential packages
log_info "Installing essential packages..."
apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    pkg-config \
    libssl-dev \
    ufw \
    fail2ban \
    unattended-upgrades \
    postgresql-client \
    nginx \
    certbot \
    python3-certbot-nginx

# Install Rust
log_info "Installing Rust..."
if ! command -v rustc &> /dev/null; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
else
    log_info "Rust already installed"
fi

# Configure UFW Firewall
log_info "Configuring UFW firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# Allow SSH from specific IPs only (IMPORTANT: Update with your IP)
# TODO: Replace with your actual IP address
read -p "Enter your IP address to whitelist for SSH (e.g., 1.2.3.4): " ADMIN_IP
if [ -n "$ADMIN_IP" ]; then
    ufw allow from $ADMIN_IP to any port 22 proto tcp
    log_info "SSH access allowed from $ADMIN_IP"
else
    log_warn "No IP specified. SSH will be blocked after UFW is enabled!"
fi

# Allow HTTP and HTTPS
ufw allow 80/tcp
ufw allow 443/tcp

# Enable UFW
ufw --force enable
log_info "UFW firewall configured and enabled"

# Configure Fail2ban
log_info "Configuring Fail2ban..."
cat > /etc/fail2ban/jail.local <<EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
destemail = your-email@example.com
sendername = FSFI-Security
action = %(action_mwl)s

[sshd]
enabled = true
port = 22
logpath = %(sshd_log)s
maxretry = 3
bantime = 86400

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-limit-req]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 5
EOF

systemctl restart fail2ban
log_info "Fail2ban configured and started"

# Configure automatic security updates
log_info "Configuring automatic security updates..."
cat > /etc/apt/apt.conf.d/50unattended-upgrades <<EOF
Unattended-Upgrade::Allowed-Origins {
    "\${distro_id}:\${distro_codename}-security";
    "\${distro_id}ESMApps:\${distro_codename}-apps-security";
    "\${distro_id}ESM:\${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "02:00";
EOF

echo 'APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
APT::Periodic::Unattended-Upgrade "1";' > /etc/apt/apt.conf.d/20auto-upgrades

log_info "Automatic security updates configured"

# SSH Hardening
log_info "Hardening SSH configuration..."
cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

cat > /etc/ssh/sshd_config <<EOF
# SSH Server Security Configuration - FSFI
Port 22
Protocol 2

# Authentication
PermitRootLogin no
PubkeyAuthentication yes
PasswordAuthentication no
PermitEmptyPasswords no
ChallengeResponseAuthentication no
UsePAM yes

# Security
X11Forwarding no
MaxAuthTries 3
MaxSessions 2
ClientAliveInterval 300
ClientAliveCountMax 2

# Logging
SyslogFacility AUTH
LogLevel VERBOSE

# Override default of no subsystems
Subsystem sftp /usr/lib/openssh/sftp-server
EOF

systemctl restart sshd
log_info "SSH hardened and restarted"

# Configure Nginx with security headers
log_info "Configuring Nginx..."
cat > /etc/nginx/sites-available/fsfi <<EOF
# Rate limiting
limit_req_zone \$binary_remote_addr zone=api_limit:10m rate=10r/s;
limit_req_zone \$binary_remote_addr zone=login_limit:10m rate=5r/m;

server {
    listen 80;
    server_name your-domain.com;

    # Redirect to HTTPS
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL Configuration (update paths after certbot)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Rate limiting
    limit_req zone=api_limit burst=20 nodelay;

    # Proxy to Rust backend
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Stricter rate limit for auth endpoints
    location /api/v1/auth/ {
        limit_req zone=login_limit burst=3 nodelay;
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Disable default site
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/fsfi /etc/nginx/sites-enabled/

nginx -t
systemctl restart nginx
log_info "Nginx configured"

# Create deployment user
log_info "Creating deployment user..."
if ! id -u fsfi &>/dev/null; then
    useradd -m -s /bin/bash fsfi
    usermod -aG sudo fsfi
    log_info "User 'fsfi' created"
else
    log_info "User 'fsfi' already exists"
fi

# Create application directory
log_info "Setting up application directory..."
mkdir -p /opt/fsfi-backend
chown -R fsfi:fsfi /opt/fsfi-backend

# Setup systemd service
log_info "Creating systemd service..."
cat > /etc/systemd/system/fsfi-backend.service <<EOF
[Unit]
Description=FSFI Backend Service
After=network.target postgresql.service

[Service]
Type=simple
User=fsfi
Group=fsfi
WorkingDirectory=/opt/fsfi-backend
Environment="RUST_LOG=info"
EnvironmentFile=/opt/fsfi-backend/.env
ExecStart=/opt/fsfi-backend/target/release/fsfi-backend
Restart=always
RestartSec=10

# Security
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/fsfi-backend

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
log_info "Systemd service created"

# Setup CloudWatch Logs (requires AWS CLI)
log_info "Setting up CloudWatch Logs..."
if ! command -v aws &> /dev/null; then
    log_info "Installing AWS CLI..."
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    ./aws/install
    rm -rf aws awscliv2.zip
fi

# Create CloudWatch agent config
cat > /opt/aws/amazon-cloudwatch-agent/etc/config.json <<EOF
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/syslog",
            "log_group_name": "/fsfi/backend/syslog",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/var/log/auth.log",
            "log_group_name": "/fsfi/backend/auth",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/var/log/nginx/access.log",
            "log_group_name": "/fsfi/backend/nginx-access",
            "log_stream_name": "{instance_id}"
          },
          {
            "file_path": "/var/log/nginx/error.log",
            "log_group_name": "/fsfi/backend/nginx-error",
            "log_stream_name": "{instance_id}"
          }
        ]
      }
    }
  }
}
EOF

# Install audit logging
log_info "Installing and configuring auditd..."
apt-get install -y auditd
auditctl -w /opt/fsfi-backend -p rwxa -k fsfi_backend_changes
auditctl -w /etc/nginx/ -p wa -k nginx_config_changes
auditctl -w /etc/ssh/sshd_config -p wa -k ssh_config_changes

# Make audit rules persistent
cat >> /etc/audit/rules.d/audit.rules <<EOF
-w /opt/fsfi-backend -p rwxa -k fsfi_backend_changes
-w /etc/nginx/ -p wa -k nginx_config_changes
-w /etc/ssh/sshd_config -p wa -k ssh_config_changes
EOF

systemctl restart auditd

log_info "============================================"
log_info "Security hardening complete!"
log_info "============================================"
log_info ""
log_info "Next steps:"
log_info "1. Configure PostgreSQL database"
log_info "2. Set up SSL certificates with: certbot --nginx -d your-domain.com"
log_info "3. Copy application code to /opt/fsfi-backend"
log_info "4. Create .env file with proper configuration"
log_info "5. Build the application: cargo build --release"
log_info "6. Start the service: systemctl start fsfi-backend"
log_info ""
log_warn "IMPORTANT: Update the Nginx config with your actual domain"
log_warn "IMPORTANT: Configure AWS credentials for CloudWatch"
log_warn "IMPORTANT: Review and adjust firewall rules as needed"
log_info ""
