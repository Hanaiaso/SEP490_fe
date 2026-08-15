import { getErrorMessage } from '../../lib/errors';
import { useEffect, useState, useCallback } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Search, Eye, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/sales-ui/dialog';
import { getStockAdjustments } from '../../services/warehouseService';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#D97706';
const ERROR = '#DC2626';
const NEUTRAL = '#64748B';

const STATUS_CFG: Record<string, { label: string; bg: string }> = {
  Pending: { label: 'Chờ duyệt', bg: WARNING },
  Approved: { label: 'Đã duyệt', bg: SUCCESS },
  Rejected: { label: 'Từ chối', bg: ERROR },
};

// Khớp StockAdjustmentDto (SEP490_be/VietTien.API/DTOs/Warehouse/StockAdjustmentDtos.cs)
interface StockAdjustment {
  id: string;
  inventoryId: string;
  itemName: string;
  itemSku: string;
  warehouseName: string;
  systemQuantity: number;
  physicalQuantity: number;
  variance: number;
  reason: string;
  status: string;
  proposedByUserId: string;
  proposedByName: string;
  proposedAt: string;
  decidedByUserId?: string | null;
  decidedByName?: string | null;
  decidedAt?: string | null;
  decisionNote?: string | null;
}

function Badge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || { label: status, bg: NEUTRAL };
  return <span className="text-[10px] font-semibold text-white px-2 py-0.5 inline-block whitespace-nowrap" style={{ backgroundColor: c.bg, borderRadius: 4 }}>{c.label}</span>;
}

function formatDate(iso?: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('vi-VN');
}

