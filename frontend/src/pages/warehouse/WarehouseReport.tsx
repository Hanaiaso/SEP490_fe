import { useState } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Download, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#F97316';
const ERROR   = '#DC2626';
const INFO    = '#2563EB';
const NEUTRAL = '#64748B';

type Tab = 'current' | 'movement' | 'materials' | 'goods' | 'slow';

const TABS: { id: Tab; label: string }[] = [
  { id: 'current',   label: 'Tồn kho hiện tại' },
  { id: 'movement',  label: 'Nhập xuất tồn' },
  { id: 'materials', label: 'Nguyên liệu SX' },
  { id: 'goods',     label: 'Hàng thương mại' },
  { id: 'slow',      label: 'Hàng chậm luân chuyển' },
];

const CURRENT_STOCK = [
  { sku: 'NL-001', name: 'Jumbo (cuộn giấy lớn)',    type: 'material', unit: 'cuộn', stock: 840, minStock: 100, status: 'ok'       },
  { sku: 'NL-002', name: 'Lõi giấy',                 type: 'material', unit: 'cuộn', stock: 180, minStock: 200, status: 'low'      },
  { sku: 'NL-003', name: 'Màng co',                  type: 'material', unit: 'kg',   stock: 620, minStock: 50,  status: 'ok'       },
  { sku: 'NL-004', name: 'Chỉ khâu công nghiệp',     type: 'material', unit: 'kg',   stock: 45,  minStock: 60,  status: 'low'      },
  { sku: 'NL-005', name: 'Keo dán nhãn',             type: 'material', unit: 'lít',  stock: 12,  minStock: 30,  status: 'critical' },
  { sku: 'VT-CT-001', name: 'Vải cotton khổ 1.5m',  type: 'goods',    unit: 'm',    stock: 850, minStock: 200, status: 'ok'       },
  { sku: 'VT-SM-012', name: 'Sơ mi nam slim fit',    type: 'goods',    unit: 'cái',  stock: 240, minStock: 50,  status: 'ok'       },
  { sku: 'VT-QT-007', name: 'Quần tây nam slim fit', type: 'goods',    unit: 'cái',  stock: 185, minStock: 50,  status: 'ok'       },
  { sku: 'VT-LN-003', name: 'Vải linen nhập khẩu Ý',type: 'goods',    unit: 'm',    stock: 420, minStock: 100, status: 'ok'       },
  { sku: 'VT-DP-021', name: 'Đồng phục VP nữ',       type: 'goods',    unit: 'bộ',   stock: 92,  minStock: 30,  status: 'ok'       },
];

const STATUS_CFG: Record<string, { label: string; bg: string }> = {
  ok:       { label: 'Bình thường', bg: SUCCESS },
  low:      { label: 'Gần hết',     bg: WARNING },
  critical: { label: 'Cần nhập',    bg: ERROR   },
};

const MOVEMENT_DATA = [
  { date: '01/06', nhap: 580, xuat: 320, ton: 5200 },
  { date: '02/06', nhap: 0,   xuat: 450, ton: 4750 },
  { date: '03/06', nhap: 820, xuat: 280, ton: 5290 },
  { date: '04/06', nhap: 0,   xuat: 620, ton: 4670 },
  { date: '05/06', nhap: 300, xuat: 390, ton: 4580 },
  { date: '06/06', nhap: 680, xuat: 170, ton: 5090 },
];

const MATERIAL_USAGE = [
  { name: 'Jumbo',    ton_dau: 900, nhap: 200, xuat: 260, ton_cuoi: 840 },
  { name: 'Lõi giấy',ton_dau: 230, nhap: 0,   xuat: 50,  ton_cuoi: 180 },
  { name: 'Màng co',  ton_dau: 600, nhap: 120, xuat: 100, ton_cuoi: 620 },
  { name: 'Chỉ khâu',ton_dau: 55,  nhap: 0,   xuat: 10,  ton_cuoi: 45  },
  { name: 'Keo dán',  ton_dau: 20,  nhap: 20,  xuat: 28,  ton_cuoi: 12  },
];

