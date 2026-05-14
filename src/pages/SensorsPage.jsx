import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getSensorsList,
  updateSensor,
  updateSensorThresholds,
  createSensor,
  deleteSensor,
  calibrateSensor,
  getSensorForecast,
} from '../services/api';
import {
  Menu,
  MenuTrigger,
  MenuPanel,
  MenuItem,
} from '../components/ui/Menu';
import { Label } from '../components/ui/Label';
import { Modal } from '../components/ui/Modal';
import { Switch } from '../components/ui/Switch';
import { Dialog } from '../components/ui/Dialog';
import { useToast } from '../components/ui/Toast';

function EditConfigModal({ open, onClose, sensor, onSave }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(
    sensor
      ? {
          lng: sensor.lng ?? '',
          lat: sensor.lat ?? '',
          installation_height: sensor.installation_height ?? 150,
          warning_threshold: sensor.warning_threshold ?? 10,
          danger_threshold: sensor.danger_threshold ?? 30,
        }
      : { lng: '', lat: '', installation_height: 150, warning_threshold: 10, danger_threshold: 30 }
  );

  useEffect(() => {
    if (sensor) {
      setForm({
        lng: sensor.lng ?? '',
        lat: sensor.lat ?? '',
        installation_height: sensor.installation_height ?? 150,
        warning_threshold: sensor.warning_threshold ?? 10,
        danger_threshold: sensor.danger_threshold ?? 30,
      });
    }
  }, [sensor]);

  if (!sensor) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave?.(sensor.sensor_id, form);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={t('sensors.modalEditTitle', { name: sensor.location_name })}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">{t('sensors.coordsLabel')}</label>
          <div className="flex gap-2">
            <input
              type="number"
              step="any"
              value={form.lng}
              onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
              className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
              placeholder={t('sensors.phLng')}
            />
            <input
              type="number"
              step="any"
              value={form.lat}
              onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
              className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
              placeholder={t('sensors.phLat')}
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">{t('sensors.installHeight')}</label>
          <input
            type="number"
            value={form.installation_height}
            onChange={(e) => setForm((f) => ({ ...f, installation_height: Number(e.target.value) }))}
            className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">{t('sensors.warnThreshold')}</label>
          <input
            type="number"
            value={form.warning_threshold}
            onChange={(e) => setForm((f) => ({ ...f, warning_threshold: Number(e.target.value) }))}
            className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">{t('sensors.dangerThreshold')}</label>
          <input
            type="number"
            value={form.danger_threshold}
            onChange={(e) => setForm((f) => ({ ...f, danger_threshold: Number(e.target.value) }))}
            className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-dashboard-border bg-dashboard-surface px-4 py-2 text-sm text-zinc-200 hover:bg-white/10">
            {t('common.cancel')}
          </button>
          <button type="submit" className="rounded-xl bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-700">
            {t('common.save')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/** A3 — Dự báo ngắn hạn theo sensor (GET /api/v1/forecast/sensor/:id). */
function ForecastSensorModal({ sensor, open, onClose }) {
  const { t } = useTranslation();
  const [horizon, setHorizon] = useState(60);
  const [sampleMinutes, setSampleMinutes] = useState(90);
  const [loading, setLoading] = useState(false);
  const [forecast, setForecast] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) {
      setForecast(null);
      setErr('');
    }
  }, [open]);

  const run = async () => {
    if (!sensor) return;
    setLoading(true);
    setErr('');
    const res = await getSensorForecast(sensor.sensor_id, {
      horizon,
      sample_minutes: sampleMinutes,
    });
    setLoading(false);
    if (res.success && res.data) {
      setForecast(res.data);
    } else {
      setForecast(null);
      setErr(res.error || t('sensors.errForecast'));
    }
  };

  if (!sensor) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('sensors.forecastTitle', { id: sensor.sensor_id })}
      description={t('sensors.forecastDesc')}
    >
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-zinc-400">
            {t('sensors.horizonMin')}
            <input
              type="number"
              min={15}
              max={120}
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-dashboard-border bg-dashboard-surface px-2 py-1.5 text-sm text-zinc-100"
            />
          </label>
          <label className="text-xs text-zinc-400">
            {t('sensors.sampleMinutes')}
            <input
              type="number"
              min={15}
              max={1440}
              value={sampleMinutes}
              onChange={(e) => setSampleMinutes(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-dashboard-border bg-dashboard-surface px-2 py-1.5 text-sm text-zinc-100"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="w-full rounded-lg bg-violet-600 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
        >
          {loading ? t('sensors.computing') : t('sensors.loadForecast')}
        </button>
        {err && <p className="text-sm text-red-300">{err}</p>}
        {forecast && (
          <div className="rounded-lg border border-dashboard-border bg-dashboard-surface p-3 text-xs text-zinc-300 space-y-1 font-mono">
            <p>{t('sensors.fcCurrent', { v: forecast.current_water_level_cm ?? '—' })}</p>
            <p>{t('sensors.fcVelocity', { v: forecast.velocity_cm_per_hour ?? '—' })}</p>
            <p>{t('sensors.fcPredicted', { v: forecast.predicted_water_level_cm ?? '—' })}</p>
            <p>{t('sensors.fcConfidence', { v: forecast.confidence ?? '—' })}</p>
            <p>{t('sensors.fcSamples', { v: forecast.sample_count ?? '—' })}</p>
            <p>{t('sensors.fcToWarn', { v: forecast.estimated_minutes_to_warning ?? '—' })}</p>
            <p>{t('sensors.fcToDanger', { v: forecast.estimated_minutes_to_danger ?? '—' })}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}

const initialCreateForm = {
  sensor_id: '',
  location_name: '',
  lng: '',
  lat: '',
  installation_height: 150,
  hardware_type: 'ESP32',
  model: 'HC-SR04',
  installation_date: new Date().toISOString().slice(0, 10),
  warning_threshold: 10,
  danger_threshold: 30,
};

function CreateSensorModal({ open, onClose, onSuccess }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [form, setForm] = useState(initialCreateForm);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const lng = Number(form.lng);
    const lat = Number(form.lat);
    const height = Number(form.installation_height);
    if (!form.sensor_id?.trim() || !form.location_name?.trim() || Number.isNaN(lng) || Number.isNaN(lat) || Number.isNaN(height)) {
      toast(t('sensors.errCreateFields'), 'error');
      return;
    }
    if (form.warning_threshold >= form.danger_threshold) {
      toast(t('sensors.errThresholdOrder'), 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await createSensor({
        sensor_id: form.sensor_id.trim(),
        location_name: form.location_name.trim(),
        lng,
        lat,
        installation_height: height,
        hardware_type: form.hardware_type || undefined,
        model: form.model || undefined,
        installation_date: form.installation_date || undefined,
        warning_threshold: Number(form.warning_threshold),
        danger_threshold: Number(form.danger_threshold),
      });
      if (res?.success) {
        onSuccess?.();
        setForm(initialCreateForm);
        onClose();
      } else {
        toast(res?.error || res?.message || t('sensors.errCreateFailed'), 'error');
      }
    } catch (err) {
      toast(err.response?.data?.error || err.response?.data?.message || err.message || t('sensors.errConnection'), 'error');
    }
    setLoading(false);
  };

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title={t('sensors.createTitle')}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">{t('sensors.labelSensorId')}</label>
          <input type="text" value={form.sensor_id} onChange={(e) => setForm((f) => ({ ...f, sensor_id: e.target.value }))} className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500" placeholder={t('sensors.phSensorExample')} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">{t('sensors.labelLocationName')}</label>
          <input type="text" value={form.location_name} onChange={(e) => setForm((f) => ({ ...f, location_name: e.target.value }))} className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500" placeholder={t('sensors.phLocation')} required />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-zinc-300">{t('sensors.lng')}</label>
            <input type="number" step="any" value={form.lng} onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))} className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500" placeholder="106.72" required />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-zinc-300">{t('sensors.lat')}</label>
            <input type="number" step="any" value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))} className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500" placeholder="10.80" required />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">{t('sensors.installHeight')} *</label>
          <input type="number" value={form.installation_height} onChange={(e) => setForm((f) => ({ ...f, installation_height: Number(e.target.value) }))} className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">{t('sensors.warnThreshold')}</label>
            <input type="number" value={form.warning_threshold} onChange={(e) => setForm((f) => ({ ...f, warning_threshold: Number(e.target.value) }))} className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">{t('sensors.dangerThreshold')}</label>
            <input type="number" value={form.danger_threshold} onChange={(e) => setForm((f) => ({ ...f, danger_threshold: Number(e.target.value) }))} className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-zinc-300">{t('sensors.hardware')}</label>
            <input type="text" value={form.hardware_type} onChange={(e) => setForm((f) => ({ ...f, hardware_type: e.target.value }))} className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500" placeholder="ESP32" />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-zinc-300">{t('sensors.model')}</label>
            <input type="text" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500" placeholder="HC-SR04" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">{t('sensors.installDate')}</label>
          <input type="date" value={form.installation_date} onChange={(e) => setForm((f) => ({ ...f, installation_date: e.target.value }))} className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-dashboard-border bg-dashboard-surface px-4 py-2 text-sm text-zinc-200 hover:bg-white/10">{t('common.cancel')}</button>
          <button type="submit" disabled={loading} className="rounded-xl bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-700 disabled:opacity-50">{loading ? t('sensors.creating') : t('sensors.createSubmit')}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function SensorsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState(null);
  const [maintenance, setMaintenance] = useState({});
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [forecastSensor, setForecastSensor] = useState(null);

  const loadSensors = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await getSensorsList({});
      if (res.success && Array.isArray(res.data)) {
        setSensors(res.data);
      } else {
        setSensors([]);
        if (res.error) {
          setLoadError(res.error);
          toast(res.error, 'error');
        }
      }
    } catch (_err) {
      setSensors([]);
      setLoadError(t('sensors.errLoadList'));
      toast(t('sensors.errLoadList'), 'error');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSensors();
  }, []);

  const handleEditConfig = async (sensorId, payload) => {
    try {
      await updateSensor(sensorId, {
        location_name: sensors.find((s) => s.sensor_id === sensorId)?.location_name,
        lng: Number(payload.lng),
        lat: Number(payload.lat),
        installation_height: Number(payload.installation_height),
      });
      const tr = await updateSensorThresholds(sensorId, {
        warning_threshold: Number(payload.warning_threshold),
        danger_threshold: Number(payload.danger_threshold),
        updated_by: 'admin',
      });
      if (tr?.success !== false) {
        toast(t('sensors.msgConfigUpdated'), 'success');
        setEditModal(null);
        loadSensors();
      } else {
        toast(tr?.error || t('sensors.msgUpdateFailed'), 'error');
      }
    } catch (err) {
      toast(err.response?.data?.error || err.message || t('sensors.errConnection'), 'error');
    }
  };

  const [calibratingId, setCalibratingId] = useState(null);

  const handleCalibrate = async (sensorId) => {
    setCalibratingId(sensorId);
    try {
      const res = await calibrateSensor(sensorId);
      setCalibratingId(null);
      if (res?.success) {
        toast(res.message || t('sensors.msgCalibrateOk'), 'success');
        loadSensors();
      } else {
        toast(res?.error || res?.message || t('sensors.msgCalibrateFail'), 'error');
      }
    } catch (err) {
      setCalibratingId(null);
      toast(
        err.response?.data?.error || err.response?.data?.message || err.message || t('sensors.errConnection'),
        'error'
      );
    }
  };

  const handleMaintenanceMode = (sensorId, checked) => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[SensorsPage] maintenance', sensorId, checked);
    }
    setMaintenance((m) => ({ ...m, [sensorId]: checked }));
  };

  const handleCreateSuccess = () => {
    toast(t('sensors.msgAdded'), 'success');
    loadSensors();
  };

  const handleDeleteSensor = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await deleteSensor(deleteConfirm.sensor_id);
      if (res?.success) {
        toast(res.message || t('sensors.msgDeleted'), 'success');
        setDeleteConfirm(null);
        loadSensors();
      } else {
        toast(res?.error || res?.message || t('sensors.msgDeleteFail'), 'error');
      }
    } catch (err) {
      toast(err.response?.data?.error || err.message || t('sensors.errConnection'), 'error');
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-100">{t('sensors.title')}</h1>
        <button type="button" onClick={() => setCreateModalOpen(true)} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
          {t('sensors.addStation')}
        </button>
      </div>
      {loadError && (
        <div className="mb-4 rounded-lg bg-amber-500/20 border border-amber-500/40 px-4 py-3 text-sm text-amber-200">
          <p className="font-medium">{t('sensors.loadErrorTitle')}</p>
          <button type="button" onClick={loadSensors} className="mt-2 text-amber-300 underline hover:no-underline">
            {t('sensors.retryLoad')}
          </button>
        </div>
      )}
      {loading ? (
        <p className="text-zinc-400">{t('common.loading')}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-dashboard-border bg-dashboard-card">
          {sensors.length === 0 && !loadError ? (
            <div className="px-6 py-8 text-center text-zinc-400">
              <p>{t('sensors.emptyTitle')}</p>
              <p className="mt-1 text-sm">{t('sensors.emptyHint')}</p>
            </div>
          ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-dashboard-border bg-dashboard-surface text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">{t('sensors.colSensorId')}</th>
                <th className="px-4 py-3 font-medium">{t('sensors.colLocation')}</th>
                <th className="px-4 py-3 font-medium">{t('sensors.colCoords')}</th>
                <th className="px-4 py-3 font-medium">{t('sensors.colHeight')}</th>
                <th className="px-4 py-3 font-medium">{t('sensors.colThresholds')}</th>
                <th className="px-4 py-3 font-medium">{t('sensors.colMaintenance')}</th>
                <th className="px-4 py-3 font-medium text-right">{t('sensors.colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {sensors.map((s) => {
                const lng = s.lng ?? s.coords?.lng;
                const lat = s.lat ?? s.coords?.lat;
                const maint = maintenance[s.sensor_id] ?? false;
                return (
                  <tr key={s.sensor_id} className="border-b border-dashboard-border last:border-0 hover:bg-white/5">
                    <td className="px-4 py-2 font-medium text-zinc-200">{s.sensor_id}</td>
                    <td className="px-4 py-2 text-zinc-300">{s.location_name}</td>
                    <td className="px-4 py-2 text-zinc-300">{lng != null && lat != null ? `${lng}, ${lat}` : '—'}</td>
                    <td className="px-4 py-2 text-zinc-300">{s.installation_height ?? '—'}</td>
                    <td className="px-4 py-2 text-zinc-300">
                      {s.warning_threshold != null && s.danger_threshold != null ? `${s.warning_threshold} / ${s.danger_threshold}` : '—'}
                    </td>
                    <td className="px-4 py-2">
                      <Label className="flex cursor-pointer items-center gap-x-3">
                        <Switch checked={maint} onCheckedChange={(checked) => handleMaintenanceMode(s.sensor_id, checked)} />
                        <span className="text-zinc-300">{t('sensors.maintenanceLabel')}</span>
                      </Label>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Menu>
                        <MenuTrigger
                          render={
                            <button type="button" className="rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-1.5 text-sm text-zinc-200 hover:bg-white/10">
                              {t('sensors.actionsMenu')}
                            </button>
                          }
                        />
                        <MenuPanel className="w-56" align="end" sideOffset={4}>
                          <MenuItem onSelect={() => setEditModal(s)}>
                            {t('sensors.actionEditConfig')}
                          </MenuItem>
                          <MenuItem onSelect={() => setForecastSensor(s)}>{t('sensors.actionForecast')}</MenuItem>
                          <MenuItem onSelect={() => handleCalibrate(s.sensor_id)} disabled={calibratingId === s.sensor_id}>
                            {calibratingId === s.sensor_id ? t('sensors.actionCalibrating') : t('sensors.actionCalibrate')}
                          </MenuItem>
                          <MenuItem variant="destructive" onSelect={() => setDeleteConfirm(s)}>
                            {t('sensors.actionDelete')}
                          </MenuItem>
                        </MenuPanel>
                      </Menu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
        </div>
      )}
      <EditConfigModal open={!!editModal} onClose={() => setEditModal(null)} sensor={editModal} onSave={handleEditConfig} />
      <CreateSensorModal open={createModalOpen} onClose={() => setCreateModalOpen(false)} onSuccess={handleCreateSuccess} />
      <ForecastSensorModal
        sensor={forecastSensor}
        open={!!forecastSensor}
        onClose={() => setForecastSensor(null)}
      />
      <Dialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteSensor}
        title={t('sensors.deleteTitle')}
        description={deleteConfirm ? t('sensors.deleteDesc', { name: deleteConfirm.location_name, id: deleteConfirm.sensor_id }) : null}
        confirmLabel={t('sensors.deleteConfirm')}
        variant="destructive"
      />
    </div>
  );
}
