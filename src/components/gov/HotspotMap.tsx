import { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import 'leaflet.markercluster';

import {
  CLASSIFICATION_STYLES,
  MARKER_COLOR,
  categoryLabel,
} from '@/lib/pollution';

import type {
  Boundary,
  Complaint,
  Hotspot,
  MapMode,
} from '@/lib/types';

export type MapFocus = {
  key: number;
  points: [number, number][];
} | null;

type HotspotMapProps = {
  points: Complaint[];
  hotspots: Hotspot[];
  boundaries: Boundary[];
  mode: MapMode;
  selectedHotspotId: string | null;
  focus: MapFocus;
  onSelectHotspot: (hotspot: Hotspot) => void;
  onSelectComplaint: (complaint: Complaint) => void;
};

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

type LayerSet = {
  cluster: L.MarkerClusterGroup;
  plain: L.LayerGroup;
  hotspots: L.LayerGroup;
  boundaries: L.LayerGroup;
  heat: L.LayerGroup;
};

function hotspotRadius(count: number): number {
  return Math.min(36, Math.max(10, 8 + Math.sqrt(count) * 3));
}

function validCoordinates(
  latitude: number,
  longitude: number,
): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

export default function HotspotMap({
  points,
  hotspots,
  boundaries,
  mode,
  selectedHotspotId,
  focus,
  onSelectHotspot,
  onSelectComplaint,
}: HotspotMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<LayerSet | null>(null);

  const handlersRef = useRef({
    onSelectHotspot,
    onSelectComplaint,
  });

  // Keep click handlers up to date without recreating the map.
  useEffect(() => {
    handlersRef.current = {
      onSelectHotspot,
      onSelectComplaint,
    };
  }, [onSelectHotspot, onSelectComplaint]);

  // Initialize the map once.
  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    // const map = L.map(container, {
    //   zoomControl: false,
    //   worldCopyJump: true,
    // }).setView([20.5, 78.9], 5);
    // Approximate geographic bounds of Asia

// India and neighbouring countries map bounds
const indiaRegionBounds = L.latLngBounds(
  L.latLng(4, 65),   // Southwest
  L.latLng(38, 100)  // Northeast
);

const map = L.map(container, {
  zoomControl: false,
  minZoom: 4,
  maxZoom: 18,
  maxBounds: indiaRegionBounds,
  maxBoundsViscosity: 1.0,
  worldCopyJump: false,
}).setView([23.5, 82.0], 5);

    L.control
      .zoom({ position: 'bottomright' })
      .addTo(map);

    L.tileLayer(TILE_URL, {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 50,
      iconCreateFunction: (group) =>
        L.divIcon({
          className: '',
          html: `<div class="rg-cluster">${group.getChildCount()}</div>`,
          iconSize: [40, 40],
        }),
    });

    mapRef.current = map;

    layersRef.current = {
      cluster,
      plain: L.layerGroup(),
      hotspots: L.layerGroup(),
      boundaries: L.layerGroup(),
      heat: L.layerGroup(),
    };

    // Leaflet sometimes needs this after its container becomes visible.
    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      window.clearTimeout(resizeTimer);
      map.remove();

      mapRef.current = null;
      layersRef.current = null;
    };
  }, []);

  // Draw complaints and hotspots.
  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;

    if (!map || !layers) return;

    map.removeLayer(layers.cluster);
    map.removeLayer(layers.plain);
    map.removeLayer(layers.hotspots);
    map.removeLayer(layers.heat);

    layers.cluster.clearLayers();
    layers.plain.clearLayers();
    layers.hotspots.clearLayers();
    layers.heat.clearLayers();

    const validPoints = points.filter((complaint) =>
      validCoordinates(
        complaint.latitude,
        complaint.longitude,
      ),
    );

    const pointIcon = L.divIcon({
      className: 'rg-point',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
    });

    const markers = validPoints.map((complaint) =>
      L.marker(
        [complaint.latitude, complaint.longitude],
        {
          icon: pointIcon,
          title: categoryLabel(complaint.category),
        },
      ).on('click', () => {
        handlersRef.current.onSelectComplaint(complaint);
      }),
    );

    if (mode === 'clusters') {
      layers.cluster.addLayers(markers);
      map.addLayer(layers.cluster);
    } else if (mode === 'markers') {
      markers.forEach((marker) => {
        layers.plain.addLayer(marker);
      });

      map.addLayer(layers.plain);
    } else {
      // Heatmap fallback: overlapping translucent circles.
      // This does not require the leaflet.heat plugin.
      validPoints.forEach((complaint) => {
        L.circle(
          [complaint.latitude, complaint.longitude],
          {
            radius: 500,
            color: '#f97316',
            weight: 0,
            fillColor: '#ef4444',
            fillOpacity: 0.16,
            interactive: false,
          },
        ).addTo(layers.heat);
      });

      // Add a smaller center circle for each complaint.
      validPoints.forEach((complaint) => {
        L.circleMarker(
          [complaint.latitude, complaint.longitude],
          {
            radius: 4,
            color: '#b91c1c',
            weight: 1,
            fillColor: '#ef4444',
            fillOpacity: 0.65,
            interactive: false,
          },
        ).addTo(layers.heat);
      });

      map.addLayer(layers.heat);

      // Draw hotspot circles above the heat layer.
      hotspots.forEach((hotspot) => {
        if (
          !validCoordinates(
            hotspot.center_lat,
            hotspot.center_lng,
          )
        ) {
          return;
        }

        const style =
          CLASSIFICATION_STYLES[hotspot.classification];

        const selected =
          hotspot.hotspot_id === selectedHotspotId;

        L.circleMarker(
          [hotspot.center_lat, hotspot.center_lng],
          {
            radius: hotspotRadius(hotspot.complaint_count),
            color: selected ? '#0f172a' : '#ffffff',
            weight: selected ? 3 : 1.5,
            fillColor: style.color,
            fillOpacity: style.opacity,
          },
        )
          .bindTooltip(
            `${style.label} hotspot: ${hotspot.complaint_count} complaints`,
          )
          .on('click', () => {
            handlersRef.current.onSelectHotspot(hotspot);
          })
          .addTo(layers.hotspots);
      });

      map.addLayer(layers.hotspots);
    }
  }, [points, hotspots, mode, selectedHotspotId]);

  // Draw administrative boundaries.
  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;

    if (!map || !layers) return;

    layers.boundaries.clearLayers();

    boundaries.forEach((boundary) => {
      try {
        const geometry = JSON.parse(boundary.geojson);

        const isState =
          boundary.boundary_level === 'state';

        L.geoJSON(
          {
            type: 'Feature',
            properties: {
              name: boundary.boundary_name,
            },
            geometry,
          } as GeoJSON.Feature,
          {
            interactive: false,
            style: {
              color: isState ? '#334155' : '#64748b',
              weight: isState ? 2 : 1,
              dashArray: isState ? undefined : '4 4',
              fillOpacity: 0,
            },
          },
        ).addTo(layers.boundaries);
      } catch (error) {
        console.warn(
          'Could not draw boundary:',
          boundary.boundary_name,
          error,
        );
      }
    });

    map.addLayer(layers.boundaries);
  }, [boundaries]);

  // Move the map to a selected complaint or hotspot.
  useEffect(() => {
    const map = mapRef.current;

    if (!map || !focus || focus.points.length === 0) {
      return;
    }

    const validFocusPoints = focus.points.filter(
      ([latitude, longitude]) =>
        validCoordinates(latitude, longitude),
    );

    if (validFocusPoints.length === 0) return;

    if (validFocusPoints.length === 1) {
      map.flyTo(validFocusPoints[0], 14, {
        duration: 0.8,
      });
    } else {
      map.flyToBounds(
        L.latLngBounds(validFocusPoints),
        {
          padding: [48, 48],
          maxZoom: 14,
          duration: 0.8,
        },
      );
    }
  }, [focus]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="h-full w-full"
      />

      {points.length === 0 && (
        <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center">
          <p className="rounded-xl bg-white/95 px-5 py-3 text-sm text-slate-600 shadow-md ring-1 ring-slate-900/5">
            No complaints match the current filters.
          </p>
        </div>
      )}

      <MapLegend mode={mode} />
    </div>
  );
}

function MapLegend({ mode }: { mode: MapMode }) {
  const items = [
    {
      color: CLASSIFICATION_STYLES.high.color,
      label: 'High hotspot (20+)',
    },
    {
      color: CLASSIFICATION_STYLES.medium.color,
      label: 'Medium hotspot (10-19)',
    },
    {
      color: CLASSIFICATION_STYLES.low.color,
      label: 'Low hotspot (1-9)',
    },
    {
      color: MARKER_COLOR,
      label: 'Complaint',
    },
  ];

  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-[400] hidden rounded-xl bg-white/95 p-3 text-xs text-slate-700 shadow-md ring-1 ring-slate-900/5 sm:block">
      <p className="mb-2 font-semibold text-slate-900">
        Legend
      </p>

      <ul className="space-y-1.5">
        {items.map((item) => (
          <li
            key={item.label}
            className="flex items-center gap-2"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                backgroundColor: item.color,
              }}
            />
            {item.label}
          </li>
        ))}
      </ul>

      {mode === 'heatmap' && (
        <p className="mt-2 text-slate-500">
          Red circles show complaint locations and overlapping density.
        </p>
      )}
    </div>
  );
}