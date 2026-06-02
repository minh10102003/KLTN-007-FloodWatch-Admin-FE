import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { fetchPendingReports, getReportsAll, moderateReport, skipReportAutoApprove } from '../services/api';
import AutoApproveSummary from '../components/admin/AutoApproveSummary';
import ReportAutoApproveDetailSection from '../components/admin/ReportAutoApproveDetailSection';
import ReportStatusBadges from '../components/admin/ReportStatusBadges';
import {
  canManualModerate,
  isManualPendingReport,
  isQueuePendingReport,
  mergeManualPendingQueues,
} from '../utils/reportAutoApprove';
import {
  dispatchReportsSummaryRefresh,
  REPORTS_FILTER_MANUAL_PENDING,
} from '../utils/reportFilterEvents';
import { getReporterReliabilityTier } from '../utils/reliabilityHelpers';
import { reverseGeocode, getDisplayAddress } from '../utils/geocode';
import { FaCheck, FaXmark, FaArrowsRotate, FaFilter, FaStar, FaGripVertical } from 'react-icons/fa6';
import { Menu, MenuTrigger, MenuPanel, MenuItem } from '../components/ui/Menu';
import ReportImage from '../components/ReportImage';
import { useToast } from '../components/ui/Toast';
import ConfidenceBadge from '../components/ConfidenceBadge';
import { getConfidenceBreakdownLines } from '../utils/formatConfidenceBreakdown';
import {
  FLOOD_FILTER_ALL,
  FLOOD_LEVEL_API_VALUES,
  formatFloodLevel,
  floodLevelFilterLabel,
  floodLevelsMatch,
  getFloodLevelCardStyle,
  getFloodLevelTextColor,
} from '../utils/floodLevel';
import {
  MODERATION_OPEN_REPORT,
  MODERATION_REFRESH,
  markSelfModeration,
} from '../utils/moderationEvents';

const FLOOD_LEVELS = [FLOOD_FILTER_ALL, ...FLOOD_LEVEL_API_VALUES];
const REPORTS_PER_PAGE = 25;

/** Chuẩn hóa status từ BE (có thể là status, moderation_status, is_approved, v.v.) */
function getReportStatus(report) {
  if (report.status) return report.status;
  if (report.moderation_status) return report.moderation_status;
  if (typeof report.is_approved === 'boolean') return report.is_approved ? 'approved' : 'rejected';
  return 'pending';
}

/** Lấy danh sách URL ảnh từ báo cáo (nhiều ảnh hoặc 1 ảnh, tương thích BE cũ) */
function getReportPhotoUrls(report) {
  if (Array.isArray(report.photo_urls) && report.photo_urls.length) return report.photo_urls;
  if (Array.isArray(report.photos) && report.photos.length) {
    return report.photos.map((p) => (typeof p === 'string' ? p : p.url || p.photo_url));
  }
  if (report.photo_url) return [report.photo_url];
  return [];
}

/** Nội dung báo cáo (content / description / note) */
function getReportContent(report) {
  const text = report.content ?? report.description ?? report.note ?? report.body ?? '';
  return typeof text === 'string' ? text.trim() : '';
}

function normalizeForSearch(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) dp[i][0] = i;
  for (let j = 0; j <= n; j += 1) dp[0][j] = j;

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

function isFuzzyTokenMatch(queryToken, targetToken) {
  if (!queryToken || !targetToken) return false;
  if (targetToken.includes(queryToken) || queryToken.includes(targetToken)) return true;

  // Cho phép sai nhẹ 1 ký tự với từ ngắn, 2 ký tự với từ dài hơn
  const allowedDistance = queryToken.length >= 8 ? 2 : 1;
  return levenshteinDistance(queryToken, targetToken) <= allowedDistance;
}

function smartIncludesQuery(query, values) {
  const queryTokens = normalizeForSearch(query).split(/\s+/).filter(Boolean);
  if (queryTokens.length === 0) return true;

  const targetText = values.map(normalizeForSearch).join(' ');
  if (targetText.includes(queryTokens.join(' '))) return true;

  const targetTokens = targetText.split(/\s+/).filter(Boolean);
  return queryTokens.every((qToken) => targetTokens.some((tToken) => isFuzzyTokenMatch(qToken, tToken)));
}

