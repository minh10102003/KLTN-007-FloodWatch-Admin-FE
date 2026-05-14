import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChevronDown } from 'lucide-react';
import { getReportsAll, getReportStats } from '../services/api';
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from '../components/ui/Table';
import { FaArrowsRotate, FaXmark } from 'react-icons/fa6';
import { Menu, MenuTrigger, MenuPanel, MenuItem } from '../components/ui/Menu';
import ReportImage from '../components/ReportImage';
import ConfidenceBadge, { getReportConfidence } from '../components/ConfidenceBadge';
import { formatAdminDateTime } from '../utils/formatDateTime';

function formatFloodLevel(raw, t) {
  if (raw == null || raw === '') return '—';
  const s = String(raw).trim();
  const lower = s.toLowerCase();
  if (lower === 'nhẹ' || lower === 'light' || lower === 'low') return t('reports.severityLight');
  if (lower === 'nặng' || lower === 'heavy' || lower === 'high') return t('reports.severityHeavy');
  return s;
}

/** Độ rộng cột theo % — phân bổ đều, tránh cột Nội dung chiếm hết không gian */
const REPORT_TABLE_COL_WIDTHS = [6, 11, 9, 9, 16, 22, 12, 15];

function getReportStatus(report) {
  if (report.status) return report.status;
  if (report.moderation_status) return report.moderation_status;
  if (typeof report.is_approved === 'boolean') return report.is_approved ? 'approved' : 'rejected';
  return 'pending';
}

/** Lấy danh sách URL ảnh từ báo cáo (chỉ từ các trường ảnh, không lấy từ content). */
function getReportPhotoUrls(report) {
  if (Array.isArray(report.photo_urls) && report.photo_urls.length) return report.photo_urls;
  if (Array.isArray(report.photos) && report.photos.length) {
    return report.photos.map((p) => (typeof p === 'string' ? p : p.url || p.photo_url)).filter(Boolean);
  }
  if (Array.isArray(report.images) && report.images.length) {
    return report.images.map((img) => (typeof img === 'string' ? img : img.url || img.src)).filter(Boolean);
  }
  if (report.photo_url) return [report.photo_url];
  if (report.image_url) return [report.image_url];
  return [];
}

function getReportContent(report) {
  const raw = report.content ?? report.description ?? report.note ?? report.body ?? '';
  const text = typeof raw === 'string' ? raw.trim() : '';
  // Chỉ hiển thị chữ, bỏ thẻ HTML để tránh render nhầm ảnh vào cột Nội dung
  if (!text) return '';
  return text.replace(/<[^>]*>/g, '').trim() || '';
}

