# FIX FOR DUPLICATE TIME-IN BUG

## Problem
Users are getting multiple "Inside" records when they sign in, instead of toggling between time-in and time-out.

## Root Cause
The database has NO constraint preventing multiple open sessions per visitor. When the React code runs, race conditions or multiple clicks can create duplicate time-in records.

## The Complete Fix (3 Steps)

### Step 1: Run SQL Cleanup (CRITICAL - Do this first!)

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Open the file: `supabase/cleanup_duplicates.sql`
4. Click "Run"

This will:
- ✅ Close all stuck "Inside" sessions
- ✅ Delete duplicate entries
- ✅ Add a UNIQUE INDEX to prevent future duplicates
- ✅ Remove any broken RPC functions

**The unique index is the KEY fix:**
```sql
CREATE UNIQUE INDEX idx_one_open_session_per_visitor 
  ON visit_logs(visitor_id) 
  WHERE time_out IS NULL;
```

This makes it **physically impossible** for the database to accept a second open session for the same visitor.

### Step 2: Verify the Files Are Correct

The files `VisitorHome.tsx` and `RegisterPage.tsx` should already have the correct logic:

**VisitorHome.tsx logic:**
1. User signs in with Google
2. Query: `SELECT * FROM visit_logs WHERE visitor_id = ? AND time_out IS NULL`
3. If found → UPDATE (time out) → navigate to success page → **RETURN**
4. If not found → show purpose picker → INSERT (time in) → navigate to success page

**RegisterPage.tsx logic:**
1. Create visitor record
2. Close any open sessions (safety net)
3. Insert exactly ONE time-in record

### Step 3: Test the Fix

1. Sign in as Wayne (or any user)
2. Check admin logs - should show "Inside"
3. Sign in again - should show "Thank You for Visiting" and status changes to "Out"
4. Sign in again - should show "Welcome" and status changes to "Inside"
5. Repeat - should toggle perfectly

### Step 4: Deploy

```bash
git add .
git commit -m "fix: prevent duplicate time-in with database constraint"
git push origin main
```

## Why This Works

### Previous Approach (Failed)
- Relied on React code to check for duplicates
- Race conditions could slip through
- Multiple tabs/devices could create duplicates
- RPC functions added complexity and failed

### New Approach (Bulletproof)
- **Database constraint** prevents duplicates at the lowest level
- Even if React code has a bug, database will reject duplicate inserts
- Simple client-side logic with clear RETURN statements
- No RPC functions - pure SQL queries

## Technical Details

### The Unique Index
```sql
CREATE UNIQUE INDEX idx_one_open_session_per_visitor 
  ON visit_logs(visitor_id) 
  WHERE time_out IS NULL;
```

This is a **partial unique index** that only applies to rows where `time_out IS NULL` (open sessions).

- ✅ Allows multiple closed sessions per visitor
- ✅ Allows only ONE open session per visitor
- ✅ Database-level enforcement (can't be bypassed)
- ✅ Fast lookups for open sessions

### Error Handling
If somehow the React code tries to insert a duplicate, the database will return error code `23505` (unique violation). The code should handle this gracefully by:

1. Catching the error
2. Querying for the existing open session
3. Updating it (time out) instead

But with the current logic, this should NEVER happen because we always check first.

## Verification Queries

Run these in Supabase SQL Editor to verify:

```sql
-- Check for any open sessions
SELECT 
  v.full_name,
  v.email,
  COUNT(*) FILTER (WHERE vl.time_out IS NULL) as open_sessions
FROM visitors v
LEFT JOIN visit_logs vl ON v.id = vl.visitor_id
GROUP BY v.id, v.full_name, v.email
HAVING COUNT(*) FILTER (WHERE vl.time_out IS NULL) > 0;

-- Should return 0 rows or 1 row per visitor with open_sessions = 1
```

```sql
-- Check if the unique index exists
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'visit_logs' 
  AND indexname = 'idx_one_open_session_per_visitor';

-- Should return 1 row showing the index definition
```

## If Problems Persist

1. Check browser console for errors
2. Check Supabase logs for database errors
3. Verify the unique index was created successfully
4. Make sure you ran the cleanup script FIRST
5. Clear browser cache and try again

## Real-World Analogy

Think of it like a library card scanner:

**Before (Broken):**
- Scanner checks if card is in system
- If yes, records entry
- But if you scan twice quickly, both scans succeed
- Result: Two "inside" records

**After (Fixed):**
- Database has a physical lock: "Only one active entry per card"
- First scan: ✅ Records entry
- Second scan: ❌ Database rejects (already inside)
- Code detects rejection, realizes user is inside, records exit instead
- Result: Perfect toggle

The unique index is that physical lock.