function getSearchableValuesFromReport(report) {
  const values = [];

  const shouldKeepKey = (key) =>
    /(id|location|address|area|district|ward|street|name|desc|content|note|lat|lng|flood|sensor)/i.test(key);

  const walk = (node, depth = 0, parentKey = '') => {
    if (node == null || depth > 3) return;

    if (typeof node === 'string' || typeof node === 'number') {
      values.push(node);
      return;
    }

    if (Array.isArray(node)) {
      node.slice(0, 20).forEach((item) => walk(item, depth + 1, parentKey));
      return;
    }

    if (typeof node === 'object') {
      Object.entries(node).forEach(([key, value]) => {
        if (depth === 0 || shouldKeepKey(key) || shouldKeepKey(parentKey)) {
          walk(value, depth + 1, key);
        }
      });
    }
  };

  walk(report);
  return values;
}

/** Hook: địa chỉ hiển thị (geocode từ tọa độ nếu cần) */
function useGeocodedAddress(report) {
  const [geocoded, setGeocoded] = useState(null);
  const desc = report?.location_description?.trim();
  const hasCoords = report?.lat != null && report?.lng != null;
  const needsGeocode = hasCoords && (!desc || /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/.test(desc));
  useEffect(() => {
    if (!needsGeocode) return;
    let cancelled = false;
    reverseGeocode(report.lat, report.lng).then((addr) => {
      if (!cancelled && addr) setGeocoded(addr);
    });
    return () => { cancelled = true; };
  }, [needsGeocode, report?.lat, report?.lng]);
  return getDisplayAddress(report, geocoded);
}

