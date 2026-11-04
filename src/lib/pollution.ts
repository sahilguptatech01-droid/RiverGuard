import type { Category, Classification, ComplaintStatus, DashboardFilters } from '@/lib/types';

export const CATEGORY_OPTIONS: { value: Category; label: string }[] = [
  { value: 'industrial_discharge', label: 'Industrial discharge' },
  { value: 'sewage', label: 'Sewage' },
  { value: 'plastic_waste', label: 'Plastic waste' },
  { value: 'oil_spill', label: 'Oil spill' },
  { value: 'chemical', label: 'Chemical contamination' },
  { value: 'other', label: 'Other' },
];

export const STATUS_OPTIONS: { value: ComplaintStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
];

export const CLASSIFICATION_STYLES: Record<
  Classification,
  { label: string; color: string; badge: string; opacity: number }
> = {
  high: { label: 'High', color: '#dc2626', badge: 'bg-red-50 text-red-700 ring-red-600/20', opacity: 0.5 },
  medium: { label: 'Medium', color: '#ca8a04', badge: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20', opacity: 0.38 },
  low: { label: 'Low', color: '#16a34a', badge: 'bg-green-50 text-green-700 ring-green-600/20', opacity: 0.28 },
};

export const STATUS_STYLES: Record<ComplaintStatus, { label: string; badge: string }> = {
  pending: { label: 'Pending', badge: 'bg-amber-50 text-amber-800 ring-amber-600/20' },
  in_progress: { label: 'In progress', badge: 'bg-sky-50 text-sky-800 ring-sky-600/20' },
  resolved: { label: 'Resolved', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
};

export const MARKER_COLOR = '#2563eb';

export const EMPTY_FILTERS: DashboardFilters = {
  dateFrom: '',
  dateTo: '',
  categories: [],
  statuses: [],
  district: '',
  river: '',
};

export function categoryLabel(value: string): string {
  return CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function statusLabel(value: string): string {
  return STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

export function formatCount(value: number): string {
  return value.toLocaleString();
}

export function monthLabel(yyyyMm: string): string {
  const [year, month] = yyyyMm.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
