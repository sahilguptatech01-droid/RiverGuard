import { useCallback, useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  CheckCircle2,
  CircleDot,
  Layers3,
  Loader2,
  Map as MapIcon,
  RefreshCw,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Waves,
} from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import ComplaintDetailModal from '@/components/complaints/ComplaintDetailModal';
import FilterPanel from '@/components/gov/FilterPanel';
import HotspotDetailPanel from '@/components/gov/HotspotDetailPanel';
import HotspotMap, { type MapFocus } from '@/components/gov/HotspotMap';
import InsightsPanel, { type InsightTab } from '@/components/gov/InsightsPanel';
import SummaryCards from '@/components/gov/SummaryCards';
import ThresholdSettingsModal from '@/components/gov/ThresholdSettingsModal';
import { useGovData } from '@/hooks/useGovData';
import { EMPTY_FILTERS } from '@/lib/pollution';
import type { AppRole, Complaint, ComplaintStatus, DashboardFilters, Hotspot, MapMode } from '@/lib/types';

type GovDashboardProps = {
  userId: string;
  fullName: string;
  role: AppRole;
  onSignOut: () => Promise<void>;
};

export default function GovDashboard({ userId, fullName, role, onSignOut }: GovDashboardProps) {
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);
  const [mapMode, setMapMode] = useState<MapMode>('heatmap');
  const [activeTab, setActiveTab] = useState<InsightTab>('hotspots');
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [showThresholds, setShowThresholds] = useState(false);
  const [focus, setFocus] = useState<MapFocus>(null);
  const [signOutBusy, setSignOutBusy] = useState(false);
  const isSuperAdmin = role === 'super_admin';
  const data = useGovData(filters, userId);

  const focusRiver = useCallback((river: string) => {
    const riverPoints = data.points
      .filter((point) => point.river_name === river)
      .map((point): [number, number] => [point.latitude, point.longitude]);
    if (riverPoints.length) {
      setFocus({ key: Date.now(), points: riverPoints });
    }
  }, [data.points]);

  const updateComplaintInView = useCallback((id: string, status: ComplaintStatus) => {
    setSelectedComplaint((current) => current?.id === id ? { ...current, status } : current);
    void data.reload();
  }, [data.reload]);

  const selectedHotspotId = selectedHotspot?.hotspot_id ?? null;
  const mapModeOptions: { value: MapMode; label: string }[] = [
    { value: 'heatmap', label: 'Heatmap' },
    { value: 'clusters', label: 'Clusters' },
    { value: 'markers', label: 'Markers' },
  ];

  const lastUpdated = useMemo(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), [data.loading, data.analytics]);

  const handleSignOut = async () => {
    setSignOutBusy(true);
    try {
      await onSignOut();
    } finally {
      setSignOutBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader
        subtitle="Government pollution monitoring"
        userLabel={fullName || (isSuperAdmin ? 'Super administrator' : 'Government official')}
        onSignOut={handleSignOut}
        actions={
          <span className={`hidden items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium sm:inline-flex ${data.liveStatus === 'live' ? 'bg-emerald-50 text-emerald-700' : data.liveStatus === 'offline' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${data.liveStatus === 'live' ? 'bg-emerald-500' : data.liveStatus === 'offline' ? 'bg-amber-500' : 'bg-slate-400'}`} />
            {data.liveStatus === 'live' ? 'Live updates' : data.liveStatus === 'offline' ? 'Live updates offline' : 'Connecting'}
          </span>
        }
      />

      <main className="mx-auto max-w-[1800px] space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
              <Waves className="h-4 w-4" /> RiverGuard intelligence
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Pollution monitoring dashboard</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">Monitor reported river pollution, identify geographic hotspots, and prioritize field investigations.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isSuperAdmin && (
              <button type="button" onClick={() => setShowThresholds(true)} disabled={!data.settings} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50">
                <Settings2 className="h-4 w-4" /> Hotspot settings
              </button>
            )}
            <button type="button" onClick={() => void data.reload()} disabled={data.loading} className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 disabled:opacity-60">
              <RefreshCw className={`h-4 w-4 ${data.loading ? 'animate-spin' : ''}`} /> Refresh data
            </button>
          </div>
        </div>

        {data.error && (
          <div role="alert" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div><p className="font-semibold">Some dashboard data could not be loaded</p><p className="mt-0.5">{data.error}</p><p className="mt-1 text-xs text-amber-800">Check that the Supabase migrations have been applied and that this account has an approved official role.</p></div>
          </div>
        )}

        <SummaryCards analytics={data.analytics} hotspots={data.hotspots} />

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-4">
            <FilterPanel filters={filters} options={data.options} onChange={(next) => { setFilters(next); setSelectedHotspot(null); }} />

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><MapIcon className="h-4 w-4 text-teal-700" /> River pollution map</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Select a hotspot or complaint marker to inspect its report.</p>
                </div>
                <div className="flex flex-wrap items-center gap-1 rounded-lg bg-slate-100 p-1" aria-label="Map display mode">
                  {mapModeOptions.map((option) => (
                    <button key={option.value} type="button" onClick={() => setMapMode(option.value)} aria-pressed={mapMode === option.value} className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${mapMode === option.value ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative h-[440px] sm:h-[560px]">
                {data.loading && data.points.length === 0 && (
                  <div className="absolute inset-0 z-[410] flex items-center justify-center bg-white/75"><Loader2 className="h-6 w-6 animate-spin text-teal-700" /></div>
                )}
                <HotspotMap
                  points={data.points}
                  hotspots={data.hotspots}
                  boundaries={data.boundaries}
                  mode={mapMode}
                  selectedHotspotId={selectedHotspotId}
                  focus={focus}
                  onSelectHotspot={setSelectedHotspot}
                  onSelectComplaint={setSelectedComplaint}
                />
                {selectedHotspot && (
                  <HotspotDetailPanel
                    hotspot={selectedHotspot}
                    filters={filters}
                    onClose={() => setSelectedHotspot(null)}
                    onViewComplaint={(complaint) => setSelectedComplaint(complaint)}
                  />
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 sm:px-5">
                <span className="inline-flex items-center gap-1.5"><Layers3 className="h-3.5 w-3.5" /> {data.points.length.toLocaleString()} mapped complaints · {data.hotspots.length.toLocaleString()} hotspot areas</span>
                <span>Updated {lastUpdated}</span>
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-teal-700" /><span className="text-sm font-semibold text-slate-800">{isSuperAdmin ? 'Super administrator' : 'Official workspace'}</span></div>
              <span className="rounded-full bg-teal-50 px-2 py-1 text-[11px] font-medium text-teal-800">Authorized</span>
            </div>
            <InsightsPanel
              hotspots={data.hotspots}
              analytics={data.analytics}
              alerts={data.alerts}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onSelectHotspot={(hotspot) => { setSelectedHotspot(hotspot); setMapMode('heatmap'); }}
              onZoomRiver={focusRiver}
              onDismissAlerts={data.dismissAlerts}
              onOpenComplaint={setSelectedComplaint}
            />
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2"><SlidersHorizontal className="h-4 w-4 text-slate-500" /><p className="text-sm font-semibold text-slate-900">Map guidance</p></div>
              <ul className="mt-3 space-y-2 text-xs leading-relaxed text-slate-600">
                <li className="flex gap-2"><CircleDot className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-700" /> Heatmap highlights concentrations of submitted reports.</li>
                <li className="flex gap-2"><Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-700" /> New complaint alerts appear when Supabase Realtime is connected.</li>
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-700" /> Hotspots represent report density, not verified water-quality measurements.</li>
              </ul>
            </div>
          </aside>
        </div>
      </main>

      {selectedComplaint && (
        <ComplaintDetailModal
          complaint={selectedComplaint}
          canUpdateStatus
          onStatusChanged={updateComplaintInView}
          onClose={() => setSelectedComplaint(null)}
        />
      )}
      {showThresholds && data.settings && (
        <ThresholdSettingsModal settings={data.settings} onSave={data.saveSettings} onClose={() => setShowThresholds(false)} />
      )}
      {signOutBusy && <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/20"><div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium shadow-xl"><Loader2 className="h-4 w-4 animate-spin" /> Signing out…</div></div>}
    </div>
  );
}
