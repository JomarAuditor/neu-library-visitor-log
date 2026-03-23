# QUICK FIX - DO THIS NOW

## The Problem
Wayne (and others) are getting multiple "Inside" records instead of toggling in/out.

## The Solution (3 Minutes)

### 1️⃣ Run SQL Script (MOST IMPORTANT)

Open Supabase → SQL Editor → Paste this:

```sql
-- Close all open sessions
UPDATE visit_logs
SET time_out = NOW(), duration_minutes = EXTRACT(EPOCH FROM (NOW() - time_in)) / 60
WHERE time_out IS NULL;

-- Delete duplicates (keep most recent per day)
WITH ranked_visits AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY visitor_id, visit_date ORDER BY time_in DESC) as rn
  FROM visit_logs
)
DELETE FROM visit_logs WHERE id IN (SELECT id FROM ranked_visits WHERE rn > 1);

-- THE KEY FIX: Prevent future duplicates
DROP INDEX IF EXISTS idx_one_open_session_per_visitor;
CREATE UNIQUE INDEX idx_one_open_session_per_visitor 
  ON visit_logs(visitor_id) 
  WHERE time_out IS NULL;

-- Verify
SELECT COUNT(*) FILTER (WHERE time_out IS NULL) as open_sessions FROM visit_logs;
```

Click **RUN**. Should show `open_sessions: 0`.

### 2️⃣ Your Code is Already Fixed

The files `VisitorHome.tsx` and `RegisterPage.tsx` already have the correct logic. No changes needed.

### 3️⃣ Test It

1. Go to https://neu-library-visitor-log.vercel.app
2. Sign in with Wayne's account
3. Check admin logs - should show 0 "Inside" records now
4. Sign in again - should create 1 "Inside" record
5. Sign in again - should change to "Out"
6. Sign in again - should change to "In"

## What the Fix Does

**The Unique Index** = Physical database lock that says:
> "Only ONE open session per visitor. Period."

Even if your React code has a bug, the database will reject duplicate inserts.

## Why It Was Failing Before

- No database constraint
- Race conditions in React code
- Multiple clicks could create duplicates
- The database accepted everything

## Why It Works Now

- Database constraint prevents duplicates
- React code has proper `return` statements
- Simple logic: check → update OR insert → return
- No complex RPC functions

## Commit & Deploy

```bash
git add .
git commit -m "fix: add unique constraint to prevent duplicate open sessions"
git push origin main
```

Done! 🎉

---

**Read `FIX_GUIDE.md` for detailed explanation.**
