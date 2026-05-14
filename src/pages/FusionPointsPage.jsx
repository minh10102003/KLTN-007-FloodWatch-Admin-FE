import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaArrowsRotate } from 'react-icons/fa6';
import { getFusionPoints } from '../services/api';
import { Table, TableBody, TableHead, TableRow, TableTh, TableTd } from '../components/ui/Table';
import { formatAdminDateTime } from '../utils/formatDateTime';
import { useToast } from '../components/ui/Toast';

const defaultBbox = {
  min_lng: '106.60',
  max_lng: '106.95',
  min_lat: '10.70',
  max_lat: '10.95',
};

const BBOX_KEYS = ['min_lng', 'max_lng', 'min_lat', 'max_lat'];

export default function FusionPointsPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const lng = i18n.language?.startsWith('en') ? 'en' : 'vi';
  const [bbox, setBbox] = useState(defaultBbox);
  const [crowdHours, setCrowdHours] = useState(72);
  const [sensorHours, setSensorHours] = useState(6);
  const [includeSensors, setIncludeSensors] = useState(true);
  const [sensors, setSensors] = useState([]);
  const [crowd, setCrowd] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await getFusionPoints({
      crowd_hours: crowdHours,
      sensor_hours: sensorHours,
      include_sensors: includeSensors,
      min_lng: bbox.min_lng,
      max_lng: bbox.max_lng,
      min_lat: bbox.min_lat,
      max_lat: bbox.max_lat,
    });
    setLoading(false);
    if (res.success && res.data) {
      setSensors(res.data.sensors || []);
      setCrowd(res.data.crowd || []);
      setMeta(res.meta || null);
    } else {
      setSensors([]);
      setCrowd([]);
      setMeta(null);
      toast(t('fusion.loadError'), 'error');
    }
  };

  const fusionParams = meta?.fusion_params;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">{t('fusion.title')}</h1>
        <p className="mt-1 text-sm text-zinc-500">{t('fusion.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 rounded-xl border border-dashboard-border bg-dashboard-card p-4 md:grid-cols-6">
        <label className="text-xs text-zinc-400 md:col-span-1">
          <span className="block text-zinc-300">{t('fusion.crowdHours')}</span>
          <input
            type="number"
            value={crowdHours}
            onChange={(e) => setCrowdHours(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-dashboard-border bg-dashboard-surface px-2 py-1.5 text-sm text-zinc-100"
          />
        </label>
        <label className="text-xs text-zinc-400 md:col-span-1">
          <span className="block text-zinc-300">{t('fusion.sensorHours')}</span>
          <input
            type="number"
            value={sensorHours}
            onChange={(e) => setSensorHours(Number(e.target.value))}
            className="mt-1 w-full rounded-lg border border-dashboard-border bg-dashboard-surface px-2 py-1.5 text-sm text-zinc-100"
          />
        </label>
        {BBOX_KEYS.map((k) => (
          <label key={k} className="text-xs text-zinc-400">
            <span className="block text-zinc-300">{t(`fusion.${k}`)}</span>
            <input
              value={bbox[k]}
              onChange={(e) => setBbox((b) => ({ ...b, [k]: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-dashboard-border bg-dashboard-surface px-2 py-1.5 text-sm text-zinc-100"
            />
          </label>
        ))}
        <label className="flex items-end gap-2 text-sm text-zinc-300 md:col-span-2">
          <input type="checkbox" checked={includeSensors} onChange={(e) => setIncludeSensors(e.target.checked)} />
          {t('fusion.includeSensors')}
        </label>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {loading ? t('common.loading') : t('fusion.loadFusion')}
        </button>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-dashboard-border px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"
        >
          <FaArrowsRotate /> {t('common.retry')}
        </button>
      </div>

      {fusionParams && (
        <p className="text-xs text-zinc-500">
          {t('fusion.fusionParamsHint', {
            rMaxM: fusionParams.rMaxM ?? '—',
            decayDistM: fusionParams.decayDistM ?? '—',
            disagreeScaleCm: fusionParams.disagreeScaleCm ?? '—',
          })}
        </p>
      )}

      <section className="overflow-hidden rounded-xl border border-dashboard-border bg-dashboard-card">
        <div className="border-b border-dashboard-border bg-dashboard-surface px-4 py-3">
          <h2 className="text-lg font-medium text-zinc-100">{t('fusion.crowdSection')}</h2>
          <p className="text-xs text-zinc-500">{t('common.pointCount', { count: crowd.length })}</p>
        </div>
        <Table colWidths={[8, 12, 12, 12, 14, 14, 18, 10]}>
          <TableHead>
            <TableRow className="hover:bg-transparent">
              <TableTh>#</TableTh>
              <TableTh>{t('fusion.colReport')}</TableTh>
              <TableTh>{t('fusion.colCoverage')}</TableTh>
              <TableTh>{t('fusion.colCrowdCm')}</TableTh>
              <TableTh>{t('fusion.colFusedCm')}</TableTh>
              <TableTh>{t('fusion.colNearestSensor')}</TableTh>
              <TableTh>{t('fusion.colWeights')}</TableTh>
              <TableTh>{t('fusion.colTime')}</TableTh>
            </TableRow>
          </TableHead>
          <TableBody>
            {crowd.map((c, i) => (
              <TableRow key={c.report_id ?? i}>
                <TableTd>{i + 1}</TableTd>
                <TableTd className="font-mono text-xs">#{c.report_id}</TableTd>
                <TableTd className="text-xs">{c.coverage}</TableTd>
                <TableTd>{c.crowd_only_cm}</TableTd>
                <TableTd>{c.fused_cm}</TableTd>
                <TableTd className="text-xs text-zinc-400">
                  {c.nearest_sensor
                    ? t('fusion.nearestSensorLine', {
                        id: c.nearest_sensor.sensor_id,
                        cm: c.nearest_sensor.water_level_cm,
                        m: c.nearest_sensor.distance_m,
                      })
                    : '—'}
                </TableTd>
                <TableTd className="text-xs">
                  {c.weights ? `${c.weights.sensor} / ${c.weights.crowd}` : '—'}
                </TableTd>
                <TableTd className="text-xs text-zinc-500">
                  {formatAdminDateTime(c.created_at, lng)}
                </TableTd>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {crowd.length === 0 && !loading && (
          <p className="p-4 text-center text-sm text-zinc-500">{t('fusion.emptyCrowd')}</p>
        )}
      </section>

      {includeSensors && (
        <section className="overflow-hidden rounded-xl border border-dashboard-border bg-dashboard-card">
          <div className="border-b border-dashboard-border bg-dashboard-surface px-4 py-3">
            <h2 className="text-lg font-medium text-zinc-100">{t('fusion.sensorSection')}</h2>
            <p className="text-xs text-zinc-500">{t('common.pointCount', { count: sensors.length })}</p>
          </div>
          <Table colWidths={[8, 22, 16, 16, 38]}>
            <TableHead>
              <TableRow className="hover:bg-transparent">
                <TableTh>#</TableTh>
                <TableTh>{t('fusion.colSensorCode')}</TableTh>
                <TableTh>{t('fusion.colWaterCm')}</TableTh>
                <TableTh>{t('fusion.colStatus')}</TableTh>
                <TableTh>{t('fusion.colLogTime')}</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {sensors.map((s, i) => (
                <TableRow key={s.sensor_id ?? i}>
                  <TableTd>{i + 1}</TableTd>
                  <TableTd className="font-mono text-sm">{s.sensor_id}</TableTd>
                  <TableTd>{s.water_level_sensor_only_cm ?? '—'}</TableTd>
                  <TableTd className="text-xs">{s.log_status || '—'}</TableTd>
                  <TableTd className="text-xs text-zinc-500">
                    {formatAdminDateTime(s.log_created_at, lng)}
                  </TableTd>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      )}
    </div>
  );
}
