import { useState } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Search, ArrowDownToLine, History, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#F97316';
const ERROR   = '#DC2626';

const GOODS = [
  { id: 'HH-001', name: 'Vải cotton cao cấp khổ 1.5m',  sku: 'VT-CT-001', unit: 'm',   stock: 850,  minStock: 200, lastReceive: '04/06/2026', lastSale: '06/06/2026' },
  { id: 'HH-002', name: 'Sơ mi nam công sở slim fit',    sku: 'VT-SM-012', unit: 'cái', stock: 240,  minStock: 50,  lastReceive: '03/06/2026', lastSale: '06/06/2026' },
  { id: 'HH-003', name: 'Quần tây nam slim fit',         sku: 'VT-QT-007', unit: 'cái', stock: 185,  minStock: 50,  lastReceive: '02/06/2026', lastSale: '05/06/2026' },
  { id: 'HH-004', name: 'Vải linen nhập khẩu Ý',        sku: 'VT-LN-003', unit: 'm',   stock: 420,  minStock: 100, lastReceive: '01/06/2026', lastSale: '05/06/2026' },
  { id: 'HH-005', name: 'Đồng phục văn phòng nữ',       sku: 'VT-DP-021', unit: 'bộ',  stock: 92,   minStock: 30,  lastReceive: '30/05/2026', lastSale: '04/06/2026' },
  { id: 'HH-006', name: 'Đồng phục văn phòng nam',       sku: 'VT-DP-020', unit: 'bộ',  stock: 78,   minStock: 30,  lastReceive: '30/05/2026', lastSale: '04/06/2026' },
  { id: 'HH-007', name: 'Vải denim cao cấp',             sku: 'VT-DM-005', unit: 'm',   stock: 310,  minStock: 80,  lastReceive: '28/05/2026', lastSale: '03/06/2026' },
  { id: 'HH-008', name: 'Áo khoác công sở nữ',          sku: 'VT-AK-009', unit: 'cái', stock: 45,   minStock: 20,  lastReceive: '25/05/2026', lastSale: '02/06/2026' },
];

export default function WarehouseGoods() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = GOODS.filter(g => !search || g.name.toLowerCase().includes(search.toLowerCase()) || g.sku.toLowerCase().includes(search));

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Hàng thương mại</h2>
            <p className="text-xs text-gray-500 mt-0.5">{GOODS.length} mặt hàng · Tồn kho hiện tại</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => navigate('/warehouse/goods/history')}>
              <History className="w-3.5 h-3.5" /> Lịch sử
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"><Download className="w-3.5 h-3.5" /> Xuất Excel</Button>
            <Button size="sm" className="h-8 text-xs gap-1.5" style={{ backgroundColor: PRIMARY }} onClick={() => navigate('/warehouse/goods/receive')}>
              <ArrowDownToLine className="w-3.5 h-3.5" /> Nhập hàng
            </Button>
          </div>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input className="pl-8 h-8 text-xs bg-gray-50" placeholder="Tìm SKU, tên hàng..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">SKU</th>
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">Tên hàng hóa</th>
                <th className="text-center px-4 py-3 text-gray-700 font-semibold">ĐVT</th>
                <th className="text-right px-4 py-3 text-gray-700 font-semibold">Tồn kho</th>
                <th className="text-right px-4 py-3 text-gray-700 font-semibold">Tồn tối thiểu</th>
                <th className="text-center px-4 py-3 text-gray-700 font-semibold">Ngày nhập cuối</th>
                <th className="text-center px-4 py-3 text-gray-700 font-semibold">Bán cuối</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((g, i) => {
                const low = g.stock < g.minStock;
                return (
                  <tr key={g.id} className="hover:bg-[#F9FAFB] transition-colors" style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td className="px-4 py-3 font-mono text-gray-500 text-[11px]">{g.sku}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{g.name}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{g.unit}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums" style={{ color: low ? ERROR : '#374151' }}>
                      {g.stock.toLocaleString('vi-VN')}
                      {low && <span className="ml-1.5 text-[9px] font-medium text-white px-1" style={{ backgroundColor: ERROR, borderRadius: 3 }}>Thấp</span>}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 tabular-nums">{g.minStock.toLocaleString('vi-VN')}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{g.lastReceive}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{g.lastSale}</td>
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
