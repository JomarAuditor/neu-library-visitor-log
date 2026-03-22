# NEU Library - Real-Time Synchronization System

## 🎯 Overview

Enterprise-grade real-time synchronization layer that provides instant updates across all admin dashboard components using Supabase Realtime. Every database change is pushed to the UI within milliseconds, ensuring 100% accuracy without manual refreshes.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        DATABASE LAYER                               │
│                     (PostgreSQL + Supabase)                         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ Postgres Changes
                             │ (INSERT/UPDATE/DELETE)
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    SUPABASE REALTIME                                │
│                  (WebSocket Connection)                             │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             │ Real-time Events
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   useRealtime Hook (Central)                        │
│  • Connection Management                                            │
│  • Auto-reconnection                                                │
│  • Error Handling                                                   │
│  • Event Distribution                                               │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                ┌────────────┼────────────┐
                │            │            │
                ▼            ▼            ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ Visit Logs   │ │  Visitors    │ │ Currently    │
    │ Realtime     │ │  Realtime    │ │ Inside RT    │
    └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
           │                │                │
           └────────────────┼────────────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │  TanStack Query       │
                │  Cache Invalidation   │
                └───────────┬───────────┘
                            │
                            ▼
                ┌───────────────────────┐
                │   React Components    │
                │   (Auto Re-render)    │
                └───────────────────────┘
```

---

## 📦 Core Components

### 1. useRealtime Hook (`src/hooks/useRealtime.ts`)

**Purpose:** Centralized real-time subscription management

**Features:**
- ✅ Automatic connection management
- ✅ Auto-reconnection on failure (5s delay)
- ✅ Error tracking and logging
- ✅ Connection status monitoring
- ✅ Query invalidation on changes
- ✅ Custom event handlers

**Usage:**
```typescript
const { stats } = useRealtime({
  table: 'visit_logs',
  event: '*', // INSERT, UPDATE, DELETE, or *
  invalidateQueries: ['dashboard', 'visit-logs'],
  onInsert: (payload) => {
    console.log('New visit log:', payload.new);
  },
  onUpdate: (payload) => {
    console.log('Updated:', payload.new);
  },
});
```

### 2. Specialized Hooks

#### useVisitLogsRealtime()
Monitors `visit_logs` table for all changes.

**Invalidates:**
- `dashboard`
- `visit-logs`
- `currently-inside`
- `by-college`
- `by-course`

**Use Case:** Dashboard, Visitor Logs page

#### useVisitorsRealtime()
Monitors `visitors` table for user changes.

**Invalidates:**
- `visitors`
- `dashboard`

**Use Case:** User Management page

#### useCurrentlyInsideRealtime()
Optimized for high-frequency "Currently Inside" count updates.

**Features:**
- Optimistic UI updates
- Instant count changes
- Callback support

**Use Case:** Dashboard KPI card

#### useDashboardRealtime()
Combined hook for dashboard-wide real-time updates.

**Returns:**
```typescript
{
  visitLogs: { connected, lastUpdate, updateCount, errors },
  visitors: { connected, lastUpdate, updateCount, errors },
  connected: boolean
}
```

### 3. UI Components

#### RealtimeStatusBadge
Compact status indicator for page headers.

**States:**
- 🟢 Live (green badge with pulse)
- 🔴 Offline (red badge)

**Usage:**
```tsx
<RealtimeStatusBadge />
```

#### RealtimeIndicator
Detailed status panel with metrics.

**Shows:**
- Connection status
- Last update time
- Total updates count
- Error count
- Active channels

**Usage:**
```tsx
<RealtimeIndicator showDetails={true} />
```

---

## 🔄 Data Flow

### Scenario: User Times In

```
1. User signs in at kiosk
   ↓
2. INSERT into visit_logs table
   ↓
3. Supabase Realtime detects INSERT
   ↓
4. WebSocket pushes event to all connected clients
   ↓
5. useVisitLogsRealtime() receives event
   ↓
6. Invalidates queries: ['dashboard', 'visit-logs', 'currently-inside']
   ↓
7. TanStack Query refetches data
   ↓
8. React components re-render with new data
   ↓
9. Admin sees update instantly (< 500ms)
```

### Scenario: User Blocked

```
1. Admin clicks "Block" button
   ↓
2. UPDATE visitors SET is_blocked = true
   ↓
3. Supabase Realtime detects UPDATE
   ↓
4. useVisitorsRealtime() receives event
   ↓
5. Invalidates queries: ['visitors', 'dashboard']
   ↓
6. User Management table updates instantly
   ↓
