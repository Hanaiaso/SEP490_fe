import { useNavigate } from 'react-router-dom';
import {
  Package, AlertCircle, TrendingDown, CheckCircle, Layers, ShoppingBag,
  ArrowDownToLine, ArrowRightLeft, ClipboardCheck, FlaskConical, Truck,
  PackageCheck, Factory, ShieldCheck,
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#D97706';
const ERROR   = '#DC2626';
const INFO    = '#2563EB';
const NEUTRAL = '#64748B';
const PURPLE  = '#7C3AED';

const tooltipStyle = { fontSize: 12, borderRadius: 6, border: '1px solid #E5E7EB', boxShadow: 'none' };

const exportData = [
  { day: 'T2', xuat: 42, nhap: 18 },
  { day: 'T3', xuat: 57, nhap: 24 },
  { day: 'T4', xuat: 38, nhap: 31 },
  { day: 'T5', xuat: 64, nhap: 15 },
  { day: 'T6', xuat: 71, nhap: 27 },
  { day: 'T7', xuat: 48, nhap: 20 },
  { day: 'CN', xuat: 29, nhap: 12 },
];

const stockStatus = [
  { name: 'Vải cotton',  stock: 840, min: 200 },
  { name: 'Lõi giấy',   stock: 180, min: 300 },
  { name: 'Màng co',    stock: 620, min: 150 },
  { name: 'Vải denim',  stock: 95,  min: 200 },
  { name: 'Vải linen',  stock: 340, min: 100 },
];

const URGENT_ORDERS = [
  { id: 'FO-2406-0134', customer: 'Cty TT Minh Anh',     status: 'waiting',  priority: 'urgent' },
  { id: 'FO-2406-0133', customer: 'Shop Vải Lan Anh',     status: 'picking',  priority: 'urgent' },
  { id: 'FO-2406-0132', customer: 'May Mặc Tân Phú',      status: 'ready',    priority: 'normal' },
  { id: 'FO-2406-0131', customer: 'Cửa hàng Đức Thịnh',  status: 'picking',  priority: 'urgent' },
];

const LOW_MATERIALS = [
  { name: 'Lõi giấy',  current: 180, min: 300, unit: 'cuộn', pct: 60 },
  { name: 'Vải cotton', current: 95,  min: 200, unit: 'm',    pct: 48 },
  { name: 'Màng co',   current: 620, min: 700, unit: 'kg',   pct: 89 },
];

const RECENT_PO = [
  { id: 'PO-2406-0234', supplier: 'Cty Dệt Thái Bình', arrival: '08/07', progress: 0,   status: 'issued'   },
  { id: 'PO-2406-0233', supplier: 'NCC Vải Phong Phú', arrival: '06/07', progress: 45,  status: 'partial'  },
  { id: 'PO-2406-0232', supplier: 'Dệt May Hòa Bình',  arrival: '05/07', progress: 100, status: 'completed'},
];

const STATUS_CFG: Record<string, { label: string; bg: string }> = {
  waiting:   { label: 'Chờ xử lý',     bg: NEUTRAL },
  picking:   { label: 'Đang picking',   bg: INFO    },
  packing:   { label: 'Đang packing',   bg: PURPLE  },
  ready:     { label: 'Sẵn sàng',       bg: SUCCESS },
  issued:    { label: 'Đã phát hành',   bg: INFO    },
  partial:   { label: 'Nhập 1 phần',    bg: WARNING },
  completed: { label: 'Hoàn tất',       bg: SUCCESS },
  shortage:  { label: 'Thiếu hàng',     bg: ERROR   },
};

interface KpiCardProps {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string; path?: string;
  onClick?: () => void;
}

function KpiCard({ label, value, sub, icon, color, onClick }: KpiCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-gray-200 rounded-lg p-3 flex items-start gap-2.5 transition-all ${onClick ? 'cursor-pointer hover:border-blue-300 hover:shadow-sm hover:bg-blue-50/20' : ''}`}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium leading-tight">{label}</p>
        <p className="text-xl font-black text-gray-900 mt-0.5 leading-none tabular-nums">{value}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{sub}</p>}
      </div>
    </div>
  );
}

function PanelHeader({ title, link, onLink }: { title: string; link?: string; onLink?: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
      <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">{title}</span>
      {link && <button onClick={onLink} className="text-[11px] text-blue-600 hover:underline">{link} →</button>}
    </div>
  );
}

function EmptyRow({ msg }: { msg: string }) {
  return (
    <tr><td colSpan={10} className="px-3 py-6 text-center text-xs text-gray-400">{msg}</td></tr>
  );
}

export default function WarehouseDashboard() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ background: '#F5F7FA' }}>
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-0.5">
          <span className="text-gray-400">Kho hàng</span>
          <span className="text-gray-300">/</span>
          <span className="text-gray-800 font-semibold">Dashboard</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Dashboard Kho hàng</h2>
            <p className="text-xs text-gray-500 mt-0.5">06/07/2026 · Ca sáng · Cập nhật lúc 09:45</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block bg-green-500" /> Kho Hà Nội: Online</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full inline-block bg-green-500" /> Kho HCM: Online</span>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-3 overflow-auto">

        {/* Outbound KPIs */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5 px-0.5">Xuất kho (Outbound)</p>
          <div className="grid grid-cols-4 gap-2.5">
            <KpiCard label="Lệnh xuất chờ xử lý" value={8}  sub="cần xử lý hôm nay"    icon={<Package className="w-4 h-4" />}       color={WARNING} onClick={() => navigate('/warehouse/fulfillment/orders')} />
            <KpiCard label="Đang Pick & Pack"     value={3}  sub="2 nhân viên đang làm"  icon={<PackageCheck className="w-4 h-4" />}   color={INFO}    onClick={() => navigate('/warehouse/fulfillment/pick-packing')} />
            <KpiCard label="Khu tập kết"          value={4}  sub="chờ bàn giao Sales"    icon={<Truck className="w-4 h-4" />}          color={PURPLE}  onClick={() => navigate('/warehouse/fulfillment/consolidation')} />
            <KpiCard label="Hoàn tất hôm nay"     value={12} sub="+3 so với hôm qua"     icon={<CheckCircle className="w-4 h-4" />}    color={SUCCESS} onClick={() => navigate('/warehouse/fulfillment/orders')} />
          </div>
        </div>

        {/* Inbound KPIs */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5 px-0.5">Nhập kho (Inbound)</p>
          <div className="grid grid-cols-4 gap-2.5">
            <KpiCard label="PO chờ nhập kho"       value={2}  sub="dự kiến về hôm nay"   icon={<ArrowDownToLine className="w-4 h-4" />} color={INFO}    onClick={() => navigate('/warehouse/purchase/orders')} />
            <KpiCard label="Phiếu nhập đang xử lý" value={1}  sub="đang nhập hàng"        icon={<ArrowDownToLine className="w-4 h-4" />} color={WARNING} onClick={() => navigate('/warehouse/purchase/goods-receipt')} />
            <KpiCard label="Cần kiểm tra CL"        value={2}  sub="hàng cách ly"          icon={<FlaskConical className="w-4 h-4" />}   color={ERROR}   onClick={() => navigate('/warehouse/purchase/quality-inspection')} />
            <KpiCard label="Cách ly (Quarantine)"   value={3}  sub="chờ xử lý"             icon={<ShieldCheck className="w-4 h-4" />}    color={WARNING} onClick={() => navigate('/warehouse/inv-management/quarantine')} />
          </div>
        </div>

        {/* Inventory KPIs */}
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5 px-0.5">Tồn kho & Vận hành</p>
          <div className="grid grid-cols-4 gap-2.5">
            <KpiCard label="Sản phẩm sắp hết"       value={4}  sub="dưới ngưỡng tối thiểu" icon={<AlertCircle className="w-4 h-4" />}    color={ERROR}   onClick={() => navigate('/warehouse/inventory/low-stock')} />
            <KpiCard label="Hàng chậm luân chuyển"  value={7}  sub="trên 2 tuần"            icon={<TrendingDown className="w-4 h-4" />}   color={NEUTRAL} onClick={() => navigate('/warehouse/inventory/slow-moving')} />
            <KpiCard label="Lệnh chuyển kho"        value={3}  sub="đang vận chuyển"        icon={<ArrowRightLeft className="w-4 h-4" />} color={INFO}    onClick={() => navigate('/warehouse/transfer/stock-transfer')} />
            <KpiCard label="Phiên kiểm kê đang mở"  value={1}  sub="Kho Hà Nội"             icon={<ClipboardCheck className="w-4 h-4" />} color={PURPLE}  onClick={() => navigate('/warehouse/inv-management/inventory-count')} />
          </div>
        </div>

        {/* Charts + panels row */}
        <div className="grid grid-cols-3 gap-3">
          {/* Inbound/Outbound chart */}
          <div className="col-span-2 bg-white border border-gray-200 rounded-lg">
            <PanelHeader title="Xuất / Nhập kho 7 ngày" />
            <div className="p-3">
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={exportData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={10}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} đơn`]} />
                  <Bar dataKey="xuat" name="Xuất kho" fill={PRIMARY} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="nhap" name="Nhập kho" fill="#D1D5DB" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 mt-1 px-1">
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500"><span className="w-3 h-2 rounded-sm inline-block" style={{ backgroundColor: PRIMARY }} /> Xuất kho</div>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500"><span className="w-3 h-2 rounded-sm inline-block bg-gray-300" /> Nhập kho</div>
              </div>
            </div>
          </div>

          {/* Stock health */}
          <div className="bg-white border border-gray-200 rounded-lg">
            <PanelHeader title="Sức khỏe tồn kho" link="Chi tiết" onLink={() => navigate('/warehouse/inventory/report')} />
            <div className="p-3 space-y-2.5">
              {stockStatus.map(s => {
                const pct = Math.round((s.stock / (s.min * 3)) * 100);
                const low = s.stock < s.min;
                return (
                  <div key={s.name}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className={`font-medium ${low ? 'text-red-600' : 'text-gray-700'}`}>{s.name}</span>
                      <span className={`tabular-nums ${low ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>{s.stock.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: low ? ERROR : PRIMARY }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom panels */}
        <div className="grid grid-cols-3 gap-3">
          {/* Fulfillment orders */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <PanelHeader title="Lệnh xuất kho gần đây" link="Xem tất cả" onLink={() => navigate('/warehouse/fulfillment/orders')} />
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-3 py-2 text-gray-700 font-semibold">Mã lệnh</th>
                  <th className="text-left px-3 py-2 text-gray-700 font-semibold">Khách hàng</th>
                  <th className="text-center px-3 py-2 text-gray-700 font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {URGENT_ORDERS.map((o, i) => (
                  <tr key={o.id} className="hover:bg-blue-50/30 cursor-pointer" style={{ backgroundColor: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}
                    onClick={() => navigate('/warehouse/fulfillment/orders')}>
                    <td className="px-3 py-2 font-semibold text-[11px]" style={{ color: PRIMARY }}>{o.id}</td>
                    <td className="px-3 py-2 text-gray-700 truncate max-w-[90px]">{o.customer}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-[10px] font-semibold text-white px-1.5 py-0.5 whitespace-nowrap inline-block" style={{ backgroundColor: STATUS_CFG[o.status]?.bg, borderRadius: 4 }}>
                        {STATUS_CFG[o.status]?.label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PO Waiting */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <PanelHeader title="PO chờ nhập kho" link="Xem tất cả" onLink={() => navigate('/warehouse/purchase/orders')} />
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-3 py-2 text-gray-700 font-semibold">Mã PO</th>
                  <th className="text-left px-3 py-2 text-gray-700 font-semibold">Nhà cung cấp</th>
                  <th className="text-center px-3 py-2 text-gray-700 font-semibold">Tiến độ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {RECENT_PO.map((po, i) => (
                  <tr key={po.id} className="hover:bg-blue-50/30 cursor-pointer" style={{ backgroundColor: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}
                    onClick={() => navigate('/warehouse/purchase/orders')}>
                    <td className="px-3 py-2 font-semibold text-[11px]" style={{ color: PRIMARY }}>{po.id}</td>
                    <td className="px-3 py-2 text-gray-700 truncate max-w-[90px] text-[11px]">{po.supplier}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center gap-1.5 justify-center">
                        <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${po.progress}%`, backgroundColor: po.progress === 100 ? SUCCESS : INFO }} />
                        </div>
                        <span className="font-mono text-[10px] text-gray-500">{po.progress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Low stock + alerts */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <PanelHeader title="Cảnh báo tồn kho" link="Xem tất cả" onLink={() => navigate('/warehouse/inventory/low-stock')} />
            <div className="p-3 space-y-2.5">
              {LOW_MATERIALS.map(m => (
                <div key={m.name} className="cursor-pointer hover:bg-gray-50 -mx-3 px-3 py-1 rounded" onClick={() => navigate('/warehouse/inventory/low-stock')}>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-medium text-gray-800">{m.name}</span>
                    <span className="font-semibold tabular-nums" style={{ color: m.pct < 50 ? ERROR : WARNING }}>{m.current.toLocaleString()} / {m.min.toLocaleString()} {m.unit}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${m.pct}%`, backgroundColor: m.pct < 50 ? ERROR : WARNING }} />
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{m.pct}% ngưỡng tối thiểu</p>
                </div>
              ))}
              <div className="pt-1 border-t border-gray-100">
                <button className="text-[11px] text-blue-600 hover:underline w-full text-left" onClick={() => navigate('/warehouse/inv-management/inventory-count')}>
                  Phiên kiểm kê đang mở: CS-2406-0012 →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Production + Transfer quick info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <PanelHeader title="Chuyển kho đang vận chuyển" link="Xem tất cả" onLink={() => navigate('/warehouse/transfer/stock-transfer')} />
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-3 py-2 text-gray-700 font-semibold">Mã lệnh</th>
                  <th className="text-left px-3 py-2 text-gray-700 font-semibold">Nguồn → Đích</th>
                  <th className="text-center px-3 py-2 text-gray-700 font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { id: 'TRF-2406-0044', route: 'Kho HCM → Đà Nẵng', status: 'dispatched' },
                  { id: 'TRF-2406-0043', route: 'Kho HN → Kho HCM',  status: 'arrived'   },
                ].map((t, i) => (
                  <tr key={t.id} className="hover:bg-blue-50/30 cursor-pointer" style={{ backgroundColor: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}
                    onClick={() => navigate('/warehouse/transfer/stock-transfer')}>
                    <td className="px-3 py-2 font-semibold" style={{ color: PRIMARY }}>{t.id}</td>
                    <td className="px-3 py-2 text-gray-700">{t.route}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-[10px] font-semibold text-white px-1.5 py-0.5 whitespace-nowrap inline-block"
                        style={{ backgroundColor: t.status === 'dispatched' ? PURPLE : WARNING, borderRadius: 4 }}>
                        {t.status === 'dispatched' ? 'Đang vận chuyển' : 'Đã đến nơi'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <PanelHeader title="Xuất NVL sản xuất gần đây" link="Xem tất cả" onLink={() => navigate('/warehouse/production/issue')} />
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-3 py-2 text-gray-700 font-semibold">Mã lệnh</th>
                  <th className="text-left px-3 py-2 text-gray-700 font-semibold">Nhà máy</th>
                  <th className="text-center px-3 py-2 text-gray-700 font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { id: 'PI-2406-0031', factory: 'Xưởng may A - Hà Đông', status: 'proof_pending'  },
                  { id: 'PI-2406-0030', factory: 'Xưởng may B - Thanh Trì',status: 'posted'         },
                ].map((p, i) => (
                  <tr key={p.id} className="hover:bg-blue-50/30 cursor-pointer" style={{ backgroundColor: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}
                    onClick={() => navigate('/warehouse/production/issue')}>
                    <td className="px-3 py-2 font-semibold" style={{ color: PRIMARY }}>{p.id}</td>
                    <td className="px-3 py-2 text-gray-700 truncate max-w-[140px]">{p.factory}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-[10px] font-semibold text-white px-1.5 py-0.5 whitespace-nowrap inline-block"
                        style={{ backgroundColor: p.status === 'posted' ? SUCCESS : WARNING, borderRadius: 4 }}>
                        {p.status === 'posted' ? 'Đã đăng sổ' : 'Chờ chứng từ'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
