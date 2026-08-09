import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, AlertCircle, TrendingDown, CheckCircle,
  ArrowDownToLine, ArrowRightLeft, ClipboardCheck, FlaskConical, Truck,
  PackageCheck, ShieldCheck, Loader2,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { getWarehouseStaffDashboard } from '../../services/dashboardService.js';
import { getErrorMessage } from '../../lib/errors';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#D97706';
const ERROR   = '#DC2626';
const INFO    = '#2563EB';
const NEUTRAL = '#64748B';
const PURPLE  = '#7C3AED';

const tooltipStyle = { fontSize: 12, borderRadius: 6, border: '1px solid #E5E7EB', boxShadow: 'none' };

// ─── Types khớp WarehouseDashboardDto (backend) ────────────────────────────
interface WarehouseSummary { id: string; name: string; code: string }
interface OutboundKpi { pendingOrders: number; pickingInProgress: number; consolidationArea: number; completedToday: number }
interface InboundKpi { pendingPurchaseOrders: number; receiptsInProgress: number; qualityCheckPending: number; returnQuarantinePending: number }
interface InventoryKpi { lowStockCount: number; slowMovingCount: number; transfersInTransit: number; activeWarehouses: number }
interface DailyVolume { date: string; outbound: number; inbound: number }
interface StockHealthItem { name: string; onHand: number; threshold: number; unit: string }
interface RecentPickTask { id: string; orderCode: string; customerName: string; status: string }
interface PendingPo { id: string; code: string; supplierName: string; status: string; progressPercent: number }
interface LowStockItem { name: string; onHand: number; threshold: number; unit: string }
interface InTransitTransfer { id: string; code: string; sourceWarehouse: string; destinationWarehouse: string; status: string }
interface RecentMaterialIssue { id: string; code: string; recipient: string; status: string }

interface WarehouseDashboard {
  generatedAt: string;
  warehouses: WarehouseSummary[];
  outbound: OutboundKpi;
  inbound: InboundKpi;
  inventoryOps: InventoryKpi;
  weeklyVolume: DailyVolume[];
  stockHealth: StockHealthItem[];
  recentPickTasks: RecentPickTask[];
  pendingPurchaseOrders: PendingPo[];
  lowStockAlerts: LowStockItem[];
  inTransitTransfers: InTransitTransfer[];
  recentMaterialIssues: RecentMaterialIssue[];
}

function statusColor(label: string): string {
  if (/hoàn tất|đã đăng sổ|đã xếp xe/i.test(label)) return SUCCESS;
  if (/đang/i.test(label)) return INFO;
  if (/ngoại lệ|lỗi/i.test(label)) return ERROR;
  return WARNING;
}

function formatDayLabel(iso: string): string {
  const d = new Date(iso);
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  return days[d.getDay()];
}

interface KpiCardProps {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string; onClick?: () => void;
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

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-4 text-center text-[11px] text-gray-400">Không có dữ liệu</td>
    </tr>
  );
}