7. Status badge changes from "Active" to "Blocked"
```

---

## ⚡ Performance Optimizations

### 1. Reduced Stale Times
```typescript
// Before: 30s stale time
staleTime: 30_000

// After: 5s stale time (with real-time updates)
staleTime: 5_000
```

**Benefit:** Faster initial loads + real-time updates = always fresh data

### 2. Optimistic Updates
```typescript
useCurrentlyInsideRealtime((newCount) => {
  // Update UI immediately, before server confirms
  setCount(newCount);
});
```

**Benefit:** Instant UI feedback, no perceived lag

### 3. Selective Invalidation
```typescript
// Only invalidate affected queries
invalidateQueries: ['dashboard', 'currently-inside']

// Not all queries
// invalidateQueries: ['*'] ❌
```

**Benefit:** Minimal re-renders, better performance

### 4. Connection Pooling
Single WebSocket connection per table, shared across all components.

**Benefit:** Reduced network overhead

---

## 🛡️ Error Handling

### Auto-Reconnection
```typescript
// Connection lost
→ Wait 5 seconds
→ Attempt reconnection
→ Log attempt
→ Retry indefinitely
```

### Error Tracking
```typescript
realtimeStats[channelName] = {
  connected: false,
  lastUpdate: null,
  updateCount: 0,
  errors: 1, // Incremented on error
};
```

### Fallback Mechanism
```typescript
// Real-time fails → Polling continues
refetchInterval: 10_000 // Every 10s
```

**Guarantee:** Data stays fresh even if WebSocket fails

---

## 📊 Monitoring

### Connection Status
```typescript
const status = useRealtimeStatus();

console.log({
  connected: status.connected,
  totalUpdates: status.totalUpdates,
  totalErrors: status.totalErrors,
  lastUpdate: status.lastUpdate,
  activeChannels: status.activeChannels,
});
```

### Per-Channel Stats
```typescript
const { stats } = useRealtime({ table: 'visit_logs' });

console.log({
  connected: stats.connected,
  lastUpdate: stats.lastUpdate,
  updateCount: stats.updateCount,
  errors: stats.errors,
});
```

### Console Logging
```typescript
// Secure logging with PII redaction
secureLog('info', 'Realtime INSERT on visit_logs', {
  table: 'visit_logs',
  event: 'INSERT',
  hasNew: true,
});
```

---

## 🧪 Testing

### Test Real-Time Updates

#### 1. Dashboard Updates
```bash
# Terminal 1: Open admin dashboard
# Terminal 2: Insert test data

psql -h your-db.supabase.co -U postgres -d postgres

INSERT INTO visit_logs (visitor_id, purpose, time_in, visit_date)
VALUES (
  (SELECT id FROM visitors LIMIT 1),
  'Studying',
  NOW(),
  CURRENT_DATE
);

# Dashboard should update within 500ms
```

#### 2. Currently Inside Count
```bash
# Time In
INSERT INTO visit_logs (visitor_id, purpose, time_in, visit_date)
VALUES (...);

# Count increases instantly

# Time Out
UPDATE visit_logs 
SET time_out = NOW(), duration_minutes = 60
WHERE id = 'log-id';

# Count decreases instantly
```

#### 3. User Management
```bash
# Block user
UPDATE visitors SET is_blocked = true WHERE id = 'user-id';

# Status badge changes to "Blocked" instantly
```

### Test Connection Resilience

#### 1. Disconnect Test
```bash
# Disable network
# Wait 5 seconds
# Re-enable network
# Connection should auto-reconnect
```

#### 2. Error Recovery
```bash
# Simulate database error
# Real-time should log error
# Polling should continue
# Data stays fresh
```

---

## 🔧 Configuration

### Supabase Realtime Setup

#### 1. Enable Realtime
```sql
-- In Supabase Dashboard → Database → Replication
-- Enable replication for tables:
ALTER TABLE visit_logs REPLICA IDENTITY FULL;
ALTER TABLE visitors REPLICA IDENTITY FULL;
```

#### 2. RLS Policies
```sql
-- Allow authenticated users to listen
CREATE POLICY "realtime_select_visit_logs" 
ON visit_logs FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "realtime_select_visitors" 
ON visitors FOR SELECT 
TO authenticated 
USING (true);
```

### TanStack Query Configuration
```typescript
// src/main.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5_000,        // 5s default
      refetchInterval: 10_000, // Fallback polling
      retry: 2,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});
