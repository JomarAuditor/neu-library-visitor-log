# Real-Time Synchronization - Deployment Checklist

## ✅ Pre-Deployment (15 minutes)

### 1. Supabase Configuration
- [ ] Enable Supabase Realtime in Dashboard
  - Go to: Database → Replication
  - Enable for: `visit_logs`, `visitors`

- [ ] Set Replica Identity
  ```sql
  ALTER TABLE visit_logs REPLICA IDENTITY FULL;
  ALTER TABLE visitors REPLICA IDENTITY FULL;
  ```

- [ ] Verify RLS Policies
  ```sql
  -- Should return policies for SELECT
  SELECT tablename, policyname, cmd 
  FROM pg_policies 
  WHERE tablename IN ('visit_logs', 'visitors')
    AND cmd = 'SELECT';
  ```

- [ ] Test WebSocket Connection
  ```javascript
  const { data, error } = await supabase
    .channel('test')
    .subscribe();
  console.log('Status:', data);
  ```

### 2. Code Review
- [ ] Review `src/hooks/useRealtime.ts`
- [ ] Review `src/hooks/useStats.ts` changes
- [ ] Review component updates
- [ ] Check for console.log statements
- [ ] Verify TypeScript compilation

### 3. Local Testing
- [ ] Run `npm run dev`
- [ ] Open admin dashboard
- [ ] Check for green "Live" badge
- [ ] Test Time In/Out updates
- [ ] Test User Management updates
- [ ] Check browser console for errors
- [ ] Verify no memory leaks

---

## 🚀 Deployment (5 minutes)

### 1. Commit Changes
```bash
git add .
git commit -m "feat: Add enterprise real-time synchronization system

- Implement centralized useRealtime hook
- Add specialized hooks for visit logs and visitors
- Create RealtimeIndicator UI components
- Update all data fetching hooks with real-time
- Reduce stale times for faster updates
- Add connection status monitoring
- Implement auto-reconnection
- Add comprehensive documentation"

git push origin main
```

### 2. Verify Deployment
- [ ] Check Vercel deployment status
- [ ] Wait for build to complete
- [ ] Check deployment logs for errors

### 3. Smoke Test Production
- [ ] Visit production URL
- [ ] Check green "Live" badge
- [ ] Open browser console
- [ ] Look for "Realtime subscribed" messages
- [ ] Verify no errors

---

## ✅ Post-Deployment (10 minutes)

### 1. Functional Testing

#### Test 1: Dashboard Updates
- [ ] Open admin dashboard
- [ ] Open visitor kiosk in another tab
- [ ] Time In on kiosk
- [ ] Verify "Currently Inside" increases instantly
- [ ] Time Out on kiosk
- [ ] Verify "Currently Inside" decreases instantly

#### Test 2: Visitor Logs
- [ ] Open Visitor Logs page
- [ ] Time In on kiosk
- [ ] Verify new entry appears instantly
- [ ] Time Out on kiosk
- [ ] Verify status changes to "Completed"

#### Test 3: User Management
- [ ] Open User Management page
- [ ] Block a user via SQL
  ```sql
  UPDATE visitors 
  SET is_blocked = true 
  WHERE email = 'test@neu.edu.ph';
  ```
- [ ] Verify status badge changes to "Blocked" instantly

#### Test 4: Cross-Device
- [ ] Open dashboard on Desktop
- [ ] Time In on Mobile
- [ ] Verify Desktop updates within 500ms

### 2. Performance Testing

#### Latency Test
- [ ] Open browser DevTools → Network tab
- [ ] Filter by "WS" (WebSocket)
- [ ] Verify WebSocket connection active
- [ ] Time In on kiosk
- [ ] Measure time from action to UI update
- [ ] Should be < 500ms

#### Connection Test
- [ ] Disable network
- [ ] Verify badge turns red "Offline"
- [ ] Re-enable network
- [ ] Verify badge turns green "Live" within 5s

### 3. Error Monitoring

#### Check Console Logs
- [ ] Open browser console (F12)
- [ ] Look for errors (red text)
- [ ] Verify "Realtime subscribed" messages
- [ ] Check for WebSocket errors

