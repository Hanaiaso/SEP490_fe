import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Search, Eye, Download, RefreshCw, Upload, FileSpreadsheet, ScanLine, Play, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/sales-ui/dialog';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#D97706';
const ERROR   = '#DC2626';
const INFO    = '#2563EB';
const NEUTRAL = '#64748B';

const STATUS_CFG: Record<string, { label: string; bg: string }> = {
  draft:     { label: 'Nháp',            bg: NEUTRAL },
  issued:    { label: 'Đã phát hành',    bg: INFO    },
  partial:   { label: 'Nhập một phần',   bg: WARNING },
  completed: { label: 'Hoàn tất',        bg: SUCCESS },
  cancelled: { label: 'Đã hủy',          bg: ERROR   },
};

interface POItem { sku: string; name: string; unit: string; orderedQty: number; receivedQty: number; remainingQty: number; unitPrice: number; notes: string }
interface PurchaseOrder {
  id: string; supplier: string; supplierCode: string; warehouse: string;
  createdBy: string; issuedDate: string; expectedArrival: string;
  itemCount: number; expectedQty: number; receivingProgress: number;
  status: 'draft' | 'issued' | 'partial' | 'completed' | 'cancelled';
  priority: 'urgent' | 'normal';
  items: POItem[];
  timeline: { time: string; event: string; user: string }[];
}

const DATA: PurchaseOrder[] = [
  {
    id: 'PO-2406-0234', supplier: 'Cty Dệt Thái Bình', supplierCode: 'SUP-TB-001',
    warehouse: 'Kho Hà Nội', createdBy: 'Nguyễn Văn An', issuedDate: '04/07/2026', expectedArrival: '08/07/2026',
    itemCount: 4, expectedQty: 1200, receivingProgress: 0, status: 'issued', priority: 'urgent',
    items: [
      { sku: 'VT-CT-001', name: 'Vải cotton khổ 1.5m', unit: 'mét', orderedQty: 500, receivedQty: 0, remainingQty: 500, unitPrice: 45000, notes: '' },
      { sku: 'VT-LN-003', name: 'Vải linen nhập khẩu', unit: 'mét', orderedQty: 300, receivedQty: 0, remainingQty: 300, unitPrice: 85000, notes: 'Màu be và xanh navy' },
      { sku: 'VT-DM-005', name: 'Vải denim cao cấp',   unit: 'mét', orderedQty: 250, receivedQty: 0, remainingQty: 250, unitPrice: 120000, notes: '' },
      { sku: 'VT-VC-008', name: 'Vải chiffon mềm',     unit: 'mét', orderedQty: 150, receivedQty: 0, remainingQty: 150, unitPrice: 65000, notes: '' },
    ],
    timeline: [
      { time: '04/07 10:00', event: 'Tạo đơn đặt hàng', user: 'Nguyễn Văn An' },
      { time: '04/07 14:00', event: 'Phát hành PO cho nhà cung cấp', user: 'Nguyễn Văn An' },
    ],
  },
  {
    id: 'PO-2406-0233', supplier: 'NCC Vải Phong Phú', supplierCode: 'SUP-PP-002',
    warehouse: 'Kho HCM', createdBy: 'Lê Thị Hoa', issuedDate: '03/07/2026', expectedArrival: '06/07/2026',
    itemCount: 2, expectedQty: 600, receivingProgress: 45, status: 'partial', priority: 'normal',
    items: [
      { sku: 'VT-SM-012', name: 'Sơ mi nam slim fit', unit: 'chiếc', orderedQty: 400, receivedQty: 180, remainingQty: 220, unitPrice: 185000, notes: '' },
      { sku: 'VT-QT-007', name: 'Quần tây slim fit',  unit: 'chiếc', orderedQty: 200, receivedQty: 90,  remainingQty: 110, unitPrice: 220000, notes: '' },
    ],
    timeline: [
      { time: '03/07 09:00', event: 'Phát hành PO', user: 'Lê Thị Hoa' },
      { time: '06/07 08:00', event: 'Nhập hàng lần 1 (45%)', user: 'Trần Văn Bình' },
    ],
  },
  {
    id: 'PO-2406-0232', supplier: 'Dệt May Hòa Bình', supplierCode: 'SUP-HB-003',
    warehouse: 'Kho Hà Nội', createdBy: 'Nguyễn Văn An', issuedDate: '02/07/2026', expectedArrival: '05/07/2026',
    itemCount: 3, expectedQty: 800, receivingProgress: 100, status: 'completed', priority: 'normal',
    items: [],
    timeline: [
      { time: '02/07 11:00', event: 'Phát hành PO', user: 'Nguyễn Văn An' },
      { time: '05/07 10:00', event: 'Nhập hàng hoàn tất', user: 'Trần Văn Bình' },
    ],
  },
  {
    id: 'PO-2406-0231', supplier: 'Import Asia Textile', supplierCode: 'SUP-AT-004',
    warehouse: 'Kho Hà Nội', createdBy: 'Nguyễn Văn An', issuedDate: '01/07/2026', expectedArrival: '10/07/2026',
    itemCount: 6, expectedQty: 2000, receivingProgress: 0, status: 'draft', priority: 'normal',
    items: [],
    timeline: [{ time: '01/07 15:00', event: 'Tạo nháp từ Excel', user: 'Nguyễn Văn An' }],
  },
];

