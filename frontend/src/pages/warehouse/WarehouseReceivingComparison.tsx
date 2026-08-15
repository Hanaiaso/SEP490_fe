import { getErrorMessage } from '../../lib/errors';
import { useState } from 'react';
import type { ChangeEvent } from 'react';
import { AlertTriangle, Eye, ShieldCheck, TrendingUp, XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/sales-ui/dialog';
import { getPurchaseOrders, getPurchaseOrderById } from '../../services/purchaseOrderService.js';
import { useEffect } from 'react';
import type { PurchaseOrder, PurchaseOrderListItem } from '../../types/warehouse';

const WARNING = '#D97706';
const ERROR   = '#DC2626';
const INFO    = '#2563EB';
const NEUTRAL = '#64748B';

interface ComparisonItem {
  sku: string; product: string; orderedQty: number; receivedQty: number;
  difference: number; damageQty: number; missingQty: number; extraQty: number;
  variancePct: number; qcRequired: boolean;
}

export default function WarehouseReceivingComparison() {
  const [items, setItems] = useState<ComparisonItem[]>([]);
  const [detail, setDetail] = useState<ComparisonItem | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');

  const [poList, setPoList] = useState<PurchaseOrderListItem[]>([]);
  const [selectedPoId, setSelectedPoId] = useState<string>('');
  const [, setPoDetail] = useState<PurchaseOrder | null>(null);
  const [, setLoading] = useState(false);

  const loadPOs = async () => {
    try {
      const pos = await getPurchaseOrders('DiscrepancyReview');
      setPoList(pos);
    } catch (err: unknown) {
      alert('Lỗi lấy danh sách PO: ' + getErrorMessage(err));
    }
  };

  const loadPoDetails = async (id: string) => {
    if (!id) {
      setItems([]);
      setPoDetail(null);
      return;
    }
    setLoading(true);
    try {
      const data: PurchaseOrder = await getPurchaseOrderById(id);
      setPoDetail(data);
      const mapped: ComparisonItem[] = data.items.map((i) => {
        const received = i.receivedQuantity;
        const ordered = i.expectedQuantity;
        const diff = received - ordered;
        const varPct = ordered > 0 ? (diff / ordered) * 100 : 0;
        return {
          sku: i.itemSku || '-',
          product: i.itemName || '-',
          orderedQty: ordered,
          receivedQty: received,
          difference: diff,
          damageQty: 0, // Should come from receipts, but currently PO item doesn't expose it directly in Dto unless we fetch GRs. For now mock 0.
          missingQty: diff < 0 ? Math.abs(diff) : 0,
          extraQty: diff > 0 ? diff : 0,
          variancePct: varPct,
          qcRequired: false,
        };
      });
      setItems(mapped.filter((i) => i.difference !== 0 || i.damageQty > 0)); // Only show items with discrepancy
    } catch (err: unknown) {
      alert('Lỗi lấy chi tiết PO: ' + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPOs(); }, []);

  const handleSelectPo = (e: ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedPoId(id);
    loadPoDetails(id);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] mb-0.5">
          <span className="text-gray-400">Kho hàng</span><span className="text-gray-400">/</span><span className="text-gray-400">Nhập kho (Inbound)</span><span className="text-gray-400">/</span><span className="text-gray-800 font-semibold">Đối chiếu nhập hàng</span>
        </div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Đối chiếu nhập hàng (Receiving Comparison)</h2>
            <p className="text-xs text-gray-500 mt-0.5">Xem hàng hoá sai lệch giữa PO và số lượng thực nhận — chỉ CEO có quyền ra quyết định xử lý</p>
          </div>
        </div>

        <div className="flex items-start gap-2 mb-3 rounded border border-blue-100 bg-blue-50 px-3 py-2">
          <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: INFO }} />
          <p className="text-xs text-blue-800">Trang này chỉ để tra cứu. Quyết định xử lý chênh lệch (chấp nhận hàng dư, trả lại NCC, yêu cầu giao bổ sung...) do CEO thực hiện ở màn Purchase Order phía CEO.</p>
        </div>

        {/* PO Selector */}
        <div className="flex items-center gap-2 mb-3">
          <select className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600 font-medium min-w-[200px]" value={selectedPoId} onChange={handleSelectPo}>
            <option value="">-- Chọn PO đang có sai lệch --</option>
            {poList.map(po => (
              <option key={po.id} value={po.id}>{po.code} - {po.supplierName}</option>
            ))}
          </select>
        </div>
        {/* Filter row */}
        <div className="flex items-center gap-2 mb-3">
          <input type="date" className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <input type="date" className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          <select className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)}>
            <option value="all">Tất cả kho</option>
            <option value="Kho Hà Nội">Kho Hà Nội</option>
            <option value="Kho HCM">Kho HCM</option>
            <option value="Kho Đà Nẵng">Kho Đà Nẵng</option>
          </select>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="flex items-center gap-2 bg-gray-50 rounded px-3 py-2 border border-gray-200">
            <span style={{ color: WARNING }}><AlertTriangle className="w-4 h-4" /></span>
            <div><p className="text-[10px] text-gray-500">Thiếu</p><p className="text-base font-bold" style={{ color: WARNING }}>{items.filter(i => i.missingQty > 0).length}</p></div>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 rounded px-3 py-2 border border-gray-200">
            <span style={{ color: INFO }}><TrendingUp className="w-4 h-4" /></span>
            <div><p className="text-[10px] text-gray-500">Dư</p><p className="text-base font-bold" style={{ color: INFO }}>{items.filter(i => i.extraQty > 0).length}</p></div>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 rounded px-3 py-2 border border-gray-200">
            <span style={{ color: ERROR }}><XCircle className="w-4 h-4" /></span>
            <div><p className="text-[10px] text-gray-500">Hư hỏng</p><p className="text-base font-bold" style={{ color: ERROR }}>{items.filter(i => i.damageQty > 0).length}</p></div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">SKU</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Sản phẩm</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">SL đặt</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">SL nhận</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Lệch</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Hư hỏng</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Thiếu</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Dư</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Lệch %</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">QC</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 && (
                <tr><td colSpan={10} className="py-12 text-center"><div className="flex flex-col items-center gap-2"><div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><span className="text-gray-400 text-xl">📋</span></div><p className="text-sm font-medium text-gray-500">Không có dữ liệu</p><p className="text-xs text-gray-400">Chọn 1 PO đang có sai lệch để xem chi tiết</p></div></td></tr>
              )}
              {items.map((item, i) => (
                <tr key={item.sku} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-3 py-2.5 font-mono text-gray-500">{item.sku}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-800">{item.product}</td>
                  <td className="px-3 py-2.5 text-center font-semibold">{item.orderedQty}</td>
                  <td className="px-3 py-2.5 text-center font-semibold" style={{ color: item.receivedQty === item.orderedQty ? '#16A34A' : WARNING }}>{item.receivedQty}</td>
                  <td className="px-3 py-2.5 text-center font-semibold" style={{ color: item.difference < 0 ? ERROR : '#16A34A' }}>
                    {item.difference > 0 ? '+' : ''}{item.difference}
                  </td>
                  <td className="px-3 py-2.5 text-center font-semibold" style={{ color: item.damageQty > 0 ? ERROR : NEUTRAL }}>{item.damageQty}</td>
                  <td className="px-3 py-2.5 text-center font-semibold" style={{ color: item.missingQty > 0 ? WARNING : NEUTRAL }}>{item.missingQty}</td>
                  <td className="px-3 py-2.5 text-center font-semibold" style={{ color: item.extraQty > 0 ? INFO : NEUTRAL }}>{item.extraQty}</td>
                  <td className="px-3 py-2.5 text-center font-mono font-semibold" style={{ color: Math.abs(item.variancePct) > 10 ? ERROR : NEUTRAL }}>
                    {item.variancePct > 0 ? '+' : ''}{item.variancePct.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    {item.qcRequired ? <span className="text-[10px] font-semibold text-white px-1.5 py-0.5" style={{ backgroundColor: WARNING, borderRadius: 4 }}>Cần QC</span>
                      : <span className="text-[10px] text-gray-400">Không</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <button className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" onClick={() => setDetail(item)} title="Xem chi tiết"><Eye className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <span className="text-xs text-gray-500">Hiển thị {items.length} sản phẩm</span>
          </div>
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Chi tiết đối chiếu — {detail?.sku}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-xs">
              <div className="bg-gray-50 rounded p-3 space-y-1.5">
                <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Thông tin sản phẩm</p>
                <div className="flex justify-between"><span className="text-gray-500">SKU:</span><span className="font-mono">{detail.sku}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Sản phẩm:</span><span className="font-medium text-gray-800">{detail.product}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded p-3 space-y-1.5">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Số lượng</p>
                  <div className="flex justify-between"><span className="text-gray-500">SL đặt:</span><span className="font-semibold">{detail.orderedQty}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">SL nhận:</span><span className="font-semibold" style={{ color: detail.receivedQty < detail.orderedQty ? WARNING : '#16A34A' }}>{detail.receivedQty}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Lệch:</span><span className="font-semibold" style={{ color: ERROR }}>{detail.difference}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Lệch %:</span><span className="font-semibold" style={{ color: ERROR }}>{detail.variancePct.toFixed(1)}%</span></div>
                </div>
                <div className="bg-gray-50 rounded p-3 space-y-1.5">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Phân loại lệch</p>
                  <div className="flex justify-between"><span className="text-gray-500">Hư hỏng:</span><span className="font-semibold" style={{ color: detail.damageQty > 0 ? ERROR : NEUTRAL }}>{detail.damageQty}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Thiếu:</span><span className="font-semibold" style={{ color: detail.missingQty > 0 ? WARNING : NEUTRAL }}>{detail.missingQty}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Dư:</span><span className="font-semibold" style={{ color: detail.extraQty > 0 ? INFO : NEUTRAL }}>{detail.extraQty}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">QC:</span><span>{detail.qcRequired ? 'Cần kiểm tra' : 'Không'}</span></div>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded border border-blue-100 bg-blue-50 px-3 py-2">
                <ShieldCheck className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: INFO }} />
                <p className="text-[11px] text-blue-800">Quyết định xử lý sai lệch này (chấp nhận, trả NCC, yêu cầu giao bổ sung...) do CEO thực hiện.</p>
              </div>
              <div className="flex pt-2 border-t border-gray-100">
                <button className="ml-auto text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5" onClick={() => setDetail(null)}>Đóng</button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
