# 🚀 DEPLOYMENT STEPS - FIX WAYNE'S BUG

## ⚠️ CRITICAL: Do These Steps IN ORDER

### Step 1: Open Supabase SQL Editor
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"

### Step 2: Copy and Run the SQL
1. Open the file: `supabase/COMPLETE_DEPLOYMENT_GUIDE.sql`
2. Copy EVERYTHING from that file
3. Paste into Supabase SQL Editor
4. Click "Run" button
5. Wait for "Success" message

### Step 3: Verify SQL Worked
Run this query in SQL Editor:
```sql
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'smart_time_in';
```
**Expected:** Should return 1 row with "smart_time_in"

### Step 4: Deploy Frontend Code
Open terminal and run:
```bash
git add .
git commit -m "fix: atomic smart toggle prevents duplicate sessions"
git push origin main
```

### Step 5: Wait for Vercel Deployment
1. Go to https://vercel.com/dashboard
2. Wait for deployment to finish (~2 minutes)
3. Look for "✅ Deployment Complete"

### Step 6: Test with Wayne's Account
1. Go to https://neu-library-visitor-log.vercel.app
2. Sign in with wayne.andy@neu.edu.ph
3. Should see "Time In" success
4. Sign in AGAIN immediately
5. Should see "Time Out" success (not "Sign-In Blocked")
6. Check Admin Dashboard → "Currently Inside" should be 0 or 1 (not 2+)

## ✅ Success Criteria
- ✅ No "Sign-In Blocked" error
- ✅ Dashboard shows correct "Currently Inside" count
- ✅ Visitor Logs shows only 1 "Inside" session per user
- ✅ Updates appear without page refresh

## 🆘 If Something Goes Wrong

### Error: "function smart_time_in does not exist"
**Fix:** Re-run Step 2 (the SQL)

### Error: "Sign-In Blocked" still appears
**Fix:** Run this in SQL Editor:
```sql
-- Remove all constraints
DROP INDEX IF EXISTS idx_one_active_session_per_visitor CASCADE;
DROP TRIGGER IF EXISTS prevent_duplicate_active_sessions ON visit_logs CASCADE;
```

### Wayne still shows multiple "Inside" sessions
**Fix:** Run this in SQL Editor:
```sql
UPDATE visit_logs
SET time_out = NOW(), duration_minutes = 0
WHERE visitor_id = (SELECT id FROM visitors WHERE email = 'wayne.andy@neu.edu.ph')
  AND time_out IS NULL;
```

## 📞 Need Help?
If you're still stuck after following these steps, check:
1. Supabase Dashboard → Database → Logs (for errors)
2. Browser Console (F12) → Look for red errors
3. Vercel Dashboard → Deployment Logs

---

**Total Time:** ~5 minutes
**Difficulty:** Easy (just copy-paste and run)
