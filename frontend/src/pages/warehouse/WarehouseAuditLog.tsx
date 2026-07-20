import { useState } from 'react';
import { Input } from '../../components/sales-ui/input';
import { Button } from '../../components/sales-ui/button';
import { Search, Download } from 'lucide-react';

const PRIMARY = '#1F3B64';
const INFO    = '#2563EB';
const SUCCESS = '#16A34A';
const WARNING = '#F97316';
const ERROR   = '#DC2626';
const NEUTRAL = '#64748B';

type ActionType = 'create' | 'update' | 'delete' | 'confirm' | 'export' | 'import' | 'login';

const ACTION_CFG: Record<ActionType, { label: string; bg: string }> = {
  create:  { label: 'Tạo mới',    bg: INFO    },
  update:  { label: 'Cập nhật',   bg: WARNING },
  delete:  { label: 'Xóa',        bg: ERROR   },
  confirm: { label: 'Xác nhận',   bg: SUCCESS },
  export:  { label: 'Xuất kho',   bg: WARNING },
  import:  { label: 'Nhập kho',   bg: SUCCESS },
  login:   { label: 'Đăng nhập',  bg: NEUTRAL },
};

const MODULES = ['Tất cả', 'Đóng gói', 'Kiểm kê', 'Nguyên liệu', 'Hàng TM', 'Báo cáo', 'Hệ thống'];

const LOGS = [
  { id: 'AL-001', time: '06/06/2026 09:15:32', user: 'Nguyễn Văn A', module: 'Nguyên liệu', action: 'import' as ActionType, detail: 'Nhập kho PT-001 — Jumbo 200 cuộn từ Cty Giấy Bãi Bằng', ip: '192.168.1.12' },
  { id: 'AL-002', time: '06/06/2026 09:05:18', user: 'Nguyễn Văn A', module: 'Đóng gói',    action: 'confirm' as ActionType, detail: 'Xác nhận hoàn tất đóng gói ĐH-2406-089 (Sơ mi nam × 50)', ip: '192.168.1.12' },
  { id: 'AL-003', time: '06/06/2026 08:45:00', user: 'Nguyễn Văn A', module: 'Nguyên liệu', action: 'export' as ActionType, detail: 'Xuất kho PT-002 — Màng co 50kg cho LSX-2406-018', ip: '192.168.1.12' },
  { id: 'AL-004', time: '06/06/2026 08:30:42', user: 'Trần Văn B',   module: 'Kiểm kê',     action: 'confirm' as ActionType, detail: 'Xác nhận kết quả kiểm kê Ca sáng 06/06 — 1 lệch số', ip: '192.168.1.15' },
  { id: 'AL-005', time: '06/06/2026 08:00:05', user: 'Trần Văn B',   module: 'Hệ thống',    action: 'login' as ActionType,   detail: 'Đăng nhập thành công', ip: '192.168.1.15' },
  { id: 'AL-006', time: '05/06/2026 15:20:10', user: 'Trần Văn B',   module: 'Nguyên liệu', action: 'import' as ActionType, detail: 'Nhập kho PT-003 — Thùng carton 40×30, 500 cái từ Cty Bao Bì Minh', ip: '192.168.1.15' },
  { id: 'AL-007', time: '05/06/2026 14:55:33', user: 'Nguyễn Văn A', module: 'Hàng TM',     action: 'import' as ActionType, detail: 'Nhập kho HK-003 — Quần tây nam 80 cái từ Cty May Phương Nam', ip: '192.168.1.12' },
  { id: 'AL-008', time: '05/06/2026 13:00:22', user: 'Nguyễn Văn A', module: 'Nguyên liệu', action: 'export' as ActionType, detail: 'Xuất kho PT-004 — Chỉ khâu 10kg cho LSX-2406-017', ip: '192.168.1.12' },
  { id: 'AL-009', time: '05/06/2026 11:20:00', user: 'Nguyễn Văn A', module: 'Hàng TM',     action: 'export' as ActionType, detail: 'Xuất kho HK-004 — Vải linen 200m', ip: '192.168.1.12' },
  { id: 'AL-010', time: '05/06/2026 10:30:14', user: 'Trần Văn B',   module: 'Nguyên liệu', action: 'export' as ActionType, detail: 'Xuất kho PT-005 — Lõi giấy 80 cuộn cho LSX-2406-016', ip: '192.168.1.15' },
  { id: 'AL-011', time: '04/06/2026 14:45:09', user: 'Trần Văn B',   module: 'Hàng TM',     action: 'export' as ActionType, detail: 'Xuất kho HK-005 — Đồng phục VP nữ 20 bộ', ip: '192.168.1.15' },
  { id: 'AL-012', time: '04/06/2026 09:00:00', user: 'Nguyễn Văn A', module: 'Nguyên liệu', action: 'import' as ActionType, detail: 'Nhập kho PT-006 — Keo dán nhãn 20 lít từ Cty Hóa Chất TN', ip: '192.168.1.12' },
  { id: 'AL-013', time: '04/06/2026 08:30:00', user: 'Nguyễn Văn A', module: 'Báo cáo',     action: 'export' as ActionType, detail: 'Xuất báo cáo tồn kho ngày 04/06 (Excel)', ip: '192.168.1.12' },
  { id: 'AL-014', time: '03/06/2026 11:15:00', user: 'Nguyễn Văn A', module: 'Đóng gói',    action: 'update' as ActionType, detail: 'Cập nhật trạng thái đơn ĐH-2406-081 — Báo thiếu hàng', ip: '192.168.1.12' },
];

