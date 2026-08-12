import { getErrorMessage } from '../../lib/errors';
import { useState, useEffect, useCallback } from 'react';
import {
  getPurchaseOrderById,
  issuePurchaseOrder,
  sendToWarehouse,
  cancelPurchaseOrder,
  resolveDiscrepancy,
  closePurchaseOrder,
  getGoodsReceipts
} from '../../services/purchaseOrderService.js';
import { ArrowLeft, Package, Truck, User, Image as ImageIcon, Pencil } from 'lucide-react';
import ConfirmModal from '../../components/ui/ConfirmModal.jsx';
import { Button } from '../../components/sales-ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/sales-ui/dialog';
import { useToast } from '../../context/ToastContext';
import CEOPurchaseOrderCreateModal from './CEOPurchaseOrderCreateModal';
import type { PurchaseOrder, GoodsReceipt, DiscrepancyResolutionRequest } from '../../types/warehouse';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#D97706';

type PoActionFn = (id: string) => Promise<unknown>;

interface CEOPurchaseOrderDetailPageProps {
  poId: string | null;
  onBack: () => void;
}

const PO_STATUS_MAP: Record<string, { label: string; style: string }> = {
  'Draft': { label: 'Bản nháp', style: 'bg-gray-100 text-gray-700' },
  'Issued': { label: 'Đã phát hành', style: 'bg-blue-100 text-blue-700' },
  'SentToWarehouse': { label: 'Đã gửi kho', style: 'bg-purple-100 text-purple-700' },
  'PartiallyReceived': { label: 'Nhận một phần', style: 'bg-yellow-100 text-yellow-700' },
  'FullyReceived': { label: 'Đã nhận đủ', style: 'bg-green-100 text-green-700' },
  'DiscrepancyReview': { label: 'Có chênh lệch', style: 'bg-red-100 text-red-700' },
  'Closed': { label: 'Đã đóng PO', style: 'bg-emerald-100 text-emerald-800' },
  'Cancelled': { label: 'Đã hủy', style: 'bg-rose-100 text-rose-800' }
};

function StatusBadge({ status }: { status: string }) {
  const cfg = PO_STATUS_MAP[status] || { label: status, style: 'bg-gray-100 text-gray-700' };
  return <span className={`px-2.5 py-1 rounded text-xs font-semibold ${cfg.style}`}>{cfg.label}</span>;
}

