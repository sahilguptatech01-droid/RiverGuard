import { Filter, RotateCcw } from 'lucide-react';
import { CATEGORY_OPTIONS, EMPTY_FILTERS, STATUS_OPTIONS } from '@/lib/pollution';
import type { Category, ComplaintStatus, DashboardFilters, FilterOptions } from '@/lib/types';

type FilterPanelProps = {
  filters: DashboardFilters;
  options: FilterOptions;
  onChange: (next: DashboardFilters) => void;
};

const selectClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20';

function toggle<T>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((value) => value !== item) : [...list, item];
}

export default function FilterPanel({ filters, options, onChange }: FilterPanelProps) {
  const activeCount =
    filters.categories.length +
    filters.statuses.length +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    (filters.district ? 1 : 0) +
    (filters.river ? 1 : 0);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Filter className="h-4 w-4 text-teal-700" /> Filters
          {activeCount > 0 && (
            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800">{activeCount}</span>
          )}
        </h2>
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTERS)}
          disabled={activeCount === 0}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-slate-900 disabled:opacity-40"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
      </div>

      <div className="space-y-4">
        <fieldset>
          <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Pollution category</legend>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORY_OPTIONS.map((option) => {
              const active = filters.categories.includes(option.value as Category);
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ ...filters, categories: toggle(filters.categories, option.value as Category) })}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition ${
                    active ? 'bg-teal-700 text-white ring-teal-700' : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Status</legend>
          <div className="flex flex-wrap gap-1.5">
            {STATUS_OPTIONS.map((option) => {
              const active = filters.statuses.includes(option.value as ComplaintStatus);
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ ...filters, statuses: toggle(filters.statuses, option.value as ComplaintStatus) })}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition ${
                    active ? 'bg-teal-700 text-white ring-teal-700' : 'bg-white text-slate-700 ring-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">From</span>
            <input
              type="date"
              value={filters.dateFrom}
              max={filters.dateTo || undefined}
              onChange={(event) => onChange({ ...filters, dateFrom: event.target.value })}
              className={selectClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">To</span>
            <input
              type="date"
              value={filters.dateTo}
              min={filters.dateFrom || undefined}
              onChange={(event) => onChange({ ...filters, dateTo: event.target.value })}
              className={selectClass}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">District</span>
          <select value={filters.district} onChange={(event) => onChange({ ...filters, district: event.target.value })} className={selectClass}>
            <option value="">All districts</option>
            {options.districts.map((district) => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-500">River</span>
          <select value={filters.river} onChange={(event) => onChange({ ...filters, river: event.target.value })} className={selectClass}>
            <option value="">All rivers</option>
            {options.rivers.map((river) => (
              <option key={river} value={river}>{river}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
