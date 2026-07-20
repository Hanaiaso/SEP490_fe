import { useEffect, useState } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Search, Eye, RefreshCw, Download, CheckCircle, XCircle, Archive } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/sales-ui/dialog';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#D97706';
const ERROR   = '#DC2626';
const NEUTRAL = '#64748B';

const STATUS_CFG: Record<string, { label: string; bg: string }> = {
  Waiting:           { label: 'Chờ kiểm tra',    bg: NEUTRAL },
  ApprovedAvailable: { label: 'Đã duyệt – Khả dụng', bg: SUCCESS },
  ApprovedDamaged:   { label: 'Đã duyệt – Hư hỏng', bg: ERROR },
};

interface QuarantineItem {
  id: string;
  quarantineCode: string;
  orderId: string;
  orderCode: string;
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  reason: string;
  status: string;
  receivedByName: string;
  createdAt: string;
  dispatchedAction: string | null;
  dispatchedByName: string | null;
  dispatchedAt: string | null;
}

function api(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('accessToken');
  return fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) },
  });
}

function Badge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || { label: status, bg: NEUTRAL };
  return (
    <span
      className="text-[10px] font-semibold text-white px-2 py-0.5 inline-block whitespace-nowrap"
      style={{ backgroundColor: c.bg, borderRadius: 4 }}
    >
      {c.label}
    </span>
  );
}

