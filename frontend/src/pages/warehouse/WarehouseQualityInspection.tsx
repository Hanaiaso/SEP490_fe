import { useState } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Search, Eye, RefreshCw, CheckCircle, XCircle, Archive, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/sales-ui/dialog';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#D97706';
const ERROR   = '#DC2626';
const INFO    = '#2563EB';
const NEUTRAL = '#64748B';

const STATUS_CFG: Record<string, { label: string; bg: string }> = {
  waiting:   { label: 'Chờ kiểm tra',    bg: NEUTRAL },
  in_progress: { label: 'Đang kiểm tra', bg: INFO    },
  passed:    { label: 'Đạt yêu cầu',     bg: SUCCESS },
  failed:    { label: 'Không đạt',        bg: ERROR   },
  quarantine:{ label: 'Cách ly',          bg: WARNING },
};

interface InspectionItem {
  id: string; poNo: string; sku: string; product: string; quantity: number;
  result: string; inspector: string; inspectionDate: string;
  status: 'waiting' | 'in_progress' | 'passed' | 'failed' | 'quarantine';
  reason: string; physicalCondition: string; packagingCondition: string; notes: string;
  decision: 'available' | 'quarantine' | 'reject' | 'pending';
}

const DATA: InspectionItem[] = [
  {
    id: 'QI-2406-0023', poNo: 'PO-2406-0233', sku: 'VT-SM-012', product: 'Sơ mi nam slim fit',
    quantity: 5, result: 'Hư hỏng nhẹ, vết bẩn vải', inspector: 'Trần Văn Bình',
    inspectionDate: '06/07/2026 10:00', status: 'in_progress',
    reason: 'Phát hiện khi nhập hàng', physicalCondition: 'Rách nhẹ cổ áo 2 chiếc, vết bẩn 3 chiếc',
    packagingCondition: 'Túi PE nguyên vẹn', notes: 'Cần báo NCC để đổi hàng',
    decision: 'pending',
  },
  {
    id: 'QI-2406-0022', poNo: 'PO-2406-0230', sku: 'VT-CT-001', product: 'Vải cotton khổ 1.5m',
    quantity: 30, result: 'Màu không đều, lỗi dệt', inspector: 'Nguyễn Văn Thành',
    inspectionDate: '04/07/2026 14:00', status: 'quarantine',
    reason: 'Lỗi sản xuất', physicalCondition: 'Màu loang, đường dệt không đều',
    packagingCondition: 'Cuộn vải nguyên', notes: 'Đang chờ NCC xem xét',
    decision: 'quarantine',
  },
  {
    id: 'QI-2406-0021', poNo: 'PO-2406-0229', sku: 'VT-QT-007', product: 'Quần tây slim fit',
    quantity: 10, result: 'Đạt yêu cầu sau kiểm tra', inspector: 'Lê Văn Dũng',
    inspectionDate: '03/07/2026 11:00', status: 'passed',
    reason: 'Kiểm tra định kỳ', physicalCondition: 'Tốt, không lỗi',
    packagingCondition: 'Túi PE đầy đủ nhãn', notes: '',
    decision: 'available',
  },
];

function Badge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || { label: status, bg: NEUTRAL };
  return <span className="text-[10px] font-semibold text-white px-2 py-0.5 inline-block whitespace-nowrap" style={{ backgroundColor: c.bg, borderRadius: 4 }}>{c.label}</span>;
}

