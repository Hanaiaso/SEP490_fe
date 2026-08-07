import { useEffect, useState } from 'react';
import { Search, Download, Eye } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { searchAuditLogs, exportAuditLogsCsv } from '../../services/adminAuditLogService.js';

function formatDate(iso: string) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('vi-VN');
}

function prettyJson(raw: string | null) {
  if (!raw) return '(không có)';
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function DetailModal({ log, onClose }: { log: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-[720px] max-h-[80vh] overflow-y-auto flex flex-col gap-4 shadow-xl">
        <div className="border-b pb-2">
          <h2 className="text-lg font-semibold text-[#1f3b64]">
            {log.entityName} — {log.action}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {formatDate(log.createdAt)} · {log.actorEmail || 'Hệ thống'} ({log.actorRole || '-'}) · IP: {log.ipAddress || '-'}
          </p>
          {log.reason && <p className="text-xs text-gray-600 italic mt-1">Lý do: {log.reason}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Trước khi thay đổi (Before)</label>
            <pre className="bg-red-50 border border-red-100 rounded p-3 text-[11px] overflow-x-auto whitespace-pre-wrap">{prettyJson(log.beforeJson)}</pre>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Sau khi thay đổi (After)</label>
            <pre className="bg-green-50 border border-green-100 rounded p-3 text-[11px] overflow-x-auto whitespace-pre-wrap">{prettyJson(log.afterJson)}</pre>
          </div>
        </div>
        <div className="flex justify-end border-t pt-3">
          <button onClick={onClose} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Đóng</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminAuditLogPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [detailTarget, setDetailTarget] = useState<any>(null);

  const [filters, setFilters] = useState({ entityName: '', action: '', searchQuery: '', fromDate: '', toDate: '' });
  const [searchInput, setSearchInput] = useState('');

  const currentQuery = () => ({
    page, pageSize: 20,
    entityName: filters.entityName || undefined,
    action: filters.action || undefined,
    searchQuery: filters.searchQuery || undefined,
    fromDate: filters.fromDate ? new Date(filters.fromDate).toISOString() : undefined,
    toDate: filters.toDate ? new Date(filters.toDate).toISOString() : undefined,
  });

  const load = async () => {
    setLoading(true);
    try {
      const result = await searchAuditLogs(currentQuery());
      setLogs(result.items || []);
      setTotalPages(result.totalPages || 1);
      setTotalCount(result.totalCount || 0);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, filters]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setFilters(f => ({ ...f, searchQuery: searchInput.trim() }));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportAuditLogsCsv(currentQuery());
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-[20px] p-[24px]">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-semibold text-[20px] text-[#1f3b64]">Nhật ký kiểm toán</h1>
          <p className="text-xs text-gray-500 mt-1">Chỉ đọc — không thể sửa/xóa. Ghi lại mọi thay đổi cấu hình, phân quyền và các thao tác quản trị.</p>
        </div>
        <button onClick={handleExport} disabled={exporting}
          className="flex items-center gap-2 bg-[#1f3b64] text-white px-[16px] py-[8px] rounded-[4px] text-[12px] font-medium hover:bg-[#162a4a] disabled:opacity-50">
          <Download className="w-4 h-4" /> {exporting ? 'Đang xuất...' : 'Xuất CSV'}
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center bg-white border border-[#e5e7eb] rounded-[8px] p-[12px]">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-gray-400" />
          <input className="flex-1 text-sm outline-none" placeholder="Tìm theo đối tượng, người thực hiện, lý do..."
            value={searchInput} onChange={e => setSearchInput(e.target.value)} />
        </form>
        <input className="border rounded px-2 py-1.5 text-xs w-[160px]" placeholder="Entity (vd: SystemConfig)"
          value={filters.entityName} onChange={e => { setPage(1); setFilters(f => ({ ...f, entityName: e.target.value })); }} />
        <input className="border rounded px-2 py-1.5 text-xs w-[160px]" placeholder="Action (vd: UPDATE)"
          value={filters.action} onChange={e => { setPage(1); setFilters(f => ({ ...f, action: e.target.value })); }} />
        <input type="date" className="border rounded px-2 py-1.5 text-xs"
          value={filters.fromDate} onChange={e => { setPage(1); setFilters(f => ({ ...f, fromDate: e.target.value })); }} />
        <span className="text-xs text-gray-400">đến</span>
        <input type="date" className="border rounded px-2 py-1.5 text-xs"
          value={filters.toDate} onChange={e => { setPage(1); setFilters(f => ({ ...f, toDate: e.target.value })); }} />
      </div>

      {/* Table */}
      <div className="bg-white border border-[#e5e7eb] rounded-[8px] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f5f7fa] border-b border-[#e5e7eb]">
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Thời gian</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Đối tượng</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Hành động</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Người thực hiện</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Lý do</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">IP</th>
              <th className="text-center px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-4 text-sm text-gray-500">Đang tải...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-4 text-sm text-gray-500">Chưa có dữ liệu</td></tr>
            ) : logs.map(log => (
              <tr key={log.id} className={`border-b border-[#f5f7fa] hover:bg-[#f5f7fa] ${log.action === 'PERMISSION_DENIED' ? 'bg-red-50/50' : ''}`}>
                <td className="px-[16px] py-[12px] text-[12px] text-[#64748b] whitespace-nowrap">{formatDate(log.createdAt)}</td>
                <td className="px-[16px] py-[12px] text-[12px]">
                  <span className="font-medium text-[#1f3b64]">{log.entityName}</span>
                  <span className="block text-[10px] text-gray-400 max-w-[160px] truncate">{log.entityId}</span>
                </td>
                <td className="px-[16px] py-[12px] text-[12px]">
                  <span className={`px-2 py-1 rounded text-xs ${log.action === 'PERMISSION_DENIED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                    {log.action}
                  </span>
                </td>
                <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">
                  {log.actorEmail || 'Hệ thống'} <span className="text-[10px] text-gray-400">({log.actorRole || '-'})</span>
                </td>
                <td className="px-[16px] py-[12px] text-[12px] text-[#64748b] max-w-[200px] truncate">{log.reason || '-'}</td>
                <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">{log.ipAddress || '-'}</td>
                <td className="px-[16px] py-[12px] text-center">
                  <button onClick={() => setDetailTarget(log)} title="Xem chi tiết" className="text-[#3b82f6] hover:text-[#2563eb]">
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[12px] text-[#64748b]">
          <span>Tổng {totalCount} bản ghi</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">Trước</button>
            <span>Trang {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">Sau</button>
          </div>
        </div>
      )}

      {detailTarget && <DetailModal log={detailTarget} onClose={() => setDetailTarget(null)} />}
    </div>
  );
}