export default function WarehouseQuarantine() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detail, setDetail] = useState<QuarantineItem | null>(null);
  const [items, setItems] = useState<QuarantineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dispatchLoading, setDispatchLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api('/api/warehouse-management/quarantine');
      if (!res.ok) throw new Error();
      const data: QuarantineItem[] = await res.json();
      setItems(data);
    } catch {
      showToast('Không thể tải danh sách cách ly.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const dispatch = async (id: string, action: 'available' | 'damaged', notes?: string) => {
    setDispatchLoading(id);
    try {
      const res = await api(`/api/warehouse-management/quarantine/${id}/dispatch`, {
        method: 'POST',
        body: JSON.stringify({ action, notes: notes || '' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast(data.message || 'Xét duyệt thành công!');
      setDetail(null);
      await fetchItems();
    } catch (err: any) {
      showToast(err.message || 'Có lỗi xảy ra.', 'error');
    } finally {
      setDispatchLoading(null);
    }
  };

  const filtered = items.filter((d) => {
    const q = search.toLowerCase();
    const ms = !q || d.quarantineCode.toLowerCase().includes(q)
      || d.productSku.toLowerCase().includes(q)
      || d.productName.toLowerCase().includes(q)
      || d.reason.toLowerCase().includes(q)
      || d.orderCode.toLowerCase().includes(q);
    return ms && (statusFilter === 'all' || d.status === statusFilter);
  });

  const toggleSelect = (id: string) => setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  const toggleAll = () => setSelected((p) => p.length === filtered.length ? [] : filtered.map((d) => d.id));

  const fmtDate = (s: string | null) => s ? new Date(s).toLocaleString('vi-VN') : '—';

  const pendingCount = items.filter((i) => i.status === 'Waiting').length;

  return (
    <div className="flex flex-col h-full">
      {toast && (
        <div className={`fixed right-4 top-14 z-50 rounded-lg px-4 py-2.5 text-sm text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] mb-0.5">
          <span className="text-gray-400">Kho hàng</span>
          <span className="text-gray-300">/</span>
          <span className="text-gray-800 font-semibold">Cách ly &amp; Kiểm định (Quarantine)</span>
        </div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Cách ly &amp; Kiểm định (Quarantine)</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {loading ? 'Đang tải...' : `${items.length} lô hàng · ${pendingCount} chờ kiểm định`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={fetchItems} disabled={loading}>
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Làm mới
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5">
              <Download className="w-3 h-3" /> Xuất Excel
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input className="pl-8 h-7 text-xs bg-gray-50" placeholder="Mã cách ly, SKU, lý do..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        {selected.length > 0 && (
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded px-3 py-2 mb-2 flex items-center gap-2 text-xs text-blue-700">
            <span className="font-medium">{selected.length} đã chọn</span>
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100" onClick={() => setSelected([])}>Hủy chọn</button>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5"><input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Mã cách ly</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Đơn hàng</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">SKU</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Sản phẩm</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">SL</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Lý do</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Người nhận</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Ngày tạo</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Trạng thái</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr><td colSpan={11} className="py-8 text-center text-xs text-gray-400">Đang tải dữ liệu...</td></tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-gray-400 text-xl">📋</span>
                      </div>
                      <p className="text-sm font-medium text-gray-500">Không có dữ liệu</p>
                      <p className="text-xs text-gray-400">Thay đổi bộ lọc để xem kết quả khác</p>
                    </div>
                  </td>
                </tr>
              )}
              {filtered.map((d, i) => (
                <tr key={d.id} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-3 py-2.5"><input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggleSelect(d.id)} /></td>
                  <td className="px-3 py-2.5 font-semibold" style={{ color: PRIMARY }}>{d.quarantineCode}</td>
                  <td className="px-3 py-2.5 text-gray-600 font-mono">{d.orderCode}</td>
                  <td className="px-3 py-2.5 font-mono text-gray-500">{d.productSku}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-800">{d.productName}</td>
                  <td className="px-3 py-2.5 text-center font-semibold text-gray-800">{d.quantity}</td>
                  <td className="px-3 py-2.5 text-gray-600 max-w-[140px] truncate">{d.reason}</td>
                  <td className="px-3 py-2.5 text-gray-700">{d.receivedByName}</td>
                  <td className="px-3 py-2.5 text-gray-500">{fmtDate(d.createdAt)}</td>
                  <td className="px-3 py-2.5 text-center"><Badge status={d.status} /></td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" onClick={() => setDetail(d)}>
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {d.status === 'Waiting' && (
                        <>
                          <button
                            className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600"
                            onClick={() => dispatch(d.id, 'available')}
                            disabled={dispatchLoading === d.id}
                            title="Duyệt – Chuyển khả dụng"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
                            onClick={() => dispatch(d.id, 'damaged')}
                            disabled={dispatchLoading === d.id}
                            title="Duyệt – Hư hỏng"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <span className="text-xs text-gray-500">Hiển thị {filtered.length} / {items.length} bản ghi</span>
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Chi tiết cách ly — {detail?.quarantineCode}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded p-3 space-y-1.5">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Thông tin hàng cách ly</p>
                  <div className="flex justify-between"><span className="text-gray-500">Mã cách ly:</span><span className="font-semibold" style={{ color: PRIMARY }}>{detail.quarantineCode}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Đơn hàng:</span><span className="font-mono">{detail.orderCode}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">SKU:</span><span className="font-mono">{detail.productSku}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Sản phẩm:</span><span className="font-medium text-gray-800">{detail.productName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Số lượng:</span><span className="font-semibold text-base" style={{ color: WARNING }}>{detail.quantity}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Người nhận:</span><span>{detail.receivedByName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Ngày nhập QZ:</span><span>{fmtDate(detail.createdAt)}</span></div>
                </div>
                <div className="bg-gray-50 rounded p-3 space-y-1.5">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Kết quả kiểm định</p>
                  <div className="flex justify-between"><span className="text-gray-500">Trạng thái:</span><Badge status={detail.status} /></div>
                  {detail.dispatchedByName && (
                    <>
                      <div className="flex justify-between"><span className="text-gray-500">Người duyệt:</span><span>{detail.dispatchedByName}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Thời gian duyệt:</span><span>{fmtDate(detail.dispatchedAt)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Kết quả:</span>
                        <span className="font-semibold" style={{ color: detail.dispatchedAction === 'available' ? SUCCESS : ERROR }}>
                          {detail.dispatchedAction === 'available' ? 'Chuyển về kho khả dụng' : 'Chuyển sang kho hư hỏng'}
                        </span>
                      </div>
                    </>
                  )}
                  <div className="space-y-1 pt-2">
                    <span className="text-gray-500">Lý do cách ly:</span>
                    <p className="text-gray-800">{detail.reason}</p>
                  </div>
                </div>
              </div>

              {/* Action buttons (chỉ hiện nếu Waiting) */}
              {detail.status === 'Waiting' && (
                <div className="flex gap-2 pt-2 border-t border-gray-100">
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    style={{ backgroundColor: SUCCESS }}
                    onClick={() => dispatch(detail.id, 'available')}
                    disabled={dispatchLoading === detail.id}
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Chuyển Khả dụng
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    style={{ backgroundColor: WARNING }}
                    onClick={() => dispatch(detail.id, 'damaged')}
                    disabled={dispatchLoading === detail.id}
                  >
                    <Archive className="w-3.5 h-3.5" /> Chuyển Hư hỏng
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs ml-auto" onClick={() => setDetail(null)}>Đóng</Button>
                </div>
              )}
              {detail.status !== 'Waiting' && (
                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDetail(null)}>Đóng</Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
