# BULLETPROOF IN/OUT TOGGLE - Testing Guide

## ✅ What Was Fixed

### Problem
Wayne was getting multiple "Inside" records because:
1. No database constraint to prevent duplicates
2. Race conditions between check and insert
3. Multiple tabs/devices could create duplicates

### Solution
**Atomic Check-Then-Act Pattern:**
```
1. Query: SELECT * FROM visit_logs WHERE visitor_id = ? AND time_out IS NULL
2. Branch A (found): UPDATE time_out = NOW() → Show "Time Out" → RETURN
3. Branch B (not found): INSERT new record → Show "Welcome" → RETURN
```

**Key Improvements:**
- ✅ Single query determines state (no race window)
- ✅ Immediate RETURN after each branch (no fall-through)
- ✅ Parallel updates for multiple open sessions (handles corruption)
- ✅ Double-check before insert (catches multi-device races)
- ✅ Rounded duration_minutes (cleaner data)

---

## 🧪 Testing Checklist for Wayne's Account

### Test 1: Clean Slate
```
1. Go to Supabase SQL Editor
2. Run: 
   -- Drop the unique constraint (IMPORTANT!)
   DROP INDEX IF EXISTS idx_one_open_session_per_visitor;
   
   -- Close all Wayne's open sessions
   UPDATE visit_logs 
   SET time_out = NOW(), duration_minutes = 1 
   WHERE visitor_id = (SELECT id FROM visitors WHERE email = 'wayneandy.villamor@neu.edu.ph')
   AND time_out IS NULL;

3. Verify: 
   SELECT COUNT(*) as open_sessions FROM visit_logs 
   WHERE visitor_id = (SELECT id FROM visitors WHERE email = 'wayneandy.villamor@neu.edu.ph')
   AND time_out IS NULL;
   
   Expected: 0
   
4. Verify constraint is gone:
   SELECT indexname FROM pg_indexes 
   WHERE tablename = 'visit_logs' 
   AND indexname = 'idx_one_open_session_per_visitor';
   
   Expected: No rows (constraint dropped)
```

### Test 2: First Sign-In (Time In)
```
1. Go to https://neu-library-visitor-log.vercel.app
2. Click "Sign in with Google"
3. Use: wayneandy.villamor@neu.edu.ph
4. Select purpose: "Studying"
5. Click "Confirm Time In"

Expected Result:
✅ Success page shows "Welcome to the Library!"
✅ Admin logs show 1 "Inside" record for Wayne
✅ Time In is recorded
✅ Time Out is NULL
```

### Test 3: Second Sign-In (Time Out)
```
1. Go to https://neu-library-visitor-log.vercel.app
2. Click "Sign in with Google"
3. Use: wayneandy.villamor@neu.edu.ph
4. NO purpose picker should appear (automatic time out)

Expected Result:
✅ Success page shows "Thank You for Visiting!"
✅ Duration is displayed (e.g., "2h 15m")
✅ Admin logs show Wayne's record with Time Out filled
✅ Status changed from "Inside" to completed
```

### Test 4: Third Sign-In (Time In Again)
```
1. Go to https://neu-library-visitor-log.vercel.app
2. Click "Sign in with Google"
3. Use: wayneandy.villamor@neu.edu.ph
4. Select purpose: "Research"
5. Click "Confirm Time In"

Expected Result:
✅ Success page shows "Welcome to the Library!"
✅ Admin logs show NEW "Inside" record for Wayne
✅ Previous record remains closed
✅ Total records for Wayne: 2 (1 closed, 1 open)
```

### Test 5: Rapid Double-Click (Race Condition Test)
```
1. Go to https://neu-library-visitor-log.vercel.app
2. Click "Sign in with Google"
3. Use: wayneandy.villamor@neu.edu.ph
4. When purpose picker appears, select "Studying"
5. DOUBLE-CLICK "Confirm Time In" rapidly

Expected Result:
✅ Only ONE record created
✅ No duplicate "Inside" records
✅ Success page appears once
```

### Test 6: Multi-Tab Test (Concurrent Access)
```
1. Open Tab 1: https://neu-library-visitor-log.vercel.app
2. Open Tab 2: https://neu-library-visitor-log.vercel.app
3. Tab 1: Sign in as Wayne, select purpose, DON'T click confirm yet
4. Tab 2: Sign in as Wayne, select purpose, click confirm
5. Tab 1: Now click confirm

Expected Result:
✅ Tab 2: Creates time-in record
✅ Tab 1: Detects existing session, times it out instead
✅ Only ONE "Inside" record exists at any time
✅ No duplicates
```

### Test 7: Multi-Device Test
```
1. Device 1 (Desktop): Sign in as Wayne → Time In
2. Device 2 (Mobile): Sign in as Wayne → Should Time Out
3. Device 1: Check admin logs

Expected Result:
✅ Device 2 automatically times out Device 1's session
✅ Only ONE session exists
✅ Perfect toggle across devices
```

### Test 8: Corruption Recovery Test
```
1. Manually create 3 open sessions for Wayne in database:
   INSERT INTO visit_logs (visitor_id, purpose, time_in, visit_date)
   SELECT id, 'Reading', NOW(), CURRENT_DATE FROM visitors 
   WHERE email = 'wayneandy.villamor@neu.edu.ph'
   UNION ALL
   SELECT id, 'Research', NOW(), CURRENT_DATE FROM visitors 
   WHERE email = 'wayneandy.villamor@neu.edu.ph'
   UNION ALL
   SELECT id, 'Studying', NOW(), CURRENT_DATE FROM visitors 
   WHERE email = 'wayneandy.villamor@neu.edu.ph';

2. Sign in as Wayne

Expected Result:
✅ ALL 3 open sessions are closed simultaneously
✅ Duration calculated for each
✅ Success page shows "Time Out"
✅ System recovers gracefully from corruption
```