const GOODS_MOVEMENT = [
  { name: 'Vải cotton',     ton_dau: 600, nhap: 300, xuat: 50, ton_cuoi: 850 },
  { name: 'Sơ mi nam',      ton_dau: 260, nhap: 30,  xuat: 50, ton_cuoi: 240 },
  { name: 'Quần tây',       ton_dau: 125, nhap: 80,  xuat: 20, ton_cuoi: 185 },
  { name: 'Vải linen',      ton_dau: 420, nhap: 0,  xuat: 200, ton_cuoi: 220 },
  { name: 'Đồng phục nữ',   ton_dau: 92,  nhap: 20,  xuat: 20, ton_cuoi: 92  },
];

const SLOW_REPORT = [
  { sku: 'VT-DP-020', name: 'Đồng phục VP nam',    stock: 78,  days: 8,  suggestion: 'Giảm giá' },
  { sku: 'VT-AK-009', name: 'Áo khoác công sở nữ', stock: 45,  days: 9,  suggestion: 'Kiểm tra nhu cầu' },
  { sku: 'VT-DM-005', name: 'Vải denim cao cấp',   stock: 310, days: 14, suggestion: 'Liên hệ khách hàng' },
  { sku: 'VT-LN-003', name: 'Vải linen nhập khẩu', stock: 420, days: 21, suggestion: 'Chiến dịch marketing' },
  { sku: 'VT-CT-002', name: 'Vải cotton khổ 1.8m', stock: 150, days: 59, suggestion: 'Cân nhắc thanh lý' },
];

