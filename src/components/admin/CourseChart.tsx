// src/components/admin/CourseChart.tsx
// Uses program abbreviation on X-axis (e.g. BSIT, BSCS) — not full name
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2, BarChart2 } from 'lucide-react';
import { useByCourse } from '@/hooks/useStats';
import { CHART_COLORS } from '@/lib/utils';

const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-neu-border shadow-card rounded-xl px-4 py-2.5">
      <p className="text-xs font-semibold text-slate-700">{payload[0]?.payload?.fullName ?? label}</p>
      <p className="text-xs text-slate-400">{label}</p>
      <p className="text-sm font-bold text-neu-blue mt-0.5">
        {payload[0].value} visit{payload[0].value !== 1 ? 's' : ''}
      </p>
    </div>
  );
};

interface Props { filter: string; from?: string; to?: string; }

export function CourseChart({ filter, from, to }: Props) {
  const { data, isLoading } = useByCourse(filter, from, to);

  return (
    <div className="card-p h-full animate-fade-up delay-3">
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-lg bg-neu-light flex items-center justify-center">
          <BarChart2 size={15} className="text-neu-blue" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-800">Visitors by Course</p>
          <p className="text-[11px] text-slate-400">Top 10 programs (abbreviation)</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-56">
          <Loader2 className="animate-spin text-neu-blue" size={26} />
        </div>
      ) : !data?.length ? (
        <div className="flex flex-col items-center justify-center h-56 text-slate-300">
          <BarChart2 size={40} strokeWidth={1} />
          <p className="text-sm mt-2 font-medium">No data for this period</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={270}>
          <BarChart
            data={data}
            margin={{ top: 0, right: 10, left: -14, bottom: 20 }}
            barSize={22}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="abbreviation"
              tick={{ fontSize: 11, fontFamily: 'Poppins', fill: '#94a3b8', fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={52}
            />
            <YAxis
              tick={{ fontSize: 11, fontFamily: 'Poppins', fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<Tip />} cursor={{ fill: 'rgba(0,48,135,0.04)', radius: 6 }} />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}