export default function CEOPurchaseOrderDetailPage({ poId, onBack }: CEOPurchaseOrderDetailPageProps) {
  const { toast } = useToast();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  const [showEditModal, setShowEditModal] = useState(false);

  // Discrepancy Modal
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);
  const [resData, setResData] = useState<{ resolutionType: DiscrepancyResolutionRequest['resolutionType']; reason: string }>({ resolutionType: 'AcceptExcess', reason: '' });
  const [confirmConfig, setConfirmConfig] = useState<{ fn: PoActionFn, msg: string } | null>(null);

  const loadData = useCallback(async () => {
    if (!poId) return;
    setLoading(true);
    try {
      const data = await getPurchaseOrderById(poId);
      setPo(data);
      if (data.status !== 'Draft' && data.status !== 'Issued' && data.status !== 'Cancelled') {
        const rc = await getGoodsReceipts(poId);
        setReceipts(rc);
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [poId, toast]);

  useEffect(() => {
    if (poId) loadData();
  }, [poId, loadData]);

  const handleAction = async (actionFn: PoActionFn, confirmMsg?: string) => {
    if (confirmMsg) {
      setConfirmConfig({ fn: actionFn, msg: confirmMsg });
      return;
    }
    await executeAction(actionFn);
  };

  const executeAction = async (actionFn: PoActionFn) => {
    if (!poId) return;
    try {
      await actionFn(poId);
      toast.success('Thao tác thành công');
      loadData();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleConfirmExecute = () => {
    if (confirmConfig) {
      executeAction(confirmConfig.fn);
      setConfirmConfig(null);
    }
  };

  const handleResolve = async () => {
    if (!poId) return;
    try {
      const payload: DiscrepancyResolutionRequest = {
        resolutionType: resData.resolutionType,
        reason: resData.reason
      };
      await resolveDiscrepancy(poId, payload);
      toast.success('Đã xử lý chênh lệch');
      setShowDiscrepancyModal(false);
      loadData();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading || !po) {
    return (
      <div className="flex flex-col gap-4 p-[24px]">
        <div className="h-6 w-64 bg-gray-100 rounded animate-pulse" />
        <div className="h-16 bg-gray-100 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          <div className="h-28 bg-gray-100 rounded animate-pulse" />
          <div className="h-28 bg-gray-100 rounded animate-pulse" />
          <div className="h-28 bg-gray-100 rounded animate-pulse" />
        </div>
        <div className="h-48 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  const totalExpected = po.items?.reduce((s, i) => s + (i.expectedQuantity ?? 0), 0) ?? 0;
  const totalReceived = po.items?.reduce((s, i) => s + (i.receivedQuantity ?? 0), 0) ?? 0;
  const progress = totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0;

  return (
    <div className="flex flex-col gap-4 p-[24px]">
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-[11px]">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-600">Purchase Orders</button>
        <span className="text-gray-300">/</span>
        <span className="text-gray-800 font-semibold">{po.code}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-[20px] text-[#1f3b64]">Chi tiết PO: {po.code}</h1>
        <StatusBadge status={po.status} />
        {po.createdByName && (
          <span className="flex items-center gap-1 text-xs text-gray-500 ml-1">
            <User className="w-3.5 h-3.5" /> Tạo bởi {po.createdByName}
          </span>
        )}
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-lg border border-gray-200">
        {po.status === 'Draft' && (
          <>
            <Button size="sm" style={{ backgroundColor: PRIMARY }} onClick={() => handleAction(issuePurchaseOrder)}>Phát hành (Issue)</Button>
            <Button size="sm" variant="outline" onClick={() => setShowEditModal(true)}><Pencil className="w-3.5 h-3.5 mr-1.5" /> Sửa PO</Button>
            <Button size="sm" variant="destructive" onClick={() => handleAction(cancelPurchaseOrder, 'Bạn chắc chắn muốn hủy?')}>Hủy PO</Button>
          </>
        )}
        {po.status === 'Issued' && (
          <Button size="sm" style={{ backgroundColor: '#7C3AED' }} onClick={() => handleAction(sendToWarehouse)}>Gửi cho Kho</Button>
        )}
        {po.status === 'SentToWarehouse' && (
          <div className="text-xs font-medium text-purple-700 flex items-center gap-2">
            <Truck className="w-4 h-4" />
            <span>Đơn hàng đã được gửi tới bộ phận Kho. Đang chờ Kho tiến hành kiểm đếm &amp; nhập hàng.</span>
          </div>
        )}
        {po.status === 'DiscrepancyReview' && (
          <Button size="sm" style={{ backgroundColor: WARNING }} onClick={() => setShowDiscrepancyModal(true)}>Xử lý Chênh lệch</Button>
        )}
        {(po.status === 'FullyReceived' || po.status === 'DiscrepancyReview' || po.status === 'PartiallyReceived') && (
          <Button size="sm" className="ml-auto" style={{ backgroundColor: SUCCESS }} onClick={() => handleAction(closePurchaseOrder, 'Đóng PO này?')}>Đóng PO (Close)</Button>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Thông tin đặt hàng</p>
          <div className="text-sm flex flex-col gap-1.5">
            <div className="flex justify-between"><span className="text-gray-500">Kho nhận:</span><span className="font-medium text-gray-800">{po.warehouseName}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Ngày tạo:</span><span className="font-medium text-gray-800">{new Date(po.createdAt).toLocaleString('vi-VN')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Ngày phát hành:</span><span className="font-medium text-gray-800">{po.issuedAt ? new Date(po.issuedAt).toLocaleString('vi-VN') : '-'}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Ngày giao dự kiến:</span><span className="font-medium text-gray-800">{po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString('vi-VN') : 'Không có'}</span></div>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Nhà cung cấp</p>
          <div className="text-sm flex flex-col gap-1.5">
            <div className="flex justify-between"><span className="text-gray-500">Tên NCC:</span><span className="font-semibold text-gray-800">{po.supplierName}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Mã NCC:</span><span className="font-mono text-gray-800">{po.supplierCode}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Điều kiện:</span><span className="font-medium text-gray-800">{po.deliveryTerms || '-'}</span></div>
            {po.note && <p className="text-gray-500 whitespace-pre-wrap mt-1"><span className="text-gray-500">Ghi chú: </span><span className="text-gray-800">{po.note}</span></p>}
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
          <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Tiến độ nhập hàng</p>
          <div className="text-sm flex flex-col gap-1.5">
            <div className="flex justify-between"><span className="text-gray-500">Số dòng hàng:</span><span className="font-semibold text-gray-800">{po.items?.length ?? 0}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Tổng SL đặt:</span><span className="font-semibold text-gray-800">{totalExpected.toLocaleString('vi-VN')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Đã nhận:</span><span className="font-semibold" style={{ color: progress === 100 ? SUCCESS : PRIMARY }}>{totalReceived.toLocaleString('vi-VN')}</span></div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${progress}%`, backgroundColor: progress === 100 ? SUCCESS : PRIMARY }} />
              </div>
              <span className="font-mono text-xs text-gray-600">{progress}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-gray-50">
          <Package className="w-4 h-4 text-gray-500" />
          <h3 className="font-semibold text-sm text-gray-800">Sản phẩm Đặt mua</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-600 uppercase">SKU</th>
              <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-600 uppercase">Sản phẩm</th>
              <th className="text-center px-3 py-2.5 text-[11px] font-semibold text-gray-600 uppercase">ĐVT</th>
              <th className="text-right px-3 py-2.5 text-[11px] font-semibold text-gray-600 uppercase">Đơn giá</th>
              <th className="text-right px-3 py-2.5 text-[11px] font-semibold text-gray-600 uppercase">SL Đặt</th>
              <th className="text-right px-3 py-2.5 text-[11px] font-semibold text-green-700 uppercase">Đã nhận</th>
              <th className="text-right px-3 py-2.5 text-[11px] font-semibold text-red-600 uppercase">Thiếu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {po.items && po.items.length > 0 ? (
              po.items.map((i) => (
                <tr key={i.id} className="hover:bg-gray-50/60">
                  <td className="px-3 py-2.5 font-mono text-gray-600">{i.itemSku || '-'}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-800">{i.itemName || 'Sản phẩm'}</td>
                  <td className="px-3 py-2.5 text-center text-gray-600">{i.unit || 'Cái'}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-gray-700">{(i.unitPrice ?? 0).toLocaleString('vi-VN')} đ</td>
                  <td className="px-3 py-2.5 text-right font-medium text-gray-800">{i.expectedQuantity ?? 0}</td>
                  <td className="px-3 py-2.5 text-right text-green-700 font-bold">{i.receivedQuantity ?? 0}</td>
                  <td className="px-3 py-2.5 text-right text-red-600 font-semibold">{Math.max(0, (i.expectedQuantity ?? 0) - (i.receivedQuantity ?? 0))}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-400 italic">Chưa có thông tin sản phẩm đặt mua</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Goods receipts history */}
      {receipts.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 bg-purple-50">
            <Truck className="w-4 h-4 text-purple-700" />
            <h3 className="font-semibold text-sm text-purple-900">Lịch sử Nhận hàng (Goods Receipts)</h3>
          </div>
          <div className="p-4 flex flex-col gap-4">
            {receipts.map(r => (
              <div key={r.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <div className="flex items-center justify-between text-sm mb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-800">{r.code}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-200 text-gray-700">{r.status}</span>
                  </div>
                  <span className="text-gray-500 text-xs">{new Date(r.receivedDate).toLocaleString('vi-VN')} · {r.receivedByUserName}</span>
                </div>

                {r.imageProofUrl && (
                  <a href={r.imageProofUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline mb-2">
                    <ImageIcon className="w-3.5 h-3.5" /> Xem ảnh minh chứng
                  </a>
                )}

                <div className="bg-white border border-gray-200 rounded overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="p-2 text-left font-semibold text-gray-700">Sản phẩm</th>
                        <th className="p-2 text-right font-semibold text-green-700">Đạt</th>
                        <th className="p-2 text-right font-semibold text-red-500">Hỏng</th>
                        <th className="p-2 text-right font-semibold text-orange-500">Thừa</th>
                        <th className="p-2 text-right font-semibold text-yellow-600">Thiếu</th>
                        <th className="p-2 text-right font-semibold text-purple-500">Sai loại</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {r.items.map((ri) => (
                        <tr key={ri.id}>
                          <td className="p-2">
                            <p className="text-gray-800">{ri.itemName}</p>
                            {(ri.batchNumber || ri.expiryDate) && (
                              <p className="text-[10px] text-gray-400">
                                {ri.batchNumber && <span>Lô: {ri.batchNumber}</span>}
                                {ri.batchNumber && ri.expiryDate && <span> · </span>}
                                {ri.expiryDate && <span>HSD: {new Date(ri.expiryDate).toLocaleDateString('vi-VN')}</span>}
                              </p>
                            )}
                          </td>
                          <td className="p-2 text-right font-bold text-green-600">{ri.acceptedQuantity}</td>
                          <td className="p-2 text-right text-red-500">{ri.damagedQuantity}</td>
                          <td className="p-2 text-right text-orange-500">{ri.excessQuantity}</td>
                          <td className="p-2 text-right text-yellow-600">{ri.shortQuantity}</td>
                          <td className="p-2 text-right text-purple-500">{ri.wrongItemQuantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discrepancy resolution modal */}
      <Dialog open={showDiscrepancyModal} onOpenChange={setShowDiscrepancyModal}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>CEO xử lý chênh lệch</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 px-6 py-4">
            <select
              className="border border-gray-300 rounded-md p-2 text-sm outline-none focus:border-blue-400"
              value={resData.resolutionType}
              onChange={e => setResData({ ...resData, resolutionType: e.target.value as DiscrepancyResolutionRequest['resolutionType'] })}
            >
              <option value="AcceptExcess">Chấp nhận hàng thừa</option>
              <option value="ReturnExcess">Yêu cầu trả hàng thừa cho NCC</option>
              <option value="RequestSupplemental">Yêu cầu giao bổ sung</option>
              <option value="CloseShort">Chấp nhận đóng thiếu (Close Short)</option>
            </select>
            <textarea
              className="border border-gray-300 rounded-md p-2 text-sm outline-none focus:border-blue-400"
              rows={3}
              placeholder="Ghi chú xử lý..."
              value={resData.reason}
              onChange={e => setResData({ ...resData, reason: e.target.value })}
            />
            <div className="flex justify-end gap-2 mt-2">
              <Button variant="outline" size="sm" onClick={() => setShowDiscrepancyModal(false)}>Hủy</Button>
              <Button size="sm" style={{ backgroundColor: WARNING }} onClick={handleResolve}>Xác nhận</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        isOpen={!!confirmConfig}
        title="Xác nhận thao tác"
        message={confirmConfig?.msg}
        onConfirm={handleConfirmExecute}
        onCancel={() => setConfirmConfig(null)}
      />

      {showEditModal && (
        <CEOPurchaseOrderCreateModal
          editingPO={po}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => { setShowEditModal(false); loadData(); }}
        />
      )}
    </div>
  );
}