export default function WarehouseAuditLog() {
  const [search, setSearch]       = useState('');
  const [module, setModule]       = useState('Tất cả');
  const [actionFilter, setAction] = useState('all');

  const filtered = LOGS.filter(l => {
    const q = search.toLowerCase();
    const matchSearch = !q || l.user.toLowerCase().includes(q) || l.detail.toLowerCase().includes(q) || l.id.toLowerCase().includes(q);
    const matchModule = module === 'Tất cả' || l.module === module;
    const matchAction = actionFilter === 'all' || l.action === actionFilter;
    return matchSearch && matchModule && matchAction;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Nhật ký thao tác</h2>
            <p className="text-xs text-gray-500 mt-0.5">{LOGS.length} bản ghi · 7 ngày gần nhất</p>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"><Download className="w-3.5 h-3.5" /> Xuất Excel</Button>
        </div>
        <div className="flex gap-2">
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input className="pl-8 h-8 text-xs bg-gray-50" placeholder="Tìm người dùng, chi tiết..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="h-8 text-xs border border-gray-200 rounded-md px-2 bg-white text-gray-600" value={module} onChange={e => setModule(e.target.value)}>
            {MODULES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select className="h-8 text-xs border border-gray-200 rounded-md px-2 bg-white text-gray-600" value={actionFilter} onChange={e => setAction(e.target.value)}>
            <option value="all">Tất cả hành động</option>
            {Object.entries(ACTION_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">Thời gian</th>
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">Người dùng</th>
                <th className="text-center px-4 py-3 text-gray-700 font-semibold">Chức năng</th>
                <th className="text-center px-4 py-3 text-gray-700 font-semibold">Hành động</th>
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">Chi tiết</th>
                <th className="text-center px-4 py-3 text-gray-700 font-semibold">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((l, i) => {
                const cfg = ACTION_CFG[l.action];
                return (
                  <tr key={l.id} className="hover:bg-[#F9FAFB]" style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td className="px-4 py-3 tabular-nums text-gray-500 whitespace-nowrap">{l.time}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{l.user}</div>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{l.module}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-[10px] font-medium text-white px-2 py-0.5 whitespace-nowrap" style={{ backgroundColor: cfg.bg, borderRadius: 4 }}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-sm">{l.detail}</td>
                    <td className="px-4 py-3 text-center font-mono text-gray-400 text-[11px]">{l.ip}</td>
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
