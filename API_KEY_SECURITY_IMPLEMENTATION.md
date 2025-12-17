# API KEY SECURITY CONTROLS - IMPLEMENTATION SUMMARY

## CRITICAL SECURITY ENHANCEMENTS IMPLEMENTED

### ✅ **IMPLEMENTED (2025-01-15)**

This document outlines the critical API key security controls implemented to protect government-level data and prevent API key sprawl.

---

## 1. ONE-KEY-PER-USER POLICY ✅

**Problem Solved:** Users could create unlimited active API keys, creating security sprawl.

**Implementation:**
- **Location:** `fsfi-backend/src/handlers/api_key.rs:95-125`
- **Behavior:** When a user generates a NEW API key, ALL their previous active keys are automatically revoked
- **Auto-Revocation Logic:**
  ```sql
  UPDATE api_keys
  SET status = 'revoked',
      revoked_at = NOW(),
      revoked_by_user_id = <user_id>,
      revocation_reason = 'Automatically revoked due to new API key generation (one-key-per-user policy)'
  WHERE created_by_user_id = <user_id>
    AND government_id = <government_id>
    AND status = 'active'
  ```
- **Audit Trail:** Logs how many keys were auto-revoked for compliance tracking
- **Result:** Each user can only have 1 active API key at any given time

---

## 2. MAXIMUM ACTIVE KEYS PER GOVERNMENT ✅

**Problem Solved:** Governments could create unlimited API keys.

**Implementation:**
- **Location:** `fsfi-backend/src/handlers/api_key.rs:69-93`
- **Database Field:** `governments.max_active_api_keys` (INTEGER, default: 5, range: 1-50)
- **Check Before Creation:**
  ```sql
  SELECT COUNT(*) FROM api_keys
  WHERE government_id = <gov_id>
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > NOW())
  ```
- **Enforcement:** Returns HTTP 403 Forbidden if limit reached
- **Error Message:** "Maximum active API keys limit reached (X/Y). Please revoke an existing key before creating a new one."
- **Admin Control:** Admins can set this limit per-government (1-50 keys)

---

## 3. MANDATORY API KEY ROTATION ✅

**Problem Solved:** API keys could remain active indefinitely without rotation.

**Implementation:**
- **Location:** `fsfi-backend/src/handlers/api_key.rs:153-157`
- **Database Fields:**
  - `governments.mandatory_rotation_days` (INTEGER, nullable, range: 1-365)
  - `api_keys.must_rotate_by` (TIMESTAMPTZ, nullable)
  - `api_keys.rotation_reminder_sent` (BOOLEAN, default: false)

- **Rotation Deadline Calculation:**
  ```rust
  let must_rotate_by = mandatory_rotation_days
      .map(|days| Utc::now() + chrono::Duration::days(days as i64));
  ```

- **Behavior:**
  - If `mandatory_rotation_days` is SET (e.g., 90 days): New API keys get a `must_rotate_by` deadline
  - If `mandatory_rotation_days` is NULL: No mandatory rotation (keys only expire based on `api_key_expiry_days`)

- **Future Enforcement (Recommended):**
  - Background job to auto-revoke keys past `must_rotate_by` date
  - Email reminders before rotation deadline
  - Dashboard warnings for keys approaching rotation

---

## 4. ADMIN CONTROLS FOR SECURITY SETTINGS ✅

**Problem Solved:** No centralized control over API key security policies.

**Implementation:**

### Database Schema
**Migration:** `migrations/20250115000001_api_key_security_controls.sql`

**New Government Fields:**
| Field | Type | Default | Range | Description |
|-------|------|---------|-------|-------------|
| `max_active_api_keys` | INTEGER | 5 | 1-50 | Max active keys per government |
| `mandatory_rotation_days` | INTEGER | NULL | 1-365 or NULL | Force rotation every N days |

**New API Key Fields:**
| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `must_rotate_by` | TIMESTAMPTZ | NULL | Calculated rotation deadline |
| `rotation_reminder_sent` | BOOLEAN | false | Tracks if reminder sent |

**Indexes Created:**
```sql
CREATE INDEX idx_api_keys_rotation
  ON api_keys(must_rotate_by)
  WHERE status = 'active' AND must_rotate_by IS NOT NULL;

CREATE INDEX idx_api_keys_government_status
  ON api_keys(government_id, status);

CREATE INDEX idx_api_keys_user_status
  ON api_keys(created_by_user_id, status);
```

### Updated Models
**File:** `fsfi-backend/src/models/government.rs`

**CreateGovernmentRequest:**
```rust
pub struct CreateGovernmentRequest {
    // ... existing fields ...
    #[validate(range(min = 1, max = 50))]
    pub max_active_api_keys: Option<i32>,  // Default: 5
    #[validate(range(min = 1, max = 365))]
    pub mandatory_rotation_days: Option<i32>,  // NULL = no rotation
}
```

**UpdateGovernmentRequest:**
```rust
pub struct UpdateGovernmentRequest {
    // ... existing fields ...
    #[validate(range(min = 1, max = 50))]
    pub max_active_api_keys: Option<i32>,
    #[validate(range(min = 1, max = 365))]
    pub mandatory_rotation_days: Option<i32>,
}
```

