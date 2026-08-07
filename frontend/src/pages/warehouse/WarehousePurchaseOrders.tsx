import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Search, Eye, Download, RefreshCw, Upload, FileSpreadsheet, ScanLine, Play, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/sales-ui/dialog';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { getPurchaseOrders, getPurchaseOrderById, createGoodsReceipt, uploadGoodsReceiptProof, postGoodsReceipt } from '../../services/purchaseOrderService.js';
import { useEffect } from 'react';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#D97706';
const ERROR = '#DC2626';
const INFO = '#2563EB';
const NEUTRAL = '#64748B';

const STATUS_CFG: Record<string, { label: string; bg: string }> = {
  draft: { label: 'Nháp', bg: NEUTRAL },
  issued: { label: 'Đã phát hành', bg: INFO },
  partial: { label: 'Nhập một phần', bg: WARNING },
  completed: { label: 'Hoàn tất', bg: SUCCESS },
  cancelled: { label: 'Đã hủy', bg: ERROR },
};

interface POItem { sku: string; name: string; unit: string; orderedQty: number; receivedQty: number; remainingQty: number; unitPrice: number; notes: string }
interface PurchaseOrder {
  id: string; code: string; supplier: string; supplierCode: string; warehouse: string;
  createdBy: string; issuedDate: string; expectedArrival: string;
  itemCount: number; expectedQty: number; receivingProgress: number;
  status: string;
  priority: 'urgent' | 'normal';
  items: POItem[];
  timeline: { time: string; event: string; user: string }[];
}



