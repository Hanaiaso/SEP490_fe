import React, { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { getProducts } from '../../services/productService';
import { createGoodsIssue } from '../../services/warehouseService';

export default function WarehouseProductionIssueFormModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouseId, setWarehouseId] = useState('b0f80bc2-a6f6-45a2-9904-bf747127e4fa'); // Mặc định Kho Hà Nội
  const [factory, setFactory] = useState('Xưởng may A');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getProducts({ pageSize: 100 }).then(res => setProducts(res.items || [])).catch(console.error);
  }, []);

  const handleAddItem = () => {
    if (products.length === 0) return;
    setItems([...items, { id: Date.now().toString(), productId: products[0].id, quantity: 1, note: '' }]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleItemChange = (id: string, field: string, value: any) => {
    setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const handleSubmit = async () => {
    if (items.length === 0) return alert('Vui lòng thêm ít nhất 1 mặt hàng');
    try {
      setLoading(true);
      const payload = {
        type: 'ProductionMaterial',
        warehouseId,
        note: `Xuất cho: ${factory}`,
        items: items.map(i => ({
          productId: i.productId,
          quantity: parseInt(i.quantity, 10),
          note: i.note
        }))
      };
      await createGoodsIssue(payload);
      alert('Tạo phiếu xuất kho sản xuất thành công!');
      onSuccess();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="h-12 bg-white border-b flex items-center justify-between px-4 flex-shrink-0 rounded-t-lg">
          <h2 className="text-lg font-bold text-[#1f3b64]">Tạo Phiếu Xuất Kho Sản Xuất</h2>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-auto p-4 flex flex-col gap-4 bg-gray-50 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kho xuất</label>
              <select className="w-full border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:border-blue-500" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                <option value="b0f80bc2-a6f6-45a2-9904-bf747127e4fa">Kho Hà Nội</option>
                {/* Giả lập các kho khác, ở thực tế cần fetch API getWarehouses */}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Xưởng/Nhà máy nhận</label>
              <input type="text" className="w-full border border-gray-300 rounded px-3 py-2 bg-white focus:outline-none focus:border-blue-500" value={factory} onChange={e => setFactory(e.target.value)} />
            </div>
          </div>

          <div className="bg-white border rounded p-3 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-gray-700">Danh sách Nguyên Liệu</h3>
              <button className="px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-medium rounded hover:bg-blue-100" onClick={handleAddItem}>+ Thêm nguyên liệu</button>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 font-medium text-gray-500 w-1/2">Sản phẩm</th>
                  <th className="pb-2 font-medium text-gray-500 w-24">Số lượng</th>
                  <th className="pb-2 font-medium text-gray-500">Ghi chú</th>
                  <th className="pb-2 font-medium text-gray-500 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2 pr-2">
                      <select className="w-full border rounded px-2 py-1.5 bg-white" value={item.productId} onChange={e => handleItemChange(item.id, 'productId', e.target.value)}>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-2">
                      <input type="number" min="1" className="w-full border rounded px-2 py-1.5" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} />
                    </td>
                    <td className="py-2 pr-2">
                      <input type="text" className="w-full border rounded px-2 py-1.5" value={item.note} onChange={e => handleItemChange(item.id, 'note', e.target.value)} placeholder="Ghi chú thêm" />
                    </td>
                    <td className="py-2 text-center">
                      <button className="text-red-500 hover:bg-red-50 p-1 rounded" onClick={() => handleRemoveItem(item.id)}><X className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-gray-500">Chưa có sản phẩm nào. Nhấn "Thêm nguyên liệu".</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="h-14 bg-gray-50 border-t flex items-center justify-end px-4 gap-3 rounded-b-lg">
          <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded text-sm font-medium hover:bg-gray-50" onClick={onClose}>Hủy</button>
          <button className="px-4 py-2 bg-[#1f3b64] text-white rounded text-sm font-medium hover:bg-[#162a47] disabled:opacity-50" onClick={handleSubmit} disabled={loading}>{loading ? 'Đang tạo...' : 'Tạo Phiếu Xuất'}</button>
        </div>
      </div>
    </div>
  );
}
