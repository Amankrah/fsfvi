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
- [ ] Optional: outbound blocks on mining-related ports **10128** / **3333** (see Phase 1.3)
- [ ] **fail2ban** for `sshd`; `systemctl status fail2ban` healthy before `fail2ban-client status sshd`
- [ ] **Unattended security upgrades** (`20auto-upgrades` + `50unattended-upgrades`); verify files with `cat` (no merged `EOF` lines)
- [ ] **SSH**: no root, no passwords, keys only; **`systemctl restart ssh`** on Ubuntu (not `sshd`)
- [ ] **`/usr/local/bin/fsfvi-security-check.sh`** + optional weekly cron; **`/etc/tmpfiles.d`** cleanup if used

### Post-deployment

- [ ] SSL certificates (certbot) + auto-renewal
- [ ] Django `DJANGO_SECRET_KEY` / `FSFI_*` not defaults
- [ ] Admin password changed (`set_password` or new user)
- [ ] nginx `server_tokens off`; TLS 1.2+

---

## Phase 1 — Security hardening

Complete **before** cloning the app or opening the service beyond tests. This phase mirrors a **Sasel-style** hardened deployment: UFW, fail2ban, unattended upgrades, SSH hardening, optional mining-port blocks, and **`fsfvi-security-check.sh`** — adapted for **Ubuntu** and this repo.

### Copy-paste and heredocs (avoid silent corruption)

Broken pastes in terminals caused **`EOF` merged into content** (e.g. `EOFttended-Upgrade...`), **commands pasted inside** a `<<'EOF'` block (ending up *inside* `/etc/ssh/sshd_config.d/hardening.conf`), and **typos** (`PermitRootLogin notion no`). Rules:

1. The closing line must be **`EOF`** alone (or `'EOF'` if you used `<<'EOF'`), **no spaces before it**, **no text after it** on the same line.
2. **Never** paste `sudo sshd -t` or `systemctl restart` **inside** the heredoc — run them **after** the `EOF` line.
3. After each `tee`, run `sudo cat /path/to/file` and confirm the file looks correct.
4. On **Ubuntu**, restart SSH with **`sudo systemctl restart ssh`**. The unit name **`sshd`** often does **not** exist (`Failed to restart sshd.service: Unit sshd.service not found`). Do **not** use `restart sshd || restart ssh` unless you know `sshd` exists.
5. If **`fail2ban-client`** says **socket** errors, ensure the service is running: `sudo systemctl enable --now fail2ban` then `sudo systemctl restart fail2ban`.

### 1.1 System updates

```bash
sudo apt update && sudo DEBIAN_FRONTEND=noninteractive apt upgrade -y
# Optional: reboot if kernel updated, then SSH back in
```

### 1.2 Install security packages

```bash
sudo apt install -y fail2ban ufw unattended-upgrades apt-listchanges
```

### 1.3 Firewall (UFW)

**Replace the IP** with yours (`curl -s ifconfig.me` on your laptop). Optional lines below match common hardening guides (mining pools / optional denylist) — **skip** if you prefer minimal rules.

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from YOUR_PUBLIC_IP to any port 22 proto tcp comment 'SSH admin'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# Optional (cryptominer incident patterns — from hardened playbooks)
sudo ufw deny out to any port 10128 comment 'Block mining pool'
sudo ufw deny out to any port 3333 comment 'Block mining pool'
# Optional: deny known bad sources (maintain your own list or omit)
# sudo ufw deny from 203.0.113.50 comment 'example block'

sudo ufw --force enable
sudo ufw status verbose
```

If you use **SSM only**, you may **omit** SSH from UFW.

### 1.4 fail2ban

Write the **whole** file in one `tee` (avoids truncated `jail.local`):

```bash
sudo tee /etc/fail2ban/jail.local > /dev/null << 'EOF'
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
bantime = 86400
findtime = 600
EOF

sudo systemctl enable fail2ban
sudo systemctl restart fail2ban
sudo systemctl status fail2ban --no-pager
sudo fail2ban-client status sshd
```

### 1.5 Unattended security upgrades

Two files — note the **`EOF`** on its **own line** after `Automatic-Reboot` (a common break was `EOF` glued to the last setting).

```bash
sudo tee /etc/apt/apt.conf.d/20auto-upgrades > /dev/null << 'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::Download-Upgradeable-Packages "1";
APT::Periodic::AutocleanInterval "7";
EOF