// P0-1: Warehouse Staff chỉ XEM lịch sử các đề xuất điều chỉnh tồn kho của chính mình
// (do chính họ tạo từ "Kiểm kê tồn kho") — quyết định Duyệt/Từ chối thuộc về CEO
// (xem trang riêng dành cho CEO, không phải trang này).
export default function WarehouseStockAdjustment() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [items, setItems] = useState<StockAdjustment[]>([]);
  const [detail, setDetail] = useState<StockAdjustment | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = statusFilter === 'all' ? undefined : { status: statusFilter };
      const data = await getStockAdjustments(params) as StockAdjustment[];
      setItems(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      alert('Lỗi khi tải danh sách đề xuất điều chỉnh: ' + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = items.filter(d => {
    const q = search.toLowerCase();
    return !q ||
      d.itemName.toLowerCase().includes(q) ||
      d.itemSku.toLowerCase().includes(q) ||
      d.warehouseName.toLowerCase().includes(q);
  });

  return (
    <div className="warehouse-hallmark-type flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-4 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] mb-0.5"><span className="text-gray-400">Kho hàng</span><span className="text-gray-300">/</span><span className="text-gray-400">Quản lý tồn kho (Inventory)</span><span className="text-gray-300">/</span><span className="text-gray-800 font-semibold">Lịch sử điều chỉnh tồn kho</span></div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 leading-tight">Lịch sử đề xuất điều chỉnh tồn kho</h2>
            <p className="text-xs text-gray-500 mt-0.5">{items.length} đề xuất · {items.filter(i => i.status === 'Pending').length} đang chờ CEO duyệt</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={loadData} disabled={loading}>
              <RefreshCw className="w-3 h-3" /> {loading ? 'Đang tải...' : 'Làm mới'}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded mb-3">
          <span className="text-blue-700 text-[11px]">
            <strong>Lưu ý:</strong> Đây là đề xuất bạn đã gửi khi kiểm kê tồn kho. Tồn kho chỉ thay đổi thật sau khi CEO duyệt.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input className="pl-8 h-7 text-xs bg-gray-50" placeholder="Tên sản phẩm, SKU, kho..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-gray-200 text-gray-700 font-semibold text-sm">
                <tr>
                  <th className="px-4 py-3">Sản phẩm / Vật tư</th>
                  <th className="px-4 py-3">Kho</th>
                  <th className="text-center px-4 py-3">SL hệ thống</th>
                  <th className="text-center px-4 py-3">SL thực tế</th>
                  <th className="text-center px-4 py-3">Chênh lệch</th>
                  <th className="px-4 py-3">Ngày đề xuất</th>
                  <th className="text-center px-4 py-3">Trạng thái</th>
                  <th className="text-center px-4 py-3">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center"><div className="flex flex-col items-center gap-2"><div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><span className="text-gray-400 text-xl">📋</span></div><p className="text-sm font-medium text-gray-500">Chưa có đề xuất nào</p><p className="text-xs text-gray-400">Tạo đề xuất mới ở trang "Kiểm kê tồn kho"</p></div></td></tr>
              )}
              {filtered.map((d, i) => (
                <tr key={d.id} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-4 py-3"><p className="font-mono text-gray-500">{d.itemSku || '-'}</p><p className="text-gray-800 font-medium">{d.itemName}</p></td>
                  <td className="px-4 py-3 text-gray-700">{d.warehouseName}</td>
                  <td className="px-4 py-3 text-center font-semibold">{d.systemQuantity}</td>
                  <td className="px-4 py-3 text-center font-semibold">{d.physicalQuantity}</td>
                  <td className="px-4 py-3 text-center font-mono font-semibold" style={{ color: d.variance < 0 ? ERROR : d.variance > 0 ? SUCCESS : NEUTRAL }}>
                    {d.variance > 0 ? '+' : ''}{d.variance}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{formatDate(d.proposedAt)}</td>
                  <td className="px-4 py-3 text-center"><Badge status={d.status} /></td>
                  <td className="px-4 py-3 text-center">
                    <button className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" onClick={() => setDetail(d)}><Eye className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <span className="text-xs text-gray-500">Hiển thị {filtered.length} / {items.length} bản ghi</span>
          </div>
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Chi tiết đề xuất điều chỉnh</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-xs">
              <div className="bg-gray-50 rounded p-3 space-y-1.5">
                <div className="flex justify-between"><span className="text-gray-500">Sản phẩm / Vật tư:</span><span className="font-medium">{detail.itemName} ({detail.itemSku || '-'})</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Kho:</span><span className="font-medium">{detail.warehouseName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">SL hệ thống:</span><span className="font-semibold">{detail.systemQuantity}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">SL thực tế:</span><span className="font-semibold">{detail.physicalQuantity}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Chênh lệch:</span><span className="font-semibold" style={{ color: detail.variance < 0 ? ERROR : detail.variance > 0 ? SUCCESS : NEUTRAL }}>{detail.variance > 0 ? '+' : ''}{detail.variance}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Trạng thái:</span><Badge status={detail.status} /></div>
              </div>
              <div className="bg-gray-50 rounded p-3 space-y-1">
                <p className="text-gray-500">Lý do chênh lệch:</p>
                <p className="text-gray-800 italic">"{detail.reason}"</p>
              </div>
              <div className="bg-gray-50 rounded p-3 space-y-1.5">
                <div className="flex justify-between"><span className="text-gray-500">Người đề xuất:</span><span>{detail.proposedByName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Ngày đề xuất:</span><span>{formatDate(detail.proposedAt)}</span></div>
                {detail.status !== 'Pending' && (
                  <>
                    <div className="flex justify-between"><span className="text-gray-500">Người duyệt:</span><span>{detail.decidedByName || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Ngày duyệt:</span><span>{formatDate(detail.decidedAt)}</span></div>
                    {detail.decisionNote && <div className="pt-1 border-t border-gray-200"><p className="text-gray-500 mb-0.5">Ghi chú của CEO:</p><p className="text-gray-800 italic">"{detail.decisionNote}"</p></div>}
                  </>
                )}
              </div>
              <div className="flex justify-end pt-2 border-t border-gray-100">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDetail(null)}>Đóng</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
