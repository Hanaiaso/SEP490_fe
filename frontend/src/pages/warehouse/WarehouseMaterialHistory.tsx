import { useState } from 'react';
import { Input } from '../../components/sales-ui/input';
import { Button } from '../../components/sales-ui/button';
import { Search, Download } from 'lucide-react';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#F97316';

const HISTORY = [
  { id: 'PT-001', type: 'receive', material: 'Jumbo (cuộn giấy lớn)', qty: 200, unit: 'cuộn', supplier: 'Cty Giấy Bãi Bằng', user: 'Nguyễn Văn A', time: '06/06 08:10', ref: 'LSX-001' },
  { id: 'PT-002', type: 'issue',   material: 'Màng co',               qty: 50,  unit: 'kg',    supplier: '—',                   user: 'Nguyễn Văn A', time: '06/06 08:45', ref: 'LSX-2406-018' },
  { id: 'PT-003', type: 'receive', material: 'Thùng carton 40x30',    qty: 500, unit: 'cái',   supplier: 'Cty Bao Bì Minh',    user: 'Trần Văn B',   time: '05/06 14:20', ref: '' },
  { id: 'PT-004', type: 'issue',   material: 'Chỉ khâu công nghiệp',  qty: 10,  unit: 'kg',    supplier: '—',                   user: 'Nguyễn Văn A', time: '05/06 13:00', ref: 'LSX-2406-017' },
  { id: 'PT-005', type: 'issue',   material: 'Lõi giấy',              qty: 80,  unit: 'cuộn',  supplier: '—',                   user: 'Trần Văn B',   time: '05/06 10:30', ref: 'LSX-2406-016' },
  { id: 'PT-006', type: 'receive', material: 'Keo dán nhãn',          qty: 20,  unit: 'lít',   supplier: 'Cty Hóa Chất TN',    user: 'Nguyễn Văn A', time: '04/06 09:00', ref: '' },
];

export default function WarehouseMaterialHistory() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = HISTORY.filter(h => {
    const q = search.toLowerCase();
    const matchSearch = !q || h.material.toLowerCase().includes(q) || h.id.toLowerCase().includes(q);
    const matchType = typeFilter === 'all' || h.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Lịch sử nhập xuất nguyên liệu</h2>
            <p className="text-xs text-gray-500 mt-0.5">{HISTORY.length} giao dịch</p>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"><Download className="w-3.5 h-3.5" /> Xuất Excel</Button>
        </div>
        <div className="flex gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input className="pl-8 h-8 text-xs bg-gray-50" placeholder="Tìm nguyên liệu, mã phiếu..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="h-8 text-xs border border-gray-200 rounded-md px-2 bg-white text-gray-600" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="receive">Nhập kho</option>
            <option value="issue">Xuất kho</option>
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
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">Nguyên liệu</th>
                <th className="text-right px-4 py-3 text-gray-700 font-semibold">Số lượng</th>
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">Nhà CC / Lệnh SX</th>
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">Người thực hiện</th>
                <th className="text-center px-4 py-3 text-gray-700 font-semibold">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((h, i) => (
                <tr key={h.id} className="hover:bg-[#F9FAFB]" style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                  <td className="px-4 py-3 font-medium" style={{ color: PRIMARY }}>{h.id}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[10px] font-medium text-white px-2 py-0.5 whitespace-nowrap" style={{ backgroundColor: h.type === 'receive' ? SUCCESS : WARNING, borderRadius: 4 }}>
                      {h.type === 'receive' ? 'Nhập kho' : 'Xuất kho'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{h.material}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-gray-800">{h.qty.toLocaleString()} {h.unit}</td>
                  <td className="px-4 py-3 text-gray-500">{h.type === 'receive' ? h.supplier : (h.ref || '—')}</td>
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
