import { useState } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Save, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PRIMARY = '#1F3B64';

const GOODS_OPTIONS = [
  { sku: 'VT-CT-001', name: 'Vải cotton cao cấp khổ 1.5m', unit: 'm'   },
  { sku: 'VT-SM-012', name: 'Sơ mi nam công sở slim fit',   unit: 'cái' },
  { sku: 'VT-QT-007', name: 'Quần tây nam slim fit',        unit: 'cái' },
  { sku: 'VT-LN-003', name: 'Vải linen nhập khẩu Ý',       unit: 'm'   },
  { sku: 'VT-DP-021', name: 'Đồng phục văn phòng nữ',      unit: 'bộ'  },
];

interface Item { sku: string; name: string; unit: string; qty: string; unitPrice: string; }

export default function WarehouseGoodsReceive() {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);
  const [supplier, setSupplier] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [items, setItems] = useState<Item[]>([{ sku: '', name: '', unit: '', qty: '', unitPrice: '' }]);

  const addItem = () => setItems(p => [...p, { sku: '', name: '', unit: '', qty: '', unitPrice: '' }]);
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof Item, val: string) => {
    setItems(p => p.map((item, idx) => {
      if (idx !== i) return item;
      if (field === 'sku') {
        const opt = GOODS_OPTIONS.find(o => o.sku === val);
        return { ...item, sku: val, name: opt?.name || '', unit: opt?.unit || '' };
      }
      return { ...item, [field]: val };
    }));
  };

  const total = items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.unitPrice) || 0), 0);

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Nhập hàng thương mại</h2>
            <p className="text-xs text-gray-500 mt-0.5">Tạo phiếu nhập kho hàng thương mại</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => navigate('/warehouse/goods')}>Hủy</Button>
            <Button size="sm" className="h-8 text-xs gap-1.5" style={{ backgroundColor: PRIMARY }} onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000); }}>
              <Save className="w-3.5 h-3.5" /> Lưu phiếu nhập
            </Button>
          </div>
        </div>
      </div>

      {saved && (
        <div className="bg-green-50 border-b border-green-200 px-5 py-2 text-xs text-green-700 font-medium flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5" /> Phiếu nhập đã lưu — Tồn kho đã cập nhật tự động
        </div>
      )}

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        <div className="max-w-3xl space-y-4">
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

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Danh sách hàng hóa</p>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={addItem}><Plus className="w-3 h-3" /> Thêm dòng</Button>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Hàng hóa</th>
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
                      <select className="w-full h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-700" value={item.sku} onChange={e => updateItem(i, 'sku', e.target.value)}>
                        <option value="">Chọn hàng hóa...</option>
                        {GOODS_OPTIONS.map(o => <option key={o.sku} value={o.sku}>{o.name}</option>)}
                      </select>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-500">{item.unit || '—'}</td>
                    <td className="px-3 py-2"><Input className="h-7 text-xs text-right" type="number" placeholder="0" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} /></td>
                    <td className="px-3 py-2"><Input className="h-7 text-xs text-right" type="number" placeholder="0" value={item.unitPrice} onChange={e => updateItem(i, 'unitPrice', e.target.value)} /></td>
                    <td className="px-3 py-2 text-right font-semibold tabular-nums text-gray-800">{((parseFloat(item.qty)||0)*(parseFloat(item.unitPrice)||0)).toLocaleString('vi-VN')}₫</td>
                    <td className="px-3 py-2"><button className="text-gray-300 hover:text-red-400" onClick={() => removeItem(i)}><Trash2 className="w-3.5 h-3.5" /></button></td>
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