function Badge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || { label: status, bg: NEUTRAL };
  return <span className="text-[10px] font-semibold text-white px-2 py-0.5 inline-block whitespace-nowrap" style={{ backgroundColor: c.bg, borderRadius: 4 }}>{c.label}</span>;
}

export default function WarehousePurchaseOrders() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<PurchaseOrder | null>(null);
  const [showImportExcel, setShowImportExcel] = useState(false);
  const [showImportOCR, setShowImportOCR] = useState(false);
  const [ocrStep, setOcrStep] = useState<'upload' | 'processing' | 'result'>('upload');

  const filtered = DATA.filter(d => {
    const q = search.toLowerCase();
    const ms = !q || d.id.toLowerCase().includes(q) || d.supplier.toLowerCase().includes(q) || d.supplierCode.toLowerCase().includes(q);
    const mst = statusFilter === 'all' || d.status === statusFilter;
    const mw = warehouseFilter === 'all' || d.warehouse === warehouseFilter;
    return ms && mst && mw;
  });

  const toggleSelect = (id: string) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAll = () => setSelected(p => p.length === filtered.length ? [] : filtered.map(d => d.id));

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] mb-0.5"><span className="text-gray-400">Kho hàng</span><span className="text-gray-300">/</span><span className="text-gray-400">Nhập kho (Inbound)</span><span className="text-gray-300">/</span><span className="text-gray-800 font-semibold">Đơn đặt hàng chờ nhập</span></div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Đơn đặt hàng chờ nhập kho (PO Waiting)</h2>
            <p className="text-xs text-gray-500 mt-0.5">{DATA.length} đơn · {DATA.filter(d => d.status === 'issued').length} chờ nhập · {DATA.filter(d => d.status === 'partial').length} nhập một phần</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => setShowImportExcel(true)}><FileSpreadsheet className="w-3 h-3" /> Import Excel</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => { setShowImportOCR(true); setOcrStep('upload'); }}><ScanLine className="w-3 h-3" /> Import hóa đơn ảnh</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"><RefreshCw className="w-3 h-3" /> Làm mới</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"><Download className="w-3 h-3" /> Xuất Excel</Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input className="pl-8 h-7 text-xs bg-gray-50" placeholder="Mã PO, nhà cung cấp..." value={search} onChange={e => setSearch(e.target.value)} />
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
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100 whitespace-nowrap" onClick={() => navigate('/warehouse/purchase/goods-receipt')}>Bắt đầu nhận hàng</button>
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100 whitespace-nowrap">Xuất Excel</button>
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100 whitespace-nowrap" onClick={() => setSelected([])}>Hủy chọn</button>
          </div>
        )}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5"><input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Mã PO</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Nhà cung cấp</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Kho</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Ngày phát hành</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Ngày dự kiến</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Số SP</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">SL dự kiến</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Tiến độ nhập</th>
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
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-gray-800">{d.supplier}</p>
                    <p className="text-gray-400 text-[10px]">{d.supplierCode}</p>
                  </td>
                  <td className="px-3 py-2.5 text-gray-700">{d.warehouse}</td>
                  <td className="px-3 py-2.5 text-gray-500">{d.issuedDate}</td>
                  <td className="px-3 py-2.5 text-gray-500">{d.expectedArrival}</td>
                  <td className="px-3 py-2.5 text-center font-semibold text-gray-700">{d.itemCount}</td>
                  <td className="px-3 py-2.5 text-center font-mono text-gray-700">{d.expectedQty.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${d.receivingProgress}%`, backgroundColor: d.receivingProgress === 100 ? SUCCESS : INFO }} />
                      </div>
                      <span className="font-mono text-gray-600">{d.receivingProgress}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-center"><Badge status={d.status} /></td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" onClick={() => setDetail(d)}><Eye className="w-3.5 h-3.5" /></button>
                      {d.status === 'issued' && <button className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600" title="Bắt đầu nhận hàng" onClick={() => navigate('/warehouse/purchase/goods-receipt')}><Play className="w-3.5 h-3.5" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <span className="text-xs text-gray-500">Hiển thị {filtered.length} / {DATA.length} bản ghi</span>
            <button className="w-6 h-6 text-xs rounded font-medium text-white flex items-center justify-center" style={{ backgroundColor: PRIMARY }}>1</button>
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Chi tiết PO — {detail?.id}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded p-3 space-y-1.5">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Thông tin PO</p>
                  <div className="flex justify-between"><span className="text-gray-500">Mã PO:</span><span className="font-semibold" style={{ color: PRIMARY }}>{detail.id}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Kho:</span><span>{detail.warehouse}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Người tạo:</span><span>{detail.createdBy}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Ngày phát hành:</span><span>{detail.issuedDate}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Dự kiến nhập:</span><span className="font-medium">{detail.expectedArrival}</span></div>
                </div>
                <div className="bg-gray-50 rounded p-3 space-y-1.5">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Nhà cung cấp</p>
                  <div className="flex justify-between"><span className="text-gray-500">Tên:</span><span className="font-semibold text-gray-800">{detail.supplier}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Mã NCC:</span><span className="font-mono">{detail.supplierCode}</span></div>
                </div>
                <div className="bg-gray-50 rounded p-3 space-y-1.5">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Tiến độ</p>
                  <div className="flex justify-between"><span className="text-gray-500">Trạng thái:</span><Badge status={detail.status} /></div>
                  <div className="flex justify-between"><span className="text-gray-500">Số SP:</span><span className="font-semibold">{detail.itemCount}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">SL dự kiến:</span><span className="font-semibold">{detail.expectedQty.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Tiến độ nhập:</span><span className="font-semibold" style={{ color: detail.receivingProgress === 100 ? SUCCESS : INFO }}>{detail.receivingProgress}%</span></div>
                </div>
              </div>

              {detail.items.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-600 text-[10px] uppercase tracking-wide mb-2">Danh sách hàng hóa</p>
                  <table className="w-full border border-gray-200 rounded overflow-hidden">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-3 py-2 text-gray-700 font-semibold">SKU</th>
                        <th className="text-left px-3 py-2 text-gray-700 font-semibold">Tên sản phẩm</th>
                        <th className="text-center px-3 py-2 text-gray-700 font-semibold">ĐVT</th>
                        <th className="text-center px-3 py-2 text-gray-700 font-semibold">SL đặt</th>
                        <th className="text-center px-3 py-2 text-gray-700 font-semibold">SL nhập</th>
                        <th className="text-center px-3 py-2 text-gray-700 font-semibold">Còn lại</th>
                        <th className="text-right px-3 py-2 text-gray-700 font-semibold">Đơn giá</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {detail.items.map(item => (
                        <tr key={item.sku} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-gray-500">{item.sku}</td>
                          <td className="px-3 py-2 text-gray-800">{item.name}</td>
                          <td className="px-3 py-2 text-center text-gray-600">{item.unit}</td>
                          <td className="px-3 py-2 text-center font-semibold">{item.orderedQty}</td>
                          <td className="px-3 py-2 text-center font-semibold" style={{ color: item.receivedQty > 0 ? SUCCESS : NEUTRAL }}>{item.receivedQty}</td>
                          <td className="px-3 py-2 text-center font-semibold" style={{ color: item.remainingQty > 0 ? WARNING : SUCCESS }}>{item.remainingQty}</td>
                          <td className="px-3 py-2 text-right font-mono text-gray-700">{item.unitPrice.toLocaleString()}đ</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                {detail.status === 'issued' && (
                  <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: PRIMARY }} onClick={() => { navigate('/warehouse/purchase/goods-receipt'); setDetail(null); }}>
                    <Play className="w-3.5 h-3.5" /> Bắt đầu nhận hàng
                  </Button>
                )}
                <Button variant="outline" size="sm" className="h-7 text-xs ml-auto" onClick={() => setDetail(null)}>Đóng</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Excel Dialog */}
      <Dialog open={showImportExcel} onOpenChange={setShowImportExcel}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2"><FileSpreadsheet className="w-4 h-4" style={{ color: PRIMARY }} /> Import PO từ Excel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-xs">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="font-medium text-gray-700 mb-1">Kéo thả file Excel vào đây</p>
              <p className="text-gray-500 mb-3">hoặc</p>
              <Button variant="outline" size="sm" className="h-7 text-xs">Chọn file</Button>
              <p className="text-gray-400 mt-2 text-[10px]">Hỗ trợ: .xlsx, .xls (tối đa 10MB)</p>
            </div>
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded border border-blue-200">
              <AlertCircle className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
              <p className="text-blue-700">File sau khi import sẽ tạo PO ở trạng thái <strong>Nháp</strong>. Cần phát hành để nhập hàng.</p>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"><Download className="w-3 h-3" /> Tải mẫu Excel</Button>
              <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: PRIMARY }}>
                <CheckCircle className="w-3.5 h-3.5" /> Xem trước & Tạo nháp
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowImportExcel(false)}>Hủy</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import OCR Dialog */}
      <Dialog open={showImportOCR} onOpenChange={setShowImportOCR}>
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2"><ScanLine className="w-4 h-4" style={{ color: PRIMARY }} /> Import hóa đơn bằng hình ảnh (OCR)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-xs">
            {ocrStep === 'upload' && (
              <>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors" onClick={() => setOcrStep('processing')}>
                  <ScanLine className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="font-medium text-gray-700 mb-1">Upload hình ảnh hóa đơn</p>
                  <p className="text-gray-500 mb-3">Hỗ trợ: JPG, PNG, PDF</p>
                  <Button variant="outline" size="sm" className="h-7 text-xs">Chọn file</Button>
                </div>
              </>
            )}
            {ocrStep === 'processing' && (
              <div className="py-8 text-center">
                <div className="w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="font-medium text-gray-700">AI đang xử lý hình ảnh...</p>
                <p className="text-gray-500 mt-1">Nhận diện thông tin hóa đơn</p>
                <button className="mt-4 text-xs text-blue-600 hover:underline" onClick={() => setOcrStep('result')}>
                  (Demo: xem kết quả)
                </button>
              </div>
            )}
            {ocrStep === 'result' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200">
                  <CheckCircle className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                  <p className="text-green-700">OCR hoàn tất. Vui lòng kiểm tra và chỉnh sửa trước khi tạo PO nháp.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label className="text-gray-500">Nhà cung cấp</label>
                    <Input defaultValue="Cty Dệt Thái Bình" className="h-7 text-xs" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-gray-500">Số hóa đơn</label>
                    <Input defaultValue="HD-2026-07-1234" className="h-7 text-xs" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-gray-500">Kho nhập</label>
                    <Input defaultValue="Kho Hà Nội" className="h-7 text-xs" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-gray-500">Ngày giao dự kiến</label>
                    <Input defaultValue="10/07/2026" className="h-7 text-xs" />
                  </div>
                </div>
                <div>
                  <p className="text-gray-500 mb-1.5">Sản phẩm nhận diện (2 dòng)</p>
                  <table className="w-full border border-gray-200 rounded overflow-hidden">
                    <thead><tr className="bg-gray-50 border-b border-gray-200"><th className="text-left px-3 py-2 text-gray-700 font-semibold">Sản phẩm</th><th className="text-center px-3 py-2 text-gray-700 font-semibold">SL</th><th className="text-right px-3 py-2 text-gray-700 font-semibold">Đơn giá</th></tr></thead>
                    <tbody>
                      <tr className="border-b border-gray-100"><td className="px-3 py-2"><Input defaultValue="Vải cotton khổ 1.5m" className="h-6 text-xs" /></td><td className="px-3 py-2 text-center"><Input defaultValue="300" className="h-6 text-xs text-center w-20 mx-auto" /></td><td className="px-3 py-2 text-right"><Input defaultValue="45,000" className="h-6 text-xs text-right w-24 ml-auto" /></td></tr>
                      <tr><td className="px-3 py-2"><Input defaultValue="Vải linen nhập khẩu" className="h-6 text-xs" /></td><td className="px-3 py-2 text-center"><Input defaultValue="150" className="h-6 text-xs text-center w-20 mx-auto" /></td><td className="px-3 py-2 text-right"><Input defaultValue="85,000" className="h-6 text-xs text-right w-24 ml-auto" /></td></tr>
                    </tbody>
                  </table>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => setOcrStep('upload')}><ScanLine className="w-3 h-3" /> Xử lý lại OCR</Button>
                  <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: PRIMARY }}>
                    <CheckCircle className="w-3.5 h-3.5" /> Tạo PO nháp
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowImportOCR(false)}>Hủy</Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
