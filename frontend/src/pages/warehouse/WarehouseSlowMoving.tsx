import { useState } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Search, Download } from 'lucide-react';

const PRIMARY = '#1F3B64';
const WARNING = '#F97316';
const ERROR   = '#DC2626';
const INFO    = '#2563EB';
const NEUTRAL = '#64748B';

type Period = '1w' | '2w' | '3w' | '1m' | '2m';

const TABS: { id: Period; label: string; days: number }[] = [
  { id: '1w',  label: '1 tuần',   days: 7  },
  { id: '2w',  label: '2 tuần',   days: 14 },
  { id: '3w',  label: '3 tuần',   days: 21 },
  { id: '1m',  label: '1 tháng',  days: 30 },
  { id: '2m',  label: '2 tháng',  days: 60 },
];

const SLOW_DATA: Record<Period, { id: string; type: string; sku: string; name: string; unit: string; stock: number; lastSale: string; daysSinceLastSale: number; suggestion: string }[]> = {
  '1w': [
    { id: 'SM-001', type: 'goods',    sku: 'VT-DP-020', name: 'Đồng phục VP nam',   unit: 'bộ',  stock: 78,  lastSale: '29/05/2026', daysSinceLastSale: 8,  suggestion: 'Giảm giá khuyến mãi' },
    { id: 'SM-002', type: 'goods',    sku: 'VT-AK-009', name: 'Áo khoác công sở nữ', unit: 'cái', stock: 45,  lastSale: '28/05/2026', daysSinceLastSale: 9,  suggestion: 'Kiểm tra nhu cầu thị trường' },
    { id: 'SM-003', type: 'material', sku: 'NL-006',    name: 'Băng keo OPP trong', unit: 'cuộn', stock: 300, lastSale: '30/05/2026', daysSinceLastSale: 7,  suggestion: 'Theo dõi thêm' },
  ],
  '2w': [
    { id: 'SM-001', type: 'goods',    sku: 'VT-DP-020', name: 'Đồng phục VP nam',    unit: 'bộ',   stock: 78,  lastSale: '29/05/2026', daysSinceLastSale: 8,  suggestion: 'Giảm giá khuyến mãi' },
    { id: 'SM-002', type: 'goods',    sku: 'VT-AK-009', name: 'Áo khoác công sở nữ', unit: 'cái',  stock: 45,  lastSale: '28/05/2026', daysSinceLastSale: 9,  suggestion: 'Kiểm tra nhu cầu thị trường' },
    { id: 'SM-004', type: 'goods',    sku: 'VT-DM-005', name: 'Vải denim cao cấp',   unit: 'm',    stock: 310, lastSale: '23/05/2026', daysSinceLastSale: 14, suggestion: 'Liên hệ khách hàng tiềm năng' },
    { id: 'SM-005', type: 'material', sku: 'NL-007',    name: 'Nhãn dán sản phẩm',  unit: 'cuộn', stock: 50,  lastSale: '23/05/2026', daysSinceLastSale: 14, suggestion: 'Xuất sử dụng nội bộ' },
  ],
  '3w': [
    { id: 'SM-001', type: 'goods',    sku: 'VT-DP-020', name: 'Đồng phục VP nam',    unit: 'bộ',   stock: 78,  lastSale: '29/05/2026', daysSinceLastSale: 8,  suggestion: 'Giảm giá khuyến mãi' },
    { id: 'SM-002', type: 'goods',    sku: 'VT-AK-009', name: 'Áo khoác công sở nữ', unit: 'cái',  stock: 45,  lastSale: '28/05/2026', daysSinceLastSale: 9,  suggestion: 'Kiểm tra nhu cầu thị trường' },
    { id: 'SM-004', type: 'goods',    sku: 'VT-DM-005', name: 'Vải denim cao cấp',   unit: 'm',    stock: 310, lastSale: '23/05/2026', daysSinceLastSale: 14, suggestion: 'Liên hệ khách hàng tiềm năng' },
    { id: 'SM-006', type: 'goods',    sku: 'VT-LN-003', name: 'Vải linen nhập khẩu Ý', unit: 'm', stock: 420, lastSale: '16/05/2026', daysSinceLastSale: 21, suggestion: 'Báo Marketing xây dựng chiến dịch' },
  ],
  '1m': [
    { id: 'SM-001', type: 'goods',    sku: 'VT-DP-020', name: 'Đồng phục VP nam',    unit: 'bộ',   stock: 78,  lastSale: '29/05/2026', daysSinceLastSale: 8,  suggestion: 'Giảm giá khuyến mãi' },
    { id: 'SM-002', type: 'goods',    sku: 'VT-AK-009', name: 'Áo khoác công sở nữ', unit: 'cái',  stock: 45,  lastSale: '28/05/2026', daysSinceLastSale: 9,  suggestion: 'Kiểm tra nhu cầu thị trường' },
    { id: 'SM-004', type: 'goods',    sku: 'VT-DM-005', name: 'Vải denim cao cấp',   unit: 'm',    stock: 310, lastSale: '23/05/2026', daysSinceLastSale: 14, suggestion: 'Liên hệ khách hàng tiềm năng' },
    { id: 'SM-006', type: 'goods',    sku: 'VT-LN-003', name: 'Vải linen nhập khẩu Ý', unit: 'm', stock: 420, lastSale: '16/05/2026', daysSinceLastSale: 21, suggestion: 'Báo Marketing xây dựng chiến dịch' },
    { id: 'SM-007', type: 'material', sku: 'NL-008',    name: 'Túi zipper bảo quản', unit: 'túi',  stock: 800, lastSale: '07/05/2026', daysSinceLastSale: 30, suggestion: 'Chuyển dùng cho đơn hàng khác' },
  ],
  '2m': [
    { id: 'SM-001', type: 'goods',    sku: 'VT-DP-020', name: 'Đồng phục VP nam',    unit: 'bộ',   stock: 78,  lastSale: '29/05/2026', daysSinceLastSale: 8,  suggestion: 'Giảm giá khuyến mãi' },
    { id: 'SM-002', type: 'goods',    sku: 'VT-AK-009', name: 'Áo khoác công sở nữ', unit: 'cái',  stock: 45,  lastSale: '28/05/2026', daysSinceLastSale: 9,  suggestion: 'Kiểm tra nhu cầu thị trường' },
    { id: 'SM-004', type: 'goods',    sku: 'VT-DM-005', name: 'Vải denim cao cấp',   unit: 'm',    stock: 310, lastSale: '23/05/2026', daysSinceLastSale: 14, suggestion: 'Liên hệ khách hàng tiềm năng' },
    { id: 'SM-006', type: 'goods',    sku: 'VT-LN-003', name: 'Vải linen nhập khẩu Ý', unit: 'm', stock: 420, lastSale: '16/05/2026', daysSinceLastSale: 21, suggestion: 'Báo Marketing xây dựng chiến dịch' },
    { id: 'SM-007', type: 'material', sku: 'NL-008',    name: 'Túi zipper bảo quản', unit: 'túi',  stock: 800, lastSale: '07/05/2026', daysSinceLastSale: 30, suggestion: 'Chuyển dùng cho đơn hàng khác' },
    { id: 'SM-008', type: 'goods',    sku: 'VT-CT-002', name: 'Vải cotton khổ 1.8m',  unit: 'm',   stock: 150, lastSale: '08/04/2026', daysSinceLastSale: 59, suggestion: 'Cân nhắc thanh lý hoặc tái chế' },
  ],
};

