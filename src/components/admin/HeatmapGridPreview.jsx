import React, { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MapContainer, TileLayer, CircleMarker, Popup, Rectangle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const HCM_CENTER = [10.8231, 106.6297];

function MapFit({ latLngs, bbox }) {
  const map = useMap();
  useEffect(() => {
    if (latLngs.length > 0) {
      map.fitBounds(L.latLngBounds(latLngs), { padding: [28, 28], maxZoom: 15 });
      return;
    }
    if (bbox) {
      map.fitBounds(
        [
          [bbox.minLat, bbox.minLng],
          [bbox.maxLat, bbox.maxLng],
        ],
        { padding: [16, 16], maxZoom: 13 }
      );
    }
  }, [map, latLngs, bbox]);
  return null;
}

function PopupBody({ title, rows }) {
  return (
    <div className="min-w-[200px] text-sm text-zinc-800">
      {title ? <p className="mb-1.5 font-semibold text-zinc-900">{title}</p> : null}
      <dl className="space-y-1">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-zinc-600">{label}</dt>
            <dd className="text-right font-medium text-zinc-900">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Bản đồ OSM — mực nước / ngập (không phải nhiệt độ DHT22).
 * mode: "cells" = lưới cảm biến | "points" = cảm biến + báo cáo
 */
export function HeatmapGridPreview({
  cells = [],
  points = [],
  bbox,
  title,
  subtitle,
  emptyHint,
  mode = 'cells',
}) {
  const { t } = useTranslation();

  const { markers, latLngs, maxIntensity } = useMemo(() => {
    const list = [];
    const coords = [];
    let maxI = 0.001;

    if (mode === 'cells') {
      cells.forEach((c, i) => {
        const lng = Number(c.lng);
        const lat = Number(c.lat);
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
        const intensity = Number(c.intensity) || 0;
        maxI = Math.max(maxI, intensity);
        const ll = [lat, lng];
        coords.push(ll);
        list.push({
          key: `c-${i}`,
          ll,
          kind: 'cell',
          avgCm: intensity,
          maxCm: Number(c.max_intensity) || null,
          logCount: c.data_count != null ? Number(c.data_count) : null,
        });
      });
    } else {
      points.forEach((p, i) => {
        const lng = Number(p.lng);
        const lat = Number(p.lat);
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
        const wl = p.water_level != null ? Number(p.water_level) : null;
        if (wl != null) maxI = Math.max(maxI, wl);
        const ll = [lat, lng];
        coords.push(ll);
        const isSensor = p.source === 'sensor';
        list.push({
          key: `p-${i}`,
          ll,
          kind: isSensor ? 'sensor' : 'crowd',
          waterCm: wl,
          status: p.status,
        });
      });
    }

    return { markers: list, latLngs: coords, maxIntensity: maxI };
  }, [cells, points, mode]);

  const fmtCm = (v) =>
    v == null || Number.isNaN(v) ? t('heatmap.popupNoValue') : `${Number(v).toFixed(1)} cm`;

  const coordRow = (ll) => ({
    label: t('heatmap.popupCoords'),
    value: `${ll[0].toFixed(5)}°, ${ll[1].toFixed(5)}°`,
  });

  const hasData = markers.length > 0;
  const bboxRect =
    bbox &&
    [
      [bbox.minLat, bbox.minLng],
      [bbox.maxLat, bbox.maxLng],
    ];

  return (
    <div>
      {title ? <h3 className="text-sm font-medium text-zinc-200">{title}</h3> : null}
      {subtitle ? <p className="mt-1 text-xs leading-relaxed text-zinc-500">{subtitle}</p> : null}
      <div className="relative mt-2 overflow-hidden rounded-lg border border-zinc-600">
        <MapContainer
          center={latLngs[0] ?? HCM_CENTER}
          zoom={12}
          className="z-0 h-[280px] w-full"
          scrollWheelZoom
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {bboxRect ? (
            <Rectangle bounds={bboxRect} pathOptions={{ color: '#a78bfa', weight: 1, dashArray: '4 4', fillOpacity: 0 }} />
          ) : null}
          {markers.map((m) => {
            const tScale = ((m.avgCm ?? m.waterCm) || 0) / maxIntensity;
            const scale = Number.isFinite(tScale) ? tScale : 0;

            if (m.kind === 'cell') {
              const rows = [
                { label: t('heatmap.popupAvgWater'), value: fmtCm(m.avgCm) },
                ...(m.maxCm != null && m.maxCm > 0
                  ? [{ label: t('heatmap.popupMaxWater'), value: fmtCm(m.maxCm) }]
                  : []),
                ...(m.logCount != null
                  ? [{ label: t('heatmap.popupLogCount'), value: String(m.logCount) }]
                  : []),
                coordRow(m.ll),
              ];
              return (
                <CircleMarker
                  key={m.key}
                  center={m.ll}
                  radius={10 + scale * 14}
                  pathOptions={{
                    color: '#fecaca',
                    fillColor: '#ef4444',
                    fillOpacity: 0.35 + scale * 0.55,
                    weight: 1,
                  }}
                >
                  <Popup>
                    <PopupBody title={t('heatmap.popupCellTitle')} rows={rows} />
                  </Popup>
                </CircleMarker>
              );
            }

            const sensor = m.kind === 'sensor';
            const rows = [
              {
                label: t('heatmap.popupSource'),
                value: sensor ? t('heatmap.popupSourceSensor') : t('heatmap.popupSourceCrowd'),
              },
              { label: t('heatmap.popupWaterEst'), value: fmtCm(m.waterCm) },
              ...(m.status ? [{ label: t('heatmap.popupStatus'), value: m.status }] : []),
              coordRow(m.ll),
            ];
            if (!sensor) {
              rows.splice(2, 0, {
                label: t('heatmap.popupCrowdNote'),
                value: t('heatmap.popupCrowdNoteVal'),
              });
            }

            return (
              <CircleMarker
                key={m.key}
                center={m.ll}
                radius={sensor ? 8 : 6}
                pathOptions={{
                  color: sensor ? '#c4b5fd' : '#86efac',
                  fillColor: sensor ? '#8b5cf6' : '#22c55e',
                  fillOpacity: 0.65,
                  weight: 1,
                }}
              >
                <Popup>
                  <PopupBody
                    title={sensor ? t('heatmap.popupPointSensor') : t('heatmap.popupPointCrowd')}
                    rows={rows}
                  />
                </Popup>
              </CircleMarker>
            );
          })}
          <MapFit latLngs={latLngs} bbox={bbox} />
        </MapContainer>
        {!hasData && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center bg-zinc-900/70 px-4 text-center text-xs text-zinc-400">
            {emptyHint}
          </p>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-zinc-600">{t('heatmap.mapLegendHint')}</p>
    </div>
  );
}
