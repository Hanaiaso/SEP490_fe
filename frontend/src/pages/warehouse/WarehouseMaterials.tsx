import { useState } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Search, ArrowDownToLine, ArrowUpFromLine, History, AlertCircle, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#F97316';
const ERROR   = '#DC2626';
const NEUTRAL = '#64748B';

interface Material {
  id: string; name: string; unit: string;
  stock: number; minThreshold: number; status: 'ok' | 'low' | 'critical';
}

const MATERIALS: Material[] = [
  { id: 'NL-001', name: 'Jumbo (cuộn giấy lớn)',  unit: 'cuộn', stock: 840,  minThreshold: 200, status: 'ok'       },
  { id: 'NL-002', name: 'Lõi giấy',               unit: 'cuộn', stock: 180,  minThreshold: 300, status: 'critical' },
  { id: 'NL-003', name: 'Màng co',                unit: 'kg',   stock: 620,  minThreshold: 150, status: 'ok'       },
  { id: 'NL-004', name: 'Chỉ khâu công nghiệp',   unit: 'kg',   stock: 45,   minThreshold: 30,  status: 'low'      },
  { id: 'NL-005', name: 'Keo dán nhãn',           unit: 'lít',  stock: 12,   minThreshold: 20,  status: 'critical' },
  { id: 'NL-006', name: 'Thùng carton 40x30',     unit: 'cái',  stock: 1200, minThreshold: 500, status: 'ok'       },
  { id: 'NL-007', name: 'Băng dán đóng gói',      unit: 'cuộn', stock: 380,  minThreshold: 100, status: 'ok'       },
  { id: 'NL-008', name: 'Túi PE đóng gói',        unit: 'cái',  stock: 4500, minThreshold: 1000,status: 'ok'       },
];

const STATUS_CFG = {
  ok:       { label: 'Đủ hàng',  bg: SUCCESS },
  low:      { label: 'Gần hết',  bg: WARNING },
  critical: { label: 'Thiếu',    bg: ERROR   },
};

export default function WarehouseMaterials() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const filtered = MATERIALS.filter(m => !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.id.includes(search));

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Nguyên vật liệu sản xuất</h2>
            <p className="text-xs text-gray-500 mt-0.5">{MATERIALS.length} loại · {MATERIALS.filter(m => m.status !== 'ok').length} cần chú ý</p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => navigate('/warehouse/materials/history')}>
              <History className="w-3.5 h-3.5" /> Lịch sử
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1.5" style={{ backgroundColor: NEUTRAL }} onClick={() => navigate('/warehouse/materials/issue')}>
              <ArrowUpFromLine className="w-3.5 h-3.5" /> Xuất nguyên liệu
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1.5" style={{ backgroundColor: PRIMARY }} onClick={() => navigate('/warehouse/materials/receive')}>
              <ArrowDownToLine className="w-3.5 h-3.5" /> Nhập nguyên liệu
            </Button>
          </div>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input className="pl-8 h-8 text-xs bg-gray-50" placeholder="Tìm mã, tên nguyên liệu..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">Mã NL</th>
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">Tên nguyên liệu</th>
                <th className="text-center px-4 py-3 text-gray-700 font-semibold">Đơn vị</th>
                <th className="text-right px-4 py-3 text-gray-700 font-semibold">Số lượng tồn</th>
                <th className="text-right px-4 py-3 text-gray-700 font-semibold">Ngưỡng cảnh báo</th>
                <th className="text-center px-4 py-3 text-gray-700 font-semibold">Trạng thái</th>
                <th className="text-center px-4 py-3 text-gray-700 font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((m, i) => (
                <tr key={m.id} className="hover:bg-[#F9FAFB] transition-colors" style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                  <td className="px-4 py-3 font-medium text-gray-500">{m.id}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{m.name}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{m.unit}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums" style={{ color: m.status === 'critical' ? ERROR : m.status === 'low' ? WARNING : '#374151' }}>
                    {m.stock.toLocaleString('vi-VN')}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 tabular-nums">{m.minThreshold.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[10px] font-medium text-white px-2 py-0.5 whitespace-nowrap" style={{ backgroundColor: STATUS_CFG[m.status].bg, borderRadius: 4 }}>
                      {STATUS_CFG[m.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="px-2 py-1 rounded text-[10px] border border-gray-200 hover:bg-gray-50 text-gray-600" onClick={() => navigate('/warehouse/materials/receive')}>Nhập</button>
                      <button className="px-2 py-1 rounded text-[10px] border border-gray-200 hover:bg-gray-50 text-gray-600" onClick={() => navigate('/warehouse/materials/issue')}>Xuất</button>
                      {m.status !== 'ok' && (
                        <button className="px-2 py-1 rounded text-[10px] border border-red-200 hover:bg-red-50 text-red-600">Báo</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
