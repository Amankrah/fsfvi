# FSFI Rwanda Stack — Secure Production Deployment (AWS EC2)

Complete guide for deploying this repository (**[github.com/Amankrah/fsfvi](https://github.com/Amankrah/fsfvi)**) to production: **Django** + **Rust `fsfi_engine`** (Gunicorn), **SQLite**, **Next.js**, **nginx**, **Ubuntu** on **EC2**.

> **Security first:** Harden the OS and SSH **before** exposing the app. After a cryptominer-style incident on any server, treat **fresh instances** and **least privilege** as default.

> **Traveling to Rwanda (or any changing IP):** Restricting **your API** to “my IP” is **not** how browser apps work. **CORS** uses **HTTPS origins** (e.g. `https://rwanda.fsfvi.ai`), not your laptop’s IP. **Public** ports **80/443** stay open to the world so users can reach the dashboard. What breaks when you travel is **locking SSH to one home IP** — see [Access and firewalls while traveling](#access-and-firewalls-while-traveling-rwanda-and-changing-ips).

---

## Table of contents

- [Prerequisites](#prerequisites)
- [Architecture overview](#architecture-overview)
- [Access and firewalls while traveling (Rwanda and changing IPs)](#access-and-firewalls-while-traveling-rwanda-and-changing-ips)
- [Security checklist](#security-checklist)
- [Phase 1 — Security hardening](#phase-1--security-hardening)
- [Phase 2 — Server setup](#phase-2--server-setup)
- [Phase 3 — Application deployment](#phase-3--application-deployment)
- [Phase 4 — nginx](#phase-4--nginx)
- [Phase 5 — systemd (Gunicorn + Next.js)](#phase-5--systemd-gunicorn--nextjs)
- [Phase 6 — SSL (Let’s Encrypt)](#phase-6--ssl-lets-encrypt)
- [Post-deployment verification](#post-deployment-verification)
- [Data pipeline (first load)](#data-pipeline-first-load)
- [Security monitoring](#security-monitoring)
- [Troubleshooting](#troubleshooting)
- [Maintenance](#maintenance)
- [Quick reference](#quick-reference)

---

## Prerequisites

### Resources

| Resource | Example | Notes |
|----------|---------|--------|
| EC2 | Ubuntu **22.04 LTS** or **24.04 LTS** | **t3.small** or larger; **20 GiB+** RAM if you can (per project notes) |
| Elastic IP | e.g. `13.63.119.228` | Associate to instance; **DNS A/AAAA** → this IP |
| Domain | e.g. **`fsfvi.ai`**, **`rwanda.fsfvi.ai`** | See `docs/domain-and-environments.md` |
| GitHub | `https://github.com/Amankrah/fsfvi.git` | |
| SSH key | `.pem` (EC2) | **Never commit**; `*.pem` is gitignored |

### Get your **current** public IP (for optional SSH UFW rule)

On **your laptop** (before flying):

```bash
curl -s ifconfig.me
```

Write it down if you use **UFW “SSH from this IP only”** — you will need to **update** it when your IP changes.

### AWS security group (typical)

| Type | Port | Source | Purpose |
|------|------|--------|---------|
| SSH | 22 | See [travel section](#access-and-firewalls-while-traveling-rwanda-and-changing-ips) | Administrative access |
| HTTP | 80 | `0.0.0.0/0` | Let’s Encrypt + redirect to HTTPS |
| HTTPS | 443 | `0.0.0.0/0` | **Public site + `/api/`** for all users |

**Never** open SSH **22** to `0.0.0.0/0` **unless** you use **key-only** auth + **fail2ban** and accept scanning noise — prefer **SSM** (below) or a **narrow** IP list.

---

## Architecture overview

```
                         Internet (users in Rwanda + worldwide)
                                       │
                              [443 HTTPS / 80 HTTP]
                                       │
                    ┌──────────────────┴──────────────────┐
                    │  Security group + optional UFW        │
                    └──────────────────┬──────────────────┘
                                       │
                              [nginx reverse proxy]
                         /api/  /admin/  /static/
                    ┌──────┴──────┬───────┴────────┐
                    │             │                │
            [Gunicorn Unix    [Next.js]      [static files]
             socket]          :3000
                    │
            [Django + fsfi_engine]
                    │
              [SQLite file]
```

| Layer | Technology |
|--------|------------|
| App server | Django 5.x, Gunicorn, **Rust `fsfi_engine`** (maturin wheel) |
| DB | **SQLite** (`DB_NAME` path outside repo) |
| Frontend | Next.js (Node) or static export |
| Edge | nginx + TLS |
| OS hardening | UFW (optional), fail2ban, unattended-upgrades |

---

## Access and firewalls while traveling (Rwanda and changing IPs)

### What is **not** restricted by “my IP”

- **Django CORS / CSRF** — You set **`https://rwanda.fsfvi.ai`** (and apex if you use it) in **`CORS_ALLOWED_ORIGINS`** / **`CSRF_TRUSTED_ORIGINS`**. That is **not** your home IP. **Anyone** loading the site from Rwanda or elsewhere uses the **same public API** as long as the **browser origin** matches.
- **Security group** — **80** and **443** should be **public** so users can reach the app.

### What **is** painful with a single home IP

- **SSH (port 22)** — If UFW or the security group only allows **one** IP, you **lose SSH** when you travel unless you **update** the rule.

### Recommended approaches (pick one)

1. **AWS Systems Manager Session Manager** (best if you want **no inbound SSH** on the internet)  
   - Attach an **IAM instance profile** with SSM permissions.  
   - Install **`amazon-ssm-agent`** on the instance.  
   - Connect with **Session Manager** in the AWS Console; **no** fixed IP needed for shell access.

2. **SSH key-only + fail2ban + open 22 to `0.0.0.0/0`**  
   - **Disable password auth** (`PasswordAuthentication no`).  
   - Accept internet-wide scans; **fail2ban** limits brute force.  
   - Still riskier than SSM; use **strong** keys only.

3. **Update UFW when your IP changes**  
   ```bash
   sudo ufw allow from YOUR_NEW_IP to any port 22 proto tcp comment 'SSH'
   sudo ufw delete <rule-number>   # remove old IP rule
   sudo ufw status numbered
   ```

4. **Tailscale / WireGuard** on the server** — VPN into the server; then SSH only from the VPN interface.

5. **EC2 Instance Connect** or **bastion** — Short-term access patterns.

### API “restriction”

If you need **admin-only** or **partner-only** APIs, do **not** rely on IP allowlists for browsers. Use **authentication** (JWT + roles), **rate limiting** (nginx / Django), and optional **WAF** / **CloudFront** in front of EC2 later.

---

## Security checklist

### Pre-deployment

- [ ] Repo clean; secrets not committed (`git status`, no `.env` / `.pem`)
- [ ] Fresh or trusted EC2 instance
- [ ] Security group: **80/443** public; **SSH** not `0.0.0.0/0` (unless key-only + fail2ban, or use **SSM**)

### Phase 1 (during)

- [ ] OS updated; **UFW** (if used) allows **80/443**; SSH strategy matches [travel section](#access-and-firewalls-while-traveling-rwanda-and-changing-ips)
- [ ] **fail2ban** for `sshd`
- [ ] **Unattended security upgrades**
- [ ] **SSH**: no root, no passwords, keys only
- [ ] Optional: `security-check.sh` script + weekly cron

### Post-deployment

- [ ] SSL certificates (certbot) + auto-renewal
- [ ] Django `DJANGO_SECRET_KEY` / `FSFI_*` not defaults
- [ ] Admin password changed (`set_password` or new user)
- [ ] nginx `server_tokens off`; TLS 1.2+

---

## Phase 1 — Security hardening

Complete **before** cloning the app or opening the service beyond tests.

### 1.1 SSH and updates

```bash
sudo apt update && sudo DEBIAN_FRONTEND=noninteractive apt upgrade -y
```

### 1.2 Install security packages

```bash
sudo apt install -y fail2ban ufw unattended-upgrades apt-listchanges
```

### 1.3 UFW (example — **adjust SSH rule** to your strategy)

**If** you use a **single IP** for SSH (replace with your IP):

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from YOUR_IP_HERE to any port 22 proto tcp comment 'SSH admin'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw --force enable
sudo ufw status verbose
```

If you use **SSM only**, you may **omit** port 22 entirely from UFW and from the security group.

### 1.4 fail2ban (`/etc/fail2ban/jail.local`)

```ini
[DEFAULT]
bantime = 86400
findtime = 600
maxretry = 5
backend = systemd
banaction = ufw

[sshd]
enabled = true
port = ssh
filter = sshd
maxretry = 3
```

```bash
sudo systemctl enable --now fail2ban
sudo fail2ban-client status sshd
```

### 1.5 Unattended upgrades

Enable `unattended-upgrades` for security pockets (same pattern as standard Ubuntu guides).

### 1.6 SSH hardening

Use **drop-in** `/etc/ssh/sshd_config.d/hardening.conf`:

- `PermitRootLogin no`
- `PasswordAuthentication no`
- `PubkeyAuthentication yes`
- `MaxAuthTries 3`

```bash
sudo sshd -t && sudo systemctl restart ssh
```

### 1.7 Optional security audit script

Install a small script (e.g. `/usr/local/bin/fsfvi-security-check.sh`) that lists crontabs, suspicious processes, listening ports, and fail2ban status — schedule weekly.

---

## Phase 2 — Server setup

### 2.1 Packages

```bash
sudo apt install -y \
  nginx git curl build-essential pkg-config libssl-dev \
  python3-venv python3-dev \
  sqlite3 jq htop
```

Install **Rust** (for `fsfi_engine`): [rustup.rs](https://rustup.rs/)

### 2.2 Node.js (LTS)

Use Node **20 LTS** or **22 LTS** (match `rwanda-frontend` if you pin a version).

### 2.3 Timezone

```bash
sudo timedatectl set-timezone Africa/Kigali
```

### 2.4 Deploy user and directories

```bash
sudo useradd -m -s /bin/bash fsfvi || true
sudo mkdir -p /opt/fsfvi/app /var/lib/fsfvi
sudo chown fsfvi:fsfvi /opt/fsfvi /var/lib/fsfvi
```

---

## Phase 3 — Application deployment

### 3.1 Clone

```bash
sudo -u fsfvi -i
cd /opt/fsfvi
git clone https://github.com/Amankrah/fsfvi.git app
cd app
```

### 3.2 Backend — Python venv, Rust engine

```bash
cd /opt/fsfvi/app/rwanda_backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install 'maturin>=1,<2' gunicorn

cd fsfi_engine
maturin build --release
pip install target/wheels/fsfi_engine-*.whl
cd ..
python -c "import fsfi_engine; print('fsfi_engine OK')"
```

### 3.3 Backend — `.env` (production)

Copy **`rwanda_backend/.env.example`** → **`.env`** and set at least:

```env
DJANGO_SETTINGS_MODULE=rwanda_project.settings_production
DJANGO_SECRET_KEY=<openssl rand -hex 32 or django get_random_secret_key>
DJANGO_ALLOWED_HOSTS=rwanda.fsfvi.ai,fsfvi.ai
CORS_ALLOWED_ORIGINS=https://rwanda.fsfvi.ai,https://fsfvi.ai
CSRF_TRUSTED_ORIGINS=https://rwanda.fsfvi.ai,https://fsfvi.ai
FSFI_JWT_SECRET=<32+ chars>
FSFI_ENCRYPTION_KEY=<32 chars>
DB_NAME=/var/lib/fsfvi/db.sqlite3
```

`chmod 600 .env`

**Django** loads **`env_bootstrap`** before settings — see `rwanda_project/env_bootstrap.py`.

### 3.4 Migrate, collectstatic, user

```bash
source venv/bin/activate
python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py register_user --username admin --email admin@example.gov.rw --full-name "Admin" --role admin --admin --password '<12+chars>'
```

### 3.5 Frontend — build

```bash
cd /opt/fsfvi/app/rwanda-frontend
cp .env.example .env.production.local
# NEXT_PUBLIC_RWANDA_API_URL=https://rwanda.fsfvi.ai
# NEXT_PUBLIC_APP_URL=https://rwanda.fsfvi.ai
npm ci
npm run build
```

### 3.6 Data pipeline (first load)

Follow **`RWANDA_BACKEND_PIPELINE_GUIDE.md`** (Excel files, `fetch_rwanda_observed`, assessments). Run from the **server** or restore a **backup** `db.sqlite3`.

---

## Phase 4 — nginx

Use the repo template:

**`deploy/nginx/fsfvi.conf.example`**

Copy to `/etc/nginx/sites-available/fsfvi`, symlink `sites-enabled`, adjust `server_name`, `ssl_certificate` paths, `alias` for static files, and upstream port for Next.js.

```bash
sudo nginx -t && sudo systemctl reload nginx
```

See comments in that file for **TLS**, **headers**, **rate limits**, and **`X-Forwarded-Proto`** (required for `settings_production`).

---

## Phase 5 — systemd (Gunicorn + Next.js)

### Gunicorn (example)

`/etc/systemd/system/fsfvi-gunicorn.service`:

```ini
[Unit]
Description=FSFI Django (Gunicorn)
After=network.target

[Service]
User=fsfvi
Group=fsfvi
WorkingDirectory=/opt/fsfvi/app/rwanda_backend
EnvironmentFile=/opt/fsfvi/app/rwanda_backend/.env
ExecStart=/opt/fsfvi/app/rwanda_backend/venv/bin/gunicorn \
  --bind unix:/run/fsfvi/gunicorn.sock \
  --workers 5 \
  --threads 2 \
  --timeout 120 \
  rwanda_project.wsgi:application
RuntimeDirectory=fsfvi
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Ensure **nginx** can read the socket (`www-data` in `fsfvi` group or `chmod`).

### Next.js (`fsfvi-frontend.service` example)

```ini
[Service]
User=fsfvi
WorkingDirectory=/opt/fsfvi/app/rwanda-frontend
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/npm start
Restart=always
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now fsfvi-gunicorn fsfvi-frontend
```

*(Supervisor is an alternative; systemd is used here for parity with existing deployment notes.)*

---

## Phase 6 — SSL (Let’s Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d rwanda.fsfvi.ai -d fsfvi.ai
```

Cron / timer for `certbot renew` (often installed by package).

---

## Post-deployment verification

```bash
curl -sI https://rwanda.fsfvi.ai/api/auth/verify/  # expect 401, not 502
curl -sI https://rwanda.fsfvi.ai/
sudo systemctl status fsfvi-gunicorn fsfvi-frontend nginx
```

---

## Data pipeline (first load)

See **`RWANDA_BACKEND_PIPELINE_GUIDE.md`**: `import_budget_mapping`, `import_indicator_parameters`, `fetch_rwanda_observed`, propagate, `compute_observed_imputed`, `run_assessments_all_years`, optional `seed_psta5`.

---

## Security monitoring

- `journalctl -u fsfvi-gunicorn -f`
- `sudo fail2ban-client status sshd`
- `sudo ufw status verbose`
- Optional: `/usr/local/bin/fsfvi-security-check.sh` + weekly cron

---

## Troubleshooting

| Symptom | Checks |
|---------|--------|
| HTTP 502 | Gunicorn up? Socket permissions? `nginx -t` |
| CORS errors | `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` match browser URL |
| “Database is locked” | SQLite timeout in `settings_production`; reduce Gunicorn workers or move to Postgres later |
| SSH refused | Security group + UFW + your IP / SSM |

---

## Maintenance

```bash
cd /opt/fsfvi/app && sudo -u fsfvi git pull
cd rwanda_backend && source venv/bin/activate && pip install -r requirements.txt
pip install target/wheels/fsfi_engine-*.whl  # after maturin build if Rust changed
python manage.py migrate && python manage.py collectstatic --noinput
cd ../rwanda-frontend && npm ci && npm run build
sudo systemctl restart fsfvi-gunicorn fsfvi-frontend && sudo systemctl reload nginx
```

**Backup SQLite** (example):

```bash
sqlite3 /var/lib/fsfvi/db.sqlite3 ".backup /var/backups/fsfvi-$(date +%Y%m%d).sqlite3"
```

---

## Quick reference

| Item | Path |
|------|------|
| App root | `/opt/fsfvi/app` |
| Django | `/opt/fsfvi/app/rwanda_backend` |
| `.env` | `/opt/fsfvi/app/rwanda_backend/.env` |
| SQLite | `/var/lib/fsfvi/db.sqlite3` (recommended) |
| nginx template | `deploy/nginx/fsfvi.conf.example` |
| Domain / branding | `docs/domain-and-environments.md` |
| Pipeline | `RWANDA_BACKEND_PIPELINE_GUIDE.md` |

---

**Version:** 1.0 (FSFI stack)  
**Audience:** Operators deploying **public** HTTPS + API for Rwanda; **SSH** access must match your **IP / SSM / VPN** strategy.
