import { useState, useEffect, useRef } from 'react';
import { getSuppliers } from '../../services/supplierService.js';
import { getProducts } from '../../services/productService.js';
import { getMaterials } from '../../services/materialService.js';
import { createPurchaseOrder, getWarehouses, importPOFromExcel, importPOFromImage } from '../../services/purchaseOrderService.js';
import { X, Plus, Trash2, Upload, FileSpreadsheet, Image as ImageIcon } from 'lucide-react';

export default function CEOPurchaseOrderCreateModal({ onClose, onSuccess }: any) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [poType, setPoType] = useState<'Product' | 'Material'>('Product');

  const [formData, setFormData] = useState({
    supplierId: '',
    warehouseId: '',
    expectedDeliveryDate: '',
    note: '',
    deliveryTerms: '',
  });

  const [items, setItems] = useState<any[]>([
    { itemId: '', itemName: '', expectedQuantity: 1, unitPrice: 0, unit: 'Cái', note: '' }
  ]);

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        const [supData, whData, prodData, matData] = await Promise.all([
          getSuppliers().catch(() => []),
          getWarehouses().catch(() => []),
          getProducts({ pageSize: 100 }).catch(() => ({ items: [] })),
          getMaterials().catch(() => [])
        ]);

        const loadedSuppliers = supData || [];
        const loadedWarehouses = whData || [];
        const loadedProducts = prodData?.items || prodData || [];
        // Xử lý list materials, có thể trả về array hoặc { items: [] } tuỳ api
        const loadedMaterials = Array.isArray(matData) ? matData : (matData?.items || []);

        setSuppliers(loadedSuppliers);
        setWarehouses(loadedWarehouses);
        setProducts(loadedProducts);
        setMaterials(loadedMaterials);

        setFormData(prev => ({
          ...prev,
          supplierId: loadedSuppliers.find((s: any) => s.isActive)?.id || loadedSuppliers[0]?.id || '',
          warehouseId: loadedWarehouses[0]?.id || ''
        }));
      } catch (err) {
        console.error("Error loading PO initial data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);

  // Khi thay đổi loại PO, reset danh sách mặt hàng
  useEffect(() => {
    setItems([{ itemId: '', itemName: '', expectedQuantity: 1, unitPrice: 0, unit: poType === 'Product' ? 'Cái' : 'Kg', note: '' }]);
  }, [poType]);

  const handleItemChange = (index: number, itemId: string) => {
    const selectedItem = poType === 'Product' 
      ? products.find((p: any) => p.id === itemId)
      : materials.find((m: any) => m.id === itemId);
      
    const newItems = [...items];
    newItems[index].itemId = itemId;
    if (selectedItem) {
      newItems[index].itemName = selectedItem.name;
      newItems[index].unitPrice = selectedItem.standardListedPrice || 0;
    }
    setItems(newItems);
  };

  const handleSave = async () => {
    try {
      if (!formData.supplierId) {
        return alert("Vui lòng chọn Nhà cung cấp.");
      }
      if (!formData.warehouseId) {
        return alert("Vui lòng chọn Kho nhận hàng.");
      }
      
      const validItems = items.filter(i => i.itemId && i.expectedQuantity > 0);
      if (validItems.length === 0) {
        return alert(`Vui lòng chọn ít nhất 1 ${poType === 'Product' ? 'sản phẩm' : 'nguyên liệu'} với số lượng > 0.`);
      }

      const payload = {
        supplierId: formData.supplierId,
        warehouseId: formData.warehouseId,
        expectedDeliveryDate: formData.expectedDeliveryDate ? formData.expectedDeliveryDate : null,
        note: formData.note || null,
        deliveryTerms: formData.deliveryTerms || null,
        items: validItems.map(i => ({
          productId: poType === 'Product' ? i.itemId : null,
          materialId: poType === 'Material' ? i.itemId : null,
          expectedQuantity: parseInt(i.expectedQuantity) || 1,
          unitPrice: parseFloat(i.unitPrice) || 0,
          unit: i.unit || (poType === 'Product' ? 'Cái' : 'Kg'),
          note: i.note || null
        }))
      };
      
      await createPurchaseOrder(payload);
      alert('Tạo Purchase Order (PO Draft) thành công!');
      onSuccess();
    } catch (err: any) {
      alert(err.message || "Đã xảy ra lỗi khi tạo PO (400 Bad Request)");
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImporting(true);
      await importPOFromExcel(file);
      alert('Import PO từ Excel thành công!');
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi import Excel');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImportImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImporting(true);
      await importPOFromImage(file);
      alert('Import PO từ hình ảnh thành công!');
      onSuccess();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi import hình ảnh');
    } finally {
      setImporting(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[850px] max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold text-[#1f3b64]">Tạo Purchase Order (CEO phát hành PO)</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-500 hover:text-gray-700" /></button>
        </div>

        <div className="flex-1 overflow-auto p-4 flex flex-col gap-6">
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">Đang tải danh mục nhà cung cấp & sản phẩm...</div>
          ) : (
            <>
              <div className="flex gap-3 pb-4 border-b">
                <input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleImportExcel} />
                <input type="file" accept="image/*" className="hidden" ref={imageInputRef} onChange={handleImportImage} />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="flex items-center gap-2 px-4 py-2 border border-green-600 text-green-600 rounded text-sm hover:bg-green-50 font-medium"
                >
                  <FileSpreadsheet className="w-4 h-4" /> {importing ? 'Đang xử lý...' : 'Import từ Excel'}
                </button>
                <button 
                  onClick={() => imageInputRef.current?.click()}
                  disabled={importing}
                  className="flex items-center gap-2 px-4 py-2 border border-purple-600 text-purple-600 rounded text-sm hover:bg-purple-50 font-medium"
                >
                  <ImageIcon className="w-4 h-4" /> {importing ? 'Đang xử lý...' : 'Upload Hóa đơn (Ảnh)'}
                </button>

                <div className="ml-auto flex items-center gap-4 bg-gray-50 px-4 py-1.5 rounded-full border">
                  <span className="text-sm font-medium text-gray-700">Loại đơn:</span>
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input 
                      type="radio" 
                      name="poType" 
                      value="Product" 
                      checked={poType === 'Product'} 
                      onChange={() => setPoType('Product')} 
                      className="text-blue-600"
                    />
                    <span>Thành phẩm</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-sm cursor-pointer">
                    <input 
                      type="radio" 
                      name="poType" 
                      value="Material" 
                      checked={poType === 'Material'} 
                      onChange={() => setPoType('Material')}
                      className="text-blue-600"
                    />
                    <span>Nguyên liệu</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Nhà cung cấp *</label>
                  <select 
                    className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500" 
                    value={formData.supplierId} 
                    onChange={e => setFormData({...formData, supplierId: e.target.value})}
                  >
                    <option value="">-- Chọn nhà cung cấp --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Kho nhận hàng *</label>
                  <select 
                    className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500" 
                    value={formData.warehouseId} 
                    onChange={e => setFormData({...formData, warehouseId: e.target.value})}
                  >
                    <option value="">-- Chọn kho nhận --</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name} ({w.code})</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Ngày giao dự kiến</label>
                  <input 
                    type="date" 
                    className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500" 
                    value={formData.expectedDeliveryDate} 
                    onChange={e => setFormData({...formData, expectedDeliveryDate: e.target.value})} 
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-gray-600">Điều kiện giao nhận</label>
                  <input 
                    className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500" 
                    placeholder="VD: Giao tại kho bên mua, thanh toán 30 ngày"
                    value={formData.deliveryTerms} 
                    onChange={e => setFormData({...formData, deliveryTerms: e.target.value})} 
                  />
                </div>

                <div className="flex flex-col gap-1 col-span-2">
                  <label className="text-xs font-medium text-gray-600">Ghi chú PO</label>
                  <textarea 
                    className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500" 
                    rows={2} 
                    placeholder="Ghi chú đơn hàng cho kho hoặc NCC..."
                    value={formData.note} 
                    onChange={e => setFormData({...formData, note: e.target.value})} 
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-sm text-[#1f3b64]">Danh sách {poType === 'Product' ? 'sản phẩm' : 'nguyên liệu'} mua</h3>
                  <button 
                    onClick={() => setItems([...items, { itemId: '', itemName: '', expectedQuantity: 1, unitPrice: 0, unit: poType === 'Product' ? 'Cái' : 'Kg', note: '' }])} 
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Thêm {poType === 'Product' ? 'sản phẩm' : 'nguyên liệu'}
                  </button>
                </div>
                
                <table className="w-full border text-sm">
                  <thead className="bg-gray-50 text-xs text-gray-500 text-left">
                    <tr>
                      <th className="p-2 border-b">{poType === 'Product' ? 'Sản phẩm *' : 'Nguyên liệu *'}</th>
                      <th className="p-2 border-b w-[80px]">ĐVT</th>
                      <th className="p-2 border-b w-[100px]">Số lượng</th>
                      <th className="p-2 border-b w-[130px]">Đơn giá (VNĐ)</th>
                      <th className="p-2 border-b w-[40px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="p-2 border-b">
                          <select 
                            className="w-full border rounded px-2 py-1 text-sm outline-none focus:border-blue-500"
                            value={item.itemId}
                            onChange={e => handleItemChange(index, e.target.value)}
                          >
                            <option value="">-- Chọn {poType === 'Product' ? 'sản phẩm' : 'nguyên liệu'} --</option>
                            {poType === 'Product' 
                              ? products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)
                              : materials.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                            }
                          </select>
                        </td>
                        <td className="p-2 border-b">
                          <input 
                            className="w-full border rounded px-2 py-1 text-sm text-center" 
                            value={item.unit} 
                            onChange={e => {
                              const newItems = [...items];
                              newItems[index].unit = e.target.value;
                              setItems(newItems);
                            }} 
                          />
                        </td>
                        <td className="p-2 border-b">
                          <input 
                            type="number" 
                            min={1} 
                            className="w-full border rounded px-2 py-1 text-sm text-right font-medium" 
                            value={item.expectedQuantity} 
                            onChange={e => {
                              const newItems = [...items];
                              newItems[index].expectedQuantity = e.target.value;
                              setItems(newItems);
                            }} 
                          />
                        </td>
                        <td className="p-2 border-b">
                          <input 
                            type="number" 
                            min={0}
                            className="w-full border rounded px-2 py-1 text-sm text-right font-medium" 
                            value={item.unitPrice} 
                            onChange={e => {
                              const newItems = [...items];
                              newItems[index].unitPrice = e.target.value;
                              setItems(newItems);
                            }} 
                          />
                        </td>
                        <td className="p-2 border-b text-center">
                          {items.length > 1 && (
                            <button 
                              onClick={() => setItems(items.filter((_, i) => i !== index))} 
                              className="text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t flex justify-end gap-3 bg-gray-50 rounded-b-lg">
          <button onClick={onClose} className="px-4 py-2 border rounded text-sm bg-white hover:bg-gray-100 font-medium">Hủy bỏ</button>
          <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium shadow-sm">Lưu PO Nháp (Draft)</button>
        </div>
      </div>
    </div>
  );
}
