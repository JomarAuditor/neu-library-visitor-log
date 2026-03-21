import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Loader2, PieChart as PieIcon } from 'lucide-react';
import { useByCollege } from '@/hooks/useStats';
import { CHART_COLORS } from '@/lib/utils';
import { sanitizeHTML } from '@/lib/security';

const RADIAN = Math.PI / 180;

const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={11} fontWeight={600} fontFamily="Poppins, sans-serif">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const Tip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const data = payload[0];
  // React automatically escapes content, just ensure it's a string
  const name = String(data.name || '');
  const value = Number(data.value) || 0;
  
  return (
    <div className="bg-white border border-neu-border shadow-card rounded-xl px-4 py-2.5">
      <p className="text-xs font-semibold text-slate-700">{name}</p>
      <p className="text-sm font-bold text-neu-blue">{value} visit{value !== 1 ? 's' : ''}</p>
    </div>
  );
};

interface Props { filter: string; from?: string; to?: string; }

export function CollegeChart({ filter, from, to }: Props) {
  const { data, isLoading } = useByCollege(filter, from, to);
  
  // React automatically escapes content - just ensure proper types
  const chart = (data ?? []).map(d => {
    const name = String(d.college || '');
    const count = Number(d.count) || 0;
    
    return {
      college: name,
      shortName: name.replace('College of ', '').replace('College ', ''),
      count: count,
    };
  });

  return (
    <div className="card-p h-full animate-fade-up delay-2">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-lg bg-neu-light flex items-center justify-center">
          <PieIcon size={15} className="text-neu-blue" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">Visitors by College</p>
          <p className="text-[11px] text-slate-400">College distribution</p>
        </div>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-56"><Loader2 className="animate-spin text-neu-blue" size={26} /></div>
      ) : !chart.length ? (
        <div className="flex flex-col items-center justify-center h-56 text-slate-300">
          <PieIcon size={40} strokeWidth={1} />
          <p className="text-sm mt-2 font-medium">No data for this period</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={270}>
          <PieChart>
            <Pie data={chart} dataKey="count" nameKey="shortName"
              cx="50%" cy="50%" outerRadius={95} innerRadius={42}
              labelLine={false} label={CustomLabel}>
              {chart.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip content={<Tip />} />
            <Legend layout="vertical" align="right" verticalAlign="middle"
              iconSize={8} iconType="circle"
              formatter={(v) => {
                // React automatically escapes content
                const text = String(v || '');
                return <span style={{ fontSize: 11, fontFamily: 'Poppins', color: '#475569', fontWeight: 500 }}>{text}</span>;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
