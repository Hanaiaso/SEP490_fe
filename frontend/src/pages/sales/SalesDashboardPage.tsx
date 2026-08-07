import { useState, useEffect } from 'react';
import {
  ShoppingCart, TrendingUp, Truck, CheckCircle, AlertCircle,
  Clock, Eye, ChevronRight, Plus, RefreshCw, ArrowUp, ArrowDown,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { getSalesStaffDashboard } from '../../services/dashboardService.js';

// ─── Design tokens ────────────────────────────────────────────────────────────
const PRIMARY  = '#1F3B64';
const INFO     = '#2563EB';
const SUCCESS  = '#16A34A';
const WARNING  = '#F97316';
const ERROR    = '#DC2626';
const NEUTRAL  = '#64748B';

const ORDER_STATUS: Record<string, { label: string; bg: string }> = {
  New:       { label: 'Đơn mới',   bg: NEUTRAL },
  Received:  { label: 'Đã nhận',   bg: INFO },
  InTransit: { label: 'Đang giao', bg: WARNING },
  Delivered: { label: 'Đã giao',   bg: SUCCESS },
  Cancelled: { label: 'Đã hủy',    bg: ERROR },
  new:       { label: 'Đơn mới',   bg: NEUTRAL },
  confirmed: { label: 'Xác nhận',  bg: INFO },
  preparing: { label: 'Chuẩn bị',  bg: NEUTRAL },
  shipping:  { label: 'Đang giao', bg: NEUTRAL },
  delivered: { label: 'Đã giao',   bg: SUCCESS },
  cancelled: { label: 'Đã hủy',    bg: ERROR },
};

function StatusBadge({ label, bg }: { label: string; bg: string }) {
  return (
    <span
      className="inline-block px-2 text-white text-[11px] font-medium"
      style={{ backgroundColor: bg, borderRadius: 4, lineHeight: '22px', height: 22, whiteSpace: 'nowrap' }}
    >
      {label}
    </span>
  );
}

function PaymentBadge({ method }: { method: string }) {
  let bg = NEUTRAL;
  if (method === 'SePay') bg = INFO;
  else if (method === 'Cash') bg = SUCCESS;
  else if (method === 'COD') bg = WARNING;

  return (
    <span
      className="inline-block px-2 text-white text-[11px] font-medium"
      style={{ backgroundColor: bg, borderRadius: 4, lineHeight: '22px', height: 22 }}
    >
      {method}
    </span>
  );
}

function KpiRow({ label, value, sub, delta, up, icon }: {
  label: string; value: string; sub?: string; delta?: string; up?: boolean; icon: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-3.5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-[#6B7280] leading-none font-bold uppercase tracking-wider">{label}</span>
        <span className="text-[#9CA3AF]">{icon}</span>
      </div>
      <p className="text-[20px] font-extrabold text-[#374151] leading-none tabular-nums mt-1">{value}</p>
      {sub && <p className="text-[10px] text-[#9CA3AF] mt-2 font-medium">{sub}</p>}
      {delta && (
        <p className={`text-[10px] mt-2 flex items-center gap-0.5 font-bold ${up ? 'text-[#16A34A]' : 'text-[#DC2626]'}`}>
          {up ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
          {delta}
        </p>
      )}
    </div>
  );
}

function PanelHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-[#E5E7EB]">
      <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider">{title}</span>
      {action && (
        <button onClick={onAction} className="text-[11px] text-[#1F3B64] hover:underline flex items-center gap-0.5 font-semibold cursor-pointer">
          {action} <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

const tooltipStyle = { fontSize: 11, borderRadius: 4, border: '1px solid #E5E7EB', padding: '4px 8px', boxShadow: 'none' };

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('vi-VN').format(price);
};

const parseDate = (dateStr: string) => {
  if (!dateStr) return new Date();
  const hasTimezone = /([+-]\d{2}(:?\d{2})?|Z)$/.test(dateStr);
  return new Date(hasTimezone ? dateStr : dateStr + 'Z');
};

const formatTimeOrDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = parseDate(dateStr);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${hours}:${minutes} ${day}/${month}`;
};

export default function SalesDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchStats = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/orders/sales-dashboard', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        const now = new Date();
        setLastUpdated(`${now.toLocaleDateString('vi-VN', { weekday: 'long' })} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
      } else {
        setError('Không thể tải dữ liệu dashboard.');
      }
    } catch (err) {
      console.error(err);
      setError('Lỗi kết nối tới máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // KPI theo business.md §5 (Revenue/DeliverySuccess/ProcessingSpeed/ReturningCustomer) — fetch riêng,
  // độc lập với dashboard vận hành phía trên: nếu API mới lỗi/chậm thì không ảnh hưởng phần đã có sẵn.
  const [kpiSnapshot, setKpiSnapshot] = useState<any>(null);
  const [kpiLoading, setKpiLoading] = useState(true);

  useEffect(() => {
    getSalesStaffDashboard()
      .then(setKpiSnapshot)
      .catch(() => {})
      .finally(() => setKpiLoading(false));
  }, []);

  const last7DaysRevenue = stats?.last7DaysRevenue || [];
  const topProductsMock = stats?.topProducts || [];

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-[#F5F7FA]">
        <div className="bg-white border-b border-[#E5E7EB] px-5 h-11 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[#374151]">Dashboard bán hàng</span>
          <span className="text-[11px] text-[#9CA3AF]">Đang tải...</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="w-8 h-8 animate-spin text-[#1F3B64]" />
            <span className="text-xs text-slate-500 font-semibold">Đang tải dữ liệu dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full bg-[#F5F7FA]">
        <div className="bg-white border-b border-[#E5E7EB] px-5 h-11 flex items-center justify-between">
          <span className="text-[13px] font-semibold text-[#374151]">Dashboard bán hàng</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <span className="text-xs text-red-500 font-bold">{error}</span>
          <button 
            onClick={fetchStats}
            className="px-3 py-1 bg-[#1F3B64] text-white rounded text-xs font-semibold cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#F5F7FA' }}>
      {/* Toolbar */}
      <div className="bg-white border-b border-[#E5E7EB] px-5 h-11 flex items-center justify-between flex-shrink-0">
        <div>
          <span className="text-[13px] font-bold text-[#374151]">Dashboard bán hàng</span>
          <span className="text-[11px] text-[#9CA3AF] ml-3">Cập nhật lúc: {lastUpdated}</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={fetchStats}
            className="h-7 px-3 text-[12px] border border-[#D1D5DB] rounded text-[#374151] bg-white hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw className="w-3 h-3 text-[#9CA3AF]" /> Làm mới
          </button>
          <button
            onClick={() => navigate('/sales/direct-purchase')}
            className="h-7 px-3 text-[12px] rounded text-white flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition-opacity"
            style={{ backgroundColor: PRIMARY }}
          >
            <Plus className="w-3 h-3" /> Tạo đơn hàng POS
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {/* KPI hiệu suất cá nhân (30 ngày gần nhất) */}
        {!kpiLoading && kpiSnapshot?.kpi && (
          <div className="grid grid-cols-4 gap-2">
            <KpiRow
              label="Doanh thu (30 ngày)"
              value={formatPrice(kpiSnapshot.kpi.revenue) + ' đ'}
              sub={`${kpiSnapshot.kpi.completedOrderCount} đơn hoàn thành`}
              icon={<TrendingUp className="w-4 h-4" />}
            />
            <KpiRow
              label="Tỷ lệ giao thành công"
              value={`${Math.round((kpiSnapshot.kpi.deliverySuccessRate ?? 0) * 100)}%`}
              sub={`${kpiSnapshot.kpi.deliveryAttemptedOrderCount} lượt giao`}
              icon={<Truck className="w-4 h-4" />}
            />
            <KpiRow
              label="Tốc độ xử lý TB"
              value={kpiSnapshot.kpi.processingSpeedAvgHours != null ? `${kpiSnapshot.kpi.processingSpeedAvgHours.toFixed(1)}h` : '—'}
              sub="Từ lúc tạo đến xác nhận"
              icon={<Clock className="w-4 h-4" />}
            />
            <KpiRow
              label="Khách quay lại"
              value={`${Math.round((kpiSnapshot.kpi.returningCustomerRate ?? 0) * 100)}%`}
              sub={`${kpiSnapshot.kpi.customersInScopeCount} khách trong kỳ`}
              icon={<CheckCircle className="w-4 h-4" />}
            />
          </div>
        )}

        {/* KPI row */}
        <div className="grid grid-cols-6 gap-2">
          <KpiRow label="Đơn mới hôm nay"     value={String(stats?.kpi?.newOrdersCount ?? 0)}       sub="Cần xử lý ngay"          icon={<ShoppingCart className="w-4 h-4" />} />
          <KpiRow label="Đang xử lý"           value={String(stats?.kpi?.processingOrdersCount ?? 0)}      sub="Awaiting action"                                      icon={<Clock className="w-4 h-4" />} />
          <KpiRow label="Đang vận chuyển"      value={String(stats?.kpi?.shippingOrdersCount ?? 0)}      sub="Dự kiến giao hôm nay"                                           icon={<Truck className="w-4 h-4" />} />
          <KpiRow label="Đã giao hôm nay"      value={String(stats?.kpi?.deliveredTodayCount ?? 0)}      sub="Thành công"              icon={<CheckCircle className="w-4 h-4" />} />
          <KpiRow label="Doanh thu hôm nay"    value={formatPrice(stats?.kpi?.revenueToday ?? 0) + ' đ'} sub="Hôm nay"           icon={<TrendingUp className="w-4 h-4" />} />
          <KpiRow label="Công nợ cần thu"      value={formatPrice(stats?.kpi?.pendingDebt ?? 0) + ' đ'} sub="Unpaid orders"          icon={<AlertCircle className="w-4 h-4" />} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-5 gap-3">
          <div className="col-span-3 bg-white border border-[#E5E7EB] rounded-lg shadow-sm">
            <PanelHeader title="Doanh thu 7 ngày qua (triệu đồng)" />
            <div className="p-3">
              <div className="flex items-center gap-4 mb-2 text-[11px] text-[#6B7280]">
                <span className="flex items-center gap-1.5"><span className="w-3 h-[2px] inline-block" style={{ background: PRIMARY }} /> Thực tế</span>
                <span className="flex items-center gap-1.5"><span className="w-3 inline-block" style={{ borderTop: '2px dashed #D1D5DB' }} /> Mục tiêu</span>
              </div>
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={last7DaysRevenue} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor={PRIMARY} stopOpacity={0.1} />
                      <stop offset="100%" stopColor={PRIMARY} stopOpacity={0}   />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={tooltipStyle} 
                    formatter={(v: any) => [`${v} tr đ (${formatPrice(v * 1_000_000)} đ)`, "Doanh thu"]} 
                  />
                  <Area type="monotone" dataKey="revenue" name="Thực tế" stroke={PRIMARY} strokeWidth={1.5} fill="url(#revFill)" dot={{ r: 2.5, fill: PRIMARY, strokeWidth: 0 }} />
                  <Area type="monotone" dataKey="target"  name="Mục tiêu" stroke="#D1D5DB" strokeWidth={1} strokeDasharray="4 3" fill="none" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="col-span-2 bg-white border border-[#E5E7EB] rounded-lg shadow-sm">
            <PanelHeader title="Top sản phẩm (triệu đồng)" />
            <div className="p-3">
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={topProductsMock} layout="vertical" margin={{ top: 0, right: 28, left: 0, bottom: 0 }} barSize={9}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10, fill: '#374151' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: unknown) => [`${v} tr đ`]} />
                  <Bar dataKey="revenue" fill={PRIMARY} radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Operational widgets */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm">
            <PanelHeader title="Đơn cần xử lý gấp" />
            <div className="divide-y divide-[#F3F4F6] max-h-56 overflow-y-auto">
              {(stats?.urgentOrders || []).length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">Không có đơn hàng khẩn cấp.</div>
              ) : (
                (stats.urgentOrders || []).map((o: any) => (
                  <div key={o.id} className="flex items-stretch">
                    <div className="w-[3px] flex-shrink-0 self-stretch" style={{ backgroundColor: o.level === 'critical' ? ERROR : o.level === 'high' ? WARNING : '#D1D5DB' }} />
                    <div className="flex-1 px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold" style={{ color: PRIMARY }}>{o.id}</span>
                        <span className="text-[10px] text-[#9CA3AF] flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />{o.deadline}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#6B7280] mt-0.5 truncate">{o.customer}</p>
                      <p className="text-[11px] font-bold text-[#374151] mt-0.5 tabular-nums">{formatPrice(o.amount)} ₫</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm">
            <PanelHeader title="Chờ xác nhận kho" />
            <div className="divide-y divide-[#F3F4F6] max-h-56 overflow-y-auto">
              {(stats?.warehouseQueue || []).length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">Không có đơn hàng chờ kho.</div>
              ) : (
                (stats.warehouseQueue || []).map((o: any) => (
                  <div key={o.id} className="px-3 py-2 flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold truncate" style={{ color: PRIMARY }}>{o.id}</p>
                      <p className="text-[11px] text-[#6B7280] truncate max-w-[160px]">{o.customer}</p>
                      <p className="text-[10px] text-[#9CA3AF] mt-0.5">{o.itemsCount} sản phẩm</p>
                    </div>
                    <StatusBadge label={o.status} bg={o.status === 'Chờ xác nhận' ? NEUTRAL : INFO} />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm">
            <PanelHeader title="Yêu cầu báo giá mới" action="Xem báo giá" onAction={() => navigate('/sales/negotiation')} />
            <div className="divide-y divide-[#F3F4F6] max-h-56 overflow-y-auto">
              {(stats?.quoteRequests || []).length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">Không có yêu cầu báo giá mới.</div>
              ) : (
                (stats.quoteRequests || []).map((q: any) => (
                  <div key={q.id} className="px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold truncate max-w-[110px]" style={{ color: PRIMARY }} title={q.id}>{q.id.slice(0, 8)}...</span>
                      <span className="text-[10px] text-[#9CA3AF]">{formatTimeOrDate(q.requestDate)}</span>
                    </div>
                    <p className="text-[11px] text-[#374151] mt-0.5 truncate">{q.customerName}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[11px] font-bold text-[#374151] tabular-nums">{formatPrice(q.value)} ₫</span>
                      <button
                        className="text-[11px] px-2 h-6 border border-[#D1D5DB] rounded bg-white text-[#374151] hover:bg-gray-50 cursor-pointer font-semibold"
                        onClick={() => navigate('/sales/negotiation')}
                      >
                        Xem
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent orders table */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm">
          <PanelHeader title="Đơn hàng gần đây — 10 đơn mới nhất" />
          <div className="flex items-center justify-end px-3 pt-3">
            <button
              onClick={() => navigate('/sales/orders')}
              className="text-[11px] font-semibold text-[#1F3B64] hover:underline"
            >
              Xem tat ca
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  {['Mã đơn', 'Khách hàng', 'Giờ đặt', 'Tổng tiền (₫)', 'Thanh toán', 'Trạng thái', ''].map(h => (
                    <th 
                      key={h} 
                      className={`px-3 py-2 text-[11px] font-bold text-[#6B7280] whitespace-nowrap uppercase tracking-wider ${h === 'Tổng tiền (₫)' ? 'text-right' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(stats?.recentOrders || []).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-xs text-slate-400">Không có đơn hàng nào gần đây.</td>
                  </tr>
                ) : (
                  (stats.recentOrders || []).map((o: any, i: number) => (
                    <tr
                      key={o.id}
                      style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}
                      className="hover:bg-blue-50/30 transition-colors"
                    >
                      <td className="px-3 py-2 font-bold whitespace-nowrap" style={{ color: PRIMARY }}>{o.orderCode}</td>
                      <td className="px-3 py-2 text-[#374151] max-w-[180px] truncate">{o.customerName}</td>
                      <td className="px-3 py-2 text-[#6B7280] whitespace-nowrap tabular-nums">{formatTimeOrDate(o.createdAt)}</td>
                      <td className="px-3 py-2 text-right font-bold text-[#374151] whitespace-nowrap tabular-nums">{formatPrice(o.finalPayment)}</td>
                      <td className="px-3 py-2"><PaymentBadge method={o.paymentMethod} /></td>
                      <td className="px-3 py-2">
                        <StatusBadge label={ORDER_STATUS[o.orderStatus]?.label || o.orderStatus} bg={ORDER_STATUS[o.orderStatus]?.bg || NEUTRAL} />
                      </td>
                      <td className="px-3 py-2 text-center">
                        {o.invoicePdfUrl ? (
                          <a 
                            href={`/api${o.invoicePdfUrl}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-[#9CA3AF] hover:text-[#1F3B64] transition-colors inline-block"
                            title="Xem hóa đơn PDF"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-slate-200" title="Không có PDF">
                            <Eye className="w-3.5 h-3.5 opacity-30" />
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
