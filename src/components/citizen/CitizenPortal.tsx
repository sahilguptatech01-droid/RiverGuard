import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Loader2, RefreshCw, FilePlus2, ListChecks } from 'lucide-react';
import AppHeader from '@/components/AppHeader';
import ReportComplaintForm from '@/components/citizen/ReportComplaintForm';
import ComplaintDetailModal from '@/components/complaints/ComplaintDetailModal';
import { fetchMyComplaints } from '@/lib/hotspotApi';
import {
  categoryLabel,
  errorMessage,
  formatDate,
  STATUS_STYLES,
} from '@/lib/pollution';
import type { Complaint } from '@/lib/types';

type CitizenPortalProps = {
  userId: string;
  fullName: string;
  onSignOut: () => Promise<void>;
};

type Tab = 'report' | 'mine';

export default function CitizenPortal({ userId, fullName, onSignOut }: CitizenPortalProps) {
  const [tab, setTab] = useState<Tab>('report');
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Complaint | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setComplaints(await fetchMyComplaints());
    } catch (caught) {
      setError(errorMessage(caught, 'Could not load your complaints.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const tabs: { id: Tab; label: string; icon: typeof FilePlus2 }[] = [
    { id: 'report', label: 'Report pollution', icon: FilePlus2 },
    { id: 'mine', label: 'My complaints', icon: ListChecks },
  ];

  return (
    <div className="min-h-screen">
      <AppHeader
        subtitle="Citizen reporting"
        userLabel={fullName || userId}
        onSignOut={onSignOut}
      />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold leading-[1.2] text-slate-900">Protect your local river</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Report pollution with its location. Officials use these reports to map hotspots and prioritise clean-up.
          </p>
        </div>

        <div className="mb-6 inline-flex rounded-lg bg-slate-200/70 p-1">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
                tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'report' && <ReportComplaintForm onSubmitted={load} />}

        {tab === 'mine' && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <p className="text-sm font-medium text-slate-700">{complaints.length} complaint{complaints.length === 1 ? '' : 's'}</p>
              <button
                type="button"
                onClick={load}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-teal-700 hover:text-teal-900"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>

            {loading && complaints.length === 0 && (
              <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-teal-700" /></div>
            )}
            {error && <p role="alert" className="px-5 py-6 text-sm text-red-700">{error}</p>}
            {!loading && !error && complaints.length === 0 && (
              <p className="px-5 py-12 text-center text-sm text-slate-500">You have not submitted any complaints yet.</p>
            )}

            <ul className="divide-y divide-slate-100">
              {complaints.map((complaint) => (
                <li key={complaint.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(complaint)}
                    className="group flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {categoryLabel(complaint.category)} on {complaint.river_name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {complaint.address} · {formatDate(complaint.created_at)}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[complaint.status].badge}`}>
                      {STATUS_STYLES[complaint.status].label}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {selected && (
        <ComplaintDetailModal
          complaint={selected}
          canUpdateStatus={false}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
