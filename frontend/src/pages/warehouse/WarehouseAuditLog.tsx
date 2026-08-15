import type { ChangeEvent, KeyboardEvent } from 'react';
import { getErrorMessage } from '../../lib/errors';
import React, { useState, useEffect, useCallback } from 'react';
import { History, Search } from 'lucide-react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { searchAuditLogs } from '../../services/adminAuditLogService';

// ─── Hallmark palette ────────────────────────────────────────────────────────
const PRIMARY  = '#1F3B64';
const SUCCESS  = '#16A34A';
const WARNING  = '#D97706';
const ERROR_C  = '#DC2626';
const INFO     = '#2563EB';
const NEUTRAL  = '#64748B';

interface AuditLog {
  id: string;
  entityName: string;
  entityId: string;
  action: string;
  actorEmail?: string;
  actorRole?: string;
  reason?: string;
  createdAt: string;
}

interface AuditLogPage {
  items: AuditLog[];
  totalPages: number;
}

// ─── Action badge helper ──────────────────────────────────────────────────────
function getActionBadgeStyle(action: string): React.CSSProperties {
  const a = (action || '').toLowerCase();
  let bg = NEUTRAL;
  if (a.includes('create'))       bg = SUCCESS;
  else if (a.includes('update'))  bg = INFO;
  else if (a.includes('delete'))  bg = ERROR_C;
  else if (a.includes('status'))  bg = WARNING;
  return {
    backgroundColor: bg,
    color: '#fff',
    fontSize: '10px',
    padding: '1px 8px',
    borderRadius: '9999px',
    fontWeight: 600,
    display: 'inline-block',
    whiteSpace: 'nowrap',
  };
}

