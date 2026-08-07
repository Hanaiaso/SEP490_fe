import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { getMaterials } from '../../services/materialService';
import { createGoodsIssue, getWarehouses } from '../../services/warehouseService';
import { getProducts } from '../../services/productService';

export default function WarehouseProductionIssueFormModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouses, setWarehouses] = useState<any[]>([]);
  
  // Fields mở rộng WF-17
  const [department, setDepartment] = useState('Xưởng May A');
  const [usagePurpose, setUsagePurpose] = useState('Xuất nguyên liệu phục vụ sản xuất');
  const [externalRecipientName, setExternalRecipientName] = useState('');
  const [paperDocumentNumber, setPaperDocumentNumber] = useState('');
  const [note, setNote] = useState('');
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getMaterials().then(res => setMaterials(Array.isArray(res) ? res : (res?.items || []))).catch(console.error);
    getProducts({ page: 1, pageSize: 200 }).then(res => setProducts(res?.items || [])).catch(console.error);
    getWarehouses().then(res => {
      const whList = Array.isArray(res) ? res : (res?.items || []);
      setWarehouses(whList);
      if (whList.length > 0 && !warehouseId) {
        setWarehouseId(whList[0].id);
      }
    }).catch(console.error);
  }, []);

  const handleAddItem = () => {
    if (materials.length === 0 && products.length === 0) return;
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        itemType: 'Material',
        materialId: materials.length > 0 ? materials[0].id : null,
        productId: null,
        quantity: 1,
        note: ''
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
  };

  const handleItemChange = (id: string, field: string, value: any) => {
    setItems(items.map(i => {
      if (i.id === id) {
        const updated = { ...i, [field]: value };
        if (field === 'itemType') {
          if (value === 'Material') {
            updated.materialId = materials.length > 0 ? materials[0].id : null;
            updated.productId = null;
          } else {
            updated.productId = products.length > 0 ? products[0].id : null;
            updated.materialId = null;
          }
        }
        return updated;
      }
      return i;
    }));
  };

  const handleSubmit = async () => {
    if (items.length === 0) return alert('Vui lòng thêm ít nhất 1 mặt hàng cần xuất');
    if (!department) return alert('Vui lòng nhập bộ phận sản xuất nhận');

    try {
      setLoading(true);
      const payload = {
        type: 'ProductionMaterial',
        warehouseId,
        department,
        usagePurpose,
        externalRecipientName: externalRecipientName || null,
        paperDocumentNumber: paperDocumentNumber || null,
        note: note || `Xuất nguyên liệu cho: ${department}`,
        items: items.map(i => ({
          productId: i.itemType === 'Product' ? i.productId : null,
          materialId: i.itemType === 'Material' ? i.materialId : null,
          quantity: parseInt(i.quantity, 10),
          note: i.note
        }))
      };

      await createGoodsIssue(payload);
      alert('Tạo lệnh xuất kho sản xuất thành công! Trạng thái: Chờ biên bản bàn giao & bằng chứng.');
      onSuccess();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100">
        <div className="h-13 bg-slate-900 text-white flex items-center justify-between px-5 flex-shrink-0">
          <h2 className="text-base font-bold flex items-center gap-2">
            <span>📦</span> Tạo Phiếu Xuất Nguyên Liệu Cho Sản Xuất
          </h2>
          <button className="text-gray-400 hover:text-white" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4 bg-gray-50 text-xs">
          {/* Main Info */}
          <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Kho xuất hàng *</label>
              <select className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-xs font-medium" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                {warehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>{wh.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Bộ phận sản xuất nhận *</label>
              <input type="text" className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-xs font-medium" value={department} onChange={e => setDepartment(e.target.value)} placeholder="Ví dụ: Xưởng May A, Tổ PE..." />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Mục đích sử dụng *</label>
              <input type="text" className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-xs" value={usagePurpose} onChange={e => setUsagePurpose(e.target.value)} placeholder="Ví dụ: Phục vụ sản xuất đơn PO-2026..." />
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Số biên bản giấy (Nếu có trước)</label>
              <input type="text" className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-xs font-mono uppercase" value={paperDocumentNumber} onChange={e => setPaperDocumentNumber(e.target.value)} placeholder="Mã biên bản (Duy nhất)" />
            </div>
            <div className="col-span-2">
              <label className="block font-semibold text-gray-700 mb-1">Đại diện sản xuất nhận (Ngoài hệ thống)</label>
              <input type="text" className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-xs" value={externalRecipientName} onChange={e => setExternalRecipientName(e.target.value)} placeholder="Nhập họ tên người nhận đại diện xưởng sản xuất..." />
            </div>
          </div>

          {/* Item Table */}
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-gray-800 uppercase tracking-wide text-[11px]">Danh sách Mặt Hàng Xuất</h3>
              <button className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded hover:bg-blue-100 transition-colors" onClick={handleAddItem}>+ Thêm mặt hàng</button>
            </div>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b bg-gray-50 text-gray-600">
                  <th className="p-2 font-semibold w-28">Loại</th>
                  <th className="p-2 font-semibold">Tên Mặt Hàng / Nguyên Liệu</th>
                  <th className="p-2 font-semibold w-24">Số lượng</th>
                  <th className="p-2 font-semibold">Ghi chú</th>
                  <th className="p-2 font-semibold w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="p-2">
                      <select className="w-full border rounded px-2 py-1 bg-white font-medium text-xs" value={item.itemType} onChange={e => handleItemChange(item.id, 'itemType', e.target.value)}>
                        <option value="Material">Nguyên liệu</option>
                        <option value="Product">Sản phẩm</option>
                      </select>
                    </td>
                    <td className="p-2">
                      {item.itemType === 'Material' ? (
                        <select className="w-full border rounded px-2 py-1 bg-white text-xs" value={item.materialId || ''} onChange={e => handleItemChange(item.id, 'materialId', e.target.value)}>
                          {materials.map(m => (
                            <option key={m.id} value={m.id}>{m.name} ({m.unit || 'Vật tư'})</option>
                          ))}
                        </select>
                      ) : (
                        <select className="w-full border rounded px-2 py-1 bg-white text-xs" value={item.productId || ''} onChange={e => handleItemChange(item.id, 'productId', e.target.value)}>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="p-2">
                      <input type="number" min="1" className="w-full border rounded px-2 py-1 font-bold text-blue-600 text-xs" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} />
                    </td>
                    <td className="p-2">
                      <input type="text" className="w-full border rounded px-2 py-1 text-xs" value={item.note} onChange={e => handleItemChange(item.id, 'note', e.target.value)} placeholder="Ghi chú xuất" />
                    </td>
                    <td className="p-2 text-center">
                      <button className="text-red-500 hover:bg-red-50 p-1 rounded" onClick={() => handleRemoveItem(item.id)}><X className="w-4 h-4" /></button>
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr><td colSpan={5} className="py-6 text-center text-gray-400 italic">Chưa có mặt hàng nào. Bấm nút "+ Thêm mặt hàng" ở trên.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="h-14 bg-gray-50 border-t flex items-center justify-end px-5 gap-2 flex-shrink-0">
          <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-100" onClick={onClose}>Hủy bỏ</button>
          <button className="px-4 py-2 bg-blue-900 text-white rounded-lg text-xs font-bold hover:bg-blue-800 shadow-md disabled:opacity-50" onClick={handleSubmit} disabled={loading}>{loading ? 'Đang khởi tạo...' : 'Tạo Lệnh Xuất Kho'}</button>
        </div>
      </div>
    </div>
  );
}
