import { useEffect, useState } from 'react';
import { ChevronRight, Loader2, MapPin, X } from 'lucide-react';
import { fetchHotspotComplaints } from '@/lib/hotspotApi';
import {
  CLASSIFICATION_STYLES,
  categoryLabel,
  errorMessage,
  formatCoordinates,
  formatDateTime,
  STATUS_STYLES,
} from '@/lib/pollution';
import type { Complaint, DashboardFilters, Hotspot } from '@/lib/types';

type HotspotDetailPanelProps = {
  hotspot: Hotspot;
  filters: DashboardFilters;
  onClose: () => void;
  onViewComplaint: (complaint: Complaint) => void;
};

export default function HotspotDetailPanel({ hotspot, filters, onClose, onViewComplaint }: HotspotDetailPanelProps) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    fetchHotspotComplaints(hotspot, filters)
      .then((rows) => {
        if (active) setComplaints(rows);
      })
      .catch((caught) => {
        if (active) setError(errorMessage(caught, 'Could not load complaints for this hotspot.'));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hotspot, filters]);

  const style = CLASSIFICATION_STYLES[hotspot.classification];

  const stats: [string, string | number][] = [
    ['Total complaints', hotspot.complaint_count],
    ['Pending', hotspot.pending_count],
    ['Resolved', hotspot.resolved_count],
    ['Top category', categoryLabel(hotspot.top_category)],
  ];

  return (
    <aside className="absolute inset-x-3 bottom-3 z-[450] flex max-h-[70%] flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5 sm:inset-x-auto sm:bottom-auto sm:right-3 sm:top-16 sm:max-h-[calc(100%-5rem)] sm:w-96 animate-[slide-up_200ms_ease-out]">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style.badge}`}>
              {style.label} hotspot
            </span>
          </div>
          <p className="mt-1.5 font-mono text-sm font-semibold text-slate-900">{hotspot.hotspot_id}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close hotspot details" className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4 overflow-y-auto px-5 py-4">
        <div className="flex items-start gap-2 text-sm text-slate-700">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
          <div>
            <p className="font-medium text-slate-900">{hotspot.top_district}</p>
            <p className="text-xs text-slate-500">{formatCoordinates(hotspot.center_lat, hotspot.center_lng)}</p>
            <p className="mt-1 text-xs text-slate-500">Rivers: {hotspot.rivers.join(', ')}</p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-3">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 px-3 py-2.5">
              <dt className="text-xs text-slate-500">{label}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>

        <p className="text-xs text-slate-500">
          Latest report: <span className="font-medium text-slate-700">{formatDateTime(hotspot.latest_reported_at)}</span>
        </p>

        <div>
          <p className="mb-2 text-sm font-semibold text-slate-900">Complaints in this area</p>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-teal-700" />}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            {complaints.map((complaint) => (
              <li key={complaint.id}>
                <button
                  type="button"
                  onClick={() => onViewComplaint(complaint)}
                  className="group flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">{complaint.address}</p>
                    <p className="truncate text-xs text-slate-500">
                      {categoryLabel(complaint.category)} · {formatDateTime(complaint.created_at)}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${STATUS_STYLES[complaint.status].badge}`}>
                    {STATUS_STYLES[complaint.status].label}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:translate-x-0.5" />
                </button>
              </li>
            ))}
            {!loading && !error && complaints.length === 0 && (
              <li className="px-3 py-4 text-center text-sm text-slate-500">No complaints match the filters.</li>
            )}
          </ul>
        </div>
      </div>
    </aside>
  );
}