export default function WarehouseQualityInspection() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<InspectionItem | null>(null);
  const [items, setItems] = useState(DATA);

  const filtered = items.filter(d => {
    const q = search.toLowerCase();
    const ms = !q || d.id.toLowerCase().includes(q) || d.sku.toLowerCase().includes(q) || d.product.toLowerCase().includes(q);
    return ms && (statusFilter === 'all' || d.status === statusFilter);
  });

  const toggleSelect = (id: string) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map(d => d.id));

  const approve = (id: string) => {
    setItems(p => p.map(i => i.id === id ? { ...i, status: 'passed' as const, decision: 'available' as const } : i));
    setDetail(prev => prev?.id === id ? { ...prev, status: 'passed', decision: 'available' } : prev);
  };
  const reject = (id: string) => {
    setItems(p => p.map(i => i.id === id ? { ...i, status: 'failed' as const, decision: 'reject' as const } : i));
    setDetail(prev => prev?.id === id ? { ...prev, status: 'failed', decision: 'reject' } : prev);
  };
  const quarantine = (id: string) => {
    setItems(p => p.map(i => i.id === id ? { ...i, status: 'quarantine' as const, decision: 'quarantine' as const } : i));
    setDetail(prev => prev?.id === id ? { ...prev, status: 'quarantine', decision: 'quarantine' } : prev);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] mb-0.5">
          <span className="text-gray-400">Kho hàng</span><span className="text-gray-400">/</span><span className="text-gray-400">Nhập kho (Inbound)</span><span className="text-gray-400">/</span><span className="text-gray-800 font-semibold">Kiểm tra chất lượng</span>
        </div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Kiểm tra chất lượng (Quality Inspection)</h2>
            <p className="text-xs text-gray-500 mt-0.5">{items.length} lệnh kiểm tra · {items.filter(i => i.status === 'waiting' || i.status === 'in_progress').length} đang xử lý</p>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"><RefreshCw className="w-3 h-3" /> Làm mới</Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input className="pl-8 h-7 text-xs bg-gray-50" placeholder="Mã kiểm tra, SKU, sản phẩm..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <input type="date" className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <input type="date" className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          <select className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)}>
            <option value="all">Tất cả kho</option>
            <option value="Kho Hà Nội">Kho Hà Nội</option>
            <option value="Kho HCM">Kho HCM</option>
            <option value="Kho Đà Nẵng">Kho Đà Nẵng</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        {selected.length > 0 && (
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded px-3 py-2 mb-2 flex items-center gap-2 text-xs text-blue-700">
            <span className="font-medium">{selected.length} mục được chọn</span>
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100 whitespace-nowrap">Duyệt đạt</button>
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100 whitespace-nowrap">Cách ly</button>
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100 whitespace-nowrap">Từ chối</button>
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100 whitespace-nowrap" onClick={() => setSelected([])}>Hủy chọn</button>
          </div>
        )}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={filtered.length > 0 && selected.length === filtered.length} onChange={toggleAll} className="w-3.5 h-3.5" /></th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Mã kiểm tra</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Mã PO</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">SKU</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Sản phẩm</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Số lượng</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Kết quả kiểm tra</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Người kiểm</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Ngày kiểm</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Trạng thái</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={12} className="py-12 text-center"><div className="flex flex-col items-center gap-2"><div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><span className="text-gray-400 text-xl">📋</span></div><p className="text-sm font-medium text-gray-500">Không có dữ liệu</p><p className="text-xs text-gray-400">Thay đổi bộ lọc để xem kết quả khác</p></div></td></tr>
              )}
              {filtered.map((d, i) => (
                <tr key={d.id} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''} ${selected.includes(d.id) ? 'bg-blue-50/50' : ''}`}>
                  <td className="px-3 py-2.5"><input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggleSelect(d.id)} className="w-3.5 h-3.5" /></td>
                  <td className="px-3 py-2.5 font-semibold" style={{ color: PRIMARY }}>{d.id}</td>
                  <td className="px-3 py-2.5 text-gray-600">{d.poNo}</td>
                  <td className="px-3 py-2.5 font-mono text-gray-500">{d.sku}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-800">{d.product}</td>
                  <td className="px-3 py-2.5 text-center font-semibold">{d.quantity}</td>
                  <td className="px-3 py-2.5 text-gray-600 max-w-[180px] truncate">{d.result}</td>
                  <td className="px-3 py-2.5 text-gray-700">{d.inspector}</td>
                  <td className="px-3 py-2.5 text-gray-500">{d.inspectionDate}</td>
                  <td className="px-3 py-2.5 text-center"><Badge status={d.status} /></td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" onClick={() => setDetail(d)}><Eye className="w-3.5 h-3.5" /></button>
                      {(d.status === 'waiting' || d.status === 'in_progress') && (
                        <>
                          <button className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600" onClick={() => approve(d.id)} title="Duyệt đạt"><CheckCircle className="w-3.5 h-3.5" /></button>
                          <button className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600" onClick={() => reject(d.id)} title="Từ chối"><XCircle className="w-3.5 h-3.5" /></button>
                          <button className="p-1 rounded hover:bg-orange-50 text-gray-400 hover:text-orange-600" onClick={() => quarantine(d.id)} title="Cách ly"><Archive className="w-3.5 h-3.5" /></button>
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
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Chi tiết kiểm tra — {detail?.id}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded p-3 space-y-1.5">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Thông tin kiểm tra</p>
                  <div className="flex justify-between"><span className="text-gray-500">Mã kiểm tra:</span><span className="font-semibold" style={{ color: PRIMARY }}>{detail.id}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Mã PO:</span><span>{detail.poNo}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">SKU:</span><span className="font-mono">{detail.sku}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Sản phẩm:</span><span className="font-medium text-gray-800">{detail.product}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Số lượng:</span><span className="font-semibold">{detail.quantity}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Người kiểm:</span><span>{detail.inspector}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Ngày kiểm:</span><span>{detail.inspectionDate}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Trạng thái:</span><Badge status={detail.status} /></div>
                </div>
                <div className="bg-gray-50 rounded p-3 space-y-1.5">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Kết quả kiểm tra</p>
                  <div className="space-y-1"><span className="text-gray-500">Tình trạng vật lý:</span><p className="text-gray-800 mt-0.5">{detail.physicalCondition}</p></div>
                  <div className="space-y-1"><span className="text-gray-500">Tình trạng bao bì:</span><p className="text-gray-800 mt-0.5">{detail.packagingCondition}</p></div>
                  <div className="space-y-1"><span className="text-gray-500">Lý do kiểm tra:</span><p className="text-gray-800 mt-0.5">{detail.reason}</p></div>
                  {detail.notes && <div className="space-y-1"><span className="text-gray-500">Ghi chú:</span><p className="text-gray-700 mt-0.5">{detail.notes}</p></div>}
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                {(detail.status === 'waiting' || detail.status === 'in_progress') && (
                  <>
                    <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: SUCCESS }} onClick={() => approve(detail.id)}><CheckCircle className="w-3.5 h-3.5" /> Chuyển sang Tồn kho</Button>
                    <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: WARNING }} onClick={() => quarantine(detail.id)}><Archive className="w-3.5 h-3.5" /> Chuyển Cách ly</Button>
                    <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: ERROR }} onClick={() => reject(detail.id)}><XCircle className="w-3.5 h-3.5" /> Trả NCC</Button>
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
