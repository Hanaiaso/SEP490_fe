import { useState } from 'react';
import { Input } from '../../components/sales-ui/input';
import { Button } from '../../components/sales-ui/button';
import { Search, Download } from 'lucide-react';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#F97316';

const HISTORY = [
  { id: 'HK-001', type: 'receive', sku: 'VT-CT-001', name: 'Vải cotton khổ 1.5m',  qty: 300, unit: 'm',   supplier: 'Cty Dệt Phong Phú', user: 'Nguyễn Văn A', time: '06/06 09:00' },
  { id: 'HK-002', type: 'export',  sku: 'VT-SM-012', name: 'Sơ mi nam slim fit',    qty: 50,  unit: 'cái', supplier: '—',                  user: 'Nguyễn Văn A', time: '06/06 08:30' },
  { id: 'HK-003', type: 'receive', sku: 'VT-QT-007', name: 'Quần tây nam slim fit', qty: 80,  unit: 'cái', supplier: 'Cty May Phương Nam', user: 'Trần Văn B',   time: '05/06 15:00' },
  { id: 'HK-004', type: 'export',  sku: 'VT-LN-003', name: 'Vải linen nhập khẩu',  qty: 200, unit: 'm',   supplier: '—',                  user: 'Nguyễn Văn A', time: '05/06 11:20' },
  { id: 'HK-005', type: 'export',  sku: 'VT-DP-021', name: 'Đồng phục VP nữ',      qty: 20,  unit: 'bộ',  supplier: '—',                  user: 'Trần Văn B',   time: '04/06 14:45' },
];

export default function WarehouseGoodsHistory() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = HISTORY.filter(h => {
    const q = search.toLowerCase();
    const matchSearch = !q || h.name.toLowerCase().includes(q) || h.sku.toLowerCase().includes(q);
    const matchType = typeFilter === 'all' || h.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Lịch sử nhập xuất hàng thương mại</h2>
            <p className="text-xs text-gray-500 mt-0.5">{HISTORY.length} giao dịch</p>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"><Download className="w-3.5 h-3.5" /> Xuất Excel</Button>
        </div>
        <div className="flex gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input className="pl-8 h-8 text-xs bg-gray-50" placeholder="Tìm SKU, tên hàng..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="h-8 text-xs border border-gray-200 rounded-md px-2 bg-white text-gray-600" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="receive">Nhập kho</option>
            <option value="export">Xuất kho</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">Mã phiếu</th>
                <th className="text-center px-4 py-3 text-gray-700 font-semibold">Loại</th>
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">SKU</th>
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">Tên hàng</th>
                <th className="text-right px-4 py-3 text-gray-700 font-semibold">Số lượng</th>
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">Nhà CC</th>
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">Người TH</th>
                <th className="text-center px-4 py-3 text-gray-700 font-semibold">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((h, i) => (
                <tr key={h.id} className="hover:bg-[#F9FAFB]" style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: PRIMARY }}>{h.id}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[10px] font-semibold text-white px-2 py-0.5 whitespace-nowrap inline-block" style={{ backgroundColor: h.type === 'receive' ? SUCCESS : WARNING, borderRadius: 4 }}>
                      {h.type === 'receive' ? 'Nhập kho' : 'Xuất kho'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-500 text-[11px]">{h.sku}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{h.name}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-gray-800">{h.qty.toLocaleString()} {h.unit}</td>
                  <td className="px-4 py-3 text-gray-500">{h.supplier}</td>
                  <td className="px-4 py-3 text-gray-600">{h.user}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{h.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
