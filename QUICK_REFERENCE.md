# NEU Library - Quick Reference Card

## 🎯 What Was Fixed

| Issue | Status | Impact |
|-------|--------|--------|
| Duplicate "Inside" entries | ✅ FIXED | Critical |
| Success page HTML rendering | ✅ FIXED | High |
| Method column in tables | ✅ REMOVED | Medium |
| College/Course abbreviations | ✅ ENFORCED | Medium |
| Search functionality | ✅ ENHANCED | Medium |
| Security messages | ✅ UPDATED | Low |

---

## 🔑 Key Changes

### Smart Toggle Logic
```typescript
// Before: Always create new record
await supabase.from('visit_logs').insert({ ... });

// After: Check first, then decide
const openLog = await checkOpenSession(visitor_id);
if (openLog) {
  await updateRecord(openLog.id);  // TIME OUT
} else {
  await createRecord();             // TIME IN
}
```

### Success Page Fix
```tsx
// Before: String interpolation (broken)
`Your entry has been recorded, <strong>${name}</strong>.`

// After: JSX elements (works)
<>Your entry has been recorded, <strong>{name}</strong>.</>
```

---

## 📊 Database Queries

### Check for Open Session
```sql
SELECT id, time_in, purpose
FROM visit_logs
WHERE visitor_id = ?
  AND time_out IS NULL
LIMIT 1;
```

### Currently Inside Count
```sql
SELECT COUNT(DISTINCT visitor_id)
FROM visit_logs
WHERE time_out IS NULL;
```

### Find Duplicates (Should return 0)
```sql
SELECT visitor_id, COUNT(*)
FROM visit_logs
WHERE time_out IS NULL
GROUP BY visitor_id
HAVING COUNT(*) > 1;
```

---

## 🚀 Deployment Commands

### 1. Cleanup Database
```sql
-- Run in Supabase SQL Editor
\i supabase/cleanup_duplicates.sql
```

### 2. Deploy Code
```bash
git add .
git commit -m "Fix: Smart toggle logic"
git push origin main
```

### 3. Verify
```bash
# Visit site
open https://neu-library-visitor-log.vercel.app

# Check logs
vercel logs
```

---

## ✅ Testing Checklist

### Single Device
- [ ] Time In → Status "Inside"
- [ ] Time In again → Status "Completed"
- [ ] Time In third time → New "Inside"

### Cross-Device
- [ ] Time In on Phone
- [ ] Time Out on Laptop
- [ ] Check: Single record

### UI/UX
- [ ] Success page shows name correctly
- [ ] No Method column visible
- [ ] Abbreviations display (CICS, BSIT)
- [ ] Search works

---

## 🐛 Quick Fixes

### User Stuck Inside
```sql
UPDATE visit_logs 
SET time_out = NOW(), 
    duration_minutes = EXTRACT(EPOCH FROM (NOW() - time_in))::INT / 60
WHERE visitor_id = (SELECT id FROM visitors WHERE email = ?)
  AND time_out IS NULL;
```

### Clear All Open Sessions
```sql
UPDATE visit_logs 
SET time_out = NOW(), 
    duration_minutes = EXTRACT(EPOCH FROM (NOW() - time_in))::INT / 60
WHERE time_out IS NULL;
```

### Check Specific User
```sql
SELECT vl.*, v.email, v.full_name
FROM visit_logs vl
JOIN visitors v ON v.id = vl.visitor_id
WHERE v.email = 'user@neu.edu.ph'
ORDER BY vl.time_in DESC
LIMIT 5;
```

---

## 📞 Emergency Contacts

**Super Admin:** jomar.auditor@neu.edu.ph  
**Platform:** Vercel (auto-deploy from GitHub)  
**Database:** Supabase  
**Rollback:** `git revert HEAD && git push`

---

## 📈 Success Metrics

| Metric | Target | Check |
|--------|--------|-------|
| Duplicate "Inside" entries | 0 | `SELECT ... HAVING COUNT(*) > 1` |
| Toggle operation time | < 100ms | Browser DevTools Network tab |
| Dashboard load time | < 500ms | Browser DevTools Performance |
| Currently Inside accuracy | 100% | Compare DB count vs Dashboard |

---

## 🔒 Security Checklist

- [ ] Only @neu.edu.ph emails accepted
- [ ] Blocked users cannot sign in
- [ ] Non-admin NEU users see "Unauthorized"
- [ ] Admin whitelist enforced
- [ ] Console logs show security warnings

---

## 📚 Documentation Files

1. **TOGGLE_LOGIC_FIX.md** - Technical deep dive
2. **DEPLOYMENT_GUIDE.md** - Step-by-step deployment
3. **FLOW_DIAGRAM.md** - Visual flow charts
4. **QUICK_REFERENCE.md** - This file
5. **cleanup_duplicates.sql** - Database cleanup script

---

## 🎓 Key Concepts

### Database-Driven Toggle
- Database is source of truth
- Check before action
- Update existing vs create new

### Cross-Device Sync
- Works automatically
- No client-side state needed
- Real-time updates via Supabase

### Status Logic
- `time_out IS NULL` → "Inside"
- `time_out IS NOT NULL` → "Completed"
- Only one "Inside" per visitor

---

## ⚡ Performance Tips

1. **Use the index:** Query includes `time_out IS NULL`
2. **Limit results:** Always use `LIMIT 1` for open session check
3. **Real-time updates:** Supabase subscription for live data
4. **Cache wisely:** TanStack Query with 30s stale time

---

## 🔄 Common Workflows

### Normal Visit
```
Sign In → Select Purpose → Time In → [Do Work] → Sign In → Time Out
```

### Cross-Device Visit
```
Phone: Sign In → Time In
Laptop: Sign In → Time Out (automatic)
```

### Multiple Visits Same Day
```
Morning: Time In → Time Out
Afternoon: Time In → Time Out
Evening: Time In → (Still inside)
```

---

**Version:** 4.0  
**Status:** ✅ Production Ready  
**Last Updated:** 2024
