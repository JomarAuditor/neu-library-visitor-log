// src/hooks/useRealtime.ts
// Enterprise-grade real-time synchronization layer for NEU Library
// Manages all Supabase Realtime subscriptions with automatic reconnection,
// error handling, and optimistic UI updates

import { useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { secureLog } from '@/lib/security';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ── Types ─────────────────────────────────────────────────────────────
type TableName = 'visit_logs' | 'visitors' | 'profiles';
type EventType = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface RealtimeConfig {
  table: TableName;
  event?: EventType;
  schema?: string;
  filter?: string;
  onInsert?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onUpdate?: (payload: RealtimePostgresChangesPayload<any>) => void;
  onDelete?: (payload: RealtimePostgresChangesPayload<any>) => void;
  invalidateQueries?: string[];
}

interface RealtimeStats {
  connected: boolean;
  lastUpdate: Date | null;
  updateCount: number;
  errors: number;
}

// ── Global state for connection monitoring ────────────────────────────
const realtimeStats: Record<string, RealtimeStats> = {};

// ── Main hook ─────────────────────────────────────────────────────────
export function useRealtime(config: RealtimeConfig) {
  const qc = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const channelName = `${config.table}-${config.event || 'all'}-${Date.now()}`;

  const handleChange = useCallback((payload: RealtimePostgresChangesPayload<any>) => {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    // Update stats
    if (!realtimeStats[channelName]) {
      realtimeStats[channelName] = {
        connected: true,
        lastUpdate: new Date(),
        updateCount: 0,
        errors: 0,
      };
    }
    realtimeStats[channelName].lastUpdate = new Date();
    realtimeStats[channelName].updateCount += 1;

    secureLog('info', `Realtime ${eventType} on ${config.table}`, {
      table: config.table,
      event: eventType,
      hasNew: !!newRecord,
      hasOld: !!oldRecord,
    });

    // Call specific handlers
    if (eventType === 'INSERT' && config.onInsert) {
      config.onInsert(payload);
    } else if (eventType === 'UPDATE' && config.onUpdate) {
      config.onUpdate(payload);
    } else if (eventType === 'DELETE' && config.onDelete) {
      config.onDelete(payload);
    }

    // Invalidate queries
    if (config.invalidateQueries) {
      config.invalidateQueries.forEach(queryKey => {
        qc.invalidateQueries({ queryKey: [queryKey] });
      });
    }
  }, [config, qc, channelName]);

  const handleError = useCallback((error: any) => {
    if (realtimeStats[channelName]) {
      realtimeStats[channelName].errors += 1;
      realtimeStats[channelName].connected = false;
    }
    secureLog('error', `Realtime error on ${config.table}`, { error });

    // Attempt reconnection after 5 seconds
    reconnectTimeoutRef.current = setTimeout(() => {
      secureLog('info', `Attempting to reconnect ${config.table} channel`);
      if (channelRef.current) {
        channelRef.current.subscribe();
      }
    }, 5000);
  }, [config.table, channelName]);

  useEffect(() => {
    // Create channel
    const channel = supabase.channel(channelName);

    // Configure postgres changes listener
    channel.on(
      'postgres_changes',
      {
        event: config.event || '*',
        schema: config.schema || 'public',
        table: config.table,
        filter: config.filter,
      },
      handleChange
    );

    // Subscribe with status callbacks
    channel
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          secureLog('info', `Realtime subscribed: ${config.table}`);
          if (realtimeStats[channelName]) {
            realtimeStats[channelName].connected = true;
          }
        } else if (status === 'CHANNEL_ERROR') {
          handleError(err);
        } else if (status === 'TIMED_OUT') {
          secureLog('warn', `Realtime timeout: ${config.table}`);
          handleError(new Error('Connection timeout'));
        } else if (status === 'CLOSED') {
          secureLog('warn', `Realtime closed: ${config.table}`);
          if (realtimeStats[channelName]) {
            realtimeStats[channelName].connected = false;
          }
        }
      });

    channelRef.current = channel;

    // Cleanup
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      delete realtimeStats[channelName];
    };
  }, [config.table, config.event, config.schema, config.filter, channelName, handleChange, handleError]);

  return {
    stats: realtimeStats[channelName] || {
      connected: false,
      lastUpdate: null,
      updateCount: 0,
      errors: 0,
    },
  };
}

// ── Specialized hooks for common use cases ────────────────────────────

/**
 * Real-time updates for visit logs
 * Automatically invalidates dashboard, logs, and inside count
 */
export function useVisitLogsRealtime() {
  return useRealtime({
    table: 'visit_logs',
    event: '*',
    invalidateQueries: [
      'dashboard',
      'visit-logs',
      'currently-inside',
      'by-college',
      'by-course',
    ],
  });
}

/**
 * Real-time updates for visitors (user management)
 * Automatically invalidates visitor queries
 */
export function useVisitorsRealtime() {
  return useRealtime({
    table: 'visitors',
    event: '*',
    invalidateQueries: ['visitors', 'dashboard'],
  });
}

/**
 * Real-time updates for currently inside count
 * Optimized for high-frequency updates
 */
export function useCurrentlyInsideRealtime(onUpdate?: (count: number) => void) {
  const qc = useQueryClient();

  return useRealtime({
    table: 'visit_logs',
    event: '*',
    onInsert: () => {
      // New time-in
      qc.invalidateQueries({ queryKey: ['currently-inside'] });
      if (onUpdate) {
        // Optimistically update count
        const currentCount = qc.getQueryData<number>(['currently-inside']) || 0;
        onUpdate(currentCount + 1);
      }
    },
    onUpdate: (payload) => {
      // Check if time_out was set (someone left)
      if (payload.new?.time_out && !payload.old?.time_out) {
        qc.invalidateQueries({ queryKey: ['currently-inside'] });
        if (onUpdate) {
          const currentCount = qc.getQueryData<number>(['currently-inside']) || 0;
          onUpdate(Math.max(0, currentCount - 1));
        }
      }
    },
    invalidateQueries: ['currently-inside'],
  });
}

/**
 * Real-time connection status indicator
 * Returns aggregated status across all active channels
 */
export function useRealtimeStatus() {
  const allStats = Object.values(realtimeStats);
  const connected = allStats.some(s => s.connected);
  const totalUpdates = allStats.reduce((sum, s) => sum + s.updateCount, 0);
  const totalErrors = allStats.reduce((sum, s) => sum + s.errors, 0);
  const lastUpdate = allStats
    .map(s => s.lastUpdate)
    .filter(Boolean)
    .sort((a, b) => (b?.getTime() || 0) - (a?.getTime() || 0))[0];

  return {
    connected,
    totalUpdates,
    totalErrors,
    lastUpdate,
    activeChannels: allStats.length,
  };
}

/**
 * Hook for dashboard-specific real-time updates
 * Combines visit logs and visitors with optimized invalidation
 */
export function useDashboardRealtime() {
  const visitLogsStats = useVisitLogsRealtime();
  const visitorsStats = useVisitorsRealtime();

  return {
    visitLogs: visitLogsStats.stats,
    visitors: visitorsStats.stats,
    connected: visitLogsStats.stats.connected || visitorsStats.stats.connected,
  };
}