export default function ReportManagementPage() {
  const { t, i18n } = useTranslation();
  const chartLocale = i18n.language?.startsWith('en') ? 'en-GB' : 'vi-VN';
  const [statsSummary, setStatsSummary] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [statsSummaryLoading, setStatsSummaryLoading] = useState(false);
  const [reportList, setReportList] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [chartGroupBy, setChartGroupBy] = useState('day');
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState(null);
  const [photoModalUrl, setPhotoModalUrl] = useState(null);

  const loadStatsSummary = useCallback(async () => {
    setStatsSummaryLoading(true);
    const result = await getReportsAll({ limit: 1000 });
    setStatsSummaryLoading(false);
    if (result.success && Array.isArray(result.data)) {
      const list = result.data;
      let pending = 0,
        approved = 0,
        rejected = 0;
      list.forEach((r) => {
        const s = getReportStatus(r);
        if (s === 'pending') pending++;
        else if (s === 'approved') approved++;
        else rejected++;
      });
      setStatsSummary({ pending, approved, rejected, total: list.length });
      setReportList(list);
    } else {
      setStatsSummary({ pending: 0, approved: 0, rejected: 0, total: 0 });
      setReportList([]);
    }
  }, []);

  const loadChartData = useCallback(async () => {
    setChartLoading(true);
    setChartError(null);
    const to = new Date();
    const from = new Date();
    if (chartGroupBy === 'day') {
      from.setDate(from.getDate() - 7);
    } else {
      from.setDate(from.getDate() - 28);
    }
    const res = await getReportStats({
      groupBy: chartGroupBy,
      from: from.toISOString(),
      to: to.toISOString(),
    });
    setChartLoading(false);
    if (res.success && res.data?.series && Array.isArray(res.data.series)) {
      const arr = res.data.series.map((s) => ({
        period: s.period,
        count: s.count ?? 0,
        label:
          chartGroupBy === 'day'
            ? new Date(s.period).toLocaleDateString(chartLocale, { day: 'numeric', month: 'numeric' })
            : s.period,
      }));
      setChartData(arr);
      setChartError(null);
    } else {
      setChartData([]);
      setChartError(
        res.status === 403
          ? t('reports.err403Stats')
          : res.error || t('reports.errStatsGeneric')
      );
    }
  }, [chartGroupBy, chartLocale, t]);

  useEffect(() => {
    loadStatsSummary();
  }, [loadStatsSummary]);

  useEffect(() => {
    loadChartData();
  }, [loadChartData]);

  const refreshAll = () => {
    loadStatsSummary();
    loadChartData();
  };

  const sortedReports = [...reportList].sort((a, b) => {
    const ta = new Date(a.created_at || 0).getTime();
    const tb = new Date(b.created_at || 0).getTime();
    return tb - ta;
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-100">{t('reports.title')}</h1>
        <button
          type="button"
          onClick={refreshAll}
          disabled={statsSummaryLoading || chartLoading}
          className="flex items-center gap-2 rounded-lg border border-dashboard-border bg-dashboard-card px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-dashboard-surface disabled:opacity-50"
        >
          <FaArrowsRotate /> {t('reports.refresh')}
        </button>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-dashboard-border bg-dashboard-card p-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="flex flex-col">
              <span className="text-2xl font-bold text-zinc-100">
                {statsSummaryLoading ? '—' : statsSummary.pending}
              </span>
              <span className="mt-1 text-sm text-zinc-400">{t('reports.statsPending')}</span>
            </div>
            <div className="flex flex-col border-l border-dashboard-border pl-4 md:pl-6">
              <span className="text-2xl font-bold text-zinc-100">
                {statsSummaryLoading ? '—' : statsSummary.approved}
              </span>
              <span className="mt-1 text-sm text-zinc-400">{t('reports.statsApproved')}</span>
            </div>
            <div className="flex flex-col border-l border-dashboard-border pl-4 md:pl-6">
              <span className="text-2xl font-bold text-zinc-100">
                {statsSummaryLoading ? '—' : statsSummary.rejected}
              </span>
              <span className="mt-1 text-sm text-zinc-400">{t('reports.statsRejected')}</span>
            </div>
            <div className="flex flex-col border-l border-dashboard-border pl-4 md:pl-6">
              <span className="text-2xl font-bold text-zinc-100">
                {statsSummaryLoading ? '—' : statsSummary.total}
              </span>
              <span className="mt-1 text-sm text-zinc-400">{t('reports.statsTotal')}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-dashboard-border bg-dashboard-card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-zinc-400">{t('reports.chartCaption')}</p>
              <h2 className="text-lg font-semibold text-zinc-100">{t('reports.chartTitle')}</h2>
            </div>
            <Menu>
              <MenuTrigger
                render={
                  <button type="button" className="flex items-center gap-2 rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500">
                    {chartGroupBy === 'week' ? t('reports.groupByWeek') : t('reports.groupByDay')}
                    <ChevronDown className="h-4 w-4 text-zinc-400" />
                  </button>
                }
              />
              <MenuPanel className="min-w-[12rem]" align="end" sideOffset={4}>
                <MenuItem onSelect={() => setChartGroupBy('day')}>{t('reports.groupByDay')}</MenuItem>
                <MenuItem onSelect={() => setChartGroupBy('week')}>{t('reports.groupByWeek')}</MenuItem>
              </MenuPanel>
            </Menu>
          </div>
          {chartLoading ? (
            <div className="flex h-64 items-center justify-center text-zinc-400">{t('reports.loading')}</div>
          ) : chartError ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/20 p-4 text-center text-sm text-amber-200">
              <p className="font-medium">{t('reports.chartErrorTitle')}</p>
              <p>{chartError}</p>
              <p className="text-xs text-amber-300">{t('reports.chartBackendHint')}</p>
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-zinc-400">{t('reports.noChartData')}</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#52525b" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: '#a1a1aa' }}
                  axisLine={{ stroke: '#52525b' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#a1a1aa' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #404040', backgroundColor: '#27272a', color: '#f4f4f5' }}
                  formatter={(value) => [value, t('reports.tooltipReportCount')]}
                  labelFormatter={(label) => t('reports.tooltipTime', { label })}
                />
                <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} maxBarSize={48} name={t('reports.tooltipReportCount')} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={{ fill: '#7c3aed', r: 4 }}
                  activeDot={{ r: 5 }}
                  name={t('reports.trendLine')}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bảng danh sách báo cáo (chỉ xem, không phê duyệt) */}
        <div className="rounded-xl border border-dashboard-border bg-dashboard-card overflow-hidden">
          <div className="border-b border-dashboard-border bg-dashboard-surface px-4 py-3">
            <h2 className="text-lg font-semibold text-zinc-100">{t('reports.tableTitle')}</h2>
            <p className="text-sm text-zinc-400 mt-0.5">{t('reports.tableSubtitle')}</p>
          </div>
          {statsSummaryLoading ? (
            <div className="p-8 text-center text-zinc-400">{t('reports.loading')}</div>
          ) : sortedReports.length === 0 ? (
            <div className="p-8 text-center text-zinc-400">{t('reports.noReports')}</div>
          ) : (
            <Table colWidths={REPORT_TABLE_COL_WIDTHS}>
              <TableHead>
                <TableRow>
                  <TableTh>{t('reports.colId')}</TableTh>
                  <TableTh>{t('reports.colStatus')}</TableTh>
                  <TableTh>{t('reports.colSeverity')}</TableTh>
                  <TableTh>{t('reports.colConfidence')}</TableTh>
                  <TableTh>{t('reports.colLocation')}</TableTh>
                  <TableTh>{t('reports.colContent')}</TableTh>
                  <TableTh>{t('reports.colImage')}</TableTh>
                  <TableTh>{t('reports.colCreated')}</TableTh>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedReports.map((report) => {
                  const status = getReportStatus(report);
                  const statusLabel =
                    status === 'pending'
                      ? t('reports.statusPending')
                      : status === 'approved'
                        ? t('reports.statusApproved')
                        : t('reports.statusRejected');
                  const statusClass =
                    status === 'pending'
                      ? 'bg-amber-500/30 text-amber-200'
                      : status === 'approved'
                        ? 'bg-emerald-500/30 text-emerald-200'
                        : 'bg-zinc-600 text-zinc-400';
                  const photoUrls = getReportPhotoUrls(report);
                  const content = getReportContent(report);
                  const locationTitle = report.location_description || (report.lat != null && report.lng != null ? `${report.lat}, ${report.lng}` : '');
                  const locationText = report.location_description || (report.lat != null && report.lng != null ? `${Number(report.lat).toFixed(4)}, ${Number(report.lng).toFixed(4)}` : '—');
                  return (
                    <TableRow key={report.id}>
                      <TableTd className="font-medium text-zinc-200">#{report.id}</TableTd>
                      <TableTd>
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </TableTd>
                      <TableTd className="text-zinc-300">{formatFloodLevel(report.flood_level, t)}</TableTd>
                      <TableTd>
                        {getReportConfidence(report) != null ? (
                          <ConfidenceBadge report={report} />
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </TableTd>
                      <TableTd className="text-zinc-400 overflow-hidden">
                        <span className="block truncate" title={locationTitle}>
                          {locationText}
                        </span>
                      </TableTd>
                      <TableTd className="text-zinc-400 overflow-hidden">
                        <span className="block truncate" title={content}>
                          {content || '—'}
                        </span>
                      </TableTd>
                      <TableTd className="align-middle">
                        {photoUrls.length > 0 ? (
                          <div className="flex flex-wrap gap-1 items-center">
                            {photoUrls.slice(0, 3).map((url, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setPhotoModalUrl(url)}
                                className="h-10 w-10 shrink-0 overflow-hidden rounded border border-dashboard-border bg-dashboard-surface focus:outline-none focus:ring-2 focus:ring-violet-500"
                              >
                                <ReportImage src={url} alt="" className="h-full w-full object-cover" />
                              </button>
                            ))}
                            {photoUrls.length > 3 && (
                              <span className="text-xs text-zinc-500">+{photoUrls.length - 3}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </TableTd>
                      <TableTd className="text-zinc-400 whitespace-nowrap">
                        {report.created_at ? formatAdminDateTime(report.created_at, i18n.language?.startsWith('en') ? 'en' : 'vi') : '—'}
                      </TableTd>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {photoModalUrl && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPhotoModalUrl(null)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Escape' && setPhotoModalUrl(null)}
          aria-label={t('common.closeAria')}
        >
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPhotoModalUrl(null);
              }}
              className="absolute -right-2 -top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-dashboard-card border border-dashboard-border text-zinc-300 shadow-md hover:bg-white/10 hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              aria-label={t('common.closeImageAria')}
            >
              <FaXmark className="h-5 w-5" />
            </button>
            <ReportImage
              src={photoModalUrl}
              alt={t('reports.reportImageAlt')}
              className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
