// src/components/admin/RealtimeIndicator.tsx
// Live connection status indicator for admin dashboard
// Shows real-time sync status, last update time, and connection health

import { useEffect, useState } from 'react';
import { Wifi, WifiOff, Activity, AlertCircle } from 'lucide-react';
import { useRealtimeStatus } from '@/hooks/useRealtime';

interface RealtimeIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function RealtimeIndicator({ className = '', showDetails = false }: RealtimeIndicatorProps) {
  const status = useRealtimeStatus();
  const [timeSinceUpdate, setTimeSinceUpdate] = useState<string>('');

  // Update time since last update every second
  useEffect(() => {
    const updateTime = () => {
      if (!status.lastUpdate) {
        setTimeSinceUpdate('Never');
        return;
      }

      const seconds = Math.floor((Date.now() - status.lastUpdate.getTime()) / 1000);
      
      if (seconds < 5) {
        setTimeSinceUpdate('Just now');
      } else if (seconds < 60) {
        setTimeSinceUpdate(`${seconds}s ago`);
      } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        setTimeSinceUpdate(`${minutes}m ago`);
      } else {
        const hours = Math.floor(seconds / 3600);
        setTimeSinceUpdate(`${hours}h ago`);
      }
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [status.lastUpdate]);

  const getStatusColor = () => {
    if (!status.connected) return 'text-red-500';
    if (status.totalErrors > 0) return 'text-amber-500';
    return 'text-green-500';
  };

  const getStatusText = () => {
    if (!status.connected) return 'Disconnected';
    if (status.totalErrors > 0) return 'Connected (with errors)';
    return 'Live';
  };

  const getStatusIcon = () => {
    if (!status.connected) return WifiOff;
    if (status.totalErrors > 0) return AlertCircle;
    return Wifi;
  };

  const StatusIcon = getStatusIcon();

  if (!showDetails) {
    // Compact version for header
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <div className={`relative ${getStatusColor()}`}>
          <StatusIcon size={14} />
          {status.connected && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          )}
        </div>
        <span className={`text-xs font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>
    );
  }

  // Detailed version for dashboard
  return (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            status.connected ? 'bg-green-100' : 'bg-red-100'
          }`}>
            <StatusIcon size={16} className={getStatusColor()} />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-700">Real-Time Sync</p>
            <p className={`text-[10px] font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </p>
          </div>
        </div>
        {status.connected && (
          <div className="flex items-center gap-1">
            <Activity size={12} className="text-green-500 animate-pulse" />
            <span className="text-[10px] font-bold text-green-600">ACTIVE</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-50 rounded-xl p-2.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Last Update
          </p>
          <p className="text-xs font-bold text-slate-700">{timeSinceUpdate}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-2.5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            Total Updates
          </p>
          <p className="text-xs font-bold text-slate-700">
            {status.totalUpdates.toLocaleString()}
          </p>
        </div>
      </div>

      {status.totalErrors > 0 && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertCircle size={12} className="text-amber-600 shrink-0" />
          <p className="text-[10px] text-amber-700 font-medium">
            {status.totalErrors} connection {status.totalErrors === 1 ? 'error' : 'errors'} detected
          </p>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-slate-100">
        <p className="text-[9px] text-slate-400 font-medium">
          {status.activeChannels} active {status.activeChannels === 1 ? 'channel' : 'channels'} • 
          Auto-refresh enabled
        </p>
      </div>
    </div>
  );
}

// Compact version for page headers
export function RealtimeStatusBadge({ className = '' }: { className?: string }) {
  const status = useRealtimeStatus();

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
      status.connected
        ? 'bg-green-100 text-green-700'
        : 'bg-red-100 text-red-700'
    } ${className}`}>
      {status.connected ? (
        <>
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Live
        </>
      ) : (
        <>
          <WifiOff size={10} />
          Offline
        </>
      )}
    </div>
  );
}