function Badge({ status }: { status: string }) {
  let mappedStatus = status;
  if (status === 'SentToWarehouse') mappedStatus = 'issued';
  if (status === 'PartiallyReceived') mappedStatus = 'partial';
  if (status === 'FullyReceived') mappedStatus = 'completed';

  const c = STATUS_CFG[mappedStatus] || { label: status, bg: NEUTRAL };
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

  const [DATA, setDATA] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Receiving Modal State
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [selectedPoForReceive, setSelectedPoForReceive] = useState<any>(null);
  const [receiptItems, setReceiptItems] = useState<any[]>([]);
  const [proofFile, setProofFile] = useState<File | null>(null);
  
  // Confirm Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmMsg, setConfirmMsg] = useState<React.ReactNode>("");

  const loadData = async () => {
    setLoading(true);
    try {
      const pos = await getPurchaseOrders('');
      const mapped = pos.map((p: any) => {
        return {
          id: p.id,
          code: p.code,
          supplier: p.supplierName || 'NCC',
          supplierCode: 'SUP-001',
          warehouse: 'Kho Hệ thống',
          createdBy: 'Hệ thống',
          issuedDate: p.expectedDate || 'N/A',
          expectedArrival: p.expectedDate || 'N/A',
          itemCount: p.totalExpectedQuantity,
          expectedQty: p.totalExpectedQuantity,
          receivingProgress: p.totalExpectedQuantity > 0 ? Math.round((p.totalReceivedQuantity / p.totalExpectedQuantity) * 100) : 0,
          status: p.status,
          priority: 'normal',
          items: [],
          timeline: []
        };
      });
      setDATA(mapped);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tải PO');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openReceiveModal = async (poId: string) => {
    try {
      const data = await getPurchaseOrderById(poId);
      setSelectedPoForReceive(data);
      setReceiptItems(data.items.map((i: any) => ({
        purchaseOrderItemId: i.id,
        productName: i.productName,
        expectedQuantity: i.expectedQuantity,
        receivedQuantity: i.receivedQuantity,
        acceptedQuantity: Math.max(0, i.expectedQuantity - i.receivedQuantity),
        damagedQuantity: 0,
        excessQuantity: 0,
        shortQuantity: 0,
        wrongItemQuantity: 0,
        note: ''
      })));
      setProofFile(null);
      setIsReceiveModalOpen(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReceive = async () => {
    try {
      const payload = {
        note: "Nhận hàng tại kho",
        items: receiptItems.map(i => {
          const remaining = Math.max(0, i.expectedQuantity - i.receivedQuantity);
          const actualReceived = i.acceptedQuantity + i.damagedQuantity + i.wrongItemQuantity;
          return {
            purchaseOrderItemId: i.purchaseOrderItemId,
            acceptedQuantity: i.acceptedQuantity,
            damagedQuantity: i.damagedQuantity,
            excessQuantity: Math.max(0, actualReceived - remaining),
            shortQuantity: Math.max(0, remaining - actualReceived),
            wrongItemQuantity: i.wrongItemQuantity,
            note: i.note
          };
        })
      };

      const receipt = await createGoodsReceipt(selectedPoForReceive.id, payload);

      if (proofFile) {
        await uploadGoodsReceiptProof(selectedPoForReceive.id, receipt.id, proofFile);
      }

      await postGoodsReceipt(selectedPoForReceive.id, receipt.id);

      alert("Post phiếu nhận hàng thành công. Tồn kho đã được cập nhật!");
      setIsReceiveModalOpen(false);
      setProofFile(null);
      loadData();
    } catch (err: any) {
      alert(err.message || "Đã có lỗi xảy ra");
    } finally {
      setShowConfirmModal(false);
    }
  };

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
                  <td className="px-3 py-2.5 font-semibold" style={{ color: PRIMARY }}>{d.code}</td>
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
                      {['SentToWarehouse', 'PartiallyReceived', 'Issued', 'issued', 1, 2, 3].includes(d.status) && <button className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600" title="Bắt đầu nhận hàng" onClick={() => openReceiveModal(d.id)}><Play className="w-3.5 h-3.5" /></button>}
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
                  <div className="flex justify-between"><span className="text-gray-500">Mã PO:</span><span className="font-semibold" style={{ color: PRIMARY }}>{detail.code}</span></div>
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
                {['SentToWarehouse', 'PartiallyReceived', 'Issued', 'issued', 1, 2, 3].includes(detail.status) && (
                  <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: PRIMARY }} onClick={() => { openReceiveModal(detail.id); setDetail(null); }}>
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
        <DialogContent aria-describedby={undefined}>
          {/* ... existing OCR mockup ... */}
        </DialogContent>
      </Dialog>

      {/* Receive Modal */}
      <Dialog open={isReceiveModalOpen && !!selectedPoForReceive} onOpenChange={() => setIsReceiveModalOpen(false)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0" aria-describedby={undefined}>
          {selectedPoForReceive && (() => {
            const computedItems = receiptItems.map(item => {
              const remaining = Math.max(0, item.expectedQuantity - item.receivedQuantity);
              const actualReceived = item.acceptedQuantity + item.damagedQuantity + item.wrongItemQuantity;
              const excess = Math.max(0, actualReceived - remaining);
              const short_ = Math.max(0, remaining - actualReceived);
              const isMatch = actualReceived === remaining && item.damagedQuantity === 0 && item.wrongItemQuantity === 0;
              const hasDiscrepancy = excess > 0 || short_ > 0 || item.damagedQuantity > 0 || item.wrongItemQuantity > 0;
              return { ...item, remaining, actualReceived, excess, short_, isMatch, hasDiscrepancy };
            });

            const totalAccepted = computedItems.reduce((s, i) => s + i.acceptedQuantity, 0);
            const totalDamaged = computedItems.reduce((s, i) => s + i.damagedQuantity, 0);
            const totalWrong = computedItems.reduce((s, i) => s + i.wrongItemQuantity, 0);
            const totalExcess = computedItems.reduce((s, i) => s + i.excess, 0);
            const totalShort = computedItems.reduce((s, i) => s + i.short_, 0);
            const discrepancyCount = computedItems.filter(i => i.hasDiscrepancy).length;
            const allMatch = discrepancyCount === 0;
            const hasNegative = computedItems.some(i => i.acceptedQuantity < 0);

            return (
              <>
                <DialogHeader className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <DialogTitle className="text-sm font-bold">Kiểm đếm nhận hàng: {selectedPoForReceive.code}</DialogTitle>
                      <p className="text-xs text-gray-500 mt-0.5">Nhập số lượng Đạt, Hỏng, Sai loại. Thừa và Thiếu được tự động tính.</p>
                    </div>
                    <button
                      onClick={() => {
                        setReceiptItems(receiptItems.map(item => {
                          const remaining = Math.max(0, item.expectedQuantity - item.receivedQuantity);
                          return { ...item, acceptedQuantity: remaining, damagedQuantity: 0, wrongItemQuantity: 0, note: '' };
                        }));
                      }}
                      className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded text-xs font-medium hover:bg-gray-100"
                    >
                      Nhận đủ tất cả
                    </button>
                  </div>
                </DialogHeader>

                <div className="p-4 overflow-x-auto">
                  <table className="w-full text-xs text-left border border-gray-200">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="p-2 font-semibold text-gray-700 w-[200px]">Sản phẩm</th>
                        <th className="p-2 font-semibold text-gray-700 w-[70px] text-center">Còn lại</th>
                        <th className="p-2 font-semibold text-gray-700 w-[80px] text-center">Đạt</th>
                        <th className="p-2 font-semibold text-gray-700 w-[80px] text-center">Hỏng</th>
                        <th className="p-2 font-semibold text-gray-700 w-[80px] text-center">Sai loại</th>
                        <th className="p-2 font-semibold text-gray-600 w-[70px] text-center border-l border-gray-200">Thực nhận</th>
                        <th className="p-2 font-semibold text-gray-600 w-[60px] text-center">Thừa</th>
                        <th className="p-2 font-semibold text-gray-600 w-[60px] text-center">Thiếu</th>
                        <th className="p-2 font-semibold text-gray-700">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody>
                      {computedItems.map((item, idx) => {
                        const updateField = (field: string, rawVal: string) => {
                          const val = parseInt(rawVal) || 0;
                          const newItems = [...receiptItems];
                          const cur = newItems[idx];

                          if (field === 'acceptedQuantity') {
                            cur.acceptedQuantity = val;
                          } else if (field === 'damagedQuantity') {
                            const delta = val - cur.damagedQuantity;
                            cur.damagedQuantity = val;
                            cur.acceptedQuantity = Math.max(0, cur.acceptedQuantity - delta);
                          } else if (field === 'wrongItemQuantity') {
                            const delta = val - cur.wrongItemQuantity;
                            cur.wrongItemQuantity = val;
                            cur.acceptedQuantity = Math.max(0, cur.acceptedQuantity - delta);
                          }
                          setReceiptItems(newItems);
                        };

                        return (
                          <tr key={idx} className={`border-b border-gray-100 ${item.acceptedQuantity < 0 ? 'bg-red-50' : item.hasDiscrepancy ? 'bg-yellow-50/50' : ''}`}>
                            <td className="p-2">
                              <p className="font-medium text-gray-800">{item.productName}</p>
                              <p className="text-[10px] text-gray-400">Đã nhận: {item.receivedQuantity} / {item.expectedQuantity}</p>
                            </td>
                            <td className="p-2 text-center font-semibold text-gray-800">{item.remaining}</td>
                            <td className="p-1">
                              <input type="number" min={0}
                                className={`w-full border rounded p-1 text-center font-semibold ${item.acceptedQuantity < 0 ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-300 bg-white text-gray-800'}`}
                                value={item.acceptedQuantity} onChange={e => updateField('acceptedQuantity', e.target.value)} />
                            </td>
                            <td className="p-1">
                              <input type="number" min={0}
                                className={`w-full border rounded p-1 text-center ${item.damagedQuantity > 0 ? 'border-gray-400 font-semibold text-gray-800' : 'border-gray-200 text-gray-600'}`}
                                value={item.damagedQuantity} onChange={e => updateField('damagedQuantity', e.target.value)} />
                            </td>
                            <td className="p-1">
                              <input type="number" min={0}
                                className={`w-full border rounded p-1 text-center ${item.wrongItemQuantity > 0 ? 'border-gray-400 font-semibold text-gray-800' : 'border-gray-200 text-gray-600'}`}
                                value={item.wrongItemQuantity} onChange={e => updateField('wrongItemQuantity', e.target.value)} />
                            </td>
                            <td className="p-2 text-center border-l border-gray-100">
                              <span className={`font-semibold ${item.actualReceived !== item.remaining ? 'text-amber-600' : 'text-gray-800'}`}>{item.actualReceived}</span>
                            </td>
                            <td className="p-2 text-center">
                              <span className={item.excess > 0 ? 'font-semibold text-blue-600' : 'text-gray-300'}>{item.excess > 0 ? `+${item.excess}` : '0'}</span>
                            </td>
                            <td className="p-2 text-center">
                              <span className={item.short_ > 0 ? 'font-semibold text-amber-600' : 'text-gray-300'}>{item.short_ > 0 ? `-${item.short_}` : '0'}</span>
                            </td>
                            <td className="p-1">
                              <input type="text" className="w-full border border-gray-200 rounded p-1 text-xs" value={item.note} onChange={e => {
                                const newItems = [...receiptItems];
                                newItems[idx].note = e.target.value;
                                setReceiptItems(newItems);
                              }} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 border-t border-gray-200">
                        <td className="p-2 font-semibold text-gray-600" colSpan={2}>Tổng</td>
                        <td className="p-2 text-center font-semibold text-gray-800">{totalAccepted}</td>
                        <td className="p-2 text-center font-semibold text-gray-800">{totalDamaged}</td>
                        <td className="p-2 text-center font-semibold text-gray-800">{totalWrong}</td>
                        <td className="p-2 text-center font-semibold text-gray-800 border-l border-gray-100">{computedItems.reduce((s, i) => s + i.actualReceived, 0)}</td>
                        <td className="p-2 text-center font-semibold text-gray-600">{totalExcess > 0 ? `+${totalExcess}` : '0'}</td>
                        <td className="p-2 text-center font-semibold text-gray-600">{totalShort > 0 ? `-${totalShort}` : '0'}</td>
                        <td className="p-2"></td>
                      </tr>
                    </tfoot>
                  </table>

                  <div className="mt-3 flex gap-4">
                    <div className="flex-1">
                      {!allMatch && (
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-2">
                          Có {discrepancyCount} sản phẩm sai lệch. Hàng hỏng/sai loại/thừa sẽ chuyển vào cách ly chờ duyệt.
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        Đạt và Thừa sẽ cộng vào tồn kho khi Post. Thiếu sẽ ghi nhận chênh lệch với NCC.
                      </p>
                    </div>
                    <div className="flex-1 p-3 bg-gray-50 rounded border flex flex-col gap-2">
                      <label className="text-xs font-medium text-gray-700">
                        Đính kèm tệp / ảnh minh chứng
                        {(totalDamaged > 0 || totalWrong > 0) && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <input type="file" className="text-xs" onChange={(e) => setProofFile(e.target.files?.[0] || null)} />
                      {(totalDamaged > 0 || totalWrong > 0) && !proofFile && (
                        <span className="text-[10px] text-red-500">Bắt buộc khi có hàng Hỏng hoặc Sai loại</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t flex justify-end gap-3">
                  <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setIsReceiveModalOpen(false)}>Hủy bỏ</Button>
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    style={{ backgroundColor: hasNegative ? '#9CA3AF' : PRIMARY }}
                    disabled={hasNegative}
                    onClick={() => {
                      if (hasNegative) {
                        alert('Có sản phẩm có số lượng Đạt âm. Vui lòng kiểm tra lại.');
                        return;
                      }
                      if ((totalDamaged > 0 || totalWrong > 0) && !proofFile) {
                        alert('Bắt buộc phải đính kèm ảnh minh chứng khi có hàng Hỏng hoặc Sai loại.');
                        return;
                      }
                      if (!allMatch) {
                        const msgNode = (
                          <>
                            <span className="block mb-2 font-medium text-gray-800">Có {discrepancyCount} sản phẩm sai lệch:</span>
                            <ul className="list-disc pl-5 mb-4 text-gray-700">
                              {totalDamaged > 0 && <li>Hỏng: {totalDamaged}</li>}
                              {totalWrong > 0 && <li>Sai loại: {totalWrong}</li>}
                              {totalExcess > 0 && <li>Thừa: +{totalExcess}</li>}
                              {totalShort > 0 && <li>Thiếu: -{totalShort}</li>}
                            </ul>
                            <span className="block text-amber-600 font-medium">Hàng sai lệch sẽ chuyển sang chờ CEO duyệt.</span>
                            <span className="block mt-2 font-bold text-gray-900">Bạn có chắc chắn muốn Post?</span>
                          </>
                        );
                        setConfirmMsg(msgNode);
                        setShowConfirmModal(true);
                        return;
                      }
                      handleReceive();
                    }}
                  >
                    Post Phiếu nhận hàng
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <ConfirmModal
        isOpen={showConfirmModal}
        title="Xác nhận phiếu nhận hàng"
        message={confirmMsg}
        confirmText="Đồng ý Post"
        cancelText="Hủy bỏ"
        onConfirm={handleReceive}
        onCancel={() => setShowConfirmModal(false)}
      />

    </div>
  );
}