/** Card mini: địa chỉ (geocode), mức độ, màu theo mức độ, không ảnh. Bấm mở popup chi tiết. */
function ReportMiniCard({
  report,
  address,
  onClick,
  className = '',
  draggable = false,
  onDragStart,
  onDragEnd,
  draggingId,
}) {
  const { t } = useTranslation();
  const levelStyle = getFloodLevelCardStyle(report.flood_level);
  const isDragging = draggable && draggingId === report.id;
  const card = (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
      className={`rounded-lg border-2 p-3 text-left cursor-pointer hover:shadow-md transition-shadow ${levelStyle} ${className} ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-zinc-500">#{report.id}</p>
          <ReportStatusBadges report={report} className="mt-1.5" showHint />
          <p className="text-sm font-medium line-clamp-2 mt-1" title={address}>
            {address}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs font-semibold">{formatFloodLevel(report.flood_level, t)}</span>
            <ConfidenceBadge report={report} variant="onLight" />
          </div>
        </div>
        {draggable && (
          <div className="shrink-0 text-zinc-500 cursor-grab active:cursor-grabbing" onPointerDown={(e) => e.stopPropagation()} aria-hidden>
            <FaGripVertical className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
  if (draggable && onDragStart && onDragEnd) {
    return (
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        {card}
      </div>
    );
  }
  return card;
}

/** Popup chi tiết báo cáo: đầy đủ thông tin + ảnh + hành động (nếu chờ duyệt) */
function ReportDetailModal({
  report,
  onClose,
  getReportStatus,
  getReportPhotoUrls,
  getReportContent,
  getReporterReliabilityTier,
  setPhotoModalUrl,
  setRejectModal,
  handleApprove,
  processing,
  onSkipAutoApprove,
  skipProcessing,
}) {
  if (!report) return null;
  return (
    <ReportDetailModalContent
      report={report}
      onClose={onClose}
      getReportStatus={getReportStatus}
      getReportPhotoUrls={getReportPhotoUrls}
      getReportContent={getReportContent}
      getReporterReliabilityTier={getReporterReliabilityTier}
      setPhotoModalUrl={setPhotoModalUrl}
      setRejectModal={setRejectModal}
      handleApprove={handleApprove}
      processing={processing}
      onSkipAutoApprove={onSkipAutoApprove}
      skipProcessing={skipProcessing}
    />
  );
}

function ReportDetailModalContent({
  report,
  onClose,
  getReportStatus,
  getReportPhotoUrls,
  getReportContent,
  getReporterReliabilityTier,
  setPhotoModalUrl,
  setRejectModal,
  handleApprove,
  processing,
  onSkipAutoApprove,
  skipProcessing,
}) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('en') ? 'en-GB' : 'vi-VN';
  const address = useGeocodedAddress(report);
  const photoUrls = getReportPhotoUrls(report);
  const content = getReportContent(report);
  const canModerate = canManualModerate(report);
  const confidenceLines = getConfidenceBreakdownLines(report.confidence_breakdown, t);
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4" onClick={onClose} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Escape' && onClose()} aria-label={t('common.closeAria')}>
      <div
        className="bg-dashboard-card border border-dashboard-border rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-dashboard-border">
          <h3 className="text-lg font-semibold text-zinc-100">{t('moderation.reportDetail', { id: report.id })}</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-zinc-400" aria-label={t('common.closeAria')}>
            <FaXmark className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-zinc-300">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${getFloodLevelTextColor(report.flood_level)}`}>{formatFloodLevel(report.flood_level, t)}</span>
            <ConfidenceBadge report={report} variant="onLight" />
          </div>
          <ReportStatusBadges report={report} className="mt-2" />
          <p className="text-sm">
            <span className="font-medium text-zinc-500">{t('moderation.locationLabel')}: </span>
            {address}
          </p>
          {content && (
            <div className="rounded-lg border border-dashboard-border bg-dashboard-surface p-3">
              <p className="text-xs font-medium text-zinc-500 uppercase">{t('moderation.contentLabel')}</p>
              <p className="text-sm mt-1 whitespace-pre-wrap">{content}</p>
            </div>
          )}
          {report.reporter_reliability != null && (() => {
            const tier = getReporterReliabilityTier(Number(report.reporter_reliability), t);
            return tier ? (
              <div className="flex items-center gap-2">
                <FaStar className="text-amber-500" style={{ fontSize: '12px' }} />
                <span className="rounded px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: tier.bgLight, color: tier.color }}>{tier.tier} ({report.reporter_reliability})</span>
              </div>
            ) : null;
          })()}
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
              <p className="text-xs font-medium text-zinc-500 mb-2">{t('moderation.photosLabel', { count: photoUrls.length })}</p>
              <div className="grid grid-cols-2 gap-2">
                {photoUrls.map((url, idx) => (
                  <button key={idx} type="button" onClick={() => setPhotoModalUrl(url)} className="rounded-lg overflow-hidden border border-dashboard-border bg-dashboard-surface focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <ReportImage src={url} alt="" className="w-full aspect-video object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-zinc-500">{report.created_at ? new Date(report.created_at).toLocaleString(dateLocale) : ''}</p>
          {canModerate && (
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => handleApprove(report.id)} disabled={processing === report.id} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                <FaCheck /> {t('moderation.approve')}
              </button>
              <button type="button" onClick={() => { onClose(); setRejectModal(report); }} disabled={processing === report.id} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                <FaXmark /> {t('moderation.reject')}
              </button>
            </div>
          )}
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

/** Card mini đã xử lý (ô trái) — dùng hook geocode, bấm mở popup */
function ProcessedMiniCard({ report, setDetailReport }) {
  const address = useGeocodedAddress(report);
  return (
    <ReportMiniCard
      report={report}
      address={address}
      onClick={() => setDetailReport(report)}
    />
  );
}

/** Card mini chờ duyệt (ô phải) — kéo được, bấm mở popup */
function PendingMiniCard({ report, setDetailReport, draggingId, setDraggingId }) {
  const address = useGeocodedAddress(report);
  const draggable = canManualModerate(report);
  if (!isQueuePendingReport(report)) return null;
  return (
    <ReportMiniCard
      report={report}
      address={address}
      onClick={() => setDetailReport(report)}
      draggable={draggable}
      onDragStart={
        draggable
          ? (e) => {
              e.dataTransfer.setData('text/plain', String(report.id));
              e.dataTransfer.effectAllowed = 'move';
              setDraggingId(report.id);
            }
          : undefined
      }
      onDragEnd={draggable ? () => setDraggingId(null) : undefined}
      draggingId={draggingId}
    />
  );
}

export default function ModerationPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const pendingOpenReportId = useRef(null);
  const [reports, setReports] = useState([]);
  const [pendingQueue, setPendingQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [filterLevel, setFilterLevel] = useState(FLOOD_FILTER_ALL);
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [photoModalUrl, setPhotoModalUrl] = useState(null);
  const [dragOverLeft, setDragOverLeft] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [detailReport, setDetailReport] = useState(null);
  const [geocodedSearchMap, setGeocodedSearchMap] = useState({});
  const [manualPendingOnly, setManualPendingOnly] = useState(false);
  const [skipProcessing, setSkipProcessing] = useState(null);
  const [processedPage, setProcessedPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);

  const loadReports = useCallback(async () => {
    setLoading(true);
    const [allRes, pendingRes, pendingStatusRes] = await Promise.all([
      getReportsAll({ limit: 2000 }),
      fetchPendingReports(500),
      getReportsAll({ limit: 500, moderation_status: 'pending' }),
    ]);
    if (allRes.success && allRes.data) setReports(allRes.data);
    else setReports([]);
    setPendingQueue(
      mergeManualPendingQueues([
        { data: pendingRes.success ? pendingRes.data : [], trustPendingApi: true },
        { data: pendingStatusRes.success ? pendingStatusRes.data : [], trustPendingApi: false },
        { data: allRes.success ? allRes.data : [], trustPendingApi: false },
      ])
    );
    setLoading(false);
    dispatchReportsSummaryRefresh();
  }, []);

  const openReportById = useCallback(
    (reportId) => {
      const id = Number(reportId);
      if (!Number.isFinite(id)) return;
      const found = reports.find((r) => Number(r.id) === id);
      if (found) {
        setDetailReport(found);
        pendingOpenReportId.current = null;
        return;
      }
      pendingOpenReportId.current = id;
      loadReports();
    },
    [reports, loadReports]
  );

  const closeDetailReport = useCallback(() => {
    setDetailReport(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('open');
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

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
        loadReports();
        setDetailReport((prev) => (prev?.id === reportId ? null : prev));
      } else {
        toast(result.error || t('autoApprove.skipFailed'), 'error');
      }
    },
    [loadReports, toast, t]
  );

  useEffect(() => {
    const onRefresh = () => {
      loadReports();
    };
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
  }, [loadReports, openReportById]);

  useEffect(() => {
    const openParam = searchParams.get('open');
    if (openParam) openReportById(openParam);
  }, [searchParams, openReportById]);

  useEffect(() => {
    const id = pendingOpenReportId.current;
    if (!id) return;
    const found = reports.find((r) => Number(r.id) === id);
    if (found) {
      setDetailReport(found);
      pendingOpenReportId.current = null;
    }
  }, [reports]);

  useEffect(() => {
    let cancelled = false;
    reports.forEach((report) => {
      const desc = report?.location_description?.trim();
      const hasCoords = report?.lat != null && report?.lng != null;
      const needsGeocode = hasCoords && (!desc || /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/.test(desc));
      if (!needsGeocode || geocodedSearchMap[report.id]) return;
      reverseGeocode(report.lat, report.lng).then((addr) => {
        if (!addr || cancelled) return;
        setGeocodedSearchMap((prev) => {
          if (prev[report.id]) return prev;
          return { ...prev, [report.id]: addr };
        });
      });
    });
    return () => {
      cancelled = true;
    };
  }, [reports, geocodedSearchMap]);

  const handleApprove = useCallback(async (reportId) => {
    setProcessing(reportId);
    const result = await moderateReport(reportId, 'approve');
    setProcessing(null);
    if (result.success) {
      markSelfModeration(reportId, 'approved');
      toast(result.message || t('moderation.toastApproved'), 'success');
      loadReports();
      setDetailReport((prev) => (prev?.id === reportId ? null : prev));
    } else if (result.code === 'AUTO_APPROVED_CONFLICT') {
      toast(result.error || t('autoApprove.conflictAutoApproved'), 'error');
      loadReports();
    } else {
      toast(result.error || t('moderation.toastApproveFailed'), 'error');
    }
  }, [loadReports, toast, t]);

  const handleRejectSubmit = async () => {
    if (!rejectModal) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast(t('moderation.toastRejectReasonRequired'), 'error');
      return;
    }
    setProcessing(rejectModal.id);
    const result = await moderateReport(rejectModal.id, 'reject', reason);
    setProcessing(null);
    setRejectModal(null);
    setRejectReason('');
    if (result.success) {
      markSelfModeration(rejectModal.id, 'rejected');
      toast(result.message || t('moderation.toastRejected'), 'success');
      loadReports();
      setDetailReport((prev) => (prev?.id === rejectModal.id ? null : prev));
    } else if (result.code === 'AUTO_APPROVED_CONFLICT') {
      toast(result.error || t('autoApprove.conflictAutoApproved'), 'error');
      loadReports();
    } else {
      toast(result.error || t('moderation.toastRejectFailed'), 'error');
    }
  };

  const applyFilterAndSort = useCallback(
    (list) => {
      let out = [...list];
      if (filterLevel !== FLOOD_FILTER_ALL) {
        out = out.filter((r) => floodLevelsMatch(r.flood_level, filterLevel));
      }
      if (searchText.trim()) {
        out = out.filter(
          (r) => {
            const searchableValues = [
              ...getSearchableValuesFromReport(r),
              geocodedSearchMap[r.id],
              getReportContent(r),
            ];
            return smartIncludesQuery(searchText, searchableValues);
          }
        );
      }
      out.sort((a, b) => {
        if (sortBy === 'reliability_desc') {
          const sa = Number(a.reporter_reliability ?? 0);
          const sb = Number(b.reporter_reliability ?? 0);
          return sb - sa;
        }
        const ta = new Date(a.created_at || 0).getTime();
        const tb = new Date(b.created_at || 0).getTime();
        return sortBy === 'newest' ? tb - ta : ta - tb;
      });
      return out;
    },
    [filterLevel, searchText, sortBy, geocodedSearchMap]
  );

  const pendingReports = useMemo(() => {
    const list = pendingQueue.filter((r) => isQueuePendingReport(r));
    return applyFilterAndSort(list);
  }, [pendingQueue, applyFilterAndSort]);

  const displayPendingReports = useMemo(() => {
    if (!manualPendingOnly) return pendingReports;
    return pendingReports.filter((r) => isManualPendingReport(r));
  }, [pendingReports, manualPendingOnly]);

  const processedReports = useMemo(() => {
    const list = reports.filter((r) => {
      const s = getReportStatus(r);
      return s === 'approved' || s === 'rejected';
    });
    return applyFilterAndSort(list);
  }, [reports, applyFilterAndSort]);

  const processedTotalPages = Math.max(1, Math.ceil(processedReports.length / REPORTS_PER_PAGE));
  const pendingTotalPages = Math.max(1, Math.ceil(displayPendingReports.length / REPORTS_PER_PAGE));

  useEffect(() => {
    setProcessedPage(1);
    setPendingPage(1);
  }, [filterLevel, searchText, sortBy]);

  useEffect(() => {
    setProcessedPage((prev) => Math.min(prev, processedTotalPages));
  }, [processedTotalPages]);

  useEffect(() => {
    setPendingPage((prev) => Math.min(prev, pendingTotalPages));
  }, [pendingTotalPages]);

  const paginatedProcessedReports = useMemo(() => {
    const start = (processedPage - 1) * REPORTS_PER_PAGE;
    return processedReports.slice(start, start + REPORTS_PER_PAGE);
  }, [processedReports, processedPage]);

  const paginatedDisplayPendingReports = useMemo(() => {
    const start = (pendingPage - 1) * REPORTS_PER_PAGE;
    return displayPendingReports.slice(start, start + REPORTS_PER_PAGE);
  }, [displayPendingReports, pendingPage]);

  const handleDropOnProcessed = useCallback(
    (e) => {
      e.preventDefault();
      setDragOverLeft(false);
      setDraggingId(null);
      const reportId = e.dataTransfer.getData('text/plain');
      if (reportId) {
        const id = Number(reportId);
        if (id && pendingReports.some((r) => r.id === id && canManualModerate(r))) handleApprove(id);
      }
    },
    [pendingReports, handleApprove]
  );

  const handleDragOverLeft = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverLeft(true);
  }, []);

  const handleDragLeaveLeft = useCallback(() => {
    setDragOverLeft(false);
  }, []);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-zinc-100">{t('moderation.title')}</h1>
        <button
          type="button"
          onClick={loadReports}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-dashboard-border bg-dashboard-card px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-dashboard-surface disabled:opacity-50"
        >
          <FaArrowsRotate /> {t('moderation.refresh')}
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

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-dashboard-border bg-dashboard-card p-4 shadow-sm">
        <span className="flex items-center gap-2 text-sm font-medium text-zinc-400">
          <FaFilter /> {t('moderation.filterBar')}
        </span>
        <Menu>
          <MenuTrigger
            render={
              <button type="button" className="flex items-center gap-2 rounded-lg border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500">
                {floodLevelFilterLabel(filterLevel, t)}
                <ChevronDown className="h-4 w-4 text-zinc-400" />
              </button>
            }
          />
          <MenuPanel className="min-w-[10rem]" align="start" sideOffset={4}>
            {FLOOD_LEVELS.map((level) => (
              <MenuItem key={level} onSelect={() => setFilterLevel(level)}>
                {floodLevelFilterLabel(level, t)}
              </MenuItem>
            ))}
          </MenuPanel>
        </Menu>
        <Menu>
          <MenuTrigger
            render={
              <button type="button" className="flex items-center gap-2 rounded-lg border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500">
                {sortBy === 'newest' ? t('moderation.sortNewest') : sortBy === 'oldest' ? t('moderation.sortOldest') : t('moderation.sortReliability')}
                <ChevronDown className="h-4 w-4 text-zinc-400" />
              </button>
            }
          />
          <MenuPanel className="min-w-[11rem]" align="start" sideOffset={4}>
            <MenuItem onSelect={() => setSortBy('newest')}>{t('moderation.sortNewest')}</MenuItem>
            <MenuItem onSelect={() => setSortBy('oldest')}>{t('moderation.sortOldest')}</MenuItem>
            <MenuItem onSelect={() => setSortBy('reliability_desc')}>{t('moderation.sortReliability')}</MenuItem>
          </MenuPanel>
        </Menu>
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder={t('moderation.searchPlaceholder')}
          className="min-w-[200px] rounded-lg border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
        />
        {(filterLevel !== FLOOD_FILTER_ALL || searchText.trim()) && (
          <button
            type="button"
            onClick={() => {
              setFilterLevel(FLOOD_FILTER_ALL);
              setSearchText('');
            }}
            className="rounded-lg border border-dashboard-border px-3 py-2 text-sm text-zinc-400 hover:bg-dashboard-surface"
          >
            {t('moderation.clearFilters')}
          </button>
        )}
      </div>

      {/* Layout 2 panel: trái = đã xử lý (drop zone), phải = chờ duyệt (draggable) */}
      <div className="flex gap-4 flex-col lg:flex-row">
        {/* Ô trái lớn: Báo cáo đã xử lý — drop card từ phải vào đây = duyệt */}
        <div
          className={`flex-1 min-h-[400px] rounded-xl border-2 transition-colors ${
            dragOverLeft ? 'border-green-500 bg-green-900/20' : 'border-dashboard-border bg-dashboard-card'
          }`}
          onDragOver={handleDragOverLeft}
          onDragLeave={handleDragLeaveLeft}
          onDrop={handleDropOnProcessed}
        >
          <div className="p-4 h-full flex flex-col">
            <h2 className="text-lg font-semibold text-zinc-100 mb-1">{t('moderation.processedTitle')}</h2>
            <p className="text-sm text-zinc-400 mb-4">
              <Trans i18nKey="moderation.processedHint" components={{ 1: <strong /> }} />
            </p>
            {loading ? (
              <p className="text-zinc-400">{t('common.loading')}</p>
            ) : (
              <div className="flex-1 overflow-auto">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {paginatedProcessedReports.map((report) => (
                    <ProcessedMiniCard
                      key={report.id}
                      report={report}
                      setDetailReport={setDetailReport}
                    />
                  ))}
                </div>
                {processedReports.length === 0 && !loading && (
                  <p className="text-zinc-400 text-center py-8">{t('moderation.processedEmpty')}</p>
                )}
                {processedReports.length > 0 && (
                  <div className="mt-4 flex items-center justify-between gap-3 border-t border-dashboard-border pt-3">
                    <p className="text-xs text-zinc-500">
                      Trang {processedPage}/{processedTotalPages} - {processedReports.length} báo cáo
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setProcessedPage((p) => Math.max(1, p - 1))}
                        disabled={processedPage <= 1}
                        className="rounded-lg border border-dashboard-border bg-dashboard-surface px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/10 disabled:opacity-50"
                      >
                        Trước
                      </button>
                      <button
                        type="button"
                        onClick={() => setProcessedPage((p) => Math.min(processedTotalPages, p + 1))}
                        disabled={processedPage >= processedTotalPages}
                        className="rounded-lg border border-dashboard-border bg-dashboard-surface px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/10 disabled:opacity-50"
                      >
                        Sau
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Ô phải nhỏ: Chờ xét duyệt — kéo card sang trái = duyệt */}
        <div className="w-full lg:w-80 shrink-0 rounded-xl border border-dashboard-border bg-dashboard-card shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-dashboard-border bg-dashboard-surface">
            <h2 className="text-lg font-semibold text-zinc-100">{t('moderation.pendingTitle')}</h2>
            <p className="text-sm text-zinc-400 mt-0.5">{t('moderation.pendingHint')}</p>
            {displayPendingReports.length > 0 && (
              <p className="text-xs text-zinc-500 mt-2">{t('moderation.pendingCount', { count: displayPendingReports.length })}</p>
            )}
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-3">
            {loading ? (
              <p className="text-zinc-400 text-sm">{t('common.loading')}</p>
            ) : displayPendingReports.length === 0 ? (
              <p className="text-zinc-400 text-sm text-center py-6">{t('moderation.pendingEmpty')}</p>
            ) : (
              paginatedDisplayPendingReports.map((report) => (
                <PendingMiniCard
                  key={report.id}
                  report={report}
                  setDetailReport={setDetailReport}
                  draggingId={draggingId}
                  setDraggingId={setDraggingId}
                />
              ))
            )}
            {pendingReports.length > 0 && (
              <div className="mt-2 flex items-center justify-between gap-2 border-t border-dashboard-border pt-3">
                <p className="text-xs text-zinc-500">
                  Trang {pendingPage}/{pendingTotalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPendingPage((p) => Math.max(1, p - 1))}
                    disabled={pendingPage <= 1}
                    className="rounded-lg border border-dashboard-border bg-dashboard-surface px-2.5 py-1 text-xs text-zinc-200 hover:bg-white/10 disabled:opacity-50"
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingPage((p) => Math.min(pendingTotalPages, p + 1))}
                    disabled={pendingPage >= pendingTotalPages}
                    className="rounded-lg border border-dashboard-border bg-dashboard-surface px-2.5 py-1 text-xs text-zinc-200 hover:bg-white/10 disabled:opacity-50"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {detailReport && (
        <ReportDetailModal
          report={detailReport}
          onClose={closeDetailReport}
          getReportStatus={getReportStatus}
          getReportPhotoUrls={getReportPhotoUrls}
          getReportContent={getReportContent}
          getReporterReliabilityTier={getReporterReliabilityTier}
          setPhotoModalUrl={setPhotoModalUrl}
          setRejectModal={setRejectModal}
          handleApprove={handleApprove}
          processing={processing}
          onSkipAutoApprove={handleSkipAutoApprove}
          skipProcessing={skipProcessing}
        />
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-dashboard-card border border-dashboard-border p-6 shadow-xl">
            <h3 className="font-semibold text-zinc-100 mb-2">{t('moderation.rejectTitle', { id: rejectModal.id })}</h3>
            <p className="mb-2 text-sm text-zinc-400">{t('moderation.rejectReasonLabel')}</p>
            <textarea
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
              }}
              placeholder={t('moderation.rejectReasonPlaceholder')}
              rows={3}
              className="mb-4 w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason('');
                }}
                className="flex-1 rounded-xl border border-dashboard-border bg-dashboard-surface py-2 text-zinc-200 hover:bg-white/10"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                className="flex-1 rounded-xl bg-red-600 py-2 text-white hover:bg-red-700"
              >
                {t('moderation.reject')}
              </button>
            </div>
          </div>
        </div>
      )}

      {photoModalUrl && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-4"
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
              alt={t('moderation.reportImageAlt')}
              className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
