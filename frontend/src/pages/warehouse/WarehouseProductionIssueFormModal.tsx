import { getErrorMessage } from '../../lib/errors';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertTriangle, Package, PackagePlus, Trash2, X } from 'lucide-react';
import { getMaterials } from '../../services/materialService';
import { createGoodsIssue, getWarehouseInventory, getWarehouses } from '../../services/warehouseService';
import { getProducts } from '../../services/productService';
import type { Warehouse } from '../../types/warehouse';
import type { Material, Product } from '../../types/catalog';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';

const PRIMARY = '#1F3B64';
const ERROR = '#DC2626';
const WARNING = '#D97706';

interface DraftIssueItem {
  id: string;
  itemType: 'Material' | 'Product';
  materialId: string | null;
  productId: string | null;
  quantity: number | string;
  note: string;
}

function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block font-semibold text-gray-700 mb-1">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      {children}
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

export default function WarehouseProductionIssueFormModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [items, setItems] = useState<DraftIssueItem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  // Fields mở rộng WF-17 — để trống, bắt nhập thật thay vì gợi ý sẵn giá trị (dễ khiến
  // nhân viên bấm "Tạo" mà quên đổi, ghi sai bộ phận/mục đích thực tế).
  const [department, setDepartment] = useState('');
  const [usagePurpose, setUsagePurpose] = useState('');
  const [externalRecipientName, setExternalRecipientName] = useState('');
  const [paperDocumentNumber, setPaperDocumentNumber] = useState('');
  const [note, setNote] = useState('');

  // Tồn khả dụng của kho đang chọn, để cảnh báo mềm ngay khi nhập số lượng thay vì chỉ
  // phát hiện lúc Post (sau khi giấy tờ bàn giao đã ký).
  const [availableQtyMap, setAvailableQtyMap] = useState<Record<string, number>>({});

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getMaterials().then(res => setMaterials(Array.isArray(res) ? res : (res?.items || []))).catch(console.error);
    getProducts({ page: 1, pageSize: 200 }).then(res => setProducts(res?.items || [])).catch(console.error);
    getWarehouses().then(res => setWarehouses(Array.isArray(res) ? res : (res?.items || []))).catch(console.error);
    // Không tự chọn sẵn kho đầu tiên: nguyên liệu/sản phẩm thường chỉ tồn tại ở MỘT kho cụ
    // thể (vd nguyên liệu sản xuất chỉ có ở WH-PE) — chọn nhầm kho mặc định sẽ khiến Post
    // báo "Tồn khả dụng: 0" dù hàng có tồn ở kho khác. Bắt nhân viên chọn kho tường minh.
  }, []);

  const loadAvailableQty = useCallback((whId: string) => {
    if (!whId) return;
    getWarehouseInventory(whId, { pageSize: 100 })
      .then((res: { items?: Array<{ productId?: string; materialId?: string; availableQuantity: number }> }) => {
        const map: Record<string, number> = {};
        (res?.items || []).forEach(inv => {
          const key = inv.productId ? `P-${inv.productId}` : inv.materialId ? `M-${inv.materialId}` : null;
          if (key) map[key] = inv.availableQuantity;
        });
        setAvailableQtyMap(map);
      })
      .catch(console.error);
  }, []);

  useEffect(() => { loadAvailableQty(warehouseId); }, [warehouseId, loadAvailableQty]);

  const getAvailableQty = (item: DraftIssueItem): number => {
    const key = item.itemType === 'Product' && item.productId ? `P-${item.productId}` : item.itemType === 'Material' && item.materialId ? `M-${item.materialId}` : null;
    return key ? (availableQtyMap[key] ?? 0) : 0;
  };

  const stockWarningCount = useMemo(
    () => items.filter(it => (Number(it.quantity) || 0) > getAvailableQty(it)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, availableQtyMap]
  );

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

  const handleItemChange = (id: string, field: keyof DraftIssueItem, value: string) => {
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
    if (!warehouseId) return alert('Vui lòng chọn kho xuất hàng');
    if (items.length === 0) return alert('Vui lòng thêm ít nhất 1 mặt hàng cần xuất');
    if (!department.trim()) return alert('Vui lòng nhập bộ phận sản xuất nhận');
    if (!usagePurpose.trim()) return alert('Vui lòng nhập mục đích sử dụng');

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
          quantity: parseInt(String(i.quantity), 10),
          note: i.note
        }))
      };

      await createGoodsIssue(payload);
      alert('Tạo lệnh xuất kho sản xuất thành công! Trạng thái: Chờ biên bản bàn giao & bằng chứng.');
      onSuccess();
    } catch (err: unknown) {
      alert(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const selectedWarehouseName = warehouses.find(w => w.id === warehouseId)?.name;

  return (
    <div className="warehouse-hallmark-type fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-100">
        <div className="h-14 text-white flex items-center justify-between px-5 flex-shrink-0" style={{ backgroundColor: PRIMARY }}>
          <h2 className="text-base font-bold flex items-center gap-2">
            <Package className="w-5 h-5" /> Tạo Phiếu Xuất Nguyên Liệu Cho Sản Xuất
          </h2>
          <button className="text-white/80 hover:text-white" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3 bg-gray-50 text-xs">
          {/* Section 1: Thông tin phiếu */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="px-4 py-2 border-b border-gray-100 bg-gray-50 rounded-t-lg">
              <h3 className="font-bold text-gray-700 uppercase tracking-wide text-[11px]">1. Thông tin phiếu xuất</h3>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 p-4">
              <Field label="Kho xuất hàng" required hint={!warehouseId ? 'Chọn đúng kho đang giữ nguyên liệu — hàng thường chỉ tồn ở một kho cụ thể.' : undefined}>
                <select
                  className={`w-full border rounded-md px-3 h-10 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${!warehouseId ? 'border-amber-400 text-gray-400' : 'border-gray-300 focus:border-blue-500'}`}
                  value={warehouseId}
                  onChange={e => setWarehouseId(e.target.value)}
                >
                  <option value="">-- Chọn kho xuất --</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>{wh.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Bộ phận sản xuất nhận" required>
                <Input type="text" className="w-full text-sm font-medium" value={department} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDepartment(e.target.value)} placeholder="Ví dụ: Xưởng May A, Tổ PE..." />
              </Field>
              <Field label="Mục đích sử dụng" required>
                <Input type="text" className="w-full text-sm" value={usagePurpose} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsagePurpose(e.target.value)} placeholder="Ví dụ: Phục vụ sản xuất đơn PO-2026..." />
              </Field>
              <Field label="Số biên bản giấy" hint="Có thể để trống, bổ sung sau khi bàn giao.">
                <Input type="text" className="w-full text-sm font-mono uppercase" value={paperDocumentNumber} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaperDocumentNumber(e.target.value)} placeholder="Mã biên bản (Duy nhất)" />
              </Field>
              <div className="col-span-2">
                <Field label="Đại diện sản xuất nhận (Ngoài hệ thống)">
                  <Input type="text" className="w-full text-sm" value={externalRecipientName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExternalRecipientName(e.target.value)} placeholder="Nhập họ tên người nhận đại diện xưởng sản xuất..." />
                </Field>
              </div>
              <div className="col-span-2">
                <Field label="Ghi chú phiếu">
                  <textarea rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" value={note} onChange={e => setNote(e.target.value)} placeholder="Ghi chú thêm cho phiếu xuất (không bắt buộc)..." />
                </Field>
              </div>
            </div>
          </div>

          {/* Section 2: Mặt hàng */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="flex justify-between items-center px-4 py-2 border-b border-gray-100 bg-gray-50 rounded-t-lg">
              <h3 className="font-bold text-gray-700 uppercase tracking-wide text-[11px]">2. Danh sách mặt hàng xuất</h3>
              <button
                className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[11px] font-bold rounded hover:bg-blue-100 transition-colors flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={handleAddItem}
                disabled={!warehouseId}
                title={!warehouseId ? 'Chọn kho xuất hàng trước' : undefined}
              >
                <PackagePlus className="w-3.5 h-3.5" /> Thêm mặt hàng
              </button>
            </div>

            {!warehouseId ? (
              <p className="py-8 text-center text-gray-400 italic px-4">Chọn kho xuất hàng ở mục 1 để xem tồn kho khả dụng và thêm mặt hàng.</p>
            ) : (
              <div className="p-3">
                {stockWarningCount > 0 && (
                  <div className="mb-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-2 text-amber-700 text-[11px] font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    {stockWarningCount} mặt hàng vượt tồn khả dụng tại {selectedWarehouseName || 'kho đã chọn'} — vẫn tạo được phiếu nháp, nhưng sẽ không Post được cho đến khi đủ hàng.
                  </div>
                )}
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-gray-50 text-gray-600">
                      <th className="p-2 font-semibold w-28">Loại</th>
                      <th className="p-2 font-semibold">Tên Mặt Hàng / Nguyên Liệu</th>
                      <th className="p-2 font-semibold w-28">Số lượng</th>
                      <th className="p-2 font-semibold">Ghi chú</th>
                      <th className="p-2 font-semibold w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => {
                      const available = getAvailableQty(item);
                      const qty = Number(item.quantity) || 0;
                      const overStock = qty > available;
                      return (
                        <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50">
                          <td className="p-2 align-top">
                            <select className="w-full border rounded px-2 py-1 bg-white font-medium text-xs" value={item.itemType} onChange={e => handleItemChange(item.id, 'itemType', e.target.value)}>
                              <option value="Material">Nguyên liệu</option>
                              <option value="Product">Sản phẩm</option>
                            </select>
                          </td>
                          <td className="p-2 align-top">
                            {item.itemType === 'Material' ? (
                              <select className="w-full border rounded px-2 py-1 bg-white text-xs" value={item.materialId || ''} onChange={e => handleItemChange(item.id, 'materialId', e.target.value)}>
                                {materials.map(m => {
                                  const qtyM = availableQtyMap[`M-${m.id}`] ?? 0;
                                  return <option key={m.id} value={m.id}>{m.name} ({m.unit || 'Vật tư'}) — Tồn: {qtyM}</option>;
                                })}
                              </select>
                            ) : (
                              <select className="w-full border rounded px-2 py-1 bg-white text-xs" value={item.productId || ''} onChange={e => handleItemChange(item.id, 'productId', e.target.value)}>
                                {products.map(p => {
                                  const qtyP = availableQtyMap[`P-${p.id}`] ?? 0;
                                  return <option key={p.id} value={p.id}>{p.sku} - {p.name} — Tồn: {qtyP}</option>;
                                })}
                              </select>
                            )}
                          </td>
                          <td className="p-2 align-top">
                            <input
                              type="number" min="1"
                              className={`w-full border rounded px-2 py-1 font-bold text-xs ${overStock ? 'border-amber-400 text-amber-700' : 'text-blue-600'}`}
                              value={item.quantity}
                              onChange={e => handleItemChange(item.id, 'quantity', e.target.value)}
                            />
                            {overStock && (
                              <p className="text-[10px] text-amber-600 font-medium mt-0.5 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 flex-shrink-0" /> Khả dụng: {available}
                              </p>
                            )}
                          </td>
                          <td className="p-2 align-top">
                            <input type="text" className="w-full border rounded px-2 py-1 text-xs" value={item.note} onChange={e => handleItemChange(item.id, 'note', e.target.value)} placeholder="Ghi chú xuất" />
                          </td>
                          <td className="p-2 text-center align-top">
                            <button className="text-red-500 hover:bg-red-50 p-1 rounded" onClick={() => handleRemoveItem(item.id)}><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      );
                    })}
                    {items.length === 0 && (
                      <tr><td colSpan={5} className="py-6 text-center text-gray-400 italic">Chưa có mặt hàng nào. Bấm "+ Thêm mặt hàng" ở trên.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="h-16 bg-gray-50 border-t flex items-center justify-end px-5 gap-3 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>Hủy bỏ</Button>
          <Button style={{ backgroundColor: PRIMARY }} className="text-white font-bold shadow-md" onClick={handleSubmit} disabled={loading}>{loading ? 'Đang khởi tạo...' : 'Tạo Lệnh Xuất Kho'}</Button>
        </div>
      </div>
    </div>
  );
}
