import { useState, type ReactNode } from 'react';
import { AlertTriangle, BellRing, Crosshair } from 'lucide-react';
import {
  CLASSIFICATION_STYLES,
  categoryLabel,
  formatCount,
  formatDateTime,
  monthLabel,
} from '@/lib/pollution';
import type { LiveAlert } from '@/hooks/useGovData';
import type { DashboardAnalytics, Hotspot } from '@/lib/types';

export type InsightTab = 'hotspots' | 'analytics' | 'alerts';

type InsightsPanelProps = {
  hotspots: Hotspot[];
  analytics: DashboardAnalytics | null;
  alerts: LiveAlert[];
  activeTab: InsightTab;
  onTabChange: (tab: InsightTab) => void;
  onSelectHotspot: (hotspot: Hotspot) => void;
  onZoomRiver: (river: string) => void;
  onDismissAlerts: () => void;
  onOpenComplaint: (complaint: LiveAlert['complaint']) => void;
};

const TABS: { id: InsightTab; label: string }[] = [
  { id: 'hotspots', label: 'Top hotspots' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'alerts', label: 'Alerts' },
];

export default function InsightsPanel({
  hotspots,
  analytics,
  alerts,
  activeTab,
  onTabChange,
  onSelectHotspot,
  onZoomRiver,
  onDismissAlerts,
  onOpenComplaint,
}: InsightsPanelProps) {
  const highPriority = hotspots.filter((hotspot) => hotspot.classification === 'high' && hotspot.pending_count > 0);
  const [showAll, setShowAll] = useState(false);
  const topHotspots = hotspots.slice(0, 10);

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div role="tablist" className="grid grid-cols-3 border-b border-slate-200 bg-slate-50/70 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`relative rounded-lg px-2 py-2 text-xs font-medium transition ${
              activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {tab.label}
            {tab.id === 'alerts' && (alerts.length > 0 || highPriority.length > 0) && (
              <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] text-white">
                {alerts.length + highPriority.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="max-h-[560px] overflow-y-auto p-5">
        {activeTab === 'hotspots' && (
          <div>
            <p className="mb-3 text-xs text-slate-500">Ranked by complaint count in each grid cell.</p>
            {topHotspots.length === 0 && <p className="text-sm text-slate-500">No hotspots for these filters.</p>}
            <ol className="space-y-2">
              {topHotspots.map((hotspot, index) => (
                <li key={hotspot.hotspot_id}>
                  <button
                    type="button"
                    onClick={() => onSelectHotspot(hotspot)}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:border-teal-300 hover:bg-teal-50/40"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-700">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{hotspot.top_district}</p>
                      <p className="truncate text-xs text-slate-500">{categoryLabel(hotspot.top_category)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-900">{hotspot.complaint_count}</p>
                      <span className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${CLASSIFICATION_STYLES[hotspot.classification].badge}`}>
                        {CLASSIFICATION_STYLES[hotspot.classification].label}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {!analytics && <p className="text-sm text-slate-500">Analytics are not available yet.</p>}
            {analytics && (
              <>
                <BarSection title="Most polluted rivers" subtitle="Click a river to zoom the map to it">
                  {analytics.rivers.map((river) => (
                    <BarRow
                      key={river.river_name}
                      label={river.river_name}
                      value={river.complaints}
                      max={analytics.rivers[0]?.complaints ?? 1}
                      color="bg-teal-600"
                      meta={`${river.unresolved} open`}
                      onClick={() => onZoomRiver(river.river_name)}
                      icon
                    />
                  ))}
                </BarSection>

                <BarSection title="Pollution categories">
                  {analytics.categories.map((item) => (
                    <BarRow
                      key={item.category}
                      label={categoryLabel(item.category)}
                      value={item.complaints}
                      max={analytics.categories[0]?.complaints ?? 1}
                      color="bg-sky-600"
                    />
                  ))}
                </BarSection>

                <MonthlyTrend analytics={analytics} />

                <BarSection title="Unresolved complaints by district">
                  {analytics.unresolved_by_district.map((item) => (
                    <BarRow
                      key={item.district}
                      label={item.district}
                      value={item.unresolved}
                      max={analytics.unresolved_by_district[0]?.unresolved ?? 1}
                      color="bg-amber-500"
                    />
                  ))}
                </BarSection>
              </>
            )}
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-900">High-priority hotspots</p>
              </div>
              {highPriority.length === 0 && <p className="text-sm text-slate-500">No high-priority hotspots with open complaints.</p>}
              <ul className="space-y-2">
                {(showAll ? highPriority : highPriority.slice(0, 5)).map((hotspot) => (
                  <li key={hotspot.hotspot_id}>
                    <button
                      type="button"
                      onClick={() => onSelectHotspot(hotspot)}
                      className="flex w-full items-start gap-3 rounded-xl bg-red-50 px-3 py-2.5 text-left ring-1 ring-inset ring-red-600/15 transition hover:bg-red-100/70"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-red-900">
                          {hotspot.complaint_count} complaints, {hotspot.pending_count} open
                        </p>
                        <p className="truncate text-xs text-red-800/80">
                          {hotspot.top_district} · {categoryLabel(hotspot.top_category)}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              {highPriority.length > 5 && (
                <button type="button" onClick={() => setShowAll((value) => !value)} className="mt-2 text-xs font-medium text-teal-700 hover:text-teal-900">
                  {showAll ? 'Show fewer' : `Show all ${highPriority.length}`}
                </button>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                  <BellRing className="h-4 w-4 text-teal-700" /> New complaints
                </p>
                {alerts.length > 0 && (
                  <button type="button" onClick={onDismissAlerts} className="text-xs font-medium text-slate-500 hover:text-slate-900">
                    Clear
                  </button>
                )}
              </div>
              {alerts.length === 0 && <p className="text-sm text-slate-500">New complaints will appear here in real time.</p>}
              <ul className="space-y-2">
                {alerts.map((alert) => (
                  <li key={alert.key}>
                    <button
                      type="button"
                      onClick={() => onOpenComplaint(alert.complaint)}
                      className="flex w-full items-center gap-3 rounded-xl border border-slate-200 px-3 py-2.5 text-left transition hover:bg-slate-50"
                    >
                      <Crosshair className="h-4 w-4 shrink-0 text-blue-600" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {categoryLabel(alert.complaint.category)} on {alert.complaint.river_name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {alert.complaint.address} · {formatDateTime(alert.complaint.created_at)}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function BarSection({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      <div className="mt-3 space-y-2.5">{children}</div>
    </div>
  );
}

function BarRow({
  label,
  value,
  max,
  color,
  meta,
  onClick,
  icon,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  meta?: string;
  onClick?: () => void;
  icon?: boolean;
}) {
  const width = max > 0 ? Math.max(4, (value / max) * 100) : 0;
  const content = (
    <>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex min-w-0 items-center gap-1.5 truncate font-medium text-slate-700">
          {icon && <Crosshair className="h-3 w-3 shrink-0 text-teal-700" />}
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 text-slate-500">
          <span className="font-semibold text-slate-900">{formatCount(value)}</span>
          {meta && <span className="ml-1.5">{meta}</span>}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${width}%` }} />
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full rounded-lg text-left transition hover:bg-slate-50">
        {content}
      </button>
    );
  }
  return <div>{content}</div>;
}

function MonthlyTrend({ analytics }: { analytics: DashboardAnalytics }) {
  const peak = Math.max(1, ...analytics.monthly.map((month) => month.complaints));
  return (
    <div>
      <p className="text-sm font-semibold text-slate-900">Monthly trend</p>
      <p className="text-xs text-slate-500">Complaints per month, last 12 months</p>
      {analytics.monthly.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No complaints in the last 12 months.</p>
      ) : (
        <div className="mt-4 flex h-32 items-end gap-1.5">
          {analytics.monthly.map((month) => (
            <div key={month.month} className="group flex h-full flex-1 flex-col justify-end">
              <div
                title={`${monthLabel(month.month)}: ${month.complaints} complaints`}
                className="w-full rounded-t-md bg-gradient-to-t from-teal-700 to-teal-400 transition group-hover:from-teal-800"
                style={{ height: `${Math.max(6, (month.complaints / peak) * 100)}%` }}
              />
              <span className="mt-1 truncate text-center text-[10px] text-slate-500">{monthLabel(month.month)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
