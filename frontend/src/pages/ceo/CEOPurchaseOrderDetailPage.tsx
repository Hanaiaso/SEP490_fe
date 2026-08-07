import { useState, useEffect } from 'react';
import { 
  getPurchaseOrderById, 
  issuePurchaseOrder, 
  sendToWarehouse, 
  cancelPurchaseOrder, 
  resolveDiscrepancy, 
  closePurchaseOrder,
  getGoodsReceipts 
} from '../../services/purchaseOrderService.js';
import { ArrowLeft } from 'lucide-react';
import ConfirmModal from '../../components/ui/ConfirmModal.jsx';

export default function CEOPurchaseOrderDetailPage({ poId, onBack }: any) {
  const [po, setPo] = useState<any>(null);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Discrepancy Modal
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);
  const [resData, setResData] = useState({ resolutionType: 'AcceptExcess', reason: '' });
  const [confirmConfig, setConfirmConfig] = useState<{ fn: any, msg: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getPurchaseOrderById(poId);
      setPo(data);
      if (data.status !== 'Draft' && data.status !== 'Issued' && data.status !== 'Cancelled') {
        const rc = await getGoodsReceipts(poId);
        setReceipts(rc);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (poId) loadData();
  }, [poId]);

  const handleAction = async (actionFn: any, confirmMsg?: string) => {
    if (confirmMsg) {
      setConfirmConfig({ fn: actionFn, msg: confirmMsg });
      return;
    }
    await executeAction(actionFn);
  };

  const executeAction = async (actionFn: any) => {
    try {
      await actionFn(poId);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleConfirmExecute = () => {
    if (confirmConfig) {
      executeAction(confirmConfig.fn);
      setConfirmConfig(null);
    }
  };

  const handleResolve = async () => {
    try {
      const payload = {
        decision: resData.resolutionType,
        notes: resData.reason
      };
      await resolveDiscrepancy(poId, payload);
      setShowDiscrepancyModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading || !po) return <div className="p-6">Đang tải...</div>;

  return (
    <div className="flex flex-col gap-4 p-[24px]">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-[20px] text-[#1f3b64]">Chi tiết PO: {po.code}</h1>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          po.status === 'SentToWarehouse' ? 'bg-purple-100 text-purple-800' :
          po.status === 'Issued' ? 'bg-blue-100 text-blue-800' :
          po.status === 'PartiallyReceived' ? 'bg-amber-100 text-amber-800' :
          po.status === 'FullyReceived' ? 'bg-emerald-100 text-emerald-800' :
          po.status === 'DiscrepancyReview' ? 'bg-orange-100 text-orange-800' :
          po.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {po.status === 'SentToWarehouse' ? 'Đã gửi kho' :
           po.status === 'Issued' ? 'Đã phát hành' :
           po.status === 'PartiallyReceived' ? 'Nhập một phần' :
           po.status === 'FullyReceived' ? 'Hoàn tất nhập' :
           po.status === 'DiscrepancyReview' ? 'Chờ duyệt chênh lệch' :
           po.status === 'Draft' ? 'Nháp' :
           po.status}
        </span>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-3 bg-white p-4 rounded border">
        {po.status === 'Draft' && (
          <>
            <button onClick={() => handleAction(issuePurchaseOrder)} className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700">Phát hành (Issue)</button>
            <button onClick={() => handleAction(cancelPurchaseOrder, 'Bạn chắc chắn muốn hủy?')} className="px-4 py-2 bg-red-100 text-red-600 text-sm font-medium rounded hover:bg-red-200">Hủy PO</button>
          </>
        )}
        {po.status === 'Issued' && (
          <button onClick={() => handleAction(sendToWarehouse)} className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded hover:bg-purple-700">Gửi cho Kho</button>
        )}
        {po.status === 'SentToWarehouse' && (
          <div className="text-xs font-medium text-purple-700 flex items-center gap-2">
            <span>📦 Đơn hàng đã được gửi tới bộ phận Kho. Đang chờ Kho tiến hành kiểm đếm & nhập hàng.</span>
          </div>
        )}
        {po.status === 'DiscrepancyReview' && (
          <button onClick={() => setShowDiscrepancyModal(true)} className="px-4 py-2 bg-orange-500 text-white text-sm font-medium rounded hover:bg-orange-600">Xử lý Chênh lệch</button>
        )}
        {(po.status === 'FullyReceived' || po.status === 'DiscrepancyReview' || po.status === 'PartiallyReceived') && (
          <button onClick={() => handleAction(closePurchaseOrder, 'Đóng PO này?')} className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded hover:bg-emerald-700 ml-auto">Đóng PO (Close)</button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded border">
          <h3 className="font-medium text-sm text-gray-500 mb-2">Thông tin Đặt hàng</h3>
          <div className="text-sm flex flex-col gap-1">
            <p><strong>NCC:</strong> {po.supplierName} ({po.supplierCode})</p>
            <p><strong>Kho nhận:</strong> {po.warehouseName}</p>
            <p><strong>Ngày tạo:</strong> {new Date(po.createdAt).toLocaleString('vi-VN')}</p>
            <p><strong>Ngày giao:</strong> {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString('vi-VN') : 'Không có'}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded border">
          <h3 className="font-medium text-sm text-gray-500 mb-2">Ghi chú & Điều kiện</h3>
          <div className="text-sm flex flex-col gap-1">
            <p><strong>Điều kiện:</strong> {po.deliveryTerms || '-'}</p>
            <p className="whitespace-pre-wrap"><strong>Ghi chú:</strong> {po.note || '-'}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded border overflow-hidden">
        <h3 className="font-medium p-4 border-b bg-gray-50">Sản phẩm Đặt mua</h3>
        <table className="w-full text-sm">
          <thead className="bg-gray-100 text-gray-600">
            <tr>
              <th className="p-2 text-left">SKU</th>
              <th className="p-2 text-left">Sản phẩm</th>
              <th className="p-2 text-right">Giá</th>
              <th className="p-2 text-right">SL Đặt</th>
              <th className="p-2 text-right text-green-700">Đã nhận</th>
              <th className="p-2 text-right text-red-600">Thiếu</th>
            </tr>
          </thead>
          <tbody>
            {po.items && po.items.length > 0 ? (
              po.items.map((i: any) => (
                <tr key={i.id || i.productSku || i.itemSku} className="border-b hover:bg-gray-50/50">
                  <td className="p-2 font-mono text-gray-600">{i.itemSku || i.productSku || '-'}</td>
                  <td className="p-2 font-medium text-gray-800">{i.itemName || i.productName || 'Sản phẩm'}</td>
                  <td className="p-2 text-right font-mono">{(i.unitPrice ?? 0).toLocaleString('vi-VN')} đ</td>
                  <td className="p-2 text-right font-medium">{i.expectedQuantity ?? 0} {i.unit || 'Cái'}</td>
                  <td className="p-2 text-right text-green-700 font-bold">{i.receivedQuantity ?? 0}</td>
                  <td className="p-2 text-right text-red-600 font-semibold">{Math.max(0, (i.expectedQuantity ?? 0) - (i.receivedQuantity ?? 0))}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-6 text-center text-gray-400 italic">Chưa có thông tin sản phẩm đặt mua</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {receipts.length > 0 && (
        <div className="bg-white rounded border overflow-hidden mt-4">
          <h3 className="font-medium p-4 border-b bg-purple-50 text-purple-900">Lịch sử Nhận hàng (Goods Receipts)</h3>
          <div className="p-4 flex flex-col gap-4">
            {receipts.map(r => (
              <div key={r.id} className="border rounded p-3 bg-gray-50">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-bold text-gray-700">{r.code} - {r.status}</span>
                  <span className="text-gray-500">{new Date(r.receivedDate).toLocaleString('vi-VN')} by {r.receivedByUserName}</span>
                </div>
                <table className="w-full text-xs bg-white border">
                  <thead className="bg-gray-200">
                    <tr>
                      <th className="p-1 text-left">SP</th>
                      <th className="p-1 text-right">Đạt</th>
                      <th className="p-1 text-right text-red-500">Hỏng</th>
                      <th className="p-1 text-right text-orange-500">Thừa</th>
                      <th className="p-1 text-right text-yellow-600">Thiếu</th>
                      <th className="p-1 text-right text-purple-500">Sai loại</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.items.map((ri: any) => (
                      <tr key={ri.id} className="border-t">
                        <td className="p-1">{ri.productName}</td>
                        <td className="p-1 text-right font-bold text-green-600">{ri.acceptedQuantity}</td>
                        <td className="p-1 text-right text-red-500">{ri.damagedQuantity}</td>
                        <td className="p-1 text-right text-orange-500">{ri.excessQuantity}</td>
                        <td className="p-1 text-right text-yellow-600">{ri.shortQuantity}</td>
                        <td className="p-1 text-right text-purple-500">{ri.wrongItemQuantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}

      {showDiscrepancyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded p-6 w-[400px]">
            <h2 className="text-lg font-bold mb-4">CEO xử lý chênh lệch</h2>
            <div className="flex flex-col gap-3">
              <select className="border p-2 rounded text-sm" value={resData.resolutionType} onChange={e => setResData({...resData, resolutionType: e.target.value})}>
                <option value="AcceptExcess">Chấp nhận hàng thừa</option>
                <option value="ReturnExcess">Yêu cầu trả hàng thừa/hỏng</option>
                <option value="RequestSupplemental">Yêu cầu giao bổ sung</option>
                <option value="CloseShort">Chấp nhận đóng thiếu (Close Short)</option>
              </select>
              <textarea className="border p-2 rounded text-sm" rows={3} placeholder="Ghi chú xử lý..." value={resData.reason} onChange={e => setResData({...resData, reason: e.target.value})}></textarea>
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => setShowDiscrepancyModal(false)} className="px-3 py-1.5 border rounded">Hủy</button>
                <button onClick={handleResolve} className="px-3 py-1.5 bg-orange-500 text-white rounded">Xác nhận</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmConfig}
        title="Xác nhận thao tác"
        message={confirmConfig?.msg}
        onConfirm={handleConfirmExecute}
        onCancel={() => setConfirmConfig(null)}
      />
    </div>
  );
}
