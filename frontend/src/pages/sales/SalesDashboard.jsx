import {
  ShoppingCart, TrendingUp, Truck, CheckCircle, AlertCircle,
  Clock, Eye, ChevronRight, Plus, RefreshCw, ArrowUp, ArrowDown,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header.jsx';
import Footer from '../../components/Footer.jsx';

// ─── Design tokens ────────────────────────────────────────────────────────────
const PRIMARY    = '#1F3B64';
const INFO       = '#2563EB';
const SUCCESS    = '#16A34A';
const WARNING    = '#F97316';
const ERROR      = '#DC2626';
const NEUTRAL    = '#64748B';

// ─── Static data ──────────────────────────────────────────────────────────────
const revenueData = [
  { day: 'T2', revenue: 42, target: 80 },
  { day: 'T3', revenue: 68, target: 80 },
  { day: 'T4', revenue: 53, target: 80 },
  { day: 'T5', revenue: 91, target: 80 },
  { day: 'T6', revenue: 74, target: 80 },
  { day: 'T7', revenue: 38, target: 40 },
  { day: 'CN', revenue: 22, target: 40 },
];

const productData = [
  { name: 'Vải cotton cao cấp', revenue: 84 },
  { name: 'Sơ mi nam công sở', revenue: 71 },
  { name: 'Quần tây nam', revenue: 63 },
  { name: 'Vải linen nhập khẩu', revenue: 55 },
  { name: 'Đồng phục văn phòng', revenue: 48 },
];

const urgentOrders = [
  { id: 'DH-2406-087', customer: 'Cty TNHH Thời Trang Hà Nội', amount: '12.400.000', deadline: '30 phút nữa', level: 'critical' },
  { id: 'DH-2406-084', customer: 'Siêu thị May Mặc Sài Gòn',  amount: '8.750.000',  deadline: '2 giờ nữa',   level: 'high' },
  { id: 'DH-2406-079', customer: 'Cửa hàng Quần Áo Đại Việt', amount: '5.200.000',  deadline: '4 giờ nữa',   level: 'normal' },
];

const warehouseQueue = [
  { id: 'DH-2406-082', customer: 'Hồng Phúc Fashion',       items: 14, status: 'Chờ xác nhận' },
  { id: 'DH-2406-081', customer: 'Đại lý Vải Minh Khai',    items: 8,  status: 'Đang đóng gói' },
  { id: 'DH-2406-078', customer: 'Shop Thời Trang Quỳnh',   items: 22, status: 'Chờ xác nhận' },
];

const quoteRequests = [
  { id: 'BG-2406-019', customer: 'Tập đoàn Dệt May Phú Cường', value: '145.000.000', time: '15 phút trước' },
  { id: 'BG-2406-018', customer: 'Xưởng May Đức Thắng',         value: '112.000.000', time: '2 giờ trước'   },
];

const recentOrders = [
  { id: 'DH-2406-092', customer: 'Cty Thời Trang Minh Anh',    date: '09:42', amount: '18.500.000', status: 'new',       payment: 'SePay' },
  { id: 'DH-2406-091', customer: 'Shop Vải Lan Anh',            date: '09:21', amount: '4.200.000',  status: 'confirmed', payment: 'COD'   },
  { id: 'DH-2406-090', customer: 'May Mặc Tân Phú',             date: '08:57', amount: '9.800.000',  status: 'preparing', payment: 'SePay' },
  { id: 'DH-2406-089', customer: 'Cửa hàng Đức Thịnh',         date: '08:33', amount: '6.300.000',  status: 'shipping',  payment: 'COD'   },
  { id: 'DH-2406-088', customer: 'Hợp tác xã Dệt Hà Đông',     date: '08:15', amount: '27.600.000', status: 'delivered', payment: 'SePay' },
  { id: 'DH-2406-087', customer: 'Cty TNHH Thời Trang HN',     date: '07:48', amount: '12.400.000', status: 'new',       payment: 'COD'   },
  { id: 'DH-2406-086', customer: 'Xưởng Thêu Hoa Hồng',        date: '07:22', amount: '3.750.000',  status: 'confirmed', payment: 'SePay' },
  { id: 'DH-2406-085', customer: 'Đại lý Vải Thắng Lợi',       date: '06:55', amount: '8.900.000',  status: 'preparing', payment: 'COD'   },
  { id: 'DH-2406-084', customer: 'Siêu thị May Mặc Sài Gòn',   date: '06:31', amount: '8.750.000',  status: 'shipping',  payment: 'SePay' },
  { id: 'DH-2406-083', customer: 'Cửa hàng Quần Áo Hưng',      date: '05:44', amount: '2.100.000',  status: 'delivered', payment: 'COD'   },
];

// ─── Status config — only 5 allowed colors ────────────────────────────────────
const ORDER_STATUS = {
  new:       { label: 'Đơn mới',         bg: NEUTRAL  },
  confirmed: { label: 'Xác nhận',        bg: INFO     },
  preparing: { label: 'Chuẩn bị',        bg: NEUTRAL  },
  shipping:  { label: 'Đang giao',       bg: NEUTRAL  },
  delivered: { label: 'Đã giao',         bg: SUCCESS  },
  cancelled: { label: 'Đã hủy',          bg: ERROR    },
};

const WH_STATUS = {
  'Chờ xác nhận': NEUTRAL,
  'Đang đóng gói': INFO,
};

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ label, bg }) {
  return (
    <span
      className="inline-block px-2 text-white text-[11px] font-medium"
      style={{ backgroundColor: bg, borderRadius: 4, lineHeight: '22px', height: 22, whiteSpace: 'nowrap' }}
    >
      {label}
    </span>
  );
}

