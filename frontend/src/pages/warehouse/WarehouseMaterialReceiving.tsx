import { useState } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Save, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';

interface ReceiveItem { materialId: string; name: string; qty: string; unitPrice: string; unit: string; }

const MATERIAL_OPTIONS = [
  { id: 'NL-001', name: 'Jumbo (cuộn giấy lớn)', unit: 'cuộn' },
  { id: 'NL-002', name: 'Lõi giấy',              unit: 'cuộn' },
  { id: 'NL-003', name: 'Màng co',               unit: 'kg'   },
  { id: 'NL-004', name: 'Chỉ khâu công nghiệp',  unit: 'kg'   },
  { id: 'NL-005', name: 'Keo dán nhãn',          unit: 'lít'  },
];

export default function WarehouseMaterialReceiving() {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [supplier, setSupplier] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [items, setItems] = useState<ReceiveItem[]>([
    { materialId: '', name: '', qty: '', unitPrice: '', unit: '' },
  ]);

  const addItem = () => setItems(prev => [...prev, { materialId: '', name: '', qty: '', unitPrice: '', unit: '' }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof ReceiveItem, val: string) => {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== i) return item;
      if (field === 'materialId') {
        const opt = MATERIAL_OPTIONS.find(o => o.id === val);
        return { ...item, materialId: val, name: opt?.name || '', unit: opt?.unit || '' };
      }
      return { ...item, [field]: val };
    }));
  };

  const total = items.reduce((s, i) => s + ((parseFloat(i.qty) || 0) * (parseFloat(i.unitPrice) || 0)), 0);

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Nhập nguyên liệu</h2>
            <p className="text-xs text-gray-500 mt-0.5">Tạo phiếu nhập kho nguyên vật liệu sản xuất</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate('/warehouse/materials')}>Hủy</Button>
            <Button size="sm" className="h-8 text-xs gap-1.5" style={{ backgroundColor: PRIMARY }} onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000); }}>
              <Save className="w-3.5 h-3.5" /> Lưu phiếu nhập
            </Button>
          </div>
        </div>
      </div>

      {saved && (
        <div className="bg-green-50 border-b border-green-200 px-5 py-2 text-xs text-green-700 font-medium flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5" /> Phiếu nhập đã được lưu — Tồn kho đã cập nhật tự động
        </div>
      )}

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        <div className="max-w-3xl space-y-4">
          {/* Header info */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide mb-3">Thông tin phiếu nhập</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Nhà cung cấp</label>
                <Input className="h-8 text-xs" placeholder="Tên nhà cung cấp..." value={supplier} onChange={e => setSupplier(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Ngày nhập</label>
                <Input className="h-8 text-xs" type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Ghi chú</label>
                <Input className="h-8 text-xs" placeholder="Ghi chú..." value={note} onChange={e => setNote(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Danh sách nguyên liệu</p>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addItem}>
                <Plus className="w-3 h-3" /> Thêm dòng
              </Button>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Nguyên liệu</th>
                  <th className="text-center px-3 py-2.5 text-gray-700 font-semibold w-16">ĐVT</th>
                  <th className="text-right px-3 py-2.5 text-gray-700 font-semibold w-24">Số lượng</th>
                  <th className="text-right px-3 py-2.5 text-gray-700 font-semibold w-28">Đơn giá (đ)</th>
                  <th className="text-right px-3 py-2.5 text-gray-700 font-semibold w-28">Thành tiền</th>
                  <th className="w-8 px-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2">
                      <select
                        className="w-full h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-700"
                        value={item.materialId}
                        onChange={e => updateItem(i, 'materialId', e.target.value)}
                      >
                        <option value="">Chọn nguyên liệu...</option>
                        {MATERIAL_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-500">{item.unit || '—'}</td>
                    <td className="px-3 py-2">
                      <Input className="h-7 text-xs text-right" type="number" placeholder="0" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} />
                    </td>
                    <td className="px-3 py-2">
                      <Input className="h-7 text-xs text-right" type="number" placeholder="0" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', e.target.value)} />
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-800 tabular-nums">
                      {((parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0)).toLocaleString('vi-VN')}₫
                    </td>
                    <td className="px-3 py-2">
                      <button className="text-gray-300 hover:text-red-400 transition-colors" onClick={() => removeItem(i)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t border-gray-200">
                  <td colSpan={4} className="px-3 py-2.5 text-right text-xs font-semibold text-gray-600">Tổng cộng:</td>
                  <td className="px-3 py-2.5 text-right text-sm font-bold tabular-nums" style={{ color: PRIMARY }}>{total.toLocaleString('vi-VN')}₫</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
