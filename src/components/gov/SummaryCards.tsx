import { Activity, AlertOctagon, CheckCircle2, Clock, Building2 } from 'lucide-react';
import { formatCount } from '@/lib/pollution';
import type { DashboardAnalytics, Hotspot } from '@/lib/types';

type SummaryCardsProps = {
  analytics: DashboardAnalytics | null;
  hotspots: Hotspot[];
};

export default function SummaryCards({ analytics, hotspots }: SummaryCardsProps) {
  const totals = analytics?.totals;
  const highCount = hotspots.filter((hotspot) => hotspot.classification === 'high').length;

  const cards = [
    { label: 'Total complaints', value: totals?.total ?? 0, icon: Activity, tone: 'text-blue-700 bg-blue-50' },
    { label: 'Pending', value: totals?.pending ?? 0, icon: Clock, tone: 'text-amber-700 bg-amber-50' },
    { label: 'Resolved', value: totals?.resolved ?? 0, icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-50' },
    { label: 'High-priority hotspots', value: highCount, icon: AlertOctagon, tone: 'text-red-700 bg-red-50' },
    { label: 'Districts affected', value: totals?.districts ?? 0, icon: Building2, tone: 'text-teal-800 bg-teal-50' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.tone}`}>
            <card.icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-medium text-slate-500">{card.label}</p>
            <p className="text-xl font-semibold leading-[1.2] text-slate-900">{formatCount(card.value)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
