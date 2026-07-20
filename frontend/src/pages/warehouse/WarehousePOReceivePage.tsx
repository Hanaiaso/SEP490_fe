import { useState, useEffect } from 'react';
import { getPurchaseOrders, getPurchaseOrderById, createGoodsReceipt, postGoodsReceipt, getGoodsReceipts } from '../../services/purchaseOrderService.js';
import { Search, Eye, ClipboardCheck } from 'lucide-react';

export default function WarehousePOReceivePage({ setActiveTab, setSelectPOId }: any) {
  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState<any>(null);
  const [receiptItems, setReceiptItems] = useState<any[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Kho chỉ thấy PO trạng thái SentToWarehouse và PartiallyReceived
      const allPos = await getPurchaseOrders('');
      setPos(allPos.filter((p: any) => p.status === 'SentToWarehouse' || p.status === 'PartiallyReceived'));
    } catch (err: any) {
      alert(err.message);
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
      setSelectedPo(data);
      // Init items
      setReceiptItems(data.items.map((i: any) => ({
        purchaseOrderItemId: i.id,
        productName: i.productName,
        expectedQuantity: i.expectedQuantity,
        receivedQuantity: i.receivedQuantity,
        acceptedQuantity: Math.max(0, i.expectedQuantity - i.receivedQuantity), // Default to remaining
        damagedQuantity: 0,
        excessQuantity: 0,
        shortQuantity: 0,
        wrongItemQuantity: 0,
        note: ''
      })));
      setIsModalOpen(true);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleReceive = async () => {
    try {
      const payload = {
        note: "Nhận hàng tại kho",
        items: receiptItems.map(i => ({
          purchaseOrderItemId: i.purchaseOrderItemId,
          acceptedQuantity: i.acceptedQuantity,
          damagedQuantity: i.damagedQuantity,
          excessQuantity: i.excessQuantity,
          shortQuantity: i.shortQuantity,
          wrongItemQuantity: i.wrongItemQuantity,
          note: i.note
        }))
      };

      const receipt = await createGoodsReceipt(selectedPo.id, payload);
      // Tự động post luôn
      await postGoodsReceipt(selectedPo.id, receipt.id);
      
      alert("Post phiếu nhận hàng thành công. Tồn kho đã được cập nhật!");
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex justify-between items-center">
        <h1 className="font-semibold text-xl text-[#1f3b64]">Nhận hàng từ Nhà cung cấp</h1>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="text-left p-3 text-gray-500 font-medium">Mã PO</th>
              <th className="text-left p-3 text-gray-500 font-medium">NCC</th>
              <th className="text-left p-3 text-gray-500 font-medium">Trạng thái</th>
              <th className="text-right p-3 text-gray-500 font-medium">Tiến độ nhận</th>
              <th className="text-center p-3 text-gray-500 font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center p-4">Đang tải...</td></tr>
            ) : pos.length === 0 ? (
              <tr><td colSpan={5} className="text-center p-4">Không có PO nào chờ nhận</td></tr>
            ) : pos.map(p => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="p-3 font-medium text-blue-600">{p.code}</td>
                <td className="p-3">{p.supplierName}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs ${p.status === 'SentToWarehouse' ? 'bg-purple-100 text-purple-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {p.status}
                  </span>
                </td>
                <td className="p-3 text-right">{p.totalReceivedQuantity} / {p.totalExpectedQuantity}</td>
                <td className="p-3 text-center">
                  <button onClick={() => openReceiveModal(p.id)} className="text-green-600 hover:bg-green-50 p-1.5 rounded flex items-center justify-center mx-auto gap-1 text-xs font-medium border border-green-200">
                    <ClipboardCheck className="w-4 h-4" /> Nhận Hàng
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && selectedPo && (
        <div className="fixed inset-0 bg-black/50 flex justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg w-full max-w-5xl my-auto p-0 flex flex-col shadow-xl">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
              <h2 className="text-lg font-bold text-[#1f3b64]">Kiểm đếm nhận hàng: {selectedPo.code}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-red-500 text-xl font-bold">×</button>
            </div>
            
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-xs text-left border">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 border-b w-[200px]">Sản phẩm</th>
                    <th className="p-2 border-b w-[80px] text-center">Cần nhận</th>
                    <th className="p-2 border-b w-[80px] text-center">Đạt (+)</th>
                    <th className="p-2 border-b w-[80px] text-center">Hỏng</th>
                    <th className="p-2 border-b w-[80px] text-center">Thừa (+)</th>
                    <th className="p-2 border-b w-[80px] text-center">Thiếu (-)</th>
                    <th className="p-2 border-b w-[80px] text-center">Sai loại</th>
                    <th className="p-2 border-b">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptItems.map((item, idx) => {
                    const remaining = Math.max(0, item.expectedQuantity - item.receivedQuantity);
                    return (
                      <tr key={idx} className="border-b">
                        <td className="p-2 bg-gray-50">
                          <p className="font-semibold">{item.productName}</p>
                          <p className="text-gray-500 text-[10px]">Còn lại: {remaining}</p>
                        </td>
                        <td className="p-2 text-center bg-gray-50 font-medium">{item.expectedQuantity}</td>
                        <td className="p-1"><input type="number" min={0} className="w-full border rounded p-1 text-center bg-green-50 font-bold" value={item.acceptedQuantity} onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          const newItems = [...receiptItems];
                          newItems[idx].acceptedQuantity = val;
                          setReceiptItems(newItems);
                        }} /></td>
                        <td className="p-1"><input type="number" min={0} className="w-full border rounded p-1 text-center bg-red-50" value={item.damagedQuantity} onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          const newItems = [...receiptItems];
                          newItems[idx].damagedQuantity = val;
                          setReceiptItems(newItems);
                        }} /></td>
                        <td className="p-1"><input type="number" min={0} className="w-full border rounded p-1 text-center bg-orange-50" value={item.excessQuantity} onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          const newItems = [...receiptItems];
                          newItems[idx].excessQuantity = val;
                          setReceiptItems(newItems);
                        }} /></td>
                        <td className="p-1"><input type="number" min={0} className="w-full border rounded p-1 text-center bg-yellow-50" value={item.shortQuantity} onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          const newItems = [...receiptItems];
                          newItems[idx].shortQuantity = val;
                          setReceiptItems(newItems);
                        }} /></td>
                        <td className="p-1"><input type="number" min={0} className="w-full border rounded p-1 text-center bg-purple-50" value={item.wrongItemQuantity} onChange={e => {
                          const val = parseInt(e.target.value) || 0;
                          const newItems = [...receiptItems];
                          newItems[idx].wrongItemQuantity = val;
                          setReceiptItems(newItems);
                        }} /></td>
                        <td className="p-1"><input type="text" className="w-full border rounded p-1" value={item.note} onChange={e => {
                          const newItems = [...receiptItems];
                          newItems[idx].note = e.target.value;
                          setReceiptItems(newItems);
                        }} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-xs rounded border border-blue-200">
                <strong>Lưu ý:</strong> Hàng <strong>Đạt</strong> và <strong>Thừa</strong> sẽ tự động được Post để tăng tồn kho. Các sai lệch khác sẽ chờ CEO duyệt.
              </div>
            </div>
            
            <div className="p-4 border-t flex justify-end gap-3 bg-gray-50 rounded-b-lg">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-white border border-gray-300 rounded font-medium text-sm">Hủy bỏ</button>
              <button onClick={handleReceive} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm">Post Phiếu nhận hàng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
