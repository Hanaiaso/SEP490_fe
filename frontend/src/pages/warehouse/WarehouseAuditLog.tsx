import type { ChangeEvent, KeyboardEvent } from 'react';
import { getErrorMessage } from '../../lib/errors';
import React, { useState, useEffect, useCallback } from 'react';
import { History, Search, Filter, Clock } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { searchAuditLogs } from '../../services/adminAuditLogService';

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

export default function WarehouseAuditLog() {
  const [search, setSearch] = useState('');
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionFilter, setActionFilter] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res: AuditLogPage = await searchAuditLogs({
        page: page,
        pageSize: 15,
        searchQuery: search,
        action: actionFilter || undefined
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

  // Chỉ tự động tải lại khi đổi trang hoặc bộ lọc hành động; gõ ô tìm kiếm không tự
  // fetch — người dùng phải bấm nút "Tìm kiếm" (xem handleSearch bên dưới).
  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, actionFilter]);

  const handleSearch = () => {
    if (page === 1) fetchLogs();
    else setPage(1);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <History className="w-6 h-6 text-gray-600" />
            Nhật Ký Thao Tác
          </h1>
          <p className="text-xs text-gray-500 mt-1">Lưu trữ tất cả các hoạt động thay đổi dữ liệu trong hệ thống kho</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Tìm kiếm</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input 
              placeholder="Người dùng, thao tác, đối tượng..." 
              className="pl-9 h-9 text-sm"
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setSearch(e.target.value)}
              onKeyDown={(e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </div>
        <div className="w-48 space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Loại thao tác</label>
          <select 
            className="h-9 text-sm border border-gray-200 rounded-md px-2.5 bg-white w-full"
            value={actionFilter}
            onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">Tất cả</option>
            <option value="Update">Update</option>
            <option value="Create">Create</option>
            <option value="Delete">Delete</option>
            <option value="StatusChange">StatusChange</option>
          </select>
        </div>
        <Button variant="outline" className="h-9 gap-2" onClick={handleSearch}>
          <Filter className="w-4 h-4" /> Lọc
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-gray-200 text-gray-700 font-semibold">
              <tr>
                <th className="px-4 py-3 w-48">Thời gian</th>
                <th className="px-4 py-3 w-40">Người thao tác</th>
                <th className="px-4 py-3 w-40">Loại thao tác</th>
                <th className="px-4 py-3 w-48">Đối tượng</th>
                <th className="px-4 py-3">Chi tiết thay đổi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">Đang tải dữ liệu...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-500">Không tìm thấy dữ liệu nhật ký thao tác</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500">
                    <div className="flex items-center gap-1.5 text-xs">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(log.createdAt).toLocaleString('vi-VN')}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{log.actorEmail || 'Hệ thống'}</td>
                  <td className="px-4 py-3 text-blue-600 font-medium">{log.action}</td>
                  <td className="px-4 py-3 font-mono text-gray-600 text-xs">{log.entityName}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs truncate max-w-sm" title={log.reason}>
                    {log.reason || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2 ml-auto">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-7 text-xs">Trước</Button>
            <span className="text-xs text-gray-600 font-medium">Trang {page} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-7 text-xs">Sau</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