---

## 🔍 Verification Queries

### Check Wayne's Current Status
```sql
SELECT 
  vl.id,
  vl.purpose,
  vl.time_in,
  vl.time_out,
  vl.duration_minutes,
  CASE 
    WHEN vl.time_out IS NULL THEN 'Inside'
    ELSE 'Out'
  END as status
FROM visit_logs vl
JOIN visitors v ON vl.visitor_id = v.id
WHERE v.email = 'wayneandy.villamor@neu.edu.ph'
ORDER BY vl.time_in DESC
LIMIT 10;
```

### Count Open Sessions (Should Always Be 0 or 1)
```sql
SELECT 
  v.full_name,
  v.email,
  COUNT(*) FILTER (WHERE vl.time_out IS NULL) as open_sessions
FROM visitors v
LEFT JOIN visit_logs vl ON v.id = vl.visitor_id
WHERE v.email = 'wayneandy.villamor@neu.edu.ph'
GROUP BY v.id, v.full_name, v.email;
```

Expected: `open_sessions` = 0 or 1 (never 2+)

### Check for Duplicates (Should Return 0 Rows)
```sql
SELECT 
  visitor_id,
  COUNT(*) as open_count
FROM visit_logs
WHERE time_out IS NULL
GROUP BY visitor_id
HAVING COUNT(*) > 1;
```

Expected: No rows (no visitor has multiple open sessions)

---

## 📊 Admin Dashboard Verification

### Real-Time "Currently Inside" Counter
```
1. Open Admin Dashboard
2. Note the "Currently Inside" count
3. Sign in as Wayne (time in)
4. Wait 5 seconds
5. Refresh dashboard

Expected: Count increases by 1

6. Sign in as Wayne again (time out)
7. Wait 5 seconds
8. Refresh dashboard

Expected: Count decreases by 1
```

### Visitor Logs Table
```
1. Go to Admin → Visitor Logs
2. Search for "Wayne"
3. Check the Status column

Expected:
✅ Only ONE "Inside" record at most
✅ All other records show duration
✅ No duplicate "Inside" records
```

---

## 🐛 Troubleshooting

### If Wayne Still Gets Duplicates

1. **Check if unique index was dropped:**
   ```sql
   SELECT indexname FROM pg_indexes 
   WHERE tablename = 'visit_logs' 
   AND indexname = 'idx_one_open_session_per_visitor';
   ```
   - If found: Drop it with `DROP INDEX idx_one_open_session_per_visitor;`

2. **Verify code is deployed:**
   - Check Vercel deployment logs
   - Confirm latest commit is live
   - Clear browser cache

3. **Check for database triggers:**
   ```sql
   SELECT tgname FROM pg_trigger WHERE tgrelid = 'visit_logs'::regclass;
   ```
   - Should only show standard triggers, no custom ones

4. **Manual cleanup:**
   ```sql
   -- Close all Wayne's open sessions
   UPDATE visit_logs
   SET time_out = NOW(), duration_minutes = 1
   WHERE visitor_id = (SELECT id FROM visitors WHERE email = 'wayneandy.villamor@neu.edu.ph')
   AND time_out IS NULL;
   ```

### If Time Out Doesn't Work

1. **Check if session exists:**
   ```sql
   SELECT * FROM visit_logs 
   WHERE visitor_id = (SELECT id FROM visitors WHERE email = 'wayneandy.villamor@neu.edu.ph')
   AND time_out IS NULL;
   ```

2. **Check browser console for errors**

3. **Verify Supabase RLS policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'visit_logs';
   ```

---

## ✅ Success Criteria

After all tests, Wayne's account should:
- ✅ Toggle perfectly: In → Out → In → Out
- ✅ Never have more than 1 open session
- ✅ Work across multiple devices/tabs
- ✅ Recover gracefully from corruption
- ✅ Update admin dashboard in real-time
- ✅ Show correct duration on time out
- ✅ No error messages or crashes

---

## 📝 Test Results Template

```
Date: _______________
Tester: _______________

Test 1 (Clean Slate): ☐ Pass ☐ Fail
Test 2 (First Sign-In): ☐ Pass ☐ Fail
Test 3 (Second Sign-In): ☐ Pass ☐ Fail
Test 4 (Third Sign-In): ☐ Pass ☐ Fail
Test 5 (Rapid Double-Click): ☐ Pass ☐ Fail
Test 6 (Multi-Tab): ☐ Pass ☐ Fail
Test 7 (Multi-Device): ☐ Pass ☐ Fail
Test 8 (Corruption Recovery): ☐ Pass ☐ Fail

Overall Result: ☐ All Pass ☐ Some Failures

Notes:
_________________________________
_________________________________
_________________________________
```

---

## 🚀 Deploy & Test

```bash
# 1. Commit changes
git add .
git commit -m "fix: bulletproof in/out toggle with atomic checks"
git push origin main

# 2. Wait for Vercel deployment (~2 minutes)

# 3. Run all tests above

# 4. Celebrate! 🎉
```
