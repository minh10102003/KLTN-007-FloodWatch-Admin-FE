import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
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
import { getReportsAll, getReportStats, skipReportAutoApprove } from '../services/api';
import AutoApproveSummary from '../components/admin/AutoApproveSummary';
import { ModerationStatusBadge, ValidationStatusBadge } from '../components/admin/ReportStatusBadges';
import ReportAutoApproveDetailSection from '../components/admin/ReportAutoApproveDetailSection';
import { isManualPendingReport } from '../utils/reportAutoApprove';
import { REPORTS_FILTER_MANUAL_PENDING } from '../utils/reportFilterEvents';
import { useToast } from '../components/ui/Toast';
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from '../components/ui/Table';
import { FaArrowsRotate, FaXmark } from 'react-icons/fa6';
import { Menu, MenuTrigger, MenuPanel, MenuItem } from '../components/ui/Menu';
import ReportImage from '../components/ReportImage';
import ConfidenceBadge, { getReportConfidence } from '../components/ConfidenceBadge';
import { formatAdminDateTime } from '../utils/formatDateTime';
import { getConfidenceBreakdownLines } from '../utils/formatConfidenceBreakdown';
import {
  MODERATION_OPEN_REPORT,
  MODERATION_REFRESH,
} from '../utils/moderationEvents';
import { dispatchReportsSummaryRefresh } from '../utils/reportFilterEvents';
import { buildFloodLevelChartData, formatFloodLevel } from '../utils/floodLevel';

/** Độ rộng cột theo % — phân bổ đều, tránh cột Nội dung chiếm hết không gian */
const REPORT_TABLE_COL_WIDTHS = [5, 10, 10, 8, 8, 14, 18, 10, 15];

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

