import React from 'react';

/** Tooltip Recharts: đọc từ payload gốc (tránh stacked Bar báo 0). */
export function HeatmapTimelineTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;

  const fmt = (v, digits = 1) =>
    v == null || Number.isNaN(Number(v)) ? '—' : Number(v).toFixed(digits);

  return (
    <div className="rounded-lg border border-zinc-600 bg-zinc-800 px-3 py-2 text-xs text-zinc-100 shadow-lg">
      {label ? <p className="mb-1.5 font-medium text-zinc-300">{label}</p> : null}
      <p>
        <span className="text-violet-300">●</span> {row.sensorLabel}: <strong>{row.sensorPts}</strong>
      </p>
      <p>
        <span className="text-emerald-400">●</span> {row.crowdLabel}: <strong>{row.crowdPts}</strong>
      </p>
      <p className="mt-1 border-t border-zinc-600 pt-1 text-zinc-400">
        {row.waterLabel}: <strong className="text-amber-200">{fmt(row.sensorAvg)}</strong> cm
      </p>
      {(row.sensorTemp != null || row.sensorHum != null) && (
        <p className="text-zinc-400">
          DHT22:{' '}
          {row.sensorTemp != null ? (
            <strong className="text-sky-300">{fmt(row.sensorTemp, 1)} °C</strong>
          ) : (
            '—'
          )}
          {row.sensorHum != null ? (
            <>
              {' · '}
              <strong className="text-cyan-300">{fmt(row.sensorHum, 0)} %</strong>
            </>
          ) : null}
        </p>
      )}
    </div>
  );
}
