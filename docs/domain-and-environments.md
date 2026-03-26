# FSFI domain naming and environment boundaries

For **EC2 / nginx / TLS** deployment steps, see **[PRODUCTION_DEPLOYMENT.md](PRODUCTION_DEPLOYMENT.md)** (traveling IPs, CORS vs SSH, security phases).

## Organization brand vs product (using **fsfvi.ai**)

You already own **`fsfvi.ai`**. The old framing (**Food System Financial Vulnerability Index**) describes a **metric family**; the **organization** should read as broader—policy intelligence, planning, and country platforms—not “only an index.”

**Practical split**

| Layer | What to call it | Role |
|--------|------------------|------|
| **Organization / program** | **FSFI** — *Food Systems Financial Intelligence* (or *… Initiative* if you prefer a softer “I”) | Mission, partners, methodology, future country instances. |
| **Named output** | FSFSI stress index, vulnerability lens, etc. | Specific models and indicators—**products** of FSFI, not the org name. |
| **This deployment** | Rwanda FSFI dashboard (Rwanda government use case) | One **national instance** on FSFI infrastructure. |

**Domain use of fsfvi.ai**

| Host | Purpose |
|------|---------|
| **`https://fsfvi.ai`** | Organization home: what FSFI is, partners, methodology, contact—not only “the index.” |
| **`https://rwanda.fsfvi.ai`** (or `app.fsfvi.ai`) | This stack: Next.js + Django API (`/api/`). Same TLS and nginx pattern as elsewhere. |

Keeping **fsfvi** in the domain preserves recognition and links; your **copy and design** carry the rebrand (headlines, About page, decks). Renaming the Git repo or code folders can wait until you are ready for a coordinated change.

**Frontend env (example):** `NEXT_PUBLIC_RWANDA_API_URL=https://rwanda.fsfvi.ai`

---

## When FSFI owns the server (no government DNS)

If the **IP and hosting sit with FSFI** as an organization and you **do not** control **gov.rw** DNS, use a domain **FSFI registers and manages**. That is normal for **demos, pilots, research delivery, and stakeholder review** before any future handover to government IT.

**What works well in practice**

| Piece | Recommendation |
|--------|----------------|
| **Root / program** | A domain FSFI controls; **`fsfvi.ai`** for org site, or **`fsfi.org`** / **`fsfi.io`** if you add them later. |
| **This Rwanda stack** | A **dedicated subdomain**, e.g. **`rwanda.fsfvi.ai`**, **`app.fsfvi.ai`**, or **`rwanda.fsfi.org`**. One hostname: nginx serves **Next.js** on `/` and **Django** on `/api/`. |
| **API** | Prefer **same origin** (e.g. `https://rwanda.fsfvi.ai` + `/api/...`). Splitting to `api.rwanda.fsfvi.ai` only if you need a separate origin. |
| **TLS** | Point the subdomain’s **DNS A/AAAA record** to the FSFI EC2 IP, then use **Let’s Encrypt** (e.g. certbot + nginx). **HTTPS on a domain name** is what you want for sharing links; raw **IP-only** URLs are poor for certificates and trust. |
| **Messaging** | In decks and emails, call it e.g. **“Rwanda FSFI dashboard (FSFI-hosted)”** so stakeholders know it is the **Rwanda program instance** delivered on **FSFI infrastructure**, not an official **government** domain yet. |

**Frontend:** set `NEXT_PUBLIC_RWANDA_API_URL=https://<your-subdomain>` (e.g. `https://rwanda.fsfvi.ai`).

**If government adopts it later:** they can add a **CNAME** from something like `fsfi.minagri.gov.rw` → your host, or move hosting under their DNS; the app does not need to change beyond env and `ALLOWED_HOSTS` / CORS.

---

## Government DNS (when you have access)

If an agency can delegate **`*.minagri.gov.rw`** or **`*.gov.rw`**, an official production URL there improves **public trust** and fits **central IT** (monitoring, compliance). Until then, **FSFI’s domain + clear labeling** is appropriate.

| Layer | Typical choice | Notes |
|--------|----------------|--------|
| **This application** | `fsfi.minagri.gov.rw` | One host; `/` + `/api/` behind nginx. |
| **Path on portal** | `minagri.gov.rw/fsfi` | Possible; a **dedicated hostname** is often simpler for SSL and routing. |

Coordinate with **MINAGRI / RISA / government IT** for DNS and certificates.

---

## Other patterns (hybrid / multi-country)

Pick a name you can **register**. Examples:

| Role | Example host | Notes |
|------|----------------|--------|
| **Program / umbrella** | `fsfvi.ai`, `fsfi.org`, `fsfi.network` | Org landing, docs, other countries later |
| **Rwanda (this repo)** | `rwanda.fsfvi.ai`, `rwanda.fsfi.org` | Demos and FSFI-hosted production |
| **API split (optional)** | `api.rwanda.fsfvi.ai` | Same-origin usually simpler |

**Frontend env:** `NEXT_PUBLIC_RWANDA_API_URL=https://<host>` (same origin if nginx serves `/` and `/api/`).

---

## Git: what must stay tracked vs what must not

### Keep in Git (required)

- **`**/migrations/*.py`** — Django **schema** migrations. Production and every developer must run the **same** files (`python manage.py migrate`). **Do not** remove these from Git or “production” vs “local” will diverge and break deploys.

### Do not commit (local / server only)

- **SQLite database files** — e.g. `rwanda_backend/db.sqlite3`. Each environment has its own file; data is not versioned in Git.
- **`.env`** — secrets.
- **Collected static** — `staticfiles/` (rebuilt on server).

### If you accidentally committed a DB

```bash
git rm --cached rwanda_backend/db.sqlite3   # if it was tracked
git commit -m "Stop tracking local SQLite database"
```

Schema migrations stay in the repo; only the **database file** is untracked.