export default function WarehouseReport() {
  const [tab, setTab] = useState<Tab>('current');

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Báo cáo kho hàng</h2>
            <p className="text-xs text-gray-500 mt-0.5">Cập nhật đến 06/06/2026</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"><FileText className="w-3.5 h-3.5" /> Xuất PDF</Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"><Download className="w-3.5 h-3.5" /> Xuất Excel</Button>
          </div>
        </div>
        <div className="flex border-b border-gray-200 -mb-3">
          {TABS.map(t => (
            <button
              key={t.id}
              className="px-4 py-2 text-xs border-b-2 transition-colors mr-1"
              style={tab === t.id
                ? { borderColor: PRIMARY, color: PRIMARY }
                : { borderColor: 'transparent', color: '#6B7280' }}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        {tab === 'current' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Tổng mặt hàng', value: CURRENT_STOCK.length, color: PRIMARY },
                { label: 'Bình thường',    value: CURRENT_STOCK.filter(r => r.status === 'ok').length, color: SUCCESS },
                { label: 'Gần hết',        value: CURRENT_STOCK.filter(r => r.status === 'low').length, color: WARNING },
                { label: 'Cần nhập gấp',   value: CURRENT_STOCK.filter(r => r.status === 'critical').length, color: ERROR },
              ].map(c => (
                <div key={c.label} className="bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center gap-3">
                  <div className="w-1 self-stretch rounded-full" style={{ backgroundColor: c.color }} />
                  <div>
                    <div className="text-[11px] text-gray-500">{c.label}</div>
                    <div className="text-xl font-bold" style={{ color: c.color }}>{c.value}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-gray-700 font-semibold">SKU</th>
                    <th className="text-left px-4 py-3 text-gray-700 font-semibold">Tên hàng</th>
                    <th className="text-center px-4 py-3 text-gray-700 font-semibold">Loại</th>
                    <th className="text-center px-4 py-3 text-gray-700 font-semibold">ĐVT</th>
                    <th className="text-right px-4 py-3 text-gray-700 font-semibold">Tồn kho</th>
                    <th className="text-right px-4 py-3 text-gray-700 font-semibold">Tồn tối thiểu</th>
                    <th className="text-center px-4 py-3 text-gray-700 font-semibold">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {CURRENT_STOCK.map((r, i) => {
                    const cfg = STATUS_CFG[r.status];
                    return (
                      <tr key={r.sku} className="hover:bg-[#F9FAFB]" style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                        <td className="px-4 py-3 font-mono text-gray-500 text-[11px]">{r.sku}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{r.name}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[10px] font-medium text-white px-2 py-0.5 whitespace-nowrap" style={{ backgroundColor: r.type === 'material' ? WARNING : INFO, borderRadius: 4 }}>
                            {r.type === 'material' ? 'Nguyên liệu' : 'Hàng TM'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center text-gray-500">{r.unit}</td>
                        <td className="px-4 py-3 text-right font-bold tabular-nums" style={{ color: r.status === 'critical' ? ERROR : r.status === 'low' ? WARNING : '#374151' }}>
                          {r.stock.toLocaleString('vi-VN')}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500 tabular-nums">{r.minStock.toLocaleString('vi-VN')}</td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-[10px] font-medium text-white px-2 py-0.5 whitespace-nowrap" style={{ backgroundColor: cfg.bg, borderRadius: 4 }}>
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'movement' && (
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide mb-3">Biến động nhập xuất tồn 6 ngày gần nhất</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={MOVEMENT_DATA} barSize={20}>
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="nhap" name="Nhập kho" fill={SUCCESS} />
                  <Bar dataKey="xuat" name="Xuất kho" fill={WARNING} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">Chi tiết theo ngày</p>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 text-gray-700 font-semibold">Ngày</th>
                    <th className="text-right px-4 py-2.5 text-gray-700 font-semibold">Nhập kho</th>
                    <th className="text-right px-4 py-2.5 text-gray-700 font-semibold">Xuất kho</th>
                    <th className="text-right px-4 py-2.5 text-gray-700 font-semibold">Tồn cuối ngày</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {MOVEMENT_DATA.map((r, i) => (
                    <tr key={r.date} className="hover:bg-[#F9FAFB]" style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                      <td className="px-4 py-3 font-medium text-gray-700">{r.date}/2026</td>
                      <td className="px-4 py-3 text-right tabular-nums" style={{ color: SUCCESS }}>{r.nhap > 0 ? `+${r.nhap.toLocaleString()}` : '—'}</td>
                      <td className="px-4 py-3 text-right tabular-nums" style={{ color: WARNING }}>-{r.xuat.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums text-gray-800">{r.ton.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {(tab === 'materials' || tab === 'goods') && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-gray-700 font-semibold">Tên {tab === 'materials' ? 'nguyên liệu' : 'hàng hóa'}</th>
                  <th className="text-right px-4 py-3 text-gray-700 font-semibold">Tồn đầu kỳ</th>
                  <th className="text-right px-4 py-3 text-gray-700 font-semibold">Nhập trong kỳ</th>
                  <th className="text-right px-4 py-3 text-gray-700 font-semibold">Xuất trong kỳ</th>
                  <th className="text-right px-4 py-3 text-gray-700 font-semibold">Tồn cuối kỳ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(tab === 'materials' ? MATERIAL_USAGE : GOODS_MOVEMENT).map((r, i) => (
                  <tr key={r.name} className="hover:bg-[#F9FAFB]" style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td className="px-4 py-3 font-semibold text-gray-800">{r.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-600">{r.ton_dau.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium" style={{ color: r.nhap > 0 ? SUCCESS : '#9CA3AF' }}>
                      {r.nhap > 0 ? `+${r.nhap.toLocaleString()}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium" style={{ color: WARNING }}>
                      -{r.xuat.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-bold" style={{ color: PRIMARY }}>{r.ton_cuoi.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'slow' && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-gray-700 font-semibold">SKU</th>
                  <th className="text-left px-4 py-3 text-gray-700 font-semibold">Tên hàng</th>
                  <th className="text-right px-4 py-3 text-gray-700 font-semibold">Tồn kho</th>
                  <th className="text-right px-4 py-3 text-gray-700 font-semibold">Số ngày không bán</th>
                  <th className="text-left px-4 py-3 text-gray-700 font-semibold">Đề xuất</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {SLOW_REPORT.map((r, i) => {
                  const urgency = r.days >= 30 ? ERROR : r.days >= 14 ? WARNING : NEUTRAL;
                  return (
                    <tr key={r.sku} className="hover:bg-[#F9FAFB]" style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                      <td className="px-4 py-3 font-mono text-gray-500 text-[11px]">{r.sku}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{r.name}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold text-gray-700">{r.stock.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-bold" style={{ color: urgency }}>{r.days} ngày</td>
                      <td className="px-4 py-3 text-gray-600">{r.suggestion}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
