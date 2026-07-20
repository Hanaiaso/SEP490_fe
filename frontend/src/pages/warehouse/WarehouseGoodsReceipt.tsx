import { useState } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Search, Eye, RefreshCw, Download, Printer, CheckCircle, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/sales-ui/dialog';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#D97706';
const ERROR   = '#DC2626';
const INFO    = '#2563EB';
const NEUTRAL = '#64748B';

const STATUS_CFG: Record<string, { label: string; bg: string }> = {
  draft:     { label: 'Nháp',            bg: NEUTRAL },
  receiving: { label: 'Đang nhận hàng',  bg: INFO    },
  completed: { label: 'Hoàn tất',        bg: SUCCESS },
  discrepancy: { label: 'Có sai lệch',   bg: WARNING },
};

interface ReceiptItem {
  sku: string; name: string; orderedQty: number; actualQty: number;
  acceptedQty: number; rejectedQty: number; damagedQty: number;
  warehouseLocation: string; batchNo: string; lotNo: string;
  expirationDate: string; storageLocation: string;
}

interface GoodsReceipt {
  id: string; poNo: string; supplier: string; warehouse: string;
  receivingDate: string; receiver: string;
  status: 'draft' | 'receiving' | 'completed' | 'discrepancy';
  items: ReceiptItem[];
}

const DATA: GoodsReceipt[] = [
  {
    id: 'GR-2406-0089', poNo: 'PO-2406-0233', supplier: 'NCC Vải Phong Phú',
    warehouse: 'Kho HCM', receivingDate: '06/07/2026 08:00', receiver: 'Trần Văn Bình',
    status: 'receiving',
    items: [
      { sku: 'VT-SM-012', name: 'Sơ mi nam slim fit', orderedQty: 400, actualQty: 180, acceptedQty: 175, rejectedQty: 5, damagedQty: 0, warehouseLocation: 'B-02-11', batchNo: 'B2407-SM-001', lotNo: 'L2407-001', expirationDate: 'N/A', storageLocation: 'Kệ B Tầng 2' },
      { sku: 'VT-QT-007', name: 'Quần tây slim fit',  orderedQty: 200, actualQty: 90,  acceptedQty: 90,  rejectedQty: 0, damagedQty: 0, warehouseLocation: 'B-03-05', batchNo: 'B2407-QT-001', lotNo: 'L2407-001', expirationDate: 'N/A', storageLocation: 'Kệ B Tầng 3' },
    ],
  },
  {
    id: 'GR-2406-0088', poNo: 'PO-2406-0232', supplier: 'Dệt May Hòa Bình',
    warehouse: 'Kho Hà Nội', receivingDate: '05/07/2026 10:00', receiver: 'Nguyễn Văn Thành',
    status: 'completed',
    items: [],
  },
  {
    id: 'GR-2406-0087', poNo: 'PO-2406-0231', supplier: 'Import Asia Textile',
    warehouse: 'Kho Hà Nội', receivingDate: '06/07/2026 14:00', receiver: 'Lê Văn Dũng',
    status: 'draft',
    items: [],
  },
  {
    id: 'GR-2406-0086', poNo: 'PO-2406-0230', supplier: 'Cty Dệt Thái Bình',
    warehouse: 'Kho HCM', receivingDate: '04/07/2026 09:00', receiver: 'Trần Văn Bình',
    status: 'discrepancy',
    items: [],
  },
];

function Badge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || { label: status, bg: NEUTRAL };
  return <span className="text-[10px] font-semibold text-white px-2 py-0.5 inline-block whitespace-nowrap" style={{ backgroundColor: c.bg, borderRadius: 4 }}>{c.label}</span>;
}

