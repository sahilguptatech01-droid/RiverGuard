import { useState, type FormEvent } from 'react';
import { CheckCircle2, Crosshair, Loader2, Send } from 'lucide-react';
import { createComplaint } from '@/lib/hotspotApi';
import { CATEGORY_OPTIONS, errorMessage } from '@/lib/pollution';
import type { Category } from '@/lib/types';

type FormState = {
  category: Category;
  river_name: string;
  address: string;
  district: string;
  state: string;
  description: string;
  latitude: string;
  longitude: string;
};

const EMPTY_FORM: FormState = {
  category: 'sewage',
  river_name: '',
  address: '',
  district: '',
  state: '',
  description: '',
  latitude: '',
  longitude: '',
};

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20';

type ReportComplaintFormProps = {
  onSubmitted: () => void;
};

export default function ReportComplaintForm({ onSubmitted }: ReportComplaintFormProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const update = (field: keyof FormState) => (value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Your browser does not support location access. Enter coordinates manually.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
        }));
        setLocating(false);
      },
      () => {
        setError('Location access was denied. Enter the GPS coordinates manually.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);
    if (!form.latitude || !form.longitude || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setError('Please provide valid GPS coordinates.');
      return;
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      setError('GPS coordinates are out of range.');
      return;
    }

    setSubmitting(true);
    try {
      await createComplaint({
        category: form.category,
        river_name: form.river_name.trim(),
        address: form.address.trim(),
        district: form.district.trim(),
        state: form.state.trim(),
        description: form.description.trim(),
        latitude,
        longitude,
      });
      setForm(EMPTY_FORM);
      setSuccess(true);
      onSubmitted();
    } catch (caught) {
      setError(errorMessage(caught, 'Your complaint could not be submitted. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="category" className="mb-1.5 block text-sm font-medium text-slate-700">Pollution type</label>
          <select id="category" className={inputClass} value={form.category} onChange={(e) => update('category')(e.target.value)}>
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="river" className="mb-1.5 block text-sm font-medium text-slate-700">River name</label>
          <input id="river" className={inputClass} maxLength={120} required value={form.river_name} onChange={(e) => update('river_name')(e.target.value)} />
        </div>
      </div>

      <div>
        <label htmlFor="address" className="mb-1.5 block text-sm font-medium text-slate-700">Nearest address or landmark</label>
        <input id="address" className={inputClass} maxLength={300} required value={form.address} onChange={(e) => update('address')(e.target.value)} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="district" className="mb-1.5 block text-sm font-medium text-slate-700">District</label>
          <input id="district" className={inputClass} maxLength={120} required value={form.district} onChange={(e) => update('district')(e.target.value)} />
        </div>
        <div>
          <label htmlFor="state" className="mb-1.5 block text-sm font-medium text-slate-700">State</label>
          <input id="state" className={inputClass} maxLength={120} required value={form.state} onChange={(e) => update('state')(e.target.value)} />
        </div>
      </div>

      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-700">GPS location</p>
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-teal-800 ring-1 ring-teal-700/20 transition hover:bg-teal-50 disabled:opacity-60"
          >
            {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
            Use my location
          </button>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <input aria-label="Latitude" placeholder="Latitude" inputMode="decimal" className={inputClass} value={form.latitude} onChange={(e) => update('latitude')(e.target.value)} />
          <input aria-label="Longitude" placeholder="Longitude" inputMode="decimal" className={inputClass} value={form.longitude} onChange={(e) => update('longitude')(e.target.value)} />
        </div>
      </div>

      <div>
        <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-slate-700">Describe what you see</label>
        <textarea id="description" rows={4} maxLength={2000} className={inputClass} value={form.description} onChange={(e) => update('description')(e.target.value)} />
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-3 text-sm text-red-700 ring-1 ring-red-600/20">{error}</p>}
      {success && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800 ring-1 ring-emerald-600/20">
          <CheckCircle2 className="h-4 w-4" /> Thank you. Your complaint has been submitted.
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-60 sm:w-auto"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Submit complaint
      </button>
    </form>
  );
}
