import React, { useEffect, useMemo, useState } from 'react';
import { fetchPendingReports, fetchCrowdReports, moderateReport } from '../services/api';
import { getReporterReliabilityTier } from '../utils/reliabilityHelpers';
import { FaCheck, FaXmark, FaArrowsRotate, FaFilter, FaStar } from 'react-icons/fa6';

const FLOOD_LEVELS = ['Tất cả', 'Nặng', 'Trung bình', 'Nhẹ'];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả báo cáo' },
  { value: 'pending', label: 'Chờ duyệt' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'rejected', label: 'Đã từ chối' },
];

/** Chuẩn hóa status từ BE (có thể là status, moderation_status, is_approved, v.v.) */
function getReportStatus(report) {
  if (report.status) return report.status;
  if (report.moderation_status) return report.moderation_status;
  if (typeof report.is_approved === 'boolean') return report.is_approved ? 'approved' : 'rejected';
  return 'pending';
}

export default function ModerationPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'pending' | 'approved' | 'rejected'
  const [filterLevel, setFilterLevel] = useState('Tất cả');
  const [searchText, setSearchText] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [photoModalUrl, setPhotoModalUrl] = useState(null);

  const loadReports = async () => {
    setLoading(true);
    if (filterStatus === 'pending') {
      const result = await fetchPendingReports(100);
      if (result.success && result.data) setReports(result.data);
      else setReports([]);
    } else {
      const statusParam = filterStatus === 'all' ? null : filterStatus;
      const result = await fetchCrowdReports(200, 0, statusParam);
      if (result.success && result.data) setReports(result.data);
      else setReports([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadReports();
    const interval = setInterval(loadReports, 15000);
    return () => clearInterval(interval);
  }, [filterStatus]);

  const handleApprove = async (reportId) => {
    setProcessing(reportId);
    setMessage({ type: '', text: '' });
    const result = await moderateReport(reportId, 'approve');
    setProcessing(null);
    if (result.success) {
      setMessage({ type: 'success', text: result.message || 'Đã duyệt báo cáo' });
      loadReports();
    } else {
      setMessage({ type: 'error', text: result.error || 'Không thể duyệt' });
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectModal) return;
    const reason = rejectReason.trim();
    if (!reason) {
      setMessage({ type: 'error', text: 'Vui lòng nhập lý do từ chối' });
      return;
    }
    setProcessing(rejectModal.id);
    setMessage({ type: '', text: '' });
    const result = await moderateReport(rejectModal.id, 'reject', reason);
    setProcessing(null);
    setRejectModal(null);
    setRejectReason('');
    if (result.success) {
      setMessage({ type: 'success', text: result.message || 'Đã từ chối báo cáo' });
      loadReports();
    } else {
      setMessage({ type: 'error', text: result.error || 'Không thể từ chối' });
    }
  };

  const levelColors = { Nặng: 'text-red-600', 'Trung bình': 'text-amber-600', Nhẹ: 'text-sky-600' };

  const filteredReports = useMemo(() => {
    let list = [...reports];
    if (filterStatus !== 'all') {
      list = list.filter((r) => getReportStatus(r) === filterStatus);
    }
    if (filterLevel !== 'Tất cả') {
      list = list.filter((r) => (r.flood_level || '') === filterLevel);
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(
        (r) =>
          (r.location_description || '').toLowerCase().includes(q) ||
          (r.id?.toString() || '').includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortBy === 'reliability_desc') {
        const sa = Number(a.reporter_reliability ?? 0);
        const sb = Number(b.reporter_reliability ?? 0);
        return sb - sa;
      }
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      return sortBy === 'newest' ? tb - ta : ta - tb;
    });
    return list;
  }, [reports, filterStatus, filterLevel, searchText, sortBy]);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-800">Kiểm duyệt báo cáo</h1>
        <button
          type="button"
          onClick={loadReports}
          disabled={loading}
          className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <FaArrowsRotate /> Làm mới
        </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <span className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <FaFilter /> Bộ lọc
        </span>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        >
          {FLOOD_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level === 'Tất cả' ? 'Mức độ: Tất cả' : level}
            </option>
          ))}
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700"
        >
          <option value="newest">Mới nhất trước</option>
          <option value="oldest">Cũ nhất trước</option>
          <option value="reliability_desc">Độ tin cậy cao trước</option>
        </select>
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Tìm theo địa điểm, mô tả, ID..."
          className="min-w-[200px] rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400"
        />
        {(filterLevel !== 'Tất cả' || searchText.trim() || filterStatus !== 'all') && (
          <button
            type="button"
            onClick={() => {
              setFilterStatus('all');
              setFilterLevel('Tất cả');
              setSearchText('');
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {message.text && (
        <div
          className={`mb-4 rounded-lg px-4 py-2 text-sm ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}
      {loading ? (
        <p className="text-slate-500">Đang tải...</p>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          <FaCheck className="mx-auto mb-2 h-10 w-10 text-green-500" />
          <p className="font-medium">
            {filterStatus === 'pending'
              ? 'Không có báo cáo nào cần duyệt'
              : 'Không có báo cáo nào'}
          </p>
          <p className="text-sm">
            {filterStatus === 'pending' ? 'Tất cả báo cáo đã được xử lý' : 'Thử chọn trạng thái khác hoặc xóa bộ lọc'}
          </p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          <p className="font-medium">Không có báo cáo nào khớp bộ lọc</p>
          <p className="text-sm">Thử đổi mức độ hoặc từ khóa tìm kiếm</p>
          <button
            type="button"
            onClick={() => {
              setFilterLevel('Tất cả');
              setSearchText('');
            }}
            className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : (
        <>
          {(filterLevel !== 'Tất cả' || searchText.trim() || filterStatus !== 'all') && (
            <p className="mb-3 text-sm text-slate-500">
              Hiển thị {filteredReports.length} / {reports.length} báo cáo
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredReports.map((report) => (
            <div
              key={report.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs text-slate-500">#{report.id}</span>
                <span className={`text-sm font-medium ${levelColors[report.flood_level] || 'text-slate-600'}`}>
                  {report.flood_level || '—'}
                </span>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-xs font-medium ${
                    getReportStatus(report) === 'pending'
                      ? 'bg-amber-100 text-amber-800'
                      : getReportStatus(report) === 'approved'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {getReportStatus(report) === 'pending'
                    ? 'Chờ duyệt'
                    : getReportStatus(report) === 'approved'
                      ? 'Đã duyệt'
                      : 'Đã từ chối'}
                </span>
              </div>
              {(() => {
                const score = report.reporter_reliability != null ? Number(report.reporter_reliability) : null;
                const tier = score != null ? getReporterReliabilityTier(score) : null;
                return tier ? (
                  <div className="mb-2 flex items-center gap-1.5">
                    <FaStar className="text-amber-500" style={{ fontSize: '12px' }} />
                    <span
                      className="rounded px-2 py-0.5 text-xs font-medium"
                      style={{ backgroundColor: tier.bgLight, color: tier.color }}
                    >
                      {tier.tier} ({score})
                    </span>
                  </div>
                ) : null;
              })()}
              <p className="mb-2 text-sm text-slate-700 line-clamp-2">
                {report.location_description || `Tọa độ: ${report.lat?.toFixed(4)}, ${report.lng?.toFixed(4)}`}
              </p>
              <div className="report-photo mb-3">
                {report.photo_url ? (
                  <button
                    type="button"
                    onClick={() => setPhotoModalUrl(report.photo_url)}
                    className="block w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <img
                      src={report.photo_url}
                      alt="Ảnh báo cáo ngập"
                      className="h-32 w-full object-cover object-center"
                    />
                  </button>
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-xs text-slate-400">
                    Không có ảnh
                  </div>
                )}
              </div>
              <p className="mb-3 text-xs text-slate-500">
                {report.created_at ? new Date(report.created_at).toLocaleString('vi-VN') : ''}
              </p>
              {getReportStatus(report) === 'pending' ? (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleApprove(report.id)}
                    disabled={processing === report.id}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-green-600 py-2 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    <FaCheck /> Duyệt
                  </button>
                  <button
                    type="button"
                    onClick={() => setRejectModal(report)}
                    disabled={processing === report.id}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-600 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    <FaXmark /> Từ chối
                  </button>
                </div>
              ) : (
                <p className="text-center text-xs text-slate-400">Đã xử lý</p>
              )}
            </div>
          ))}
          </div>
        </>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="font-semibold text-slate-800 mb-2">Từ chối báo cáo #{rejectModal.id}</h3>
            <p className="mb-2 text-sm text-slate-600">Lý do từ chối (bắt buộc):</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do..."
              rows={3}
              className="mb-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setRejectModal(null);
                  setRejectReason('');
                }}
                className="flex-1 rounded-lg border border-slate-300 py-2 text-slate-700"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                className="flex-1 rounded-lg bg-red-600 py-2 text-white hover:bg-red-700"
              >
                Từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {photoModalUrl && (
        <div
          className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPhotoModalUrl(null)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Escape' && setPhotoModalUrl(null)}
          aria-label="Đóng"
        >
          <img
            src={photoModalUrl}
            alt="Ảnh báo cáo ngập"
            className="max-h-[90vh] max-w-full rounded-lg object-contain shadow-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