function PaymentBadge({ method }) {
  return (
    <span
      className="inline-block px-2 text-white text-[11px] font-medium"
      style={{ backgroundColor: method === 'SePay' ? INFO : WARNING, borderRadius: 4, lineHeight: '22px', height: 22 }}
    >
      {method}
    </span>
  );
}

function KpiRow({ label, value, sub, delta, up, icon }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-3.5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-[#6B7280] leading-none">{label}</span>
        <span className="text-[#9CA3AF]">{icon}</span>
      </div>
      <p className="text-[22px] font-bold text-[#374151] leading-none tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-[#9CA3AF] mt-1.5">{sub}</p>}
      {delta && (
        <p className={`text-[11px] mt-1.5 flex items-center gap-0.5 font-medium ${up ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
          {up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          {delta}
        </p>
      )}
    </div>
  );
}

function PanelHeader({ title, action, onAction }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-[#E5E7EB] bg-gray-50/50 rounded-t-lg">
      <span className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">{title}</span>
      {action && (
        <button onClick={onAction} className="text-[11px] text-[#1F3B64] hover:underline flex items-center gap-0.5">
          {action} <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

// ─── Chart tooltip style ──────────────────────────────────────────────────────
const tooltipStyle = { fontSize: 11, borderRadius: 4, border: '1px solid #E5E7EB', padding: '4px 8px', boxShadow: 'none' };

// ─── Main component ───────────────────────────────────────────────────────────
export default function SalesDashboard() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <div className="flex-1 pt-16">
        <div className="flex flex-col h-full" style={{ background: '#F5F7FA' }}>
          {/* ── Toolbar ── */}
          <div className="bg-white border-b border-[#E5E7EB] px-5 h-14 flex items-center justify-between flex-shrink-0 shadow-sm z-10">
            <div>
              <span className="text-sm font-bold text-[#1F3B64]">Dashboard Bán Hàng</span>
              <span className="text-xs text-[#9CA3AF] ml-3 hidden sm:inline-block">Cập nhật lúc 09:45</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="h-8 px-3 text-xs border border-[#D1D5DB] rounded text-[#374151] bg-white hover:bg-gray-50 flex items-center gap-1.5 shadow-sm transition-colors">
                <RefreshCw className="w-3.5 h-3.5 text-[#6B7280]" /> Làm mới
              </button>
              <button
                className="h-8 px-4 text-xs font-medium rounded text-white flex items-center gap-1.5 shadow-sm hover:opacity-90 transition-opacity"
                style={{ backgroundColor: PRIMARY }}
                onClick={() => alert('Tạo đơn hàng')}
              >
                <Plus className="w-3.5 h-3.5" /> Tạo đơn hàng
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 sm:p-6 space-y-4 max-w-[1600px] mx-auto w-full">

            {/* ── KPI row ── */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              <KpiRow label="Đơn mới hôm nay"     value="7"      sub="Cần xử lý ngay"         delta="+2 vs hôm qua"   up={true}  icon={<ShoppingCart className="w-4 h-4" />} />
              <KpiRow label="Đang xử lý"           value="23"     sub="14 chuẩn bị · 9 xác nhận"                                  icon={<Clock className="w-4 h-4" />} />
              <KpiRow label="Đang vận chuyển"      value="18"     sub="Dự kiến giao hôm nay"                                      icon={<Truck className="w-4 h-4" />} />
              <KpiRow label="Đã giao hôm nay"      value="31"     sub="Tỷ lệ thành công 96,9%"  delta="+5 vs hôm qua"   up={true}  icon={<CheckCircle className="w-4 h-4" />} />
              <KpiRow label="Doanh thu hôm nay"    value="74,2 tr" sub="Mục tiêu 120 tr"         delta="+12% vs hôm qua" up={true}  icon={<TrendingUp className="w-4 h-4" />} />
              <KpiRow label="Công nợ cần thu"      value="248,5 tr" sub="12 KH · 3 quá hạn"      delta="-8,2 tr vs hôm qua" up={false} icon={<AlertCircle className="w-4 h-4" />} />
            </div>

            {/* ── Charts ── */}
            <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">

              {/* Revenue vs target */}
              <div className="xl:col-span-3 bg-white border border-[#E5E7EB] rounded-lg shadow-sm">
                <PanelHeader title="Doanh thu 7 ngày (triệu đồng)" />
                <div className="p-4">
                  <div className="flex items-center gap-4 mb-4 text-xs text-[#6B7280]">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-[2px] inline-block" style={{ background: PRIMARY }} /> Thực tế</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-[2px] inline-block bg-[#D1D5DB]" style={{ borderTop: '2px dashed #D1D5DB' }} /> Mục tiêu</span>
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                      <defs>
                        <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"   stopColor={PRIMARY} stopOpacity={0.15} />
                          <stop offset="100%" stopColor={PRIMARY} stopOpacity={0}   />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v, n) => [`${v} tr đ`, n === 'revenue' ? 'Thực tế' : 'Mục tiêu']} />
                      <Area type="monotone" dataKey="revenue" name="Thực tế" stroke={PRIMARY} strokeWidth={2} fill="url(#revFill)" dot={{ r: 3, fill: PRIMARY, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                      <Area type="monotone" dataKey="target"  name="Mục tiêu" stroke="#D1D5DB" strokeWidth={1.5} strokeDasharray="4 4" fill="none" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top products */}
              <div className="xl:col-span-2 bg-white border border-[#E5E7EB] rounded-lg shadow-sm">
                <PanelHeader title="Top sản phẩm (triệu đồng)" />
                <div className="p-4 pt-8">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={productData} layout="vertical" margin={{ top: 0, right: 28, left: 0, bottom: 0 }} barSize={12}>
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: '#374151' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} tr đ`]} cursor={{ fill: '#F3F4F6' }} />
                      <Bar dataKey="revenue" fill={PRIMARY} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ── Operational widgets ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

              {/* Urgent orders */}
              <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm overflow-hidden">
                <PanelHeader title="Đơn cần xử lý gấp" action="Xem đơn hàng" onAction={() => alert('Xem đơn hàng')} />
                <div className="divide-y divide-[#F3F4F6]">
                  {urgentOrders.map(o => (
                    <div key={o.id} className="flex items-stretch hover:bg-gray-50 transition-colors">
                      <div className="w-1 flex-shrink-0 self-stretch" style={{ backgroundColor: o.level === 'critical' ? ERROR : o.level === 'high' ? WARNING : '#D1D5DB' }} />
                      <div className="flex-1 p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold" style={{ color: PRIMARY }}>{o.id}</span>
                          <span className="text-[11px] text-[#6B7280] flex items-center gap-1 font-medium bg-red-50 text-red-700 px-1.5 py-0.5 rounded">
                            <Clock className="w-3 h-3" />{o.deadline}
                          </span>
                        </div>
                        <p className="text-xs text-[#4B5563] mt-1.5 truncate">{o.customer}</p>
                        <p className="text-xs font-semibold text-[#111827] mt-1 tabular-nums">{o.amount}₫</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Warehouse queue */}
              <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm overflow-hidden">
                <PanelHeader title="Chờ xác nhận kho" action="Xem kho" onAction={() => alert('Xem kho')} />
                <div className="divide-y divide-[#F3F4F6]">
                  {warehouseQueue.map(o => (
                    <div key={o.id} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold truncate" style={{ color: PRIMARY }}>{o.id}</p>
                        <p className="text-xs text-[#4B5563] truncate mt-1">{o.customer}</p>
                        <p className="text-[11px] text-[#6B7280] mt-1 font-medium">{o.items} sản phẩm</p>
                      </div>
                      <StatusBadge label={o.status} bg={WH_STATUS[o.status] ?? NEUTRAL} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Quote requests */}
              <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm overflow-hidden">
                <PanelHeader title="Yêu cầu báo giá mới" action="Xem báo giá" onAction={() => navigate('/negotiation')} />
                <div className="divide-y divide-[#F3F4F6]">
                  {quoteRequests.map(q => (
                    <div key={q.id} className="p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold" style={{ color: PRIMARY }}>{q.id}</span>
                        <span className="text-[10px] text-[#6B7280] bg-gray-100 px-1.5 py-0.5 rounded">{q.time}</span>
                      </div>
                      <p className="text-xs text-[#4B5563] mt-1.5 truncate">{q.customer}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-bold text-[#111827] tabular-nums">{q.value}₫</span>
                        <button
                          className="text-[11px] font-medium px-3 h-7 border border-[#D1D5DB] rounded bg-white text-[#374151] hover:bg-gray-100 hover:text-[#1F3B64] transition-colors shadow-sm"
                          onClick={() => navigate('/negotiation')}
                        >
                          Xem
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Recent orders table ── */}
            <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm overflow-hidden">
              <PanelHeader title="Đơn hàng gần đây — 10 đơn" action="Tất cả đơn hàng" onAction={() => alert('Tất cả đơn hàng')} />
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                      {['Mã đơn', 'Khách hàng', 'Giờ đặt', 'Tổng tiền (₫)', 'Thanh toán', 'Trạng thái', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((o, i) => (
                      <tr
                        key={o.id}
                        style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}
                        className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3 font-bold whitespace-nowrap" style={{ color: PRIMARY }}>{o.id}</td>
                        <td className="px-4 py-3 font-medium text-[#374151] max-w-[200px] truncate">{o.customer}</td>
                        <td className="px-4 py-3 text-[#6B7280] whitespace-nowrap tabular-nums">{o.date}</td>
                        <td className="px-4 py-3 text-right font-bold text-[#111827] whitespace-nowrap tabular-nums">{o.amount}</td>
                        <td className="px-4 py-3"><PaymentBadge method={o.payment} /></td>
                        <td className="px-4 py-3">
                          <StatusBadge label={ORDER_STATUS[o.status].label} bg={ORDER_STATUS[o.status].bg} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button className="text-[#9CA3AF] group-hover:text-[#1F3B64] transition-colors p-1.5 rounded hover:bg-blue-100">
                            <Eye className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
