import { useState } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Search, Eye, RefreshCw, Download, CheckCircle, XCircle, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/sales-ui/dialog';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#D97706';
const ERROR   = '#DC2626';
const INFO    = '#2563EB';
const NEUTRAL = '#64748B';

const STATUS_CFG: Record<string, { label: string; bg: string }> = {
  pending:  { label: 'Chờ duyệt',   bg: WARNING },
  approved: { label: 'Đã duyệt',    bg: SUCCESS },
  rejected: { label: 'Từ chối',     bg: ERROR   },
  recount:  { label: 'Kiểm lại',    bg: INFO    },
};

interface AdjLine { sku: string; product: string; systemQty: number; physicalQty: number; variance: number; reason: string; warehouseExplanation: string }
interface Adjustment {
  id: string; countSession: string; warehouse: string;
  skuCount: number; varianceValue: number; submittedBy: string; submittedDate: string;
  status: string;
  lines: AdjLine[];
  approverNote: string;
}

const DATA: Adjustment[] = [
  {
    id: 'ADJ-2406-0008', countSession: 'CS-2406-0011', warehouse: 'Kho HCM',
    skuCount: 5, varianceValue: -12500000, submittedBy: 'Phạm Thị Hương', submittedDate: '04/07/2026 17:00',
    status: 'pending', approverNote: '',
    lines: [
      { sku: 'VT-AK-009', product: 'Áo khoác công sở nữ', systemQty: 45, physicalQty: 43, variance: -2, reason: 'Hao hụt tự nhiên', warehouseExplanation: 'Sản phẩm bị lỗi không dùng được, đã tách riêng' },
      { sku: 'VT-DP-021', product: 'Đồng phục VP nữ',     systemQty: 92, physicalQty: 90, variance: -2, reason: 'Thiếu hụt không xác định', warehouseExplanation: 'Cần kiểm tra log xuất hàng' },
      { sku: 'VT-SM-012', product: 'Sơ mi nam slim fit',   systemQty: 180, physicalQty: 181, variance: 1, reason: 'Ghi nhận dư 1 chiếc', warehouseExplanation: 'Hàng trả lại chưa cập nhật hệ thống' },
    ],
  },
  {
    id: 'ADJ-2406-0007', countSession: 'CS-2406-0010', warehouse: 'Kho Hà Nội',
    skuCount: 1, varianceValue: -3200000, submittedBy: 'Lê Văn Dũng', submittedDate: '28/06/2026 16:00',
    status: 'approved', approverNote: 'Chênh lệch nhỏ, chấp nhận điều chỉnh',
    lines: [
      { sku: 'VT-CT-001', product: 'Vải cotton khổ 1.5m', systemQty: 852, physicalQty: 850, variance: -2, reason: 'Hao hụt vải khi cắt', warehouseExplanation: 'Hao hụt thông thường trong quá trình bảo quản' },
    ],
  },
  {
    id: 'ADJ-2406-0006', countSession: 'CS-2406-0009', warehouse: 'Kho Đà Nẵng',
    skuCount: 3, varianceValue: -45000000, submittedBy: 'Nguyễn Minh Khoa', submittedDate: '20/06/2026 15:00',
    status: 'rejected', approverNote: 'Lệch quá lớn, cần kiểm kê lại toàn bộ kho',
    lines: [],
  },
];

function Badge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || { label: status, bg: NEUTRAL };
  return <span className="text-[10px] font-semibold text-white px-2 py-0.5 inline-block whitespace-nowrap" style={{ backgroundColor: c.bg, borderRadius: 4 }}>{c.label}</span>;
}

