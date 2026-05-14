import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { getReportsAll, moderateReport } from '../services/api';
import { getReporterReliabilityTier } from '../utils/reliabilityHelpers';
import { reverseGeocode, getDisplayAddress } from '../utils/geocode';
import { FaCheck, FaXmark, FaArrowsRotate, FaFilter, FaStar, FaGripVertical } from 'react-icons/fa6';
import { Menu, MenuTrigger, MenuPanel, MenuItem } from '../components/ui/Menu';
import ReportImage from '../components/ReportImage';
import { useToast } from '../components/ui/Toast';
import ConfidenceBadge from '../components/ConfidenceBadge';

const FLOOD_LEVELS = ['Tất cả', 'Nặng', 'Trung bình', 'Nhẹ'];

/** Màu card theo mức độ ngập */
const LEVEL_CARD_STYLES = {
  Nặng: 'bg-red-50 border-red-200 text-red-900',
  'Trung bình': 'bg-amber-50 border-amber-200 text-amber-900',
  Nhẹ: 'bg-sky-50 border-sky-200 text-sky-900',
};
const levelDefaultStyle = 'bg-dashboard-surface border-dashboard-border text-zinc-200';

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
  statusLabel,
  statusClass,
  onClick,
  className = '',
  isPending = false,
  onDragStart,
  onDragEnd,
  draggingId,
}) {
  const levelStyle = LEVEL_CARD_STYLES[report.flood_level] || levelDefaultStyle;
  const isDragging = isPending && draggingId === report.id;
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
          <p className="text-sm font-medium line-clamp-2 mt-0.5" title={address}>
            {address}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs font-semibold">{report.flood_level || '—'}</span>
            {statusLabel && (
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}>
                {statusLabel}
              </span>
            )}
            <ConfidenceBadge report={report} />
          </div>
        </div>
        {isPending && (
          <div className="shrink-0 text-zinc-500 cursor-grab active:cursor-grabbing" onPointerDown={(e) => e.stopPropagation()} aria-hidden>
            <FaGripVertical className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
  if (isPending && onDragStart && onDragEnd) {
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
  levelColors,
  setPhotoModalUrl,
  setRejectModal,
  handleApprove,
  processing,
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
      levelColors={levelColors}
      setPhotoModalUrl={setPhotoModalUrl}
      setRejectModal={setRejectModal}
      handleApprove={handleApprove}
      processing={processing}
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
  levelColors,
  setPhotoModalUrl,
  setRejectModal,
  handleApprove,
  processing,
}) {
  const address = useGeocodedAddress(report);
  const status = getReportStatus(report);
  const photoUrls = getReportPhotoUrls(report);
  const content = getReportContent(report);
  const isPending = status === 'pending';
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4" onClick={onClose} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Escape' && onClose()} aria-label="Đóng">
      <div
        className="bg-dashboard-card border border-dashboard-border rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-dashboard-border">
          <h3 className="text-lg font-semibold text-zinc-100">Báo cáo #{report.id}</h3>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-zinc-400" aria-label="Đóng">
            <FaXmark className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-zinc-300">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${levelColors[report.flood_level] || 'text-zinc-200'}`}>{report.flood_level || '—'}</span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${isPending ? 'bg-amber-500/30 text-amber-200' : status === 'approved' ? 'bg-emerald-500/30 text-emerald-200' : 'bg-zinc-600 text-zinc-400'}`}>
              {isPending ? 'Chờ duyệt' : status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}
            </span>
            <ConfidenceBadge report={report} />
          </div>
          <p className="text-sm">
            <span className="font-medium text-zinc-500">Địa điểm: </span>
            {address}
          </p>
          {content && (
            <div className="rounded-lg border border-dashboard-border bg-dashboard-surface p-3">
              <p className="text-xs font-medium text-zinc-500 uppercase">Nội dung</p>
              <p className="text-sm mt-1 whitespace-pre-wrap">{content}</p>
            </div>
          )}
          {report.reporter_reliability != null && (() => {
            const tier = getReporterReliabilityTier(Number(report.reporter_reliability));
            return tier ? (
              <div className="flex items-center gap-2">
                <FaStar className="text-amber-500" style={{ fontSize: '12px' }} />
                <span className="rounded px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: tier.bgLight, color: tier.color }}>{tier.tier} ({report.reporter_reliability})</span>
              </div>
            ) : null;
          })()}
          {report.confidence_breakdown != null && report.confidence_breakdown !== '' && (
            <p className="text-xs text-zinc-500 border border-dashboard-border rounded-lg p-2 bg-dashboard-surface whitespace-pre-wrap">
              {typeof report.confidence_breakdown === 'string'
                ? report.confidence_breakdown
                : JSON.stringify(report.confidence_breakdown, null, 2)}
            </p>
          )}
          {photoUrls.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-2">Ảnh ({photoUrls.length})</p>
              <div className="grid grid-cols-2 gap-2">
                {photoUrls.map((url, idx) => (
                  <button key={idx} type="button" onClick={() => setPhotoModalUrl(url)} className="rounded-lg overflow-hidden border border-dashboard-border bg-dashboard-surface focus:outline-none focus:ring-2 focus:ring-violet-500">
                    <ReportImage src={url} alt="" className="w-full aspect-video object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-zinc-500">{report.created_at ? new Date(report.created_at).toLocaleString('vi-VN') : ''}</p>
          {isPending && (
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => handleApprove(report.id)} disabled={processing === report.id} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
                <FaCheck /> Duyệt
              </button>
              <button type="button" onClick={() => { onClose(); setRejectModal(report); }} disabled={processing === report.id} className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">
                <FaXmark /> Từ chối
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Card mini đã xử lý (ô trái) — dùng hook geocode, bấm mở popup */
function ProcessedMiniCard({ report, getReportStatus, setDetailReport }) {
  const address = useGeocodedAddress(report);
  const status = getReportStatus(report);
  const statusLabel = status === 'approved' ? 'Đã duyệt' : 'Đã từ chối';
  const statusClass = status === 'approved' ? 'bg-emerald-500/30 text-emerald-200' : 'bg-zinc-600 text-zinc-400';
  return (
    <ReportMiniCard
      report={report}
      address={address}
      statusLabel={statusLabel}
      statusClass={statusClass}
      onClick={() => setDetailReport(report)}
    />
  );
}

/** Card mini chờ duyệt (ô phải) — kéo được, bấm mở popup */
function PendingMiniCard({ report, setDetailReport, setRejectModal, handleApprove, processing, draggingId, setDraggingId }) {
  const address = useGeocodedAddress(report);
  return (
    <ReportMiniCard
      report={report}
      address={address}
      statusLabel="Chờ duyệt"
      statusClass="bg-amber-500/30 text-amber-200"
      onClick={() => setDetailReport(report)}
      isPending
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', String(report.id));
        e.dataTransfer.effectAllowed = 'move';
        setDraggingId(report.id);
      }}
      onDragEnd={() => setDraggingId(null)}
      draggingId={draggingId}
    />
  );
}

export default function ModerationPage() {
  const { toast } = useToast();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [filterLevel, setFilterLevel] = useState('Tất cả');
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [photoModalUrl, setPhotoModalUrl] = useState(null);
  const [dragOverLeft, setDragOverLeft] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [detailReport, setDetailReport] = useState(null);
  const [geocodedSearchMap, setGeocodedSearchMap] = useState({});

  const loadReports = useCallback(async () => {
    setLoading(true);
    const result = await getReportsAll({ limit: 500 });
    if (result.success && result.data) setReports(result.data);
    else setReports([]);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

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
      toast(result.message || 'Đã duyệt báo cáo', 'success');
      loadReports();
      setDetailReport((prev) => (prev?.id === reportId ? null : prev));
    } else {
      toast(result.error || 'Không thể duyệt', 'error');
    }
  }, [loadReports, toast]);

  const handleRejectSubmit = async () => {
    if (!rejectModal) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast('Vui lòng nhập lý do từ chối', 'error');
      return;
    }
    setProcessing(rejectModal.id);
    const result = await moderateReport(rejectModal.id, 'reject', reason);
    setProcessing(null);
    setRejectModal(null);
    setRejectReason('');
    if (result.success) {
      toast(result.message || 'Đã từ chối báo cáo', 'success');
      loadReports();
      setDetailReport((prev) => (prev?.id === rejectModal.id ? null : prev));
    } else {
      toast(result.error || 'Không thể từ chối', 'error');
    }
  };

  const levelColors = { Nặng: 'text-red-600', 'Trung bình': 'text-amber-600', Nhẹ: 'text-sky-600' };

  const applyFilterAndSort = useCallback(
    (list) => {
      let out = [...list];
      if (filterLevel !== 'Tất cả') out = out.filter((r) => (r.flood_level || '') === filterLevel);
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
    const list = reports.filter((r) => getReportStatus(r) === 'pending');
    return applyFilterAndSort(list);
  }, [reports, applyFilterAndSort]);

  const processedReports = useMemo(() => {
    const list = reports.filter((r) => {
      const s = getReportStatus(r);
      return s === 'approved' || s === 'rejected';
    });
    return applyFilterAndSort(list);
  }, [reports, applyFilterAndSort]);

  const handleDropOnProcessed = useCallback(
    (e) => {
      e.preventDefault();
      setDragOverLeft(false);
      setDraggingId(null);
      const reportId = e.dataTransfer.getData('text/plain');
      if (reportId) {
        const id = Number(reportId);
        if (id && pendingReports.some((r) => r.id === id)) handleApprove(id);
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
        <h1 className="text-2xl font-semibold text-zinc-100">Kiểm duyệt báo cáo</h1>
        <button
          type="button"
          onClick={loadReports}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-dashboard-border bg-dashboard-card px-4 py-2 text-sm font-medium text-zinc-200 hover:bg-dashboard-surface disabled:opacity-50"
        >
          <FaArrowsRotate /> Làm mới
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-dashboard-border bg-dashboard-card p-4 shadow-sm">
        <span className="flex items-center gap-2 text-sm font-medium text-zinc-400">
          <FaFilter /> Bộ lọc (áp dụng cả hai ô)
        </span>
        <Menu>
          <MenuTrigger
            render={
              <button type="button" className="flex items-center gap-2 rounded-lg border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500">
                {filterLevel === 'Tất cả' ? 'Mức độ: Tất cả' : filterLevel}
                <ChevronDown className="h-4 w-4 text-zinc-400" />
              </button>
            }
          />
          <MenuPanel className="min-w-[10rem]" align="start" sideOffset={4}>
            {FLOOD_LEVELS.map((level) => (
              <MenuItem key={level} onSelect={() => setFilterLevel(level)}>
                {level === 'Tất cả' ? 'Mức độ: Tất cả' : level}
              </MenuItem>
            ))}
          </MenuPanel>
        </Menu>
        <Menu>
          <MenuTrigger
            render={
              <button type="button" className="flex items-center gap-2 rounded-lg border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-500">
                {sortBy === 'newest' ? 'Mới nhất trước' : sortBy === 'oldest' ? 'Cũ nhất trước' : 'Độ tin cậy cao trước'}
                <ChevronDown className="h-4 w-4 text-zinc-400" />
              </button>
            }
          />
          <MenuPanel className="min-w-[11rem]" align="start" sideOffset={4}>
            <MenuItem onSelect={() => setSortBy('newest')}>Mới nhất trước</MenuItem>
            <MenuItem onSelect={() => setSortBy('oldest')}>Cũ nhất trước</MenuItem>
            <MenuItem onSelect={() => setSortBy('reliability_desc')}>Độ tin cậy cao trước</MenuItem>
          </MenuPanel>
        </Menu>
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Tìm theo địa điểm, nội dung, ID..."
          className="min-w-[200px] rounded-lg border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500"
        />
        {(filterLevel !== 'Tất cả' || searchText.trim()) && (
          <button
            type="button"
            onClick={() => {
              setFilterLevel('Tất cả');
              setSearchText('');
            }}
            className="rounded-lg border border-dashboard-border px-3 py-2 text-sm text-zinc-400 hover:bg-dashboard-surface"
          >
            Xóa bộ lọc
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
            <h2 className="text-lg font-semibold text-zinc-100 mb-1">Báo cáo đã xử lý</h2>
            <p className="text-sm text-zinc-400 mb-4">
              Kéo thả card từ ô bên phải vào đây để <strong>duyệt</strong> báo cáo.
            </p>
            {loading ? (
              <p className="text-zinc-400">Đang tải...</p>
            ) : (
              <div className="flex-1 overflow-auto">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {processedReports.map((report) => (
                    <ProcessedMiniCard
                      key={report.id}
                      report={report}
                      getReportStatus={getReportStatus}
                      setDetailReport={setDetailReport}
                    />
                  ))}
                </div>
                {processedReports.length === 0 && !loading && (
                  <p className="text-zinc-400 text-center py-8">Chưa có báo cáo đã xử lý</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Ô phải nhỏ: Chờ xét duyệt — kéo card sang trái = duyệt */}
        <div className="w-full lg:w-80 shrink-0 rounded-xl border border-dashboard-border bg-dashboard-card shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-dashboard-border bg-dashboard-surface">
            <h2 className="text-lg font-semibold text-zinc-100">Chờ xét duyệt</h2>
            <p className="text-sm text-zinc-400 mt-0.5">
              Kéo card sang ô trái để duyệt. Bấm &quot;Từ chối&quot; để từ chối.
            </p>
            {pendingReports.length > 0 && (
              <p className="text-xs text-zinc-500 mt-2">{pendingReports.length} báo cáo</p>
            )}
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-3">
            {loading ? (
              <p className="text-zinc-400 text-sm">Đang tải...</p>
            ) : pendingReports.length === 0 ? (
              <p className="text-zinc-400 text-sm text-center py-6">Không có báo cáo chờ duyệt</p>
            ) : (
              pendingReports.map((report) => (
                <PendingMiniCard
                  key={report.id}
                  report={report}
                  setDetailReport={setDetailReport}
                  setRejectModal={setRejectModal}
                  handleApprove={handleApprove}
                  processing={processing}
                  draggingId={draggingId}
                  setDraggingId={setDraggingId}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {detailReport && (
        <ReportDetailModal
          report={detailReport}
          onClose={() => setDetailReport(null)}
          getReportStatus={getReportStatus}
          getReportPhotoUrls={getReportPhotoUrls}
          getReportContent={getReportContent}
          getReporterReliabilityTier={getReporterReliabilityTier}
          levelColors={levelColors}
          setPhotoModalUrl={setPhotoModalUrl}
          setRejectModal={setRejectModal}
          handleApprove={handleApprove}
          processing={processing}
        />
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-dashboard-card border border-dashboard-border p-6 shadow-xl">
            <h3 className="font-semibold text-zinc-100 mb-2">Từ chối báo cáo #{rejectModal.id}</h3>
            <p className="mb-2 text-sm text-zinc-400">Lý do từ chối (bắt buộc):</p>
            <textarea
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
              }}
              placeholder="Nhập lý do..."
              rows={3}
              className="mb-4 w-full rounded-xl border border-dashboard-border bg-dashboard-surface px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason('');
                  setRejectErrorToast('');
                }}
                className="flex-1 rounded-xl border border-dashboard-border bg-dashboard-surface py-2 text-zinc-200 hover:bg-white/10"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                className="flex-1 rounded-xl bg-red-600 py-2 text-white hover:bg-red-700"
              >
                Từ chối
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
          aria-label="Đóng"
        >
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPhotoModalUrl(null);
              }}
              className="absolute -right-2 -top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-dashboard-card border border-dashboard-border text-zinc-300 shadow-md hover:bg-white/10 hover:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
              aria-label="Đóng ảnh"
            >
              <FaXmark className="h-5 w-5" />
            </button>
            <ReportImage
              src={photoModalUrl}
              alt="Ảnh báo cáo ngập"
              className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
