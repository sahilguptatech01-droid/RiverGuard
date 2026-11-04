import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { errorMessage } from '@/lib/pollution';
import type { HotspotSettings } from '@/lib/types';

type ThresholdSettingsModalProps = {
  settings: HotspotSettings;
  onSave: (next: HotspotSettings) => Promise<void>;
  onClose: () => void;
};

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20';

export default function ThresholdSettingsModal({ settings, onSave, onClose }: ThresholdSettingsModalProps) {
  const [values, setValues] = useState({
    high_min: String(settings.high_min),
    medium_min: String(settings.medium_min),
    low_min: String(settings.low_min),
    grid_size_m: String(settings.grid_size_m),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next: HotspotSettings = {
      high_min: Number(values.high_min),
      medium_min: Number(values.medium_min),
      low_min: Number(values.low_min),
      grid_size_m: Number(values.grid_size_m),
    };
    const integers = Object.values(next).every((value) => Number.isInteger(value));
    if (!integers) {
      setError('All values must be whole numbers.');
      return;
    }
    if (next.low_min < 1 || next.medium_min <= next.low_min || next.high_min <= next.medium_min) {
      setError('Thresholds must be ordered: low is at least 1, medium is above low, and high is above medium.');
      return;
    }
    if (next.grid_size_m < 100 || next.grid_size_m > 10000) {
      setError('Grid cell size must be between 100 and 10,000 metres.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(next);
      onClose();
    } catch (caught) {
      setError(errorMessage(caught, 'Could not save the settings.'));
    } finally {
      setSaving(false);
    }
  };

  const fields: { key: keyof typeof values; label: string; hint: string }[] = [
    { key: 'high_min', label: 'High hotspot from', hint: 'Complaints in a cell' },
    { key: 'medium_min', label: 'Medium hotspot from', hint: 'Complaints in a cell' },
    { key: 'low_min', label: 'Low hotspot from', hint: 'Complaints in a cell' },
    { key: 'grid_size_m', label: 'Grid cell size (m)', hint: 'Area used to group complaints' },
  ];

  return (
    <Modal
      title="Hotspot thresholds"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            type="submit"
            form="threshold-form"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save thresholds
          </button>
        </div>
      }
    >
      <form id="threshold-form" onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm leading-relaxed text-slate-600">
          Changes apply to every official's map immediately. Each grid cell is classified by its complaint count.
        </p>
        <div className="grid grid-cols-2 gap-4">
          {fields.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">{field.label}</span>
              <input
                type="number"
                inputMode="numeric"
                className={inputClass}
                value={values[field.key]}
                onChange={(event) => setValues((prev) => ({ ...prev, [field.key]: event.target.value }))}
              />
              <span className="mt-1 block text-xs text-slate-500">{field.hint}</span>
            </label>
          ))}
        </div>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      </form>
    </Modal>
  );
}