export default function WarehouseStockAdjustment() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<Adjustment | null>(null);
  const [items, setItems] = useState(DATA);
  const [approveNote, setApproveNote] = useState('');

  const filtered = items.filter(d => {
    const q = search.toLowerCase();
    const ms = !q || d.id.toLowerCase().includes(q) || d.warehouse.toLowerCase().includes(q) || d.submittedBy.toLowerCase().includes(q);
    const mw = warehouseFilter === 'all' || d.warehouse === warehouseFilter;
    return ms && (statusFilter === 'all' || d.status === statusFilter) && mw;
  });

  const toggleSelect = (id: string) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAll = () => setSelected(p => p.length === filtered.length ? [] : filtered.map(d => d.id));

  const approve = async (id: string) => {
    try {
      const { ceoDecisionStockAdjustment } = await import('../../services/warehouseService.js');
      await ceoDecisionStockAdjustment(id, { decision: 'approved', notes: approveNote });
      alert('Đã duyệt điều chỉnh!');
      setItems(p => p.map(i => i.id === id ? { ...i, status: 'approved', approverNote: approveNote } : i));
      setDetail(p => p?.id === id ? { ...p, status: 'approved', approverNote: approveNote } : p);
    } catch (err: any) { alert(err.message); }
  };
  const reject = async (id: string) => {
    try {
      if (!approveNote) return alert('Vui lòng nhập ghi chú khi từ chối!');
      const { ceoDecisionStockAdjustment } = await import('../../services/warehouseService.js');
      await ceoDecisionStockAdjustment(id, { decision: 'rejected', notes: approveNote });
      alert('Đã từ chối điều chỉnh!');
      setItems(p => p.map(i => i.id === id ? { ...i, status: 'rejected', approverNote: approveNote } : i));
      setDetail(p => p?.id === id ? { ...p, status: 'rejected', approverNote: approveNote } : p);
    } catch (err: any) { alert(err.message); }
  };
  const recount = async (id: string) => {
    try {
      if (!approveNote) return alert('Vui lòng nhập ghi chú yêu cầu kiểm lại!');
      const { ceoDecisionStockAdjustment } = await import('../../services/warehouseService.js');
      await ceoDecisionStockAdjustment(id, { decision: 'recount', notes: approveNote });
      alert('Đã yêu cầu kiểm lại!');
      setItems(p => p.map(i => i.id === id ? { ...i, status: 'recount', approverNote: approveNote } : i));
      setDetail(p => p?.id === id ? { ...p, status: 'recount', approverNote: approveNote } : p);
    } catch (err: any) { alert(err.message); }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] mb-0.5"><span className="text-gray-400">Kho hàng</span><span className="text-gray-300">/</span><span className="text-gray-400">Quản lý tồn kho (Inventory)</span><span className="text-gray-300">/</span><span className="text-gray-800 font-semibold">Duyệt điều chỉnh tồn kho</span></div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Duyệt điều chỉnh tồn kho (Stock Adjustment)</h2>
            <p className="text-xs text-gray-500 mt-0.5">{items.length} phiếu điều chỉnh · {items.filter(i => i.status === 'pending').length} chờ duyệt</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"><RefreshCw className="w-3 h-3" /> Làm mới</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"><Download className="w-3 h-3" /> Xuất Excel</Button>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded mb-3">
          <span className="text-amber-700 text-[11px]">
            <strong>Lưu ý:</strong> Chỉ CEO/Quản lý cấp cao mới có quyền phê duyệt điều chỉnh tồn kho. Mọi điều chỉnh sẽ được ghi vào nhật ký kiểm toán.
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input className="pl-8 h-7 text-xs bg-gray-50" placeholder="Mã điều chỉnh, kho, người gửi..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)}>
            <option value="all">Tất cả kho</option>
            <option>Kho Hà Nội</option>
            <option>Kho HCM</option>
            <option>Kho Đà Nẵng</option>
          </select>
          <input type="date" className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <input type="date" className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        {selected.length > 0 && (
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded px-3 py-2 mb-2 flex items-center gap-2 text-xs text-blue-700">
            <span className="font-medium">{selected.length} đã chọn</span>
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100 whitespace-nowrap">Phê duyệt</button>
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100 whitespace-nowrap">Từ chối</button>
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100 whitespace-nowrap">Xuất Excel</button>
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100 whitespace-nowrap" onClick={() => setSelected([])}>Hủy chọn</button>
          </div>
        )}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5"><input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Mã điều chỉnh</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Phiên kiểm kê</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Kho</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Số SKU</th>
                <th className="text-right px-3 py-2.5 text-gray-700 font-semibold">Giá trị lệch</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Người gửi</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Ngày gửi</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Trạng thái</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={12} className="py-12 text-center"><div className="flex flex-col items-center gap-2"><div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><span className="text-gray-400 text-xl">📋</span></div><p className="text-sm font-medium text-gray-500">Không có dữ liệu</p><p className="text-xs text-gray-400">Thay đổi bộ lọc để xem kết quả khác</p></div></td></tr>
              )}
              {filtered.map((d, i) => (
                <tr key={d.id} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-3 py-2.5"><input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggleSelect(d.id)} /></td>
                  <td className="px-3 py-2.5 font-semibold" style={{ color: PRIMARY }}>{d.id}</td>
                  <td className="px-3 py-2.5 text-gray-600">{d.countSession}</td>
                  <td className="px-3 py-2.5 text-gray-700">{d.warehouse}</td>
                  <td className="px-3 py-2.5 text-center font-semibold">{d.skuCount}</td>
                  <td className="px-3 py-2.5 text-right font-mono font-semibold" style={{ color: d.varianceValue < 0 ? ERROR : SUCCESS }}>
                    {d.varianceValue < 0 ? '-' : '+'}{Math.abs(d.varianceValue).toLocaleString()}đ
                  </td>
                  <td className="px-3 py-2.5 text-gray-700">{d.submittedBy}</td>
                  <td className="px-3 py-2.5 text-gray-500">{d.submittedDate}</td>
                  <td className="px-3 py-2.5 text-center"><Badge status={d.status} /></td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" onClick={() => setDetail(d)}><Eye className="w-3.5 h-3.5" /></button>
                      {d.status === 'pending' && (
                        <>
                          <button className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600" onClick={() => approve(d.id)} title="Duyệt"><CheckCircle className="w-3.5 h-3.5" /></button>
                          <button className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600" onClick={() => reject(d.id)} title="Từ chối"><XCircle className="w-3.5 h-3.5" /></button>
                          <button className="p-1 rounded hover:bg-orange-50 text-gray-400 hover:text-orange-600" onClick={() => recount(d.id)} title="Yêu cầu kiểm lại"><RotateCcw className="w-3.5 h-3.5" /></button>
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
            <button className="w-6 h-6 text-xs rounded font-medium text-white flex items-center justify-center" style={{ backgroundColor: PRIMARY }}>1</button>
          </div>
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Chi tiết điều chỉnh — {detail?.id}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded p-3 space-y-1.5">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Thông tin</p>
                  <div className="flex justify-between"><span className="text-gray-500">Mã:</span><span className="font-semibold" style={{ color: PRIMARY }}>{detail.id}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Phiên kiểm:</span><span>{detail.countSession}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Kho:</span><span className="font-medium">{detail.warehouse}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Người gửi:</span><span>{detail.submittedBy}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Ngày gửi:</span><span>{detail.submittedDate}</span></div>
                </div>
                <div className="col-span-2 bg-gray-50 rounded p-3 space-y-1.5">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Tóm tắt điều chỉnh</p>
                  <div className="flex justify-between"><span className="text-gray-500">Trạng thái:</span><Badge status={detail.status} /></div>
                  <div className="flex justify-between"><span className="text-gray-500">Số SKU điều chỉnh:</span><span className="font-semibold text-lg" style={{ color: PRIMARY }}>{detail.skuCount}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Giá trị lệch:</span><span className="font-semibold text-lg" style={{ color: detail.varianceValue < 0 ? ERROR : SUCCESS }}>{detail.varianceValue < 0 ? '-' : '+'}{Math.abs(detail.varianceValue).toLocaleString()}đ</span></div>
                  {detail.approverNote && <div className="pt-1 border-t border-gray-200"><p className="text-gray-500 mb-0.5">Ghi chú phê duyệt:</p><p className="text-gray-800 italic">"{detail.approverNote}"</p></div>}
                </div>
              </div>

              {detail.lines.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-600 text-[10px] uppercase tracking-wide mb-2">Chi tiết điều chỉnh từng SKU</p>
                  <table className="w-full border border-gray-200 rounded overflow-hidden">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-3 py-2 text-gray-700 font-semibold">SKU / Sản phẩm</th>
                        <th className="text-center px-3 py-2 text-gray-700 font-semibold">SL hệ thống</th>
                        <th className="text-center px-3 py-2 text-gray-700 font-semibold">SL thực tế</th>
                        <th className="text-center px-3 py-2 text-gray-700 font-semibold">Lệch</th>
                        <th className="text-left px-3 py-2 text-gray-700 font-semibold">Lý do</th>
                        <th className="text-left px-3 py-2 text-gray-700 font-semibold">Giải trình kho</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {detail.lines.map(line => (
                        <tr key={line.sku} className="hover:bg-gray-50">
                          <td className="px-3 py-2"><p className="font-mono text-gray-500">{line.sku}</p><p className="text-gray-800">{line.product}</p></td>
                          <td className="px-3 py-2 text-center font-semibold">{line.systemQty}</td>
                          <td className="px-3 py-2 text-center font-semibold">{line.physicalQty}</td>
                          <td className="px-3 py-2 text-center font-semibold" style={{ color: line.variance < 0 ? ERROR : SUCCESS }}>
                            {line.variance > 0 ? '+' : ''}{line.variance}
                          </td>
                          <td className="px-3 py-2 text-gray-600">{line.reason}</td>
                          <td className="px-3 py-2 text-gray-600">{line.warehouseExplanation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {detail.status === 'pending' && (
                <div className="space-y-2">
                  <label className="text-gray-500 text-[11px]">Ghi chú phê duyệt (tùy chọn)</label>
                  <Input value={approveNote} onChange={e => setApproveNote(e.target.value)} className="h-7 text-xs" placeholder="Nhập ghi chú..." />
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                {detail.status === 'pending' && (
                  <>
                    <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: SUCCESS }} onClick={() => approve(detail.id)}><CheckCircle className="w-3.5 h-3.5" /> Phê duyệt điều chỉnh</Button>
                    <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: ERROR }} onClick={() => reject(detail.id)}><XCircle className="w-3.5 h-3.5" /> Từ chối</Button>
                    <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: INFO }} onClick={() => recount(detail.id)}><RotateCcw className="w-3.5 h-3.5" /> Yêu cầu kiểm lại</Button>
                  </>
                )}
                <Button variant="outline" size="sm" className="h-7 text-xs ml-auto" onClick={() => setDetail(null)}>Đóng</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
