import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Label } from '../components/ui/Label';
import { Switch } from '../components/ui/Switch';
import { useToast } from '../components/ui/Toast';

const DEFAULT_TRUST_WEIGHTS = { weight_verified: 10, weight_rejected: -10, weight_has_photo: 5 };

export default function SettingsPage() {
  const { toast } = useToast();
  const [trustWeights, setTrustWeights] = useState(DEFAULT_TRUST_WEIGHTS);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const handleSave = () => {
    console.log('[SettingsPage] Save', { trustWeights, maintenanceMode });
    toast('Đã lưu cấu hình thành công.', 'success');
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-100 mb-4">Cài đặt hệ thống</h1>
      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Động cơ điểm tin cậy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-400">Trọng số cộng/trừ điểm tin cậy (người báo cáo). Sẽ áp dụng khi BE hỗ trợ.</p>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Điểm khi báo cáo được xác minh</label>
              <input type="number" value={trustWeights.weight_verified} onChange={(e) => setTrustWeights((w) => ({ ...w, weight_verified: Number(e.target.value) }))} className="w-full max-w-xs rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Điểm khi báo cáo bị từ chối</label>
              <input type="number" value={trustWeights.weight_rejected} onChange={(e) => setTrustWeights((w) => ({ ...w, weight_rejected: Number(e.target.value) }))} className="w-full max-w-xs rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">Điểm cộng khi có ảnh</label>
              <input type="number" value={trustWeights.weight_has_photo} onChange={(e) => setTrustWeights((w) => ({ ...w, weight_has_photo: Number(e.target.value) }))} className="w-full max-w-xs rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cấu hình hệ thống</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="flex cursor-pointer items-center gap-x-3">
                  <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
                  Chế độ bảo trì
                </Label>
                <p className="mt-1.5 text-sm text-zinc-400">Bật chế độ bảo trì (mock, sẽ nối BE khi có API).</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <button type="button" onClick={handleSave} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
            Lưu thay đổi
          </button>
        </div>
      </div>
    </div>
  );
}