function ReportDetailView({ report, onClose, onPhotoClick, onSkipAutoApprove, skipProcessing, t, i18n }) {
  const dateLocale = i18n.language?.startsWith('en') ? 'en-GB' : 'vi-VN';
  const photoUrls = getReportPhotoUrls(report);
  const content = getReportContent(report);
  const locationText =
    report.location_description ||
    (report.lat != null && report.lng != null
      ? `${Number(report.lat).toFixed(4)}, ${Number(report.lng).toFixed(4)}`
      : '—');
  const confidenceLines = getConfidenceBreakdownLines(report.confidence_breakdown, t);

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      aria-label={t('common.closeAria')}
    >
      <div
        className="bg-dashboard-card border border-dashboard-border rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-dashboard-border">
          <h3 className="text-lg font-semibold text-zinc-100">{t('reports.reportDetail', { id: report.id })}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-zinc-400"
            aria-label={t('common.closeAria')}
          >
            <FaXmark className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-zinc-300">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-zinc-200">{formatFloodLevel(report.flood_level, t)}</span>
            <ConfidenceBadge report={report} variant="onLight" />
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <ModerationStatusBadge report={report} />
            <ValidationStatusBadge report={report} />
          </div>
          <p className="text-sm">
            <span className="font-medium text-zinc-500">{t('reports.colLocation')}: </span>
            {locationText}
          </p>
          {content && (
            <div className="rounded-lg border border-dashboard-border bg-dashboard-surface p-3">
              <p className="text-xs font-medium text-zinc-500 uppercase">{t('reports.colContent')}</p>
              <p className="text-sm mt-1 whitespace-pre-wrap">{content}</p>
            </div>
          )}
          {confidenceLines.length > 0 && (
            <div className="rounded-lg border border-dashboard-border bg-dashboard-surface overflow-hidden">
              <p className="px-3 pt-3 pb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
                {t('reports.confidenceBreakdownTitle')}
              </p>
              <ul className="border-t border-dashboard-border">
                {confidenceLines.map((line) => (
                  <li
                    key={line.key}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 border-b border-dashboard-border px-3 py-2.5 text-sm last:border-b-0"
                  >
                    <span className="min-w-0 text-zinc-400 leading-snug">{line.label}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-zinc-100 whitespace-nowrap text-right">
                      {line.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {photoUrls.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-2">
                {t('reports.colImage')} ({photoUrls.length})
              </p>
              <div className="grid grid-cols-2 gap-2">
                {photoUrls.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onPhotoClick(url)}
                    className="rounded-lg overflow-hidden border border-dashboard-border bg-dashboard-surface focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <ReportImage src={url} alt="" className="w-full aspect-video object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-zinc-500">
            {report.created_at ? new Date(report.created_at).toLocaleString(dateLocale) : ''}
          </p>
          <ReportAutoApproveDetailSection
            report={report}
            onSkipAutoApprove={onSkipAutoApprove}
            skipProcessing={skipProcessing}
          />
        </div>
      </div>
    </div>
  );
}

export default function ReportManagementPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const pendingOpenReportId = useRef(null);
  const rowRefs = useRef({});
  const chartLocale = i18n.language?.startsWith('en') ? 'en-GB' : 'vi-VN';
  const [statsSummary, setStatsSummary] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [statsSummaryLoading, setStatsSummaryLoading] = useState(false);
  const [reportList, setReportList] = useState([]);
  const [focusedReportId, setFocusedReportId] = useState(null);
  const [detailReport, setDetailReport] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [floodLevelChartData, setFloodLevelChartData] = useState([]);
  const [statsApiPayload, setStatsApiPayload] = useState(null);
  const [chartGroupBy, setChartGroupBy] = useState('day');
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState(null);
  const [photoModalUrl, setPhotoModalUrl] = useState(null);
  const [manualPendingOnly, setManualPendingOnly] = useState(false);
  const [skipProcessing, setSkipProcessing] = useState(null);

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
      setFloodLevelChartData(buildFloodLevelChartData(list, statsApiPayload, t));
      dispatchReportsSummaryRefresh();
    } else {
      setStatsSummary({ pending: 0, approved: 0, rejected: 0, total: 0 });
      setReportList([]);
    }
  }, [statsApiPayload, t]);

  const scrollToReportRow = useCallback((id) => {
    window.requestAnimationFrame(() => {
      rowRefs.current[id]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
  }, []);

  const openReportById = useCallback(
    (reportId) => {
      const id = Number(reportId);
      if (!Number.isFinite(id)) return;
      setFocusedReportId(id);
      const found = reportList.find((r) => Number(r.id) === id);
      if (found) {
        setDetailReport(found);
        pendingOpenReportId.current = null;
        scrollToReportRow(id);
        return;
      }
      pendingOpenReportId.current = id;
      loadStatsSummary();
    },
    [reportList, loadStatsSummary, scrollToReportRow]
  );

  const closeDetailReport = useCallback(() => {
    setDetailReport(null);
    setFocusedReportId(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('open');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

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
    if (res.success && res.data) {
      setStatsApiPayload(res.data);
      if (res.data?.series && Array.isArray(res.data.series)) {
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
      }
    } else {
      setStatsApiPayload(null);
      setChartData([]);
      setChartError(
        res.status === 403
          ? t('reports.err403Stats')
          : res.error || t('reports.errStatsGeneric')
      );
    }
  }, [chartGroupBy, chartLocale, t]);

  useEffect(() => {
    setFloodLevelChartData(buildFloodLevelChartData(reportList, statsApiPayload, t));
  }, [reportList, statsApiPayload, t]);

  useEffect(() => {
    loadStatsSummary();
  }, [loadStatsSummary]);

  useEffect(() => {
    const onFilterManual = () => setManualPendingOnly(true);
    window.addEventListener(REPORTS_FILTER_MANUAL_PENDING, onFilterManual);
    return () => window.removeEventListener(REPORTS_FILTER_MANUAL_PENDING, onFilterManual);
  }, []);

  const handleSkipAutoApprove = useCallback(
    async (reportId) => {
      setSkipProcessing(reportId);
      const result = await skipReportAutoApprove(reportId);
      setSkipProcessing(null);
      if (result.success) {
        toast(result.message || t('autoApprove.skipSuccess'), 'success');
        loadStatsSummary();
        setDetailReport((prev) => (prev?.id === reportId ? null : prev));
      } else {
        toast(result.error || t('autoApprove.skipFailed'), 'error');
      }
    },
    [loadStatsSummary, toast, t]
  );

  useEffect(() => {
    loadChartData();
  }, [loadChartData]);

  useEffect(() => {
    const onRefresh = () => loadStatsSummary();
    const onOpen = (e) => {
      const id = e.detail?.reportId;
      if (id != null) openReportById(id);
    };
    window.addEventListener(MODERATION_REFRESH, onRefresh);
    window.addEventListener(MODERATION_OPEN_REPORT, onOpen);
    return () => {
      window.removeEventListener(MODERATION_REFRESH, onRefresh);
      window.removeEventListener(MODERATION_OPEN_REPORT, onOpen);
    };
  }, [loadStatsSummary, openReportById]);

  useEffect(() => {
    const openParam = searchParams.get('open');
    if (openParam) openReportById(openParam);
  }, [searchParams, openReportById]);

  useEffect(() => {
    const id = pendingOpenReportId.current;
    if (!id) return;
    const found = reportList.find((r) => Number(r.id) === id);
    if (found) {
      setDetailReport(found);
      setFocusedReportId(id);
      pendingOpenReportId.current = null;
      scrollToReportRow(id);
    }
  }, [reportList, scrollToReportRow]);

  const refreshAll = () => {
    loadStatsSummary();
    loadChartData();
  };

  const sortedReports = useMemo(() => {
    let list = [...reportList];
    if (manualPendingOnly) {
      list = list.filter((r) => isManualPendingReport(r, getReportStatus(r)));
    }
    return list.sort((a, b) => {
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      return tb - ta;
    });
  }, [reportList, manualPendingOnly]);

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

      <AutoApproveSummary onFilterManualPending={() => setManualPendingOnly(true)} />

      {manualPendingOnly && (
        <p className="mb-4 text-sm text-amber-400/90">
          {t('autoApprove.filterManualActive')}
          <button
            type="button"
            className="ml-2 text-violet-400 hover:text-violet-300 underline"
            onClick={() => setManualPendingOnly(false)}
          >
            {t('moderation.clearFilters')}
          </button>
        </p>
      )}

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
          <div className="mb-4">
            <p className="text-sm text-zinc-400">{t('reports.floodChartCaption')}</p>
            <h2 className="text-lg font-semibold text-zinc-100">{t('reports.floodChartTitle')}</h2>
          </div>
          {statsSummaryLoading ? (
            <div className="flex h-56 items-center justify-center text-zinc-400">{t('reports.loading')}</div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={floodLevelChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#52525b" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#a1a1aa' }}
                  axisLine={{ stroke: '#52525b' }}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: '#a1a1aa' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: '1px solid #404040',
                    backgroundColor: '#27272a',
                    color: '#f4f4f5',
                  }}
                  formatter={(value) => [value, t('reports.tooltipReportCount')]}
                />
                <Bar dataKey="count" fill="#06b6d4" name={t('reports.tooltipReportCount')} radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
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
                  <TableTh>{t('reports.colModeration')}</TableTh>
                  <TableTh>{t('reports.colValidation')}</TableTh>
                  <TableTh>{t('reports.colFloodLevel')}</TableTh>
                  <TableTh>{t('reports.colConfidence')}</TableTh>
                  <TableTh>{t('reports.colLocation')}</TableTh>
                  <TableTh>{t('reports.colContent')}</TableTh>
                  <TableTh>{t('reports.colImage')}</TableTh>
                  <TableTh>{t('reports.colCreated')}</TableTh>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedReports.map((report) => {
                  const photoUrls = getReportPhotoUrls(report);
                  const content = getReportContent(report);
                  const locationTitle = report.location_description || (report.lat != null && report.lng != null ? `${report.lat}, ${report.lng}` : '');
                  const locationText = report.location_description || (report.lat != null && report.lng != null ? `${Number(report.lat).toFixed(4)}, ${Number(report.lng).toFixed(4)}` : '—');
                  const isFocused = focusedReportId === Number(report.id);
                  return (
                    <TableRow
                      key={report.id}
                      ref={(el) => {
                        if (el) rowRefs.current[report.id] = el;
                        else delete rowRefs.current[report.id];
                      }}
                      className={isFocused ? 'bg-violet-500/15 ring-1 ring-inset ring-violet-500/50' : undefined}
                      onClick={() => {
                        setFocusedReportId(Number(report.id));
                        setDetailReport(report);
                        setSearchParams((prev) => {
                          const next = new URLSearchParams(prev);
                          next.set('open', String(report.id));
                          return next;
                        }, { replace: true });
                      }}
                    >
                      <TableTd className="font-medium text-zinc-200">#{report.id}</TableTd>
                      <TableTd>
                        <ModerationStatusBadge report={report} />
                      </TableTd>
                      <TableTd>
                        <ValidationStatusBadge report={report} />
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPhotoModalUrl(url);
                                }}
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

      {detailReport && (
        <ReportDetailView
          report={detailReport}
          onClose={closeDetailReport}
          onPhotoClick={setPhotoModalUrl}
          onSkipAutoApprove={handleSkipAutoApprove}
          skipProcessing={skipProcessing}
          t={t}
          i18n={i18n}
        />
      )}

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