export default function WarehouseDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<WarehouseDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const result = await getWarehouseStaffDashboard();
        if (!cancelled) setData(result);
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, 'Không thể tải dashboard kho hàng'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: '#F5F7FA' }}>
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: '#F5F7FA' }}>
        <p className="text-sm text-red-600">{error || 'Không thể tải dashboard kho hàng'}</p>
      </div>
    );
  }

  const generatedAtLabel = new Date(data.generatedAt).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ background: '#F5F7FA' }}>
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-0.5">
          <span className="text-gray-400">Kho hàng</span>
          <span className="text-gray-300">/</span>
          <span className="text-gray-800 font-semibold">Dashboard</span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-gray-900">Dashboard Kho hàng</h2>
            <p className="text-xs text-gray-500 mt-0.5">Cập nhật lúc {generatedAtLabel}</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
            {data.warehouses.map((w) => (
              <span key={w.id} className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full inline-block bg-blue-500" /> {w.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-3 overflow-auto">

        {/* Outbound KPIs */}
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2 px-0.5">Xuất kho (Outbound)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 4xl:grid-cols-6 gap-3">
            <KpiCard label="Lệnh xuất chờ xử lý" value={data.outbound.pendingOrders}    sub="cần xử lý hôm nay"    icon={<Package className="w-4 h-4" />}      color={WARNING} onClick={() => navigate('/warehouse/fulfillment/orders')} />
            <KpiCard label="Đang Pick & Pack"     value={data.outbound.pickingInProgress} sub="đang thực hiện"       icon={<PackageCheck className="w-4 h-4" />} color={INFO}    onClick={() => navigate('/warehouse/fulfillment/pick-packing')} />
            <KpiCard label="Khu tập kết"          value={data.outbound.consolidationArea} sub="chờ bàn giao Sales"   icon={<Truck className="w-4 h-4" />}        color={PURPLE}  onClick={() => navigate('/warehouse/fulfillment/consolidation')} />
            <KpiCard label="Hoàn tất hôm nay"     value={data.outbound.completedToday}    sub="pick task hoàn tất"   icon={<CheckCircle className="w-4 h-4" />}  color={SUCCESS} onClick={() => navigate('/warehouse/fulfillment/orders')} />
          </div>
        </div>

        {/* Inbound KPIs */}
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2 px-0.5">Nhập kho (Inbound)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 4xl:grid-cols-6 gap-3">
            <KpiCard label="PO chờ nhập kho"       value={data.inbound.pendingPurchaseOrders}   sub="đã phát hành"        icon={<ArrowDownToLine className="w-4 h-4" />} color={INFO}    onClick={() => navigate('/warehouse/purchase/orders')} />
            <KpiCard label="Phiếu nhập đang xử lý" value={data.inbound.receiptsInProgress}       sub="đang nhập hàng"      icon={<ArrowDownToLine className="w-4 h-4" />} color={WARNING} onClick={() => navigate('/warehouse/purchase/goods-receipt')} />
            <KpiCard label="Cần kiểm tra CL"       value={data.inbound.qualityCheckPending}      sub="hàng nhập lỗi"       icon={<FlaskConical className="w-4 h-4" />}    color={ERROR}   onClick={() => navigate('/warehouse/purchase/quality-inspection')} />
            <KpiCard label="Cách ly (Quarantine)"  value={data.inbound.returnQuarantinePending}  sub="hàng khách trả"      icon={<ShieldCheck className="w-4 h-4" />}     color={WARNING} onClick={() => navigate('/warehouse/inv-management/quarantine')} />
          </div>
        </div>

        {/* Inventory KPIs */}
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2 px-0.5">Tồn kho & Vận hành</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 4xl:grid-cols-6 gap-3">
            <KpiCard label="Sản phẩm sắp hết"       value={data.inventoryOps.lowStockCount}      sub="dưới ngưỡng tối thiểu" icon={<AlertCircle className="w-4 h-4" />}    color={ERROR}   onClick={() => navigate('/warehouse/inventory/low-stock')} />
            <KpiCard label="Hàng chậm luân chuyển"  value={data.inventoryOps.slowMovingCount}    sub="trên 2 tuần"           icon={<TrendingDown className="w-4 h-4" />}   color={NEUTRAL} onClick={() => navigate('/warehouse/inventory/slow-moving')} />
            <KpiCard label="Lệnh chuyển kho"        value={data.inventoryOps.transfersInTransit} sub="đang vận chuyển"       icon={<ArrowRightLeft className="w-4 h-4" />} color={INFO}    onClick={() => navigate('/warehouse/transfer/stock-transfer')} />
            <KpiCard label="Kho đang hoạt động"     value={data.inventoryOps.activeWarehouses}   sub="tổng số kho"           icon={<ClipboardCheck className="w-4 h-4" />} color={PURPLE}  onClick={() => navigate('/warehouse/inv-management/inventory-count')} />
          </div>
        </div>

        {/* Charts + panels row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Inbound/Outbound chart */}
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <PanelHeader title="Xuất / Nhập kho 7 ngày" />
            <div className="p-3">
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={data.weeklyVolume.map((d) => ({ ...d, day: formatDayLabel(d.date) }))} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={10}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v}`]} />
                  <Bar dataKey="outbound" name="Xuất kho" fill={PRIMARY} radius={[2, 2, 0, 0]} />
                  <Bar dataKey="inbound" name="Nhập kho" fill="#D1D5DB" radius={[2, 2, 0, 0]} />
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
            <PanelHeader title="Sản phẩm cần chú ý" link="Chi tiết" onLink={() => navigate('/warehouse/inventory/report')} />
            <div className="p-3 space-y-2.5">
              {data.stockHealth.length === 0 && <p className="text-[11px] text-gray-400 text-center py-2">Không có sản phẩm dưới ngưỡng</p>}
              {data.stockHealth.map((s) => {
                const pct = s.threshold > 0 ? Math.round((s.onHand / s.threshold) * 100) : 0;
                return (
                  <div key={s.name}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-medium text-red-600">{s.name}</span>
                      <span className="tabular-nums text-red-500 font-semibold">{s.onHand.toLocaleString()} {s.unit}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: ERROR }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Fulfillment orders */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <PanelHeader title="Lệnh xuất kho gần đây" link="Xem tất cả" onLink={() => navigate('/warehouse/fulfillment/orders')} />
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-3 py-2 text-gray-700 font-semibold">Mã đơn</th>
                  <th className="text-left px-3 py-2 text-gray-700 font-semibold">Khách hàng</th>
                  <th className="text-center px-3 py-2 text-gray-700 font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.recentPickTasks.length === 0 && <EmptyRow colSpan={3} />}
                {data.recentPickTasks.map((o, i) => (
                  <tr key={o.id} className="hover:bg-blue-50/30 cursor-pointer" style={{ backgroundColor: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}
                    onClick={() => navigate('/warehouse/fulfillment/orders')}>
                    <td className="px-3 py-2 font-semibold text-[11px]" style={{ color: PRIMARY }}>{o.orderCode}</td>
                    <td className="px-3 py-2 text-gray-700 truncate max-w-[90px]">{o.customerName}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-[10px] font-semibold text-white px-1.5 py-0.5 whitespace-nowrap inline-block" style={{ backgroundColor: statusColor(o.status), borderRadius: 4 }}>
                        {o.status}
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
                {data.pendingPurchaseOrders.length === 0 && <EmptyRow colSpan={3} />}
                {data.pendingPurchaseOrders.map((po, i) => (
                  <tr key={po.id} className="hover:bg-blue-50/30 cursor-pointer" style={{ backgroundColor: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}
                    onClick={() => navigate('/warehouse/purchase/orders')}>
                    <td className="px-3 py-2 font-semibold text-[11px]" style={{ color: PRIMARY }}>{po.code}</td>
                    <td className="px-3 py-2 text-gray-700 truncate max-w-[90px] text-[11px]">{po.supplierName}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center gap-1.5 justify-center">
                        <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${po.progressPercent}%`, backgroundColor: po.progressPercent >= 100 ? SUCCESS : INFO }} />
                        </div>
                        <span className="font-mono text-[10px] text-gray-500">{po.progressPercent}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Low stock alerts */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <PanelHeader title="Cảnh báo tồn kho" link="Xem tất cả" onLink={() => navigate('/warehouse/inventory/low-stock')} />
            <div className="p-3 space-y-2.5">
              {data.lowStockAlerts.length === 0 && <p className="text-[11px] text-gray-400 text-center py-2">Không có cảnh báo</p>}
              {data.lowStockAlerts.map((m) => {
                const pct = m.threshold > 0 ? Math.round((m.onHand / m.threshold) * 100) : 0;
                return (
                  <div key={m.name} className="cursor-pointer hover:bg-gray-50 -mx-3 px-3 py-1 rounded" onClick={() => navigate('/warehouse/inventory/low-stock')}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-medium text-gray-800">{m.name}</span>
                      <span className="font-semibold tabular-nums" style={{ color: pct < 50 ? ERROR : WARNING }}>{m.onHand.toLocaleString()} / {m.threshold.toLocaleString()} {m.unit}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct < 50 ? ERROR : WARNING }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{pct}% ngưỡng tối thiểu</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Production + Transfer quick info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                {data.inTransitTransfers.length === 0 && <EmptyRow colSpan={3} />}
                {data.inTransitTransfers.map((t, i) => (
                  <tr key={t.id} className="hover:bg-blue-50/30 cursor-pointer" style={{ backgroundColor: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}
                    onClick={() => navigate('/warehouse/transfer/stock-transfer')}>
                    <td className="px-3 py-2 font-semibold" style={{ color: PRIMARY }}>{t.code}</td>
                    <td className="px-3 py-2 text-gray-700">{t.sourceWarehouse} → {t.destinationWarehouse}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-[10px] font-semibold text-white px-1.5 py-0.5 whitespace-nowrap inline-block"
                        style={{ backgroundColor: statusColor(t.status), borderRadius: 4 }}>
                        {t.status}
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
                  <th className="text-left px-3 py-2 text-gray-700 font-semibold">Nơi nhận</th>
                  <th className="text-center px-3 py-2 text-gray-700 font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.recentMaterialIssues.length === 0 && <EmptyRow colSpan={3} />}
                {data.recentMaterialIssues.map((p, i) => (
                  <tr key={p.id} className="hover:bg-blue-50/30 cursor-pointer" style={{ backgroundColor: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}
                    onClick={() => navigate('/warehouse/production/issue')}>
                    <td className="px-3 py-2 font-semibold" style={{ color: PRIMARY }}>{p.code}</td>
                    <td className="px-3 py-2 text-gray-700 truncate max-w-[140px]">{p.recipient}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-[10px] font-semibold text-white px-1.5 py-0.5 whitespace-nowrap inline-block"
                        style={{ backgroundColor: statusColor(p.status), borderRadius: 4 }}>
                        {p.status}
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
