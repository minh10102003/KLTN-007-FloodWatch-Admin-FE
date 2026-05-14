import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Label } from '../components/ui/Label';
import { Switch } from '../components/ui/Switch';
import { useToast } from '../components/ui/Toast';

const DEFAULT_TRUST_WEIGHTS = { weight_verified: 10, weight_rejected: -10, weight_has_photo: 5 };

export default function SettingsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [trustWeights, setTrustWeights] = useState(DEFAULT_TRUST_WEIGHTS);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const handleSave = () => {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[SettingsPage] save');
    }
    toast(t('settingsPage.toastSaved'), 'success');
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold text-zinc-100 mb-4">{t('settingsPage.title')}</h1>
      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{t('settingsPage.trustEngine')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-zinc-400">{t('settingsPage.trustEngineDesc')}</p>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">{t('settingsPage.weightVerified')}</label>
              <input type="number" value={trustWeights.weight_verified} onChange={(e) => setTrustWeights((w) => ({ ...w, weight_verified: Number(e.target.value) }))} className="w-full max-w-xs rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">{t('settingsPage.weightRejected')}</label>
              <input type="number" value={trustWeights.weight_rejected} onChange={(e) => setTrustWeights((w) => ({ ...w, weight_rejected: Number(e.target.value) }))} className="w-full max-w-xs rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">{t('settingsPage.weightPhoto')}</label>
              <input type="number" value={trustWeights.weight_has_photo} onChange={(e) => setTrustWeights((w) => ({ ...w, weight_has_photo: Number(e.target.value) }))} className="w-full max-w-xs rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('settingsPage.sysConfig')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label className="flex cursor-pointer items-center gap-x-3">
                  <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
                  {t('settingsPage.maintenance')}
                </Label>
                <p className="mt-1.5 text-sm text-zinc-400">{t('settingsPage.maintenanceDesc')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end">
          <button type="button" onClick={handleSave} className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
            {t('settingsPage.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
