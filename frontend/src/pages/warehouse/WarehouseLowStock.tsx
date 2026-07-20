import { useState } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Search, Bell, RefreshCw, History, Download } from 'lucide-react';

const PRIMARY  = '#1F3B64';
const INFO     = '#2563EB';
const SUCCESS  = '#16A34A';
const NEUTRAL  = '#64748B';
const WARNING  = '#F97316';
const ERROR    = '#DC2626';

const LOW_STOCK = [
  { id: 'CB-001', type: 'material', sku: 'NL-005', name: 'Keo dán nhãn',           unit: 'lít',  current: 12,  threshold: 30,  lastReport: '06/06 08:00', status: 'pending',    nextReminder: '08/06' },
  { id: 'CB-002', type: 'material', sku: 'NL-004', name: 'Chỉ khâu công nghiệp',   unit: 'kg',   current: 45,  threshold: 60,  lastReport: '05/06 14:00', status: 'confirmed',  nextReminder: '07/06' },
  { id: 'CB-003', type: 'goods',    sku: 'VT-AK-009', name: 'Áo khoác công sở nữ', unit: 'cái',  current: 45,  threshold: 20,  lastReport: '04/06 10:30', status: 'received',   nextReminder: '—' },
  { id: 'CB-004', type: 'material', sku: 'NL-002', name: 'Lõi giấy',               unit: 'cuộn', current: 180, threshold: 200, lastReport: '06/06 07:30', status: 'pending',    nextReminder: '08/06' },
  { id: 'CB-005', type: 'goods',    sku: 'VT-DP-020', name: 'Đồng phục VP nam',    unit: 'bộ',   current: 78,  threshold: 30,  lastReport: '03/06 09:00', status: 'confirmed',  nextReminder: '09/06' },
];

const STATUS_CFG: Record<string, { label: string; bg: string }> = {
  pending:   { label: 'Chờ Admin xử lý', bg: NEUTRAL },
  confirmed: { label: 'Đã xác nhận',     bg: INFO },
  received:  { label: 'Đã nhập hàng',    bg: SUCCESS },
};

const TYPE_LABEL: Record<string, string> = { material: 'Nguyên liệu', goods: 'Hàng TM' };
const TYPE_BG:    Record<string, string> = { material: WARNING, goods: INFO };

export default function WarehouseLowStock() {
  const [search, setSearch]           = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [reminded, setReminded]       = useState<Set<string>>(new Set());

  const filtered = LOW_STOCK.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q || r.name.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const remind = (id: string) => setReminded(prev => new Set([...prev, id]));

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Cảnh báo gần hết hàng / nguyên liệu</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {LOW_STOCK.filter(r => r.status === 'pending').length} mục chờ xử lý
            </p>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"><Download className="w-3.5 h-3.5" /> Xuất Excel</Button>
        </div>
        <div className="flex gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input className="pl-8 h-8 text-xs bg-gray-50" placeholder="Tìm SKU, tên hàng..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="h-8 text-xs border border-gray-200 rounded-md px-2 bg-white text-gray-600" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ Admin xử lý</option>
            <option value="confirmed">Đã xác nhận</option>
            <option value="received">Đã nhập hàng</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">Loại</th>
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">SKU / Tên</th>
                <th className="text-right px-4 py-3 text-gray-700 font-semibold">Tồn hiện tại</th>
                <th className="text-right px-4 py-3 text-gray-700 font-semibold">Ngưỡng</th>
                <th className="text-center px-4 py-3 text-gray-700 font-semibold">Mức tồn</th>
                <th className="text-center px-4 py-3 text-gray-700 font-semibold">Ngày báo</th>
                <th className="text-center px-4 py-3 text-gray-700 font-semibold">Nhắc lại</th>
                <th className="text-center px-4 py-3 text-gray-700 font-semibold">Trạng thái</th>
                <th className="text-center px-4 py-3 text-gray-700 font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((r, i) => {
                const pct = Math.round((r.current / r.threshold) * 100);
                const barColor = pct < 50 ? ERROR : pct < 80 ? WARNING : SUCCESS;
                const cfg = STATUS_CFG[r.status];
                const hasReminded = reminded.has(r.id);
                return (
                  <tr key={r.id} className="hover:bg-[#F9FAFB]" style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-semibold text-white px-2 py-0.5 whitespace-nowrap inline-block" style={{ backgroundColor: TYPE_BG[r.type], borderRadius: 4 }}>
                        {TYPE_LABEL[r.type]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{r.name}</div>
                      <div className="text-[11px] font-mono text-gray-400 mt-0.5">{r.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums" style={{ color: pct < 50 ? ERROR : '#374151' }}>
                      {r.current.toLocaleString('vi-VN')} {r.unit}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 tabular-nums">{r.threshold.toLocaleString('vi-VN')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-[60px]">
                          <div className="h-1.5 rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }} />
                        </div>
                        <span className="text-[11px] tabular-nums text-gray-500 w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500">{r.lastReport}</td>
                    <td className="px-4 py-3 text-center text-gray-500">
                      {r.status === 'received' ? '—' : (hasReminded ? <span className="text-[11px] text-gray-400">Đã nhắc</span> : r.nextReminder)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[10px] font-semibold text-white px-2 py-0.5 whitespace-nowrap inline-block" style={{ backgroundColor: cfg.bg, borderRadius: 4 }}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        {r.status === 'pending' && (
                          <button
                            className="h-6 px-2.5 text-[10px] font-medium text-white rounded flex items-center gap-1 whitespace-nowrap"
                            style={{ backgroundColor: PRIMARY }}
                            onClick={() => {}}
                          >
                            <Bell className="w-3 h-3 flex-shrink-0" /> Báo cáo
                          </button>
                        )}
                        {r.status !== 'received' && !hasReminded && (
                          <button
                            className="h-6 px-2.5 text-[10px] font-medium border border-gray-200 rounded text-gray-600 flex items-center gap-1 hover:bg-gray-50 whitespace-nowrap"
                            onClick={() => remind(r.id)}
                          >
                            <RefreshCw className="w-3 h-3 flex-shrink-0" /> Nhắc lại
                          </button>
                        )}
                        <button className="h-6 px-2.5 text-[10px] font-medium border border-gray-200 rounded text-gray-600 flex items-center gap-1 hover:bg-gray-50 whitespace-nowrap">
                          <History className="w-3 h-3 flex-shrink-0" /> Lịch sử
                        </button>
                      </div>
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
