import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  title:     string;
  value:     number | string;
  icon:      LucideIcon;
  subtitle?: string;
  accent?:   boolean;
  loading?:  boolean;
  delay?:    number;
}

export function StatsCard({ title, value, icon: Icon, subtitle, accent, loading, delay = 0 }: Props) {
  return (
    <div
      className={cn(
        'card-p relative overflow-hidden animate-fade-up',
        accent && 'bg-neu-blue border-0',
      )}
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Decor circle */}
      <div className={cn(
        'absolute -right-5 -top-5 w-20 h-20 rounded-full opacity-[0.07]',
        accent ? 'bg-white' : 'bg-neu-blue',
      )} />
      <div className="relative">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center mb-4',
          accent ? 'bg-white/20' : 'bg-neu-light',
        )}>
          <Icon size={18} strokeWidth={2} className={accent ? 'text-white' : 'text-neu-blue'} />
        </div>
        {loading ? (
          <div className="space-y-2">
            <div className={cn('h-8 w-16 rounded-lg animate-pulse', accent ? 'bg-white/20' : 'bg-gray-100')} />
            <div className={cn('h-3 w-24 rounded animate-pulse',   accent ? 'bg-white/20' : 'bg-gray-100')} />
          </div>
        ) : (
          <>
            <p className={cn('text-3xl font-bold tracking-tight', accent ? 'text-white' : 'text-slate-900')}>
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            <p className={cn('text-sm font-medium mt-0.5', accent ? 'text-white/80' : 'text-slate-500')}>{title}</p>
            {subtitle && (
              <p className={cn('text-[11px] mt-0.5', accent ? 'text-white/55' : 'text-slate-400')}>{subtitle}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
