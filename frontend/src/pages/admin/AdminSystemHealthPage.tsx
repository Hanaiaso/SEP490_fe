import { useEffect, useState } from 'react';
import { RefreshCw, Eye } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
  getJobRunsSummary, searchJobRuns, retryJob, searchWebhookLogs, retryWebhookLog,
} from '../../services/adminSystemHealthService.js';

function formatDate(iso: string | null | undefined) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('vi-VN');
}

function formatDuration(ms: number | null | undefined) {
  if (ms === null || ms === undefined) return '-';
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`;
}

const JOB_STATUS_STYLE: Record<string, string> = {
  Running: 'bg-blue-100 text-blue-700',
  Success: 'bg-green-100 text-green-700',
  Failed: 'bg-red-100 text-red-700',
};

const WEBHOOK_STATUS_STYLE: Record<string, string> = {
  Received: 'bg-gray-100 text-gray-600',
  Processed: 'bg-green-100 text-green-700',
  Failed: 'bg-red-100 text-red-700',
  Abandoned: 'bg-orange-100 text-orange-800',
};

function StatusBadge({ status, styleMap }: { status: string; styleMap: Record<string, string> }) {
  return <span className={`px-2 py-1 rounded text-xs ${styleMap[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

function PaginationBar({ page, totalPages, totalCount, unit, onChange }: {
  page: number; totalPages: number; totalCount: number; unit: string; onChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between text-[12px] text-[#64748b]">
      <span>Tổng {totalCount} {unit}</span>
      <div className="flex items-center gap-2">
        <button disabled={page <= 1} onClick={() => onChange(page - 1)}
          className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">Trước</button>
        <span>Trang {page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => onChange(page + 1)}
          className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">Sau</button>
      </div>
    </div>
  );
}

// ─── Panel: Job Runs ─────────────────────────────────────────────────────────
function JobRunsPanel() {
  const { toast } = useToast();
  const [summary, setSummary] = useState<any[]>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [retryingJob, setRetryingJob] = useState<string | null>(null);

  const [runs, setRuns] = useState<any[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [jobNameFilter, setJobNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const loadSummary = async () => {
    setLoadingSummary(true);
    try {
      setSummary(await getJobRunsSummary());
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingSummary(false);
    }
  };

  const loadRuns = async () => {
    setLoadingRuns(true);
    try {
      const result = await searchJobRuns({
        page, pageSize: 20,
        jobName: jobNameFilter || undefined,
        status: statusFilter || undefined,
      });
      setRuns(result.items || []);
      setTotalPages(result.totalPages || 1);
      setTotalCount(result.totalCount || 0);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoadingRuns(false);
    }
  };

  useEffect(() => { loadSummary(); }, []);
  useEffect(() => { loadRuns(); }, [page, jobNameFilter, statusFilter]);

  const handleRetry = async (jobName: string) => {
    setRetryingJob(jobName);
    try {
      await retryJob(jobName);
      toast.success(`Đã chạy lại job "${jobName}".`);
      await Promise.all([loadSummary(), loadRuns()]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRetryingJob(null);
    }
  };

  return (
    <div className="flex flex-col gap-[16px]">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {loadingSummary ? (
          <div className="col-span-4 text-center py-4 text-sm text-gray-500">Đang tải...</div>
        ) : summary.map(s => (
          <div key={s.jobName} className="bg-white border border-[#e5e7eb] rounded-[8px] p-[14px] flex flex-col gap-2">
            <div className="flex justify-between items-start">
              <span className="font-semibold text-[13px] text-[#1f3b64]">{s.jobName}</span>
              {s.isCurrentlyRunning && <span className="text-[10px] text-blue-600 animate-pulse">● Đang chạy</span>}
            </div>
            <span className="text-[10px] text-gray-400">Chu kỳ: {s.intervalDescription}</span>
            {s.lastRun ? (
              <>
                <div className="flex items-center gap-1.5">
                  <StatusBadge status={s.lastRun.status} styleMap={JOB_STATUS_STYLE} />
                  <span className="text-[10px] text-gray-400">{formatDate(s.lastRun.startedAt)}</span>
                </div>
                {s.lastRun.errorMessage && (
                  <p className="text-[10px] text-red-500 truncate" title={s.lastRun.errorMessage}>{s.lastRun.errorMessage}</p>
                )}
              </>
            ) : (
              <span className="text-[10px] text-gray-400">Chưa từng chạy</span>
            )}
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-gray-500">
                Hôm nay: <span className="text-green-600 font-medium">{s.todaySuccessCount} ✓</span> / <span className="text-red-500 font-medium">{s.todayFailureCount} ✗</span>
              </span>
              <button onClick={() => handleRetry(s.jobName)} disabled={retryingJob === s.jobName}
                className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 disabled:opacity-50">
                <RefreshCw className={`w-3 h-3 ${retryingJob === s.jobName ? 'animate-spin' : ''}`} /> Chạy lại
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 items-center bg-white border border-[#e5e7eb] rounded-[8px] p-[12px]">
        <select className="border rounded px-2 py-1.5 text-xs" value={jobNameFilter}
          onChange={e => { setPage(1); setJobNameFilter(e.target.value); }}>
          <option value="">Tất cả job</option>
          {summary.map(s => <option key={s.jobName} value={s.jobName}>{s.jobName}</option>)}
        </select>
        <select className="border rounded px-2 py-1.5 text-xs" value={statusFilter}
          onChange={e => { setPage(1); setStatusFilter(e.target.value); }}>
          <option value="">Tất cả trạng thái</option>
          <option value="Running">Đang chạy</option>
          <option value="Success">Thành công</option>
          <option value="Failed">Thất bại</option>
        </select>
      </div>

      {/* History table */}
      <div className="bg-white border border-[#e5e7eb] rounded-[8px] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f5f7fa] border-b border-[#e5e7eb]">
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Job</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Trạng thái</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Bắt đầu</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Thời gian chạy</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Số lượng xử lý</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Lỗi</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Loại kích hoạt</th>
            </tr>
          </thead>
          <tbody>
            {loadingRuns ? (
              <tr><td colSpan={7} className="text-center py-4 text-sm text-gray-500">Đang tải...</td></tr>
            ) : runs.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-4 text-sm text-gray-500">Chưa có dữ liệu</td></tr>
            ) : runs.map(r => (
              <tr key={r.id} className="border-b border-[#f5f7fa] hover:bg-[#f5f7fa]">
                <td className="px-[16px] py-[12px] text-[12px] font-medium text-[#1f3b64]">{r.jobName}</td>
                <td className="px-[16px] py-[12px]"><StatusBadge status={r.status} styleMap={JOB_STATUS_STYLE} /></td>
                <td className="px-[16px] py-[12px] text-[12px] text-[#64748b] whitespace-nowrap">{formatDate(r.startedAt)}</td>
                <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">{formatDuration(r.durationMs)}</td>
                <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">{r.itemsProcessed ?? '-'}</td>
                <td className="px-[16px] py-[12px] text-[12px] text-red-500 max-w-[200px] truncate" title={r.errorMessage || ''}>{r.errorMessage || '-'}</td>
                <td className="px-[16px] py-[12px] text-[12px]">
                  <span className={`px-2 py-1 rounded text-xs ${r.triggerType === 'Manual' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                    {r.triggerType === 'Manual' ? 'Thủ công' : 'Tự động'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaginationBar page={page} totalPages={totalPages} totalCount={totalCount} unit="lượt chạy" onChange={setPage} />
    </div>
  );
}

// ─── Modal: chi tiết webhook ─────────────────────────────────────────────────
function WebhookDetailModal({ log, onClose }: { log: any; onClose: () => void }) {
  function prettyJson(raw: string | null) {
    if (!raw) return '(không có)';
    try { return JSON.stringify(JSON.parse(raw), null, 2); } catch { return raw; }
  }
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] overflow-y-auto flex flex-col gap-4 shadow-xl">
        <div className="border-b pb-2">
          <h2 className="text-lg font-semibold text-[#1f3b64]">Webhook — {log.source}</h2>
          <p className="text-xs text-gray-500 mt-1">
            Nhận lúc {formatDate(log.receivedAt)} · Trạng thái: {log.status} · Số lần thử: {log.attemptCount}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Payload</label>
          <pre className="bg-gray-50 border rounded p-3 text-[11px] overflow-x-auto whitespace-pre-wrap">{prettyJson(log.rawPayload)}</pre>
        </div>
        {log.lastError && (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Lỗi gần nhất</label>
            <p className="bg-red-50 border border-red-100 rounded p-3 text-[11px] text-red-600">{log.lastError}</p>
          </div>
        )}
        <div className="flex justify-end border-t pt-3">
          <button onClick={onClose} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Đóng</button>
        </div>
      </div>
    </div>
  );
}

// ─── Panel: Webhook Logs ─────────────────────────────────────────────────────
function WebhookLogsPanel() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [detailLog, setDetailLog] = useState<any>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await searchWebhookLogs({ page, pageSize: 20, status: statusFilter || undefined });
      setLogs(result.items || []);
      setTotalPages(result.totalPages || 1);
      setTotalCount(result.totalCount || 0);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, statusFilter]);

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      await retryWebhookLog(id);
      toast.success('Đã thử lại webhook.');
      await load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex gap-3 items-center bg-white border border-[#e5e7eb] rounded-[8px] p-[12px]">
        <select className="border rounded px-2 py-1.5 text-xs" value={statusFilter}
          onChange={e => { setPage(1); setStatusFilter(e.target.value); }}>
          <option value="">Tất cả trạng thái</option>
          <option value="Received">Đã nhận</option>
          <option value="Processed">Đã xử lý</option>
          <option value="Failed">Thất bại</option>
          <option value="Abandoned">Đã bỏ cuộc</option>
        </select>
      </div>

      <div className="bg-white border border-[#e5e7eb] rounded-[8px] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f5f7fa] border-b border-[#e5e7eb]">
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Nhận lúc</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Nguồn</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Trạng thái</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Số lần thử</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Lỗi gần nhất</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Xử lý lúc</th>
              <th className="text-center px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-4 text-sm text-gray-500">Đang tải...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-4 text-sm text-gray-500">Chưa có dữ liệu</td></tr>
            ) : logs.map(log => (
              <tr key={log.id} className="border-b border-[#f5f7fa] hover:bg-[#f5f7fa]">
                <td className="px-[16px] py-[12px] text-[12px] text-[#64748b] whitespace-nowrap">{formatDate(log.receivedAt)}</td>
                <td className="px-[16px] py-[12px] text-[12px] text-[#1f3b64] font-medium">{log.source}</td>
                <td className="px-[16px] py-[12px]"><StatusBadge status={log.status} styleMap={WEBHOOK_STATUS_STYLE} /></td>
                <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">{log.attemptCount}</td>
                <td className="px-[16px] py-[12px] text-[12px] text-red-500 max-w-[180px] truncate" title={log.lastError || ''}>{log.lastError || '-'}</td>
                <td className="px-[16px] py-[12px] text-[12px] text-[#64748b] whitespace-nowrap">{formatDate(log.processedAt)}</td>
                <td className="px-[16px] py-[12px]">
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => setDetailLog(log)} title="Xem chi tiết" className="text-[#3b82f6] hover:text-[#2563eb]">
                      <Eye className="w-4 h-4" />
                    </button>
                    {log.status === 'Failed' && (
                      <button onClick={() => handleRetry(log.id)} disabled={retryingId === log.id} title="Thử lại"
                        className="text-orange-600 hover:text-orange-800 disabled:opacity-50">
                        <RefreshCw className={`w-4 h-4 ${retryingId === log.id ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PaginationBar page={page} totalPages={totalPages} totalCount={totalCount} unit="webhook" onChange={setPage} />

      {detailLog && <WebhookDetailModal log={detailLog} onClose={() => setDetailLog(null)} />}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminSystemHealthPage() {
  const [tab, setTab] = useState<'jobs' | 'webhooks'>('jobs');

  return (
    <div className="flex flex-col gap-[20px] p-[24px]">
      <div>
        <h1 className="font-semibold text-[20px] text-[#1f3b64]">Giám sát hệ thống</h1>
        <p className="text-xs text-gray-500 mt-1">Theo dõi các tác vụ nền định kỳ và nhật ký webhook SePay.</p>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab('jobs')}
          className={`px-4 py-2 rounded-[4px] text-[12px] font-medium ${tab === 'jobs' ? 'bg-[#1f3b64] text-white' : 'bg-white border border-[#e5e7eb] text-[#64748b] hover:bg-gray-50'}`}>
          Tác vụ nền (Job Runs)
        </button>
        <button onClick={() => setTab('webhooks')}
          className={`px-4 py-2 rounded-[4px] text-[12px] font-medium ${tab === 'webhooks' ? 'bg-[#1f3b64] text-white' : 'bg-white border border-[#e5e7eb] text-[#64748b] hover:bg-gray-50'}`}>
          Nhật ký Webhook
        </button>
      </div>

      {tab === 'jobs' ? <JobRunsPanel /> : <WebhookLogsPanel />}
    </div>
  );
}