const SUGGESTION_COLOR: Record<string, string> = {
  'Giảm giá khuyến mãi':                  WARNING,
  'Kiểm tra nhu cầu thị trường':           NEUTRAL,
  'Theo dõi thêm':                          NEUTRAL,
  'Liên hệ khách hàng tiềm năng':          INFO,
  'Xuất sử dụng nội bộ':                   INFO,
  'Báo Marketing xây dựng chiến dịch':     PRIMARY,
  'Chuyển dùng cho đơn hàng khác':         INFO,
  'Cân nhắc thanh lý hoặc tái chế':        ERROR,
};

export default function WarehouseSlowMoving() {
  const [period, setPeriod] = useState<Period>('2w');
  const [search, setSearch] = useState('');

  const rows = SLOW_DATA[period].filter(r => {
    const q = search.toLowerCase();
    return !q || r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Hàng chậm luân chuyển</h2>
            <p className="text-xs text-gray-500 mt-0.5">{rows.length} mặt hàng không có giao dịch trong kỳ</p>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"><Download className="w-3.5 h-3.5" /> Xuất Excel</Button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex border border-gray-200 rounded-md overflow-hidden">
            {TABS.map(t => (
              <button
                key={t.id}
                className="px-3 py-1.5 text-xs transition-colors"
                style={period === t.id
                  ? { backgroundColor: PRIMARY, color: '#fff' }
                  : { backgroundColor: '#fff', color: '#6B7280' }}
                onClick={() => setPeriod(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input className="pl-8 h-8 text-xs bg-gray-50" placeholder="Tìm SKU, tên hàng..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">Loại</th>
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">SKU</th>
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">Tên hàng</th>
                <th className="text-right px-4 py-3 text-gray-700 font-semibold">Tồn kho</th>
                <th className="text-center px-4 py-3 text-gray-700 font-semibold">Lần bán cuối</th>
                <th className="text-right px-4 py-3 text-gray-700 font-semibold">Số ngày không bán</th>
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">Đề xuất xử lý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r, i) => {
                const urgency = r.daysSinceLastSale >= 30 ? ERROR : r.daysSinceLastSale >= 14 ? WARNING : NEUTRAL;
                const suggColor = SUGGESTION_COLOR[r.suggestion] || NEUTRAL;
                return (
                  <tr key={r.id} className="hover:bg-[#F9FAFB]" style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-medium text-white px-2 py-0.5 whitespace-nowrap" style={{ backgroundColor: r.type === 'goods' ? INFO : WARNING, borderRadius: 4 }}>
                        {r.type === 'goods' ? 'Hàng TM' : 'Nguyên liệu'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-500 text-[11px]">{r.sku}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{r.name}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-gray-700">{r.stock.toLocaleString('vi-VN')} {r.unit}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{r.lastSale}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums" style={{ color: urgency }}>{r.daysSinceLastSale} ngày</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-medium text-white px-2 py-0.5 whitespace-nowrap" style={{ backgroundColor: suggColor, borderRadius: 4 }}>
                        {r.suggestion}
                      </span>
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
