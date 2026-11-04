import { useState } from 'react';
import { CheckCircle2, MapPin } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import {
  categoryLabel,
  formatCoordinates,
  formatDateTime,
  STATUS_STYLES,
  STATUS_OPTIONS,
  errorMessage,
} from '@/lib/pollution';
import { updateComplaintStatus } from '@/lib/hotspotApi';
import type { Complaint, ComplaintStatus } from '@/lib/types';

type ComplaintDetailModalProps = {
  complaint: Complaint;
  canUpdateStatus: boolean;
  onStatusChanged?: (id: string, status: ComplaintStatus) => void;
  onClose: () => void;
};

export default function ComplaintDetailModal({
  complaint,
  canUpdateStatus,
  onStatusChanged,
  onClose,
}: ComplaintDetailModalProps) {
  const [status, setStatus] = useState<ComplaintStatus>(complaint.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleStatusSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateComplaintStatus(complaint.id, status);
      setSaved(true);
      onStatusChanged?.(complaint.id, status);
    } catch (caught) {
      setError(errorMessage(caught, 'Could not update the status.'));
    } finally {
      setSaving(false);
    }
  };

  const rows: [string, string][] = [
    ['Category', categoryLabel(complaint.category)],
    ['River', complaint.river_name],
    ['Address', complaint.address],
    ['District / State', `${complaint.district}, ${complaint.state}`],
    ['GPS coordinates', formatCoordinates(complaint.latitude, complaint.longitude)],
    ['Reported', formatDateTime(complaint.created_at)],
    ['Last updated', formatDateTime(complaint.updated_at)],
  ];

  return (
    <Modal
      title={`Complaint ${complaint.id.slice(0, 8).toUpperCase()}`}
      onClose={onClose}
      widthClass="max-w-xl"
    >
      <div className="space-y-5">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_STYLES[complaint.status].badge}`}
          >
            {STATUS_STYLES[complaint.status].label}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="h-3.5 w-3.5" />
            {complaint.district}
          </span>
        </div>

        <dl className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {rows.map(([label, value]) => (
            <div key={label} className="grid grid-cols-3 gap-3 px-4 py-3 text-sm">
              <dt className="text-slate-500">{label}</dt>
              <dd className="col-span-2 break-words font-medium text-slate-900">{value}</dd>
            </div>
          ))}
        </dl>

        {complaint.description && (
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700">Description</p>
            <p className="whitespace-pre-line rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
              {complaint.description}
            </p>
          </div>
        )}

        {canUpdateStatus && (
          <div className="rounded-xl border border-slate-200 p-4">
            <label htmlFor="complaint-status" className="mb-1.5 block text-sm font-medium text-slate-700">
              Update status
            </label>
            <div className="flex gap-2">
              <select
                id="complaint-status"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as ComplaintStatus);
                  setSaved(false);
                }}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleStatusSave}
                disabled={saving || status === complaint.status}
                className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
            {saved && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Status saved.
              </p>
            )}
            {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
          </div>
        )}
      </div>
    </Modal>
  );
}