function getActionLabel(action: string): string {
  const a = (action || '').toLowerCase();
  if (a.includes('create'))       return 'Tạo mới';
  if (a.includes('update'))       return 'Cập nhật';
  if (a.includes('delete'))       return 'Xoá';
  if (a.includes('status'))       return 'Đổi trạng thái';
  return action || '—';
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WarehouseAuditLog() {
  const [search, setSearch]           = useState('');
  const [logs, setLogs]               = useState<AuditLog[]>([]);
  const [loading, setLoading]         = useState(false);
  const [actionFilter, setActionFilter] = useState('');
  
  // Pagination
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res: AuditLogPage = await searchAuditLogs({
        page: page,
        pageSize: 15,
        searchQuery: search,
        action: actionFilter || undefined,
      });
      setLogs(res.items || []);
      setTotalPages(res.totalPages || 1);
    } catch (err: unknown) {
      if (getErrorMessage(err).includes('403')) {
        alert('Bạn không có quyền xem nhật ký thao tác.');
      } else {
        alert('Lỗi: ' + getErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, search]);

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, actionFilter]);

  const handleSearch = () => {
    if (page === 1) fetchLogs();
    else setPage(1);
  };

  return (
    <div className="flex flex-col h-full">
      {/* ── Fixed header ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-[10px] text-gray-400 mb-1">
          <span>Kho hàng</span>
          <span>/</span>
          <span>Nhật ký</span>
          <span>/</span>
          <span style={{ color: PRIMARY }} className="font-medium">Nhật ký thao tác</span>
        </nav>

        {/* Title row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <History size={16} style={{ color: PRIMARY }} />
            <span className="text-base font-bold" style={{ color: PRIMARY }}>
              Nhật Ký Thao Tác
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleSearch}
              className="h-7 text-xs px-3 flex items-center gap-1"
              style={{ backgroundColor: PRIMARY, color: '#fff', border: 'none' }}
              size="sm"
            >
              <Search size={12} />
              Tìm kiếm
            </Button>
          </div>
        </div>

        {/* Subtitle */}
        <p className="text-[10px] text-gray-400 mb-2">
          Trang {page} / {totalPages} · Lưu trữ tất cả thao tác hệ thống
        </p>

        {/* Filter row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search input */}
          <div className="relative flex items-center">
            <Search size={12} className="absolute left-2 text-gray-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSearch()}
              placeholder="Tìm theo email, đối tượng…"
              className="pl-8 h-7 text-xs bg-gray-50 w-56"
            />
          </div>

          {/* Action type filter */}
          <select
            value={actionFilter}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="h-7 text-xs border border-gray-200 rounded-md bg-gray-50 px-2 focus:outline-none focus:ring-1"
            style={{ color: NEUTRAL }}
          >
            <option value="">Tất cả loại thao tác</option>
            <option value="CREATE">Tạo mới</option>
            <option value="UPDATE">Cập nhật</option>
            <option value="DELETE">Xoá</option>
            <option value="STATUS_CHANGE">Đổi trạng thái</option>
            <option value="ROLE_CHANGE">Đổi vai trò</option>
            <option value="POST">Đăng sổ xuất kho</option>
            <option value="REVERSAL">Đảo chứng từ xuất kho</option>
          </select>
        </div>
      </div>

      {/* ── Scrollable body ─────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200" style={{ backgroundColor: '#F8FAFC' }}>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">Thời gian</th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">Người thao tác</th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">Vai trò</th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">Loại thao tác</th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-500 whitespace-nowrap">Đối tượng</th>
                <th className="px-4 py-2.5 text-left font-semibold text-gray-500">Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">
                    Đang tải…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400">
                    Không có dữ liệu nhật ký.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b border-gray-100 last:border-0 transition-colors hover:bg-blue-50/30"
                  >
                    {/* Thời gian */}
                    <td className="px-4 py-2.5 whitespace-nowrap text-gray-500">
                      {log.createdAt
                        ? new Date(log.createdAt).toLocaleString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </td>

                    {/* Người thao tác */}
                    <td className="px-4 py-2.5 whitespace-nowrap font-medium" style={{ color: PRIMARY }}>
                      {log.actorEmail || '—'}
                    </td>

                    {/* Vai trò */}
                    <td className="px-4 py-2.5 whitespace-nowrap text-gray-500">
                      {log.actorRole || '—'}
                    </td>

                    {/* Loại thao tác */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      <span style={getActionBadgeStyle(log.action)}>
                        {getActionLabel(log.action)}
                      </span>
                    </td>

                    {/* Đối tượng */}
                    <td className="px-4 py-2.5 whitespace-nowrap text-gray-600">
                      {log.entityName
                        ? `${log.entityName}${log.entityId ? ` #${log.entityId}` : ''}`
                        : '—'}
                    </td>

                    {/* Chi tiết */}
                    <td className="px-4 py-2.5 text-gray-500 max-w-xs truncate">
                      {log.reason || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ──────────────────────────────────────────────────────── */}
      <div className="px-4 py-2.5 border-t border-gray-200 flex items-center justify-between bg-gray-50 flex-shrink-0">
        <span className="text-[10px] text-gray-400">
          Trang <span className="font-semibold text-gray-600">{page}</span> / {totalPages}
        </span>

        <div className="flex items-center gap-1.5">
          <Button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            size="sm"
            className="h-6 text-[10px] px-2.5"
            style={{
              border: `1px solid ${PRIMARY}`,
              color: PRIMARY,
              background: 'white',
            }}
          >
            Trước
          </Button>

          {/* Page numbers – show at most 5 around current */}
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
            .reduce<(number | '…')[]>((acc, p, idx, arr) => {
              if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('…');
              acc.push(p);
              return acc;
            }, [])
            .map((p, idx) =>
              p === '…' ? (
                <span key={`ellipsis-${idx}`} className="text-[10px] text-gray-400 px-1">
                  …
                </span>
              ) : (
                <Button
                  key={p}
                  onClick={() => setPage(p as number)}
                  disabled={loading}
                  size="sm"
                  className="h-6 text-[10px] min-w-[22px] px-1.5"
                  style={
                    page === p
                      ? { backgroundColor: PRIMARY, color: '#fff', border: `1px solid ${PRIMARY}` }
                      : { border: '1px solid #E5E7EB', color: NEUTRAL, background: 'white' }
                  }
                >
                  {p}
                </Button>
              )
            )}

          <Button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            size="sm"
            className="h-6 text-[10px] px-2.5"
            style={{
              border: `1px solid ${PRIMARY}`,
              color: PRIMARY,
              background: 'white',
            }}
          >
            Sau
          </Button>
        </div>
      </div>
    </div>
  );
}
