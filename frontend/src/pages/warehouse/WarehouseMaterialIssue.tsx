import { useState } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Save, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';

interface IssueItem { materialId: string; name: string; qty: string; unit: string; }

const MATERIAL_OPTIONS = [
  { id: 'NL-001', name: 'Jumbo (cuộn giấy lớn)', unit: 'cuộn', stock: 840 },
  { id: 'NL-002', name: 'Lõi giấy',              unit: 'cuộn', stock: 180 },
  { id: 'NL-003', name: 'Màng co',               unit: 'kg',   stock: 620 },
  { id: 'NL-004', name: 'Chỉ khâu công nghiệp',  unit: 'kg',   stock: 45  },
  { id: 'NL-005', name: 'Keo dán nhãn',          unit: 'lít',  stock: 12  },
];

export default function WarehouseMaterialIssue() {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [productionOrder, setProductionOrder] = useState('');
  const [issuer, setIssuer] = useState('Nguyễn Văn A');
  const [note, setNote] = useState('');
  const [items, setItems] = useState<IssueItem[]>([{ materialId: '', name: '', qty: '', unit: '' }]);

  const addItem = () => setItems(prev => [...prev, { materialId: '', name: '', qty: '', unit: '' }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof IssueItem, val: string) => {
    setItems(prev => prev.map((item, idx) => {
      if (idx !== i) return item;
      if (field === 'materialId') {
        const opt = MATERIAL_OPTIONS.find(o => o.id === val);
        return { ...item, materialId: val, name: opt?.name || '', unit: opt?.unit || '' };
      }
      return { ...item, [field]: val };
    }));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Xuất nguyên liệu sản xuất</h2>
            <p className="text-xs text-gray-500 mt-0.5">Tạo phiếu xuất kho nguyên vật liệu theo lệnh sản xuất</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate('/warehouse/materials')}>Hủy</Button>
            <Button size="sm" className="h-8 text-xs gap-1.5" style={{ backgroundColor: PRIMARY }} onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000); }}>
              <Save className="w-3.5 h-3.5" /> Xác nhận xuất kho
            </Button>
          </div>
        </div>
      </div>

      {saved && (
        <div className="bg-green-50 border-b border-green-200 px-5 py-2 text-xs text-green-700 font-medium flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5" /> Đã xuất kho — Tồn kho nguyên liệu đã cập nhật tự động
        </div>
      )}

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        <div className="max-w-3xl space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide mb-3">Thông tin phiếu xuất</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Lệnh sản xuất</label>
                <Input className="h-8 text-xs" placeholder="LSX-2406-..." value={productionOrder} onChange={e => setProductionOrder(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Người thực hiện</label>
                <Input className="h-8 text-xs" value={issuer} onChange={e => setIssuer(e.target.value)} />
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Ghi chú</label>
                <Input className="h-8 text-xs" placeholder="Ghi chú..." value={note} onChange={e => setNote(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Nguyên liệu xuất</p>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addItem}>
                <Plus className="w-3 h-3" /> Thêm dòng
              </Button>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Nguyên liệu</th>
                  <th className="text-center px-3 py-2.5 text-gray-700 font-semibold w-16">ĐVT</th>
                  <th className="text-right px-3 py-2.5 text-gray-700 font-semibold w-24">Tồn kho</th>
                  <th className="text-right px-3 py-2.5 text-gray-700 font-semibold w-28">Số lượng xuất</th>
                  <th className="w-8 px-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item, i) => {
                  const opt = MATERIAL_OPTIONS.find(o => o.id === item.materialId);
                  const exceed = opt && parseFloat(item.qty) > opt.stock;
                  return (
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
                      <td className="px-3 py-2 text-right font-semibold tabular-nums" style={{ color: opt?.stock ? (opt.stock < 50 ? '#DC2626' : '#374151') : '#9CA3AF' }}>
                        {opt ? opt.stock.toLocaleString('vi-VN') : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          className={`h-7 text-xs text-right ${exceed ? 'border-red-400 bg-red-50' : ''}`}
                          type="number" placeholder="0" value={item.qty}
                          onChange={e => updateItem(i, 'qty', e.target.value)}
                        />
                        {exceed && <p className="text-[10px] text-red-500 mt-0.5 text-right">Vượt tồn kho</p>}
                      </td>
                      <td className="px-3 py-2">
                        <button className="text-gray-300 hover:text-red-400 transition-colors" onClick={() => removeItem(i)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