export default function WarehouseGoodsReceipt() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<GoodsReceipt | null>(null);
  const [editItems, setEditItems] = useState<ReceiptItem[]>([]);

  const filtered = DATA.filter(d => {
    const q = search.toLowerCase();
    const ms = !q || d.id.toLowerCase().includes(q) || d.poNo.toLowerCase().includes(q) || d.supplier.toLowerCase().includes(q);
    return ms && (statusFilter === 'all' || d.status === statusFilter) && (warehouseFilter === 'all' || d.warehouse === warehouseFilter);
  });

  const toggleSelect = (id: string) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map(d => d.id));

  const openDetail = (d: GoodsReceipt) => {
    setDetail(d);
    setEditItems(d.items.map(i => ({ ...i })));
  };

  const updateQty = (idx: number, field: keyof ReceiptItem, value: number) => {
    setEditItems(p => p.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] mb-0.5">
          <span className="text-gray-400">Kho hàng</span><span className="text-gray-400">/</span><span className="text-gray-400">Nhập kho (Inbound)</span><span className="text-gray-400">/</span><span className="text-gray-800 font-semibold">Phiếu nhập hàng</span>
        </div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Phiếu nhập hàng (Goods Receipt)</h2>
            <p className="text-xs text-gray-500 mt-0.5">{DATA.length} phiếu · {DATA.filter(d => d.status === 'receiving').length} đang nhập · {DATA.filter(d => d.status === 'discrepancy').length} có sai lệch</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"><RefreshCw className="w-3 h-3" /> Làm mới</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"><Printer className="w-3 h-3" /> In phiếu nhập</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"><Download className="w-3 h-3" /> Xuất Excel</Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input className="pl-8 h-7 text-xs bg-gray-50" placeholder="Mã GR, mã PO, nhà cung cấp..." value={search} onChange={e => setSearch(e.target.value)} />
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
            <span className="font-medium">{selected.length} phiếu được chọn</span>
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100 whitespace-nowrap">In phiếu nhập</button>
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100 whitespace-nowrap">Hoàn tất nhập hàng</button>
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100 whitespace-nowrap">Xuất Excel</button>
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100 whitespace-nowrap" onClick={() => setSelected([])}>Hủy chọn</button>
          </div>
        )}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={filtered.length > 0 && selected.length === filtered.length} onChange={toggleAll} className="w-3.5 h-3.5" /></th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Mã phiếu nhập</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Mã PO</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Nhà cung cấp</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Kho</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Ngày nhập</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Người nhập</th>
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
                  <td className="px-3 py-2.5 font-medium text-gray-800">{d.supplier}</td>
                  <td className="px-3 py-2.5 text-gray-700">{d.warehouse}</td>
                  <td className="px-3 py-2.5 text-gray-500">{d.receivingDate}</td>
                  <td className="px-3 py-2.5 text-gray-700">{d.receiver}</td>
                  <td className="px-3 py-2.5 text-center"><Badge status={d.status} /></td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" onClick={() => openDetail(d)}><Eye className="w-3.5 h-3.5" /></button>
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

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Phiếu nhập hàng — {detail?.id}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded p-3 space-y-1.5">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Thông tin phiếu</p>
                  <div className="flex justify-between"><span className="text-gray-500">Mã phiếu:</span><span className="font-semibold" style={{ color: PRIMARY }}>{detail.id}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Mã PO:</span><span>{detail.poNo}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Ngày nhập:</span><span>{detail.receivingDate}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Người nhập:</span><span className="font-medium">{detail.receiver}</span></div>
                </div>
                <div className="bg-gray-50 rounded p-3 space-y-1.5">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Nhà cung cấp</p>
                  <div className="flex justify-between"><span className="text-gray-500">Tên NCC:</span><span className="font-semibold text-gray-800">{detail.supplier}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Kho nhập:</span><span>{detail.warehouse}</span></div>
                </div>
                <div className="bg-gray-50 rounded p-3 space-y-1.5">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Trạng thái</p>
                  <div className="flex justify-between"><span className="text-gray-500">Trạng thái:</span><Badge status={detail.status} /></div>
                </div>
              </div>

              {editItems.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-600 text-[10px] uppercase tracking-wide mb-2">Chi tiết hàng nhập</p>
                  <div className="border border-gray-200 rounded overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-3 py-2 text-gray-700 font-semibold">SKU / Sản phẩm</th>
                          <th className="text-center px-3 py-2 text-gray-700 font-semibold">SL đặt</th>
                          <th className="text-center px-3 py-2 text-gray-700 font-semibold">SL thực tế</th>
                          <th className="text-center px-3 py-2 text-gray-700 font-semibold">Chấp nhận</th>
                          <th className="text-center px-3 py-2 text-gray-700 font-semibold">Từ chối</th>
                          <th className="text-center px-3 py-2 text-gray-700 font-semibold">Hư hỏng</th>
                          <th className="text-left px-3 py-2 text-gray-700 font-semibold">Batch / Lot</th>
                          <th className="text-left px-3 py-2 text-gray-700 font-semibold">Vị trí lưu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {editItems.map((item, idx) => (
                          <tr key={item.sku} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <p className="font-mono text-gray-500">{item.sku}</p>
                              <p className="text-gray-800">{item.name}</p>
                            </td>
                            <td className="px-3 py-2 text-center font-semibold">{item.orderedQty}</td>
                            <td className="px-3 py-2 text-center">
                              <Input type="number" value={item.actualQty} className="h-6 text-xs text-center w-16 mx-auto" onChange={e => updateQty(idx, 'actualQty', +e.target.value)} />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Input type="number" value={item.acceptedQty} className="h-6 text-xs text-center w-16 mx-auto" onChange={e => updateQty(idx, 'acceptedQty', +e.target.value)} />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Input type="number" value={item.rejectedQty} className="h-6 text-xs text-center w-16 mx-auto" onChange={e => updateQty(idx, 'rejectedQty', +e.target.value)} />
                            </td>
                            <td className="px-3 py-2 text-center">
                              <Input type="number" value={item.damagedQty} className="h-6 text-xs text-center w-16 mx-auto" onChange={e => updateQty(idx, 'damagedQty', +e.target.value)} />
                            </td>
                            <td className="px-3 py-2">
                              <p className="text-gray-600">{item.batchNo}</p>
                              <p className="text-gray-400">{item.lotNo}</p>
                            </td>
                            <td className="px-3 py-2 text-gray-600">{item.storageLocation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-gray-400 mt-1 text-[10px]">* Chấp nhận + Từ chối phải bằng SL thực tế</p>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <Button size="sm" className="h-7 text-xs gap-1.5" variant="outline"><Save className="w-3.5 h-3.5" /> Lưu nháp</Button>
                {detail.status !== 'completed' && (
                  <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: PRIMARY }}>
                    <CheckCircle className="w-3.5 h-3.5" /> Hoàn tất nhập hàng
                  </Button>
                )}
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"><Printer className="w-3.5 h-3.5" /> In phiếu nhập</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs ml-auto" onClick={() => setDetail(null)}>Đóng</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