sudo tee /etc/apt/apt.conf.d/50unattended-upgrades > /dev/null << 'EOF'
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}";
    "${distro_id}:${distro_codename}-security";
    "${distro_id}ESMApps:${distro_codename}-apps-security";
    "${distro_id}ESM:${distro_codename}-infra-security";
};
Unattended-Upgrade::AutoFixInterruptedDpkg "true";
Unattended-Upgrade::MinimalSteps "true";
Unattended-Upgrade::Remove-Unused-Kernel-Packages "true";
Unattended-Upgrade::Remove-Unused-Dependencies "true";
Unattended-Upgrade::Automatic-Reboot "false";
EOF

sudo systemctl enable unattended-upgrades
sudo systemctl start unattended-upgrades
```

### 1.6 SSH hardening

**Only** configuration lines between `<<'EOF'` and **`EOF`** — then test and restart **ssh**:

```bash
sudo tee /etc/ssh/sshd_config.d/hardening.conf > /dev/null << 'EOF'
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
X11Forwarding no
AllowTcpForwarding no
AllowAgentForwarding no
PermitEmptyPasswords no
EOF

sudo sshd -t && sudo systemctl restart ssh
```

If `sshd -t` **fails**, fix `hardening.conf` before restarting SSH. Recovery: **EC2 Serial Console** or **SSM**.

### 1.7 Security monitoring script (`/usr/local/bin/fsfvi-security-check.sh`)

```bash
sudo tee /usr/local/bin/fsfvi-security-check.sh > /dev/null << 'EOFSCRIPT'
#!/bin/bash
echo "=== FSFI security check $(date) ==="

echo -e "\n--- Crontabs ---"
for user in $(cut -f1 -d: /etc/passwd); do
  crontab -u "$user" -l 2>/dev/null | grep -v "^#" | grep -v "^$" && echo "  ^ User: $user"
done

echo -e "\n--- Suspicious processes (heuristic) ---"
ps aux | grep -E "(xmrig|mine|kdevtmpfsi|/dev/shm/|/var/tmp/\.)" | grep -v grep || echo "None matched"

echo -e "\n--- High CPU ---"
ps aux --sort=-%cpu | head -5

echo -e "\n--- fail2ban (sshd) ---"
sudo fail2ban-client status sshd 2>/dev/null || echo "fail2ban not responding"

echo -e "\n--- Listening TCP ---"
sudo ss -tlnp

echo -e "\n--- UFW ---"
sudo ufw status verbose 2>/dev/null | head -20

echo "=== Done ==="
EOFSCRIPT

sudo chmod +x /usr/local/bin/fsfvi-security-check.sh
```

Optional weekly cron (as root or ubuntu):

```bash
(sudo crontab -l 2>/dev/null | grep -v fsfvi-security-check; echo "0 8 * * 1 /usr/local/bin/fsfvi-security-check.sh >> /var/log/fsfvi-security-check.log 2>&1") | sudo crontab -
```

### 1.8 Temp directory hygiene (optional)

```bash
sudo tee /etc/tmpfiles.d/fsfvi-tmp-clean.conf > /dev/null << 'EOF'
D /tmp 1777 root root 1d
D /var/tmp 1777 root root 7d
D /dev/shm 1777 root root 1d
EOF
```

### 1.9 Verify Phase 1

```bash
sudo /usr/local/bin/fsfvi-security-check.sh
sudo ufw status verbose
sudo fail2ban-client status sshd
```

✅ Then continue to **Phase 2**.

---

## Phase 2 — Server setup

### 2.1 Packages

```bash
sudo apt install -y \
  nginx git curl build-essential pkg-config libssl-dev \
  python3-venv python3-dev \
  sqlite3 jq htop
```

Install **Rust** (required before **`maturin build`**). Rustup installs under **`~/.cargo`** for the **current user** — it does **not** require `sudo`.

- **If your prompt is `fsfvi@...`** (you are already `fsfvi`): **do not use `sudo`** (it will fail). Run:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
source ~/.cargo/env
cargo --version && rustc --version
```

- **If your prompt is `ubuntu@...`**: same install, but run it **as `fsfvi`**:

```bash
sudo -u fsfvi bash -c "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y"
sudo -u fsfvi bash -c 'source "$HOME/.cargo/env" && cargo --version && rustc --version'
```

In any **new** `fsfvi` shell, run `source ~/.cargo/env` before **`maturin`** (or add that line to `~/.bashrc`). See [rustup.rs](https://rustup.rs/).

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
# -R is required: without it, /opt/fsfvi/app stays root-owned and git clone fails
sudo chown -R fsfvi:fsfvi /opt/fsfvi /var/lib/fsfvi
```

---

## Phase 3 — Application deployment

### 3.1 Clone

**Do not** paste `sudo -u fsfvi -i` and the next lines as separate steps unless you run `cd`, `git clone`, and `cd app` **inside** the new shell.

The command below uses **`sudo`**, so run it only when your shell prompt is **`ubuntu@...`** (the default EC2 admin user). If your prompt is **`fsfvi@...`**, skip to the non-`sudo` clone below — **`fsfvi` has no sudo** and `sudo -u fsfvi ...` from inside `fsfvi` will always fail.

```bash
sudo -u fsfvi bash -c 'cd /opt/fsfvi && git clone https://github.com/Amankrah/fsfvi.git app'
```

Verify:

```bash
ls /opt/fsfvi/app/rwanda_backend
```

If you are **already** logged in as `fsfvi`, you **cannot** use `sudo` (not in sudoers — that is normal). Run:

```bash
cd /opt/fsfvi && git clone https://github.com/Amankrah/fsfvi.git app
```

If you see **`[sudo] password for fsfvi`**, you are still logged in as **`fsfvi`**. Type **`exit`** until the prompt is **`ubuntu@...`**, or use another SSH session as **`ubuntu`**. **`fsfvi` cannot sudo** — there is no valid password for that.

If clone fails with **`Permission denied`** under `/opt/fsfvi/app/.git`, the tree was probably created as **root** without recursive `chown`. As **`ubuntu`**:

```bash
sudo rm -rf /opt/fsfvi/app
sudo mkdir -p /opt/fsfvi/app
sudo chown -R fsfvi:fsfvi /opt/fsfvi /var/lib/fsfvi
```

Then clone again as **`fsfvi`** (command above) or from **`ubuntu`**: `sudo -u fsfvi bash -c 'cd /opt/fsfvi && git clone https://github.com/Amankrah/fsfvi.git app'`.

### 3.2 Backend — Python venv, Rust engine

Run as **`fsfvi`** (no `sudo` if you are already `fsfvi`). **Rust must be installed** ([Phase 2.1](#21-packages)); in this shell run `source ~/.cargo/env` so **`cargo`** is on `PATH` before **`maturin build`**.

```bash
cd /opt/fsfvi/app/rwanda_backend
source ~/.cargo/env   # if cargo: not found, install rustup first (Phase 2.1)
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install 'maturin>=1,<2' gunicorn

cd fsfi_engine
maturin build --release
pip install "$(ls target/wheels/fsfi_engine-*.whl | head -n1)"
cd ..
python -c "import fsfi_engine; print(fsfi_engine.__file__)"
```

The last line should print a path ending in **`.so`** (built extension). If **`maturin`** errors with **Cargo metadata failed** / **cargo in your PATH**, Rust is missing or `~/.cargo/env` was not sourced.

Run **`maturin build`** as the **same Linux user** that owns **`/opt/fsfvi/app`** and **`~/.cargo`** (usually **`fsfvi`**). If **`target/.cargo-lock` Permission denied**, another user owns **`fsfi_engine/target/`**: `sudo rm -rf fsfi_engine/target` then **`sudo chown -R fsfvi:fsfvi /opt/fsfvi/app`** (or **`ubuntu:ubuntu`** if you deploy only as **`ubuntu`**) and rebuild as that user.

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

Before **`migrate`**, ensure **`DB_NAME`**’s parent directory exists and is writable by the user running Django, e.g. **`sudo mkdir -p /var/lib/fsfvi`** and **`sudo chown ubuntu:ubuntu /var/lib/fsfvi`** (or **`fsfvi:fsfvi`** if the app runs as **`fsfvi`** — then run **`migrate`** as that user).

Edit **`.env` without `sudo nano`** (use **`nano .env`** as the user that owns the repo — e.g. **`fsfvi`** or **`ubuntu`**). **`sudo nano`** creates a **root-owned** file; then **`chmod`** as a normal user fails with **Operation not permitted**. Fix: `sudo chown ubuntu:ubuntu .env` or `sudo chown fsfvi:fsfvi .env`, then **`chmod 600 .env`**.

**Django** loads **`env_bootstrap`** before settings — see `rwanda_project/env_bootstrap.py`.

### 3.4 Migrate, collectstatic, user

```bash
# If DB_NAME is under /var/lib/fsfvi (recommended):
sudo mkdir -p /var/lib/fsfvi
sudo chown ubuntu:ubuntu /var/lib/fsfvi   # match the user that runs migrate / gunicorn

source venv/bin/activate
python manage.py migrate --noinput
python manage.py collectstatic --noinput
python manage.py register_user --username admin --email admin@example.gov.rw --full-name "Admin" --role admin --admin --password 'DevAdminPass123!'
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

### Before you start

1. **`rwanda_backend`**: venv exists, **`python manage.py migrate`** and **`collectstatic`** already run.
2. **`rwanda-frontend`**: **`npm ci`** and **`npm run build`** already succeeded (`.next/` present).
3. **`.env`**: production values; readable by the service user (`fsfvi` or `ubuntu`).
4. **SQLite** at **`DB_NAME`**: parent directory writable by the Gunicorn user (e.g. **`sudo chown fsfvi:fsfvi /var/lib/fsfvi`**).
5. **Process user** below is **`fsfvi`**. If everything under **`/opt/fsfvi/app`** is owned by **`ubuntu`**, replace **`User=`** / **`Group=`** with **`ubuntu`** in both units (and match SQLite ownership).

### Install unit files (prefer **`cp`** — avoids broken heredocs)

Multi-line **`tee << 'EOF'`** pastes often corrupt units (e.g. **`EOF` glued to `WantedBy`**). Use the committed files:

**`deploy/systemd/fsfvi-gunicorn.service`**  
**`deploy/systemd/fsfvi-frontend.service`**

```bash
sudo cp /opt/fsfvi/app/deploy/systemd/fsfvi-gunicorn.service /etc/systemd/system/
sudo cp /opt/fsfvi/app/deploy/systemd/fsfvi-frontend.service /etc/systemd/system/
```

If Gunicorn must run as **`ubuntu`** (not **`fsfvi`**), fix both units once:

```bash
sudo sed -i 's/^User=fsfvi/User=ubuntu/; s/^Group=fsfvi/Group=ubuntu/' /etc/systemd/system/fsfvi-gunicorn.service /etc/systemd/system/fsfvi-frontend.service
```

If **`npm`** is not **`/usr/bin/npm`**, set **`ExecStart=`** in **`fsfvi-frontend.service`** to **`$(command -v npm)`** output (edit that file only).

**3. Enable and start**

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now fsfvi-gunicorn fsfvi-frontend
sudo systemctl status fsfvi-gunicorn fsfvi-frontend --no-pager
```

**4. nginx ↔ socket** (so **`www-data`** can proxy to Gunicorn):

```bash
sudo usermod -aG fsfvi www-data
sudo systemctl restart nginx
```

**5. Logs if something fails**

```bash
journalctl -u fsfvi-gunicorn -n 80 --no-pager
journalctl -u fsfvi-frontend -n 80 --no-pager
```

Workers **`3`** reduces SQLite lock contention vs **`5`**; raise after moving to Postgres if needed.

*(Supervisor is an alternative; systemd matches common Ubuntu EC2 setups.)*

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
| `Unit sshd.service not found` | On **Ubuntu**, SSH is **`ssh`**: `sudo systemctl restart ssh` (not `sshd`). |
| `Failed to access socket path: .../fail2ban.sock` | `sudo systemctl enable --now fail2ban` then `sudo systemctl restart fail2ban`; check `journalctl -u fail2ban`. |
| `sshd -t` fails after editing `hardening.conf` | Fix typos (`PermitRootLogin no`, not `notion no`). See [Phase 1.6 SSH hardening](#16-ssh-hardening) and the heredoc rules above. |
| HTTP 502 | Gunicorn up? Socket permissions? `nginx -t` |
| CORS errors | `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` match browser URL |
| “Database is locked” | SQLite timeout in `settings_production`; reduce Gunicorn workers or move to Postgres later |
| SSH refused | Security group + UFW + your IP / SSM |
| `fsfvi is not in the sudoers file` | Expected when logged in as **`fsfvi`**. Do **not** use `sudo` (including `sudo -u fsfvi ...`). Use **`exit`** to return to **`ubuntu`**, or run clone/commands **without** `sudo` as **`fsfvi`** (see [Phase 3.1 Clone](#31-clone)). |
| `[sudo] password for fsfvi` | Same: **`fsfvi` has no sudo**. **`exit`** to **`ubuntu@...`** and run admin commands there. |
| `cd: app: No such file or directory` | Clone never ran or wrong directory. From **`ubuntu`**: `sudo -u fsfvi bash -c 'cd /opt/fsfvi && git clone https://github.com/Amankrah/fsfvi.git app'` — see [Phase 3.1 Clone](#31-clone). |
| `/opt/fsfvi/app/.git: Permission denied` | **`app`** was root-owned. As **`ubuntu`**: `sudo rm -rf /opt/fsfvi/app && sudo mkdir -p /opt/fsfvi/app && sudo chown -R fsfvi:fsfvi /opt/fsfvi /var/lib/fsfvi`, then clone again. Ensure deploy step uses **`chown -R`** (see [Phase 2.4](#24-deploy-user-and-directories)). |
| `Cargo metadata failed` / **cargo** not in `PATH` | Install **rustup** for **`fsfvi`** ([Phase 2.1](#21-packages)), then **`source ~/.cargo/env`** before **`maturin build`**. |
| **`target/release/.cargo-lock` Permission denied** | **`maturin`** run as a different user than the one that created **`fsfi_engine/target/`**. Remove target and fix ownership: `sudo rm -rf /opt/fsfvi/app/rwanda_backend/fsfi_engine/target` and **`sudo chown -R fsfvi:fsfvi /opt/fsfvi/app`** (or align with **`ubuntu`** if you use only **`ubuntu`**), then rebuild as that user with **`source ~/.cargo/env`**. |
| **`chmod` .env Operation not permitted** | **`.env`** is **root-owned** (e.g. **`sudo nano .env`**). **`sudo chown ubuntu:ubuntu .env`** or **`fsfvi:fsfvi`**, then **`chmod 600 .env`**. |
| **`unable to open database file`** (SQLite) | **`DB_NAME`** parent dir missing or wrong owner. **`sudo mkdir -p /var/lib/fsfvi`**. If you run Django as **`ubuntu`**: **`sudo chown ubuntu:ubuntu /var/lib/fsfvi`**. If Gunicorn runs as **`fsfvi`**, use **`sudo chown fsfvi:fsfvi /var/lib/fsfvi`** and run **`migrate`** as **`fsfvi`** (or **`sudo -u fsfvi ...`**) so the DB file is created with the right owner. |
| **`fsfvi-gunicorn` activating / exit status 1** | **`sudo cat /etc/systemd/system/fsfvi-gunicorn.service`** — if you see garbage like **`EOFtedBy`**, the unit was corrupted by a bad paste. Reinstall: **`sudo cp /opt/fsfvi/app/deploy/systemd/fsfvi-gunicorn.service /etc/systemd/system/`** then **`daemon-reload`**. Then **`journalctl -u fsfvi-gunicorn -n 50`** for Python/env/SQLite errors. |
| Next.js on **3001**, nginx expects **3000** | Repo **`package.json`** **`start`** must be **`next start`** (no **`--port 3001`**); **`git pull`**, **`npm run build`**, **`sudo systemctl restart fsfvi-frontend`**. Or temporarily point **`upstream fsfvi_nextjs`** to **`127.0.0.1:3001`**. |

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
| systemd unit templates | `deploy/systemd/fsfvi-gunicorn.service`, `deploy/systemd/fsfvi-frontend.service` |
| Security audit script (server) | `/usr/local/bin/fsfvi-security-check.sh` |
| Domain / branding | `docs/domain-and-environments.md` |
| Pipeline | `RWANDA_BACKEND_PIPELINE_GUIDE.md` |

---

**Version:** 1.0 (FSFI stack)  
**Audience:** Operators deploying **public** HTTPS + API for Rwanda; **SSH** access must match your **IP / SSM / VPN** strategy.
