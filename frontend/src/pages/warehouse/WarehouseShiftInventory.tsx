import { useState } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Save, CheckCircle, Download, AlertCircle } from 'lucide-react';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const ERROR   = '#DC2626';
const WARNING = '#F97316';

interface InventoryItem {
  sku: string; name: string; unit: string;
  systemQty: number; actualQty: number | ''; note: string;
}

const BASE_PRODUCTS: Omit<InventoryItem, 'actualQty' | 'note'>[] = [
  { sku: 'VT-CT-001', name: 'Vải cotton cao cấp khổ 1.5m',  unit: 'm',   systemQty: 850  },
  { sku: 'VT-SM-012', name: 'Sơ mi nam công sở slim fit',    unit: 'cái', systemQty: 240  },
  { sku: 'VT-QT-007', name: 'Quần tây nam slim fit',         unit: 'cái', systemQty: 185  },
  { sku: 'VT-LN-003', name: 'Vải linen nhập khẩu Ý',        unit: 'm',   systemQty: 420  },
  { sku: 'VT-DP-021', name: 'Đồng phục văn phòng nữ',       unit: 'bộ',  systemQty: 92   },
  { sku: 'VT-DP-020', name: 'Đồng phục văn phòng nam',       unit: 'bộ',  systemQty: 78   },
  { sku: 'VT-DM-005', name: 'Vải denim cao cấp',             unit: 'm',   systemQty: 310  },
  { sku: 'VT-AK-009', name: 'Áo khoác công sở nữ',          unit: 'cái', systemQty: 45   },
];

const SHIFTS = ['Ca sáng (7:00 - 12:00)', 'Ca trưa (12:00 - 17:00)', 'Ca chiều (17:00 - 21:00)'];

export default function WarehouseShiftInventory() {
  const [activeShift, setActiveShift] = useState(0);
  const [saved, setSaved] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [items, setItems] = useState<InventoryItem[]>(
    BASE_PRODUCTS.map(p => ({ ...p, actualQty: '', note: '' }))
  );

  const updateActual = (sku: string, val: string) => {
    setItems(prev => prev.map(i => i.sku === sku ? { ...i, actualQty: val === '' ? '' : Number(val) } : i));
  };
  const updateNote = (sku: string, val: string) => {
    setItems(prev => prev.map(i => i.sku === sku ? { ...i, note: val } : i));
  };

  const getDiff = (item: InventoryItem) => {
    if (item.actualQty === '') return null;
    return (item.actualQty as number) - item.systemQty;
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const discrepancies = items.filter(i => {
    const d = getDiff(i);
    return d !== null && d !== 0;
  }).length;

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Cập nhật tồn kho theo ca</h2>
            <p className="text-xs text-gray-500 mt-0.5">Kiểm đếm và cập nhật tồn kho thực tế — {new Date().toLocaleDateString('vi-VN')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"><Download className="w-3.5 h-3.5" /> Xuất Excel</Button>
            <Button size="sm" className="h-8 text-xs gap-1.5" style={{ backgroundColor: PRIMARY }} onClick={handleSave}>
              <Save className="w-3.5 h-3.5" /> Lưu cập nhật
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1.5" style={{ backgroundColor: SUCCESS }} disabled={confirmed} onClick={() => setConfirmed(true)}>
              <CheckCircle className="w-3.5 h-3.5" /> {confirmed ? 'Đã xác nhận ca' : 'Xác nhận ca'}
            </Button>
          </div>
        </div>

        {/* Shift tabs */}
        <div className="flex gap-0 mt-3">
          {SHIFTS.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveShift(i)}
              className={`px-4 py-1.5 text-xs border-b-2 transition-colors ${activeShift === i ? 'font-semibold' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
              style={activeShift === i ? { borderBottomColor: PRIMARY, color: PRIMARY } : {}}
            >{s}</button>
          ))}
        </div>
      </div>

      {saved && (
        <div className="bg-green-50 border-b border-green-200 px-5 py-2 text-xs text-green-700 font-medium flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5" /> Đã lưu cập nhật tồn kho ca {SHIFTS[activeShift]}
        </div>
      )}

      {discrepancies > 0 && (
        <div className="bg-orange-50 border-b border-orange-200 px-5 py-2 text-xs text-orange-700 font-medium flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" /> {discrepancies} sản phẩm có chênh lệch tồn kho — vui lòng kiểm tra lại
        </div>
      )}

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-gray-700 font-semibold w-28">Mã sản phẩm</th>
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">Tên sản phẩm</th>
                <th className="text-center px-4 py-3 text-gray-700 font-semibold w-16">ĐVT</th>
                <th className="text-right px-4 py-3 text-gray-700 font-semibold w-28">Tồn hệ thống</th>
                <th className="text-right px-4 py-3 text-gray-700 font-semibold w-32">Tồn thực tế</th>
                <th className="text-right px-4 py-3 text-gray-700 font-semibold w-24">Chênh lệch</th>
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {items.map((item, i) => {
                const diff = getDiff(item);
                return (
                  <tr key={item.sku} className="hover:bg-[#F9FAFB]" style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td className="px-4 py-2.5 font-medium text-gray-500">{item.sku}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{item.name}</td>
                    <td className="px-4 py-2.5 text-center text-gray-500">{item.unit}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-800 tabular-nums">{item.systemQty.toLocaleString('vi-VN')}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Input
                        type="number"
                        className="h-7 text-xs text-right w-24 ml-auto"
                        placeholder="Nhập..."
                        value={item.actualQty}
                        onChange={e => updateActual(item.sku, e.target.value)}
                        disabled={confirmed}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums">
                      {diff === null ? <span className="text-gray-300">—</span> :
                       diff === 0 ? <span style={{ color: SUCCESS }}>0</span> :
                       <span style={{ color: diff > 0 ? SUCCESS : ERROR }}>{diff > 0 ? '+' : ''}{diff}</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <Input
                        className="h-7 text-xs w-full"
                        placeholder="Ghi chú..."
                        value={item.note}
                        onChange={e => updateNote(item.sku, e.target.value)}
                        disabled={confirmed}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
