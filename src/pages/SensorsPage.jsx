import React, { useEffect, useState } from 'react';
import { getSensorsList, updateSensor, updateSensorThresholds, createSensor, deleteSensor, calibrateSensor } from '../services/api';
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

function EditConfigModal({ open, onClose, sensor, onSave }) {
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
    <Modal open={open} onClose={onClose} title={`Chỉnh sửa cấu hình: ${sensor.location_name}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">Tọa độ (lng, lat)</label>
          <div className="flex gap-2">
            <input
              type="number"
              step="any"
              value={form.lng}
              onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
              className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
              placeholder="Kinh độ"
            />
            <input
              type="number"
              step="any"
              value={form.lat}
              onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
              className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
              placeholder="Vĩ độ"
            />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">Độ cao lắp đặt (cm)</label>
          <input
            type="number"
            value={form.installation_height}
            onChange={(e) => setForm((f) => ({ ...f, installation_height: Number(e.target.value) }))}
            className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">Ngưỡng cảnh báo (cm)</label>
          <input
            type="number"
            value={form.warning_threshold}
            onChange={(e) => setForm((f) => ({ ...f, warning_threshold: Number(e.target.value) }))}
            className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">Ngưỡng nguy hiểm (cm)</label>
          <input
            type="number"
            value={form.danger_threshold}
            onChange={(e) => setForm((f) => ({ ...f, danger_threshold: Number(e.target.value) }))}
            className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-dashboard-border bg-dashboard-surface px-4 py-2 text-sm text-zinc-200 hover:bg-white/10">
            Hủy
          </button>
          <button type="submit" className="rounded-xl bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-700">
            Lưu
          </button>
        </div>
      </form>
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
  const [form, setForm] = useState(initialCreateForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const lng = Number(form.lng);
    const lat = Number(form.lat);
    const height = Number(form.installation_height);
    if (!form.sensor_id?.trim() || !form.location_name?.trim() || Number.isNaN(lng) || Number.isNaN(lat) || Number.isNaN(height)) {
      setError('Vui lòng điền đủ: Mã sensor, Tên vị trí, Kinh độ, Vĩ độ, Độ cao lắp đặt.');
      return;
    }
    if (form.warning_threshold >= form.danger_threshold) {
      setError('Ngưỡng cảnh báo phải nhỏ hơn ngưỡng nguy hiểm.');
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
        setError(res?.error || res?.message || 'Tạo trạm thất bại');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Lỗi kết nối');
    }
    setLoading(false);
  };

  if (!open) return null;
  return (
    <Modal open={open} onClose={onClose} title="Thêm trạm sensor">
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">Mã sensor *</label>
          <input type="text" value={form.sensor_id} onChange={(e) => setForm((f) => ({ ...f, sensor_id: e.target.value }))} className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500" placeholder="vd: S04" required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">Tên vị trí *</label>
          <input type="text" value={form.location_name} onChange={(e) => setForm((f) => ({ ...f, location_name: e.target.value }))} className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500" placeholder="Tên vị trí" required />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-zinc-300">Kinh độ *</label>
            <input type="number" step="any" value={form.lng} onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))} className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500" placeholder="106.72" required />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-zinc-300">Vĩ độ *</label>
            <input type="number" step="any" value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))} className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500" placeholder="10.80" required />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">Độ cao lắp đặt (cm) *</label>
          <input type="number" value={form.installation_height} onChange={(e) => setForm((f) => ({ ...f, installation_height: Number(e.target.value) }))} className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Ngưỡng cảnh báo (cm)</label>
            <input type="number" value={form.warning_threshold} onChange={(e) => setForm((f) => ({ ...f, warning_threshold: Number(e.target.value) }))} className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">Ngưỡng nguy hiểm (cm)</label>
            <input type="number" value={form.danger_threshold} onChange={(e) => setForm((f) => ({ ...f, danger_threshold: Number(e.target.value) }))} className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-zinc-300">Loại phần cứng</label>
            <input type="text" value={form.hardware_type} onChange={(e) => setForm((f) => ({ ...f, hardware_type: e.target.value }))} className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500" placeholder="ESP32" />
          </div>
          <div className="flex-1">
            <label className="mb-1 block text-sm font-medium text-zinc-300">Model</label>
            <input type="text" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500" placeholder="HC-SR04" />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-300">Ngày lắp đặt</label>
          <input type="date" value={form.installation_date} onChange={(e) => setForm((f) => ({ ...f, installation_date: e.target.value }))} className="w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100" />
        </div>
        {error && <p className="text-sm text-red-300">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-dashboard-border bg-dashboard-surface px-4 py-2 text-sm text-zinc-200 hover:bg-white/10">Hủy</button>
          <button type="submit" disabled={loading} className="rounded-xl bg-violet-600 px-4 py-2 text-sm text-white hover:bg-violet-700 disabled:opacity-50">{loading ? 'Đang tạo...' : 'Tạo trạm'}</button>
        </div>
      </form>
    </Modal>
  );
}

export default function SensorsPage() {
  const [sensors, setSensors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editModal, setEditModal] = useState(null);
  const [maintenance, setMaintenance] = useState({});
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [loadError, setLoadError] = useState('');

  const loadSensors = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await getSensorsList({});
      if (res.success && Array.isArray(res.data)) {
        setSensors(res.data);
      } else {
        setSensors([]);
        if (res.error) setLoadError(res.error);
      }
    } catch (_err) {
      setSensors([]);
      setLoadError(_err.response?.data?.error || _err.response?.data?.message || _err.message || 'Không thể tải danh sách sensor. Kiểm tra kết nối BE và VITE_API_BASE_URL.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSensors();
  }, []);

  const handleEditConfig = async (sensorId, payload) => {
    setMessage({ type: '', text: '' });
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
        setMessage({ type: 'success', text: 'Đã cập nhật cấu hình sensor.' });
        setEditModal(null);
        loadSensors();
      } else {
        setMessage({ type: 'error', text: tr?.error || 'Cập nhật thất bại' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message || 'Lỗi kết nối' });
    }
  };

  const [calibratingId, setCalibratingId] = useState(null);

  const handleCalibrate = async (sensorId) => {
    setMessage({ type: '', text: '' });
    setCalibratingId(sensorId);
    try {
      const res = await calibrateSensor(sensorId);
      setCalibratingId(null);
      if (res?.success) {
        setMessage({ type: 'success', text: res.message || 'Hiệu chuẩn sensor thành công.' });
        loadSensors();
      } else {
        setMessage({ type: 'error', text: res?.error || res?.message || 'Hiệu chuẩn thất bại' });
      }
    } catch (err) {
      setCalibratingId(null);
      setMessage({ type: 'error', text: err.response?.data?.error || err.response?.data?.message || err.message || 'Lỗi kết nối' });
    }
  };

  const handleMaintenanceMode = (sensorId, checked) => {
    console.log('[SensorsPage] Set Maintenance Mode', sensorId, checked);
    setMaintenance((m) => ({ ...m, [sensorId]: checked }));
  };

  const handleCreateSuccess = () => {
    setMessage({ type: 'success', text: 'Đã thêm trạm sensor.' });
    loadSensors();
  };

  const handleDeleteSensor = async () => {
    if (!deleteConfirm) return;
    setMessage({ type: '', text: '' });
    try {
      const res = await deleteSensor(deleteConfirm.sensor_id);
      if (res?.success) {
        setMessage({ type: 'success', text: res.message || 'Đã xóa sensor.' });
        setDeleteConfirm(null);
        loadSensors();
      } else {
        setMessage({ type: 'error', text: res?.error || res?.message || 'Xóa thất bại' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.error || err.message || 'Lỗi kết nối' });
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-zinc-100">Quản lý Sensors</h1>
        <button type="button" onClick={() => setCreateModalOpen(true)} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
          Thêm trạm
        </button>
      </div>
      {message.text && (
        <div className={`mb-4 rounded-lg px-4 py-2 text-sm ${message.type === 'success' ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-500/40' : 'bg-red-500/20 text-red-200 border border-red-500/40'}`}>
          {message.text}
        </div>
      )}
      {loadError && (
        <div className="mb-4 rounded-lg bg-amber-500/20 border border-amber-500/40 px-4 py-3 text-sm text-amber-200">
          <p className="font-medium">Lỗi tải danh sách</p>
          <p>{loadError}</p>
          <button type="button" onClick={loadSensors} className="mt-2 text-amber-300 underline hover:no-underline">
            Thử tải lại
          </button>
        </div>
      )}
      {loading ? (
        <p className="text-zinc-400">Đang tải...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-dashboard-border bg-dashboard-card">
          {sensors.length === 0 && !loadError ? (
            <div className="px-6 py-8 text-center text-zinc-400">
              <p>Chưa có sensor nào.</p>
              <p className="mt-1 text-sm">Bấm <strong className="text-zinc-200">Thêm trạm</strong> để tạo sensor mới.</p>
            </div>
          ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-dashboard-border bg-dashboard-surface text-zinc-400">
              <tr>
                <th className="px-4 py-3 font-medium">Mã sensor</th>
                <th className="px-4 py-3 font-medium">Vị trí</th>
                <th className="px-4 py-3 font-medium">Tọa độ</th>
                <th className="px-4 py-3 font-medium">Độ cao (cm)</th>
                <th className="px-4 py-3 font-medium">Ngưỡng (Cảnh báo / Nguy hiểm)</th>
                <th className="px-4 py-3 font-medium">Bảo trì</th>
                <th className="px-4 py-3 font-medium text-right">Thao tác</th>
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
                        <span className="text-zinc-300">Bảo trì</span>
                      </Label>
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Menu>
                        <MenuTrigger
                          render={
                            <button type="button" className="rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-1.5 text-sm text-zinc-200 hover:bg-white/10">
                              Thao tác ▾
                            </button>
                          }
                        />
                        <MenuPanel className="w-56" align="end" sideOffset={4}>
                          <MenuItem onSelect={() => setEditModal(s)}>
                            Chỉnh sửa cấu hình
                          </MenuItem>
                          <MenuItem onSelect={() => handleCalibrate(s.sensor_id)} disabled={calibratingId === s.sensor_id}>
                            {calibratingId === s.sensor_id ? 'Đang hiệu chuẩn...' : 'Hiệu chuẩn sensor'}
                          </MenuItem>
                          <MenuItem variant="destructive" onSelect={() => setDeleteConfirm(s)}>
                            Xóa sensor
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
      <Dialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteSensor}
        title="Xác nhận xóa sensor"
        description={deleteConfirm ? `Bạn có chắc muốn xóa sensor "${deleteConfirm.location_name}" (${deleteConfirm.sensor_id})?` : null}
        confirmLabel="Xóa"
        variant="destructive"
      />
    </div>
  );
}