**GovernmentDetail (Response):**
```rust
pub struct GovernmentDetail {
    // ... existing fields ...
    pub max_active_api_keys: i32,
    pub mandatory_rotation_days: Option<i32>,
}
```

---

## SECURITY FLOW - API KEY CREATION

```
User requests new API key
         ↓
1. ✅ Fetch government security settings
   - max_active_api_keys
   - mandatory_rotation_days
         ↓
2. ✅ Check: Active keys < max_active_api_keys?
   NO → Return 403 Forbidden
   YES → Continue
         ↓
3. ✅ Auto-revoke ALL existing active keys for this user
   - Update status → 'revoked'
   - Set revoked_at → NOW()
   - Set revocation_reason → 'Auto-revoked (one-key-per-user)'
   - Log count for audit
         ↓
4. ✅ Calculate rotation deadline
   - If mandatory_rotation_days set: must_rotate_by = NOW() + rotation_days
   - Else: must_rotate_by = NULL
         ↓
5. ✅ Calculate expiration (from user.api_key_expiry_days)
   - expires_at = NOW() + api_key_expiry_days
         ↓
6. ✅ Generate and insert new API key
   - Generate secure random key
   - Hash key for storage
   - Store: key_hash, expires_at, must_rotate_by
         ↓
7. ✅ Return API key ONE TIME ONLY
```

---

## TESTING CHECKLIST

### ✅ Before Running Tests - Run Migration
```bash
cd fsfi-backend
sqlx migrate run
```

### Test Scenarios

**Test 1: One-Key-Per-User**
1. User creates API key #1
2. User creates API key #2
3. ✅ EXPECTED: Key #1 is automatically revoked, only Key #2 is active

**Test 2: Max Active Keys Limit**
1. Government has `max_active_api_keys = 3`
2. User A creates key #1
3. User B creates key #2
4. User C creates key #3
5. User D tries to create key #4
6. ✅ EXPECTED: HTTP 403 - "Maximum active API keys limit reached (3/3)"

**Test 3: Mandatory Rotation**
1. Government has `mandatory_rotation_days = 90`
2. User creates API key
3. ✅ EXPECTED: `must_rotate_by` = current_time + 90 days

**Test 4: No Mandatory Rotation**
1. Government has `mandatory_rotation_days = NULL`
2. User creates API key
3. ✅ EXPECTED: `must_rotate_by` = NULL

---

## ADMIN UI UPDATES REQUIRED

### Government Creation/Edit Form
Add fields:
- **Max Active API Keys:** Number input (1-50, default: 5)
- **Mandatory Rotation Days:** Number input (1-365, optional)

### Government Details View
Display:
- Max Active API Keys: `{value}` keys
- Mandatory Rotation: `{value} days` or "No mandatory rotation"

### API Keys Dashboard
Show:
- Current active keys / Max allowed
- Rotation deadlines (if applicable)
- Warning indicators for keys approaching rotation

---

## SECURITY BENEFITS

| Control | Benefit |
|---------|---------|
| **One-Key-Per-User** | Eliminates key sprawl, simplifies revocation, reduces attack surface |
| **Max Active Keys** | Prevents resource exhaustion, enforces organizational limits |
| **Mandatory Rotation** | Limits window of exposure if key is compromised |
| **Admin Controls** | Centralized security policy enforcement, tier-based customization |

---

## COMPLIANCE NOTES

- **Audit Trail:** All auto-revocations are logged with user_id, timestamp, and reason
- **Immutable History:** Revoked keys remain in database for audit purposes
- **Non-Repudiation:** revoked_by_user_id tracks who revoked each key
- **Least Privilege:** Developers cannot override security settings set by admins

---

## MIGRATION STATUS

✅ **COMPLETED STEPS:**
1. Database migration created
2. Government models updated
3. API key creation handler updated with all 4 security controls
4. Audit logging implemented

⏳ **PENDING STEPS:**
1. Run database migration: `sqlx migrate run`
2. Update admin handler for government create/update (add new fields)
3. Update frontend types (TypeScript)
4. Update frontend UI (Government forms + API Keys dashboard)
5. Background job for auto-revoking expired rotation keys (future enhancement)
6. Email notifications for rotation reminders (future enhancement)

---

## FILES MODIFIED/CREATED

### Backend
1. ✅ `migrations/20250115000001_api_key_security_controls.sql` - NEW
2. ✅ `src/models/government.rs` - MODIFIED (added security fields)
3. ✅ `src/handlers/api_key.rs` - MODIFIED (security controls in create_api_key)

### Frontend (Pending)
4. ⏳ `fsfvi-admin/src/types/index.ts` - TODO
5. ⏳ `fsfvi-admin/src/components/Governments.tsx` - TODO

---

## ROLLBACK PLAN

If issues arise, rollback via:
```bash
cd fsfi-backend
sqlx migrate revert
```

This will:
- Remove `max_active_api_keys` and `mandatory_rotation_days` from governments table
- Remove `must_rotate_by` and `rotation_reminder_sent` from api_keys table
- Drop all new indexes

---

**Implementation Date:** 2025-01-15
**Security Level:** GOVERNMENT-CRITICAL
**Status:** ✅ BACKEND IMPLEMENTED | ⏳ FRONTEND PENDING
