import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { reverseGeocode } from '../../utils/geocode';

export function HotspotLocationCell({ lat, lng }) {
  const { t } = useTranslation();
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (lat == null || lng == null) return undefined;
    let cancelled = false;
    setLoading(true);
    setAddress(null);
    reverseGeocode(Number(lat), Number(lng)).then((addr) => {
      if (!cancelled) {
        setAddress(addr);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  const coord =
    lat != null && lng != null ? `${Number(lng).toFixed(6)}, ${Number(lat).toFixed(6)}` : '—';

  return (
    <div className="max-w-[16rem]">
      <p className="text-xs leading-snug text-zinc-200">
        {loading ? t('research.geocoding') : address || t('research.geocodeUnavailable')}
      </p>
      <p className="mt-0.5 font-mono text-[10px] text-zinc-500" title={t('research.hotspotCoordHint')}>
        {coord}
      </p>
    </div>
  );
}
