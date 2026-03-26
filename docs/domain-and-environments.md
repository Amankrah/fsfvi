# FSFI domain naming and environment boundaries

## Domain naming (suggestions)

Pick a name you can **register** (DNS) and that fits your **program** (government, multi-country FSFI, etc.). Patterns below are illustrative; check availability and trademark policy.

### Pattern A — FSFI program domain + country product

| Role | Example host | Notes |
|------|----------------|--------|
| **Program / umbrella** | `fsfi.org`, `fsfi.network`, `foodsystems-fsfi.org` | Public landing, docs, future non-Rwanda products |
| **Rwanda deployment (this repo)** | `rwanda.fsfi.org` or `rw-fsfi.org` | Dashboard + marketing for Rwanda instance |
| **API (optional split)** | `api.rwanda.fsfi.org` | Only if you want cookies/CORS on a separate host; same-origin (`app` + `/api/` on one host) is simpler |

### Pattern B — Rwanda government DNS

If MINAGRI or another agency owns the zone:

| Role | Example |
|------|
| Umbrella | `fsfi.minagri.gov.rw` or `minagri.gov.rw/fsfi` (path) |
| This product | `rwanda-fsfi.minagri.gov.rw` or `fsfi.minagri.gov.rw` |

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
