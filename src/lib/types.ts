export type Category =
  | 'industrial_discharge'
  | 'sewage'
  | 'plastic_waste'
  | 'oil_spill'
  | 'chemical'
  | 'other';

export type ComplaintStatus = 'pending' | 'in_progress' | 'resolved';

export type AppRole = 'citizen' | 'official' | 'super_admin';

export type Classification = 'high' | 'medium' | 'low';

export type MapMode = 'markers' | 'clusters' | 'heatmap';

export type Complaint = {
  id: string;
  user_id: string;
  category: Category;
  status: ComplaintStatus;
  river_name: string;
  address: string;
  district: string;
  state: string;
  description: string;
  latitude: number;
  longitude: number;
  created_at: string;
  updated_at: string;
};

export type Hotspot = {
  hotspot_id: string;
  cell_x: number;
  cell_y: number;
  classification: Classification;
  complaint_count: number;
  pending_count: number;
  resolved_count: number;
  top_category: Category;
  top_district: string;
  rivers: string[];
  latest_reported_at: string;
  center_lat: number;
  center_lng: number;
  grid_size_m: number;
};

export type HotspotSettings = {
  high_min: number;
  medium_min: number;
  low_min: number;
  grid_size_m: number;
};

export type DashboardFilters = {
  dateFrom: string;
  dateTo: string;
  categories: Category[];
  statuses: ComplaintStatus[];
  district: string;
  river: string;
};

export type FilterOptions = {
  districts: string[];
  rivers: string[];
};

export type Boundary = {
  boundary_id: string;
  boundary_level: 'state' | 'district';
  boundary_name: string;
  boundary_state: string | null;
  geojson: string;
};

export type DashboardAnalytics = {
  totals: { total: number; pending: number; resolved: number; districts: number };
  rivers: { river_name: string; complaints: number; unresolved: number }[];
  categories: { category: Category; complaints: number }[];
  monthly: { month: string; complaints: number; resolved: number }[];
  unresolved_by_district: { district: string; unresolved: number }[];
};
