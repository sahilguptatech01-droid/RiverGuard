import { supabase } from '@/lib/supabase';
import type {
  Boundary,
  Complaint,
  DashboardAnalytics,
  DashboardFilters,
  FilterOptions,
  Hotspot,
  HotspotSettings,
} from '@/lib/types';

type RpcFilterArgs = {
  p_date_from: string | null;
  p_date_to: string | null;
  p_categories: string[] | null;
  p_statuses: string[] | null;
  p_district: string | null;
  p_river: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toRpcFilterArgs(filters: DashboardFilters): RpcFilterArgs {
  const dateFrom = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
  const dateTo = filters.dateTo ? new Date(`${filters.dateTo}T00:00:00`) : null;
  return {
    p_date_from: dateFrom ? dateFrom.toISOString() : null,
    p_date_to: dateTo ? new Date(dateTo.getTime() + DAY_MS).toISOString() : null,
    p_categories: filters.categories.length ? filters.categories : null,
    p_statuses: filters.statuses.length ? filters.statuses : null,
    p_district: filters.district || null,
    p_river: filters.river || null,
  };
}

async function callRpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    throw new Error(error.message);
  }
  return data as T;
}

async function callRpcList<T>(fn: string, args: Record<string, unknown>): Promise<T[]> {
  const data = await callRpc<unknown>(fn, args);
  if (!Array.isArray(data)) {
    throw new Error(`Unexpected response from ${fn}.`);
  }
  return data as T[];
}

export function fetchHotspots(filters: DashboardFilters): Promise<Hotspot[]> {
  return callRpcList<Hotspot>('get_hotspots', toRpcFilterArgs(filters));
}

export function fetchComplaintPoints(filters: DashboardFilters): Promise<Complaint[]> {
  return callRpcList<Complaint>('get_complaint_points', toRpcFilterArgs(filters));
}

export function fetchHotspotComplaints(
  hotspot: Pick<Hotspot, 'cell_x' | 'cell_y'>,
  filters: DashboardFilters,
): Promise<Complaint[]> {
  return callRpcList<Complaint>('get_hotspot_complaints', {
    p_cell_x: hotspot.cell_x,
    p_cell_y: hotspot.cell_y,
    ...toRpcFilterArgs(filters),
  });
}

export async function fetchDashboardAnalytics(filters: DashboardFilters): Promise<DashboardAnalytics | null> {
  return callRpc<DashboardAnalytics | null>('get_dashboard_analytics', toRpcFilterArgs(filters));
}

export async function fetchFilterOptions(): Promise<FilterOptions> {
  const data = await callRpc<FilterOptions | null>('get_filter_options', {});
  return data ?? { districts: [], rivers: [] };
}

export function fetchBoundaries(): Promise<Boundary[]> {
  return callRpcList<Boundary>('get_boundaries', {});
}

export async function fetchHotspotSettings(): Promise<HotspotSettings | null> {
  const { data, error } = await supabase
    .from('hotspot_settings')
    .select('high_min, medium_min, low_min, grid_size_m')
    .eq('id', 1)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  return data as HotspotSettings | null;
}

export async function saveHotspotSettings(settings: HotspotSettings, userId: string): Promise<void> {
  const { error } = await supabase
    .from('hotspot_settings')
    .update({ ...settings, updated_at: new Date().toISOString(), updated_by: userId })
    .eq('id', 1);
  if (error) {
    throw new Error(error.message);
  }
}

export async function updateComplaintStatus(id: string, status: Complaint['status']): Promise<void> {
  const { error } = await supabase.from('complaints').update({ status }).eq('id', id);
  if (error) {
    throw new Error(error.message);
  }
}

export type NewComplaintInput = {
  category: Complaint['category'];
  river_name: string;
  address: string;
  district: string;
  state: string;
  description: string;
  latitude: number;
  longitude: number;
};

export async function createComplaint(input: NewComplaintInput): Promise<void> {
  const { error } = await supabase.from('complaints').insert(input);
  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchMyComplaints(): Promise<Complaint[]> {
  const { data, error } = await supabase
    .from('complaints')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as Complaint[];
}
