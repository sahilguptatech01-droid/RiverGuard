import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  fetchBoundaries,
  fetchComplaintPoints,
  fetchDashboardAnalytics,
  fetchFilterOptions,
  fetchHotspots,
  fetchHotspotSettings,
  saveHotspotSettings,
} from '@/lib/hotspotApi';
import { errorMessage } from '@/lib/pollution';
import type {
  Boundary,
  Complaint,
  DashboardAnalytics,
  DashboardFilters,
  FilterOptions,
  Hotspot,
  HotspotSettings,
} from '@/lib/types';

export type LiveAlert = { key: string; complaint: Complaint; receivedAt: number };

export type LiveStatus = 'connecting' | 'live' | 'offline';

const REFRESH_DEBOUNCE_MS = 400;
const MAX_ALERTS = 20;

export function useGovData(filters: DashboardFilters, userId: string) {
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [points, setPoints] = useState<Complaint[]>([]);
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null);
  const [options, setOptions] = useState<FilterOptions>({ districts: [], rivers: [] });
  const [boundaries, setBoundaries] = useState<Boundary[]>([]);
  const [settings, setSettings] = useState<HotspotSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<LiveAlert[]>([]);
  const [liveStatus, setLiveStatus] = useState<LiveStatus>('connecting');

  const requestRef = useRef(0);

  const loadDashboard = useCallback(async () => {
    const requestId = ++requestRef.current;
    setLoading(true);
    try {
      const [nextHotspots, nextPoints, nextAnalytics] = await Promise.all([
        fetchHotspots(filters),
        fetchComplaintPoints(filters),
        fetchDashboardAnalytics(filters),
      ]);
      if (requestId !== requestRef.current) return;
      setHotspots(nextHotspots);
      setPoints(nextPoints);
      setAnalytics(nextAnalytics);
      setError(null);
    } catch (caught) {
      if (requestId !== requestRef.current) return;
      setError(errorMessage(caught, 'Could not load hotspot data.'));
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [filters]);

  const loadOptions = useCallback(async () => {
    try {
      setOptions(await fetchFilterOptions());
    } catch {
      setOptions({ districts: [], rivers: [] });
    }
  }, []);

  const loadDashboardRef = useRef(loadDashboard);
  useEffect(() => {
    loadDashboardRef.current = loadDashboard;
  }, [loadDashboard]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    loadOptions();
    fetchBoundaries()
      .then(setBoundaries)
      .catch(() => setBoundaries([]));
    fetchHotspotSettings()
      .then(setSettings)
      .catch(() => setSettings(null));
  }, [loadOptions]);

  useEffect(() => {
    let refreshTimer: number | undefined;

    const scheduleRefresh = () => {
      window.clearTimeout(refreshTimer);
      refreshTimer = window.setTimeout(() => {
        loadDashboardRef.current();
        loadOptions();
      }, REFRESH_DEBOUNCE_MS);
    };

    const channel = supabase
      .channel('government-complaints-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'complaints' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const complaint = payload.new as Complaint;
            setAlerts((prev) =>
              [{ key: complaint.id, complaint, receivedAt: Date.now() }, ...prev].slice(0, MAX_ALERTS),
            );
          }
          scheduleRefresh();
        },
      )
.subscribe((status, err) => {
  console.log('[RiverGuard Realtime]', status, err ?? '');

  if (status === 'SUBSCRIBED') {
    setLiveStatus('live');
  } else if (
    status === 'CHANNEL_ERROR' ||
    status === 'TIMED_OUT' ||
    status === 'CLOSED'
  ) {
    setLiveStatus('offline');
  } else {
    setLiveStatus('connecting');
  }
});

    return () => {
      window.clearTimeout(refreshTimer);
      supabase.removeChannel(channel);
    };
  }, [loadOptions]);

  const saveSettings = useCallback(
    async (next: HotspotSettings) => {
      await saveHotspotSettings(next, userId);
      setSettings(next);
      await loadDashboardRef.current();
    },
    [userId],
  );

  const dismissAlerts = useCallback(() => setAlerts([]), []);

  return {
    hotspots,
    points,
    analytics,
    options,
    boundaries,
    settings,
    loading,
    error,
    alerts,
    liveStatus,
    reload: loadDashboard,
    saveSettings,
    dismissAlerts,
  };
}