```

---

## 📈 Performance Metrics

### Expected Latency
| Event | Latency | Target |
|-------|---------|--------|
| Database INSERT | < 50ms | ✅ |
| Realtime push | < 100ms | ✅ |
| Query invalidation | < 50ms | ✅ |
| Component re-render | < 100ms | ✅ |
| **Total (DB → UI)** | **< 300ms** | **✅** |

### Network Usage
| Metric | Value |
|--------|-------|
| WebSocket connection | 1 per table |
| Bandwidth (idle) | < 1 KB/s |
| Bandwidth (active) | < 10 KB/s |
| Reconnection attempts | Unlimited |

### Browser Compatibility
| Browser | Support |
|---------|---------|
| Chrome 88+ | ✅ Full |
| Firefox 85+ | ✅ Full |
| Safari 14+ | ✅ Full |
| Edge 88+ | ✅ Full |
| Mobile browsers | ✅ Full |

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Enable Supabase Realtime for all tables
- [ ] Set REPLICA IDENTITY FULL on tables
- [ ] Verify RLS policies allow SELECT
- [ ] Test WebSocket connection
- [ ] Check browser console for errors

### Post-Deployment
- [ ] Monitor connection status in dashboard
- [ ] Verify "Live" badge shows green
- [ ] Test Time In/Out updates
- [ ] Check Currently Inside count accuracy
- [ ] Verify User Management updates
- [ ] Monitor error logs

### Monitoring
```typescript
// Add to admin dashboard
<RealtimeIndicator showDetails={true} />

// Check stats
const status = useRealtimeStatus();
console.log('Real-time health:', status);
```

---

## 🐛 Troubleshooting

### Issue: "Offline" Badge Showing

**Causes:**
1. Supabase Realtime not enabled
2. Network connectivity issues
3. RLS policies blocking SELECT
4. Browser blocking WebSockets

**Fix:**
```bash
# 1. Check Supabase Realtime
# Dashboard → Database → Replication → Enable

# 2. Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'visit_logs';

# 3. Check browser console
# Look for WebSocket errors

# 4. Test connection
const { data, error } = await supabase
  .channel('test')
  .subscribe();
console.log('Status:', data);
```

### Issue: Updates Not Showing

**Causes:**
1. Query not invalidated
2. Stale time too high
3. Component not re-rendering

**Fix:**
```typescript
// 1. Force invalidation
queryClient.invalidateQueries({ queryKey: ['dashboard'] });

// 2. Reduce stale time
staleTime: 0 // Always fresh

// 3. Check component deps
useEffect(() => {
  console.log('Data changed:', data);
}, [data]);
```

### Issue: High Error Count

**Causes:**
1. Network instability
2. Database connection issues
3. Rate limiting

**Fix:**
```typescript
// Check error details
const { stats } = useRealtime({ table: 'visit_logs' });
console.log('Errors:', stats.errors);

// Increase reconnection delay
reconnectTimeoutRef.current = setTimeout(() => {
  // Reconnect
}, 10000); // 10s instead of 5s
```

---

## 📚 API Reference

### useRealtime(config)
```typescript
interface RealtimeConfig {
  table: 'visit_logs' | 'visitors' | 'profiles';
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string; // Default: 'public'
  filter?: string; // e.g., 'visitor_id=eq.123'
  onInsert?: (payload) => void;
  onUpdate?: (payload) => void;
  onDelete?: (payload) => void;
  invalidateQueries?: string[];
}

Returns: {
  stats: {
    connected: boolean;
    lastUpdate: Date | null;
    updateCount: number;
    errors: number;
  }
}
```

### useRealtimeStatus()
```typescript
Returns: {
  connected: boolean;
  totalUpdates: number;
  totalErrors: number;
  lastUpdate: Date | null;
  activeChannels: number;
}
```

---

## 🎓 Best Practices

### 1. Use Specialized Hooks
```typescript
// ✅ Good
useVisitLogsRealtime();

// ❌ Avoid
useRealtime({ table: 'visit_logs', event: '*', ... });
```

### 2. Minimize Invalidations
```typescript
// ✅ Good - specific queries
invalidateQueries: ['dashboard', 'currently-inside']

// ❌ Avoid - all queries
invalidateQueries: ['*']
```

### 3. Handle Errors Gracefully
```typescript
const { stats } = useVisitLogsRealtime();

if (!stats.connected) {
  return <div>Connecting to live updates...</div>;
}
```

### 4. Show Connection Status
```tsx
// Always show status to users
<RealtimeStatusBadge />
```

### 5. Test Offline Scenarios
```typescript
// Ensure app works without real-time
refetchInterval: 10_000 // Fallback polling
```

---

**Version:** 4.0 - Real-Time Sync  
**Status:** ✅ Production Ready  
**Last Updated:** 2024