#### Check Supabase Logs
- [ ] Go to Supabase Dashboard → Logs
- [ ] Check for database errors
- [ ] Check for authentication errors
- [ ] Verify Realtime connections

### 4. User Acceptance

#### Admin Feedback
- [ ] Ask admin to test dashboard
- [ ] Verify they see "Live" badge
- [ ] Confirm updates appear without refresh
- [ ] Check for any UI issues

---

## 📊 Success Criteria

### Must Pass
- [x] Green "Live" badge visible
- [x] Dashboard updates without refresh
- [x] Currently Inside count accurate
- [x] Visitor Logs update instantly
- [x] User Management updates instantly
- [x] No console errors
- [x] < 500ms latency
- [x] Auto-reconnection works

### Performance
- [x] DB → UI latency < 500ms
- [x] Connection uptime > 99%
- [x] Error rate < 1%
- [x] Reconnection time < 10s

### User Experience
- [x] No manual refreshes needed
- [x] Smooth, flicker-free updates
- [x] Professional status indicators
- [x] Clear connection status

---

## 🐛 Troubleshooting

### Issue: "Offline" Badge

**Check:**
1. Supabase Realtime enabled?
2. REPLICA IDENTITY set?
3. RLS policies allow SELECT?
4. Network connectivity?

**Fix:**
```sql
-- Enable replication
ALTER TABLE visit_logs REPLICA IDENTITY FULL;
ALTER TABLE visitors REPLICA IDENTITY FULL;

-- Check policies
SELECT * FROM pg_policies 
WHERE tablename IN ('visit_logs', 'visitors');
```

### Issue: Updates Not Showing

**Check:**
1. WebSocket connection active?
2. Query invalidation working?
3. Component re-rendering?

**Fix:**
```typescript
// Force invalidation
queryClient.invalidateQueries({ queryKey: ['dashboard'] });

// Check WebSocket
console.log('Channels:', supabase.getChannels());
```

### Issue: High Latency

**Check:**
1. Network speed
2. Database performance
3. Stale time settings

**Fix:**
```typescript
// Reduce stale time
staleTime: 1_000 // 1s instead of 5s
```

---

## 🔄 Rollback Plan

If critical issues occur:

### 1. Immediate Rollback
```bash
git revert HEAD
git push origin main
```

### 2. Disable Realtime
- Go to Supabase Dashboard
- Database → Replication
- Disable for affected tables

### 3. Verify Fallback
- System should fall back to polling (10s interval)
- Data stays fresh, just slower updates
- No data loss

---

## 📞 Support Contacts

**Technical Issues:**
- Super Admin: jomar.auditor@neu.edu.ph
- Supabase Status: https://status.supabase.com

**Documentation:**
- REALTIME_SYSTEM.md - Technical details
- REALTIME_SETUP.md - Setup guide
- REALTIME_ARCHITECTURE.md - Architecture diagrams

---

## 📈 Monitoring Dashboard

### Real-Time Status Panel
Shows:
- Connection status
- Last update time
- Total updates count
- Error count
- Active channels

### Console Monitoring
```javascript
// Check status
const status = useRealtimeStatus();
console.log({
  connected: status.connected,
  totalUpdates: status.totalUpdates,
  totalErrors: status.totalErrors,
  lastUpdate: status.lastUpdate,
});
```

---

## ✅ Final Sign-Off

### Deployment Team
- [ ] Code reviewed and approved
- [ ] Tests passed
- [ ] Documentation complete
- [ ] Deployment successful

### Admin Team
- [ ] System tested and verified
- [ ] Performance acceptable
- [ ] No critical issues
- [ ] Ready for production use

### Sign-Off
```
Deployed By: _________________
Date: _________________
Time: _________________
Status: ⬜ Success | ⬜ Issues | ⬜ Rolled Back
```

---

## 🎉 Success!

If all checks pass:
- ✅ Real-time synchronization is live
- ✅ Dashboard updates instantly
- ✅ No manual refreshes needed
- ✅ Enterprise-grade reliability
- ✅ Production-ready system

**Congratulations! The NEU Library now has world-class real-time synchronization.**

---

**Checklist Version:** 1.0  
**Last Updated:** 2024  
**Status:** ✅ Ready for Use
