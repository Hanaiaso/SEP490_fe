import { getErrorMessage } from '../../lib/errors';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw, TrendingUp, Truck, Clock, Users2, AlertTriangle,
  FileCheck, UserCog, CalendarClock, Megaphone, X, ExternalLink
} from 'lucide-react';
import { getSalesManagerDashboard } from '../../services/dashboardService.js';
import { getQuotations } from '../../services/quotationService.js';
import { getManagerList } from '../../services/salesChangeRequestService.js';
import { getPendingDeliveryConflicts } from '../../services/deliveryConflictService.js';
import api from '../../services/api';
import { authFetch } from '../../services/httpClient';
import type { SalesManagerDashboard } from '../../types/dashboard';
import type { DashboardOrder } from '../../types/order';

const PRIMARY = '#1F3B64';
const INFO     = '#2563EB';
const SUCCESS  = '#16A34A';
const WARNING  = '#F97316';
const ERROR    = '#DC2626';
const NEUTRAL  = '#64748B';

const ORDER_STATUS: Record<string, { label: string; bg: string }> = {
  Draft: { label: 'Chờ xác nhận', bg: WARNING },
  New: { label: 'Chờ xác nhận', bg: WARNING },
  PendingConfirmation: { label: 'Chờ xác nhận', bg: WARNING },
  PendingPayment: { label: 'Chờ thanh toán', bg: INFO },
  PaidReviewRequired: { label: 'Chờ duyệt TT', bg: '#8B5CF6' },
  Confirmed: { label: 'Đã xác nhận', bg: '#2563EB' },
  Received: { label: 'Đã nhận đơn', bg: '#2563EB' },
  Processing: { label: 'Đang đóng gói', bg: '#8B5CF6' },
  Packing: { label: 'Đang đóng gói', bg: '#8B5CF6' },
  Shortage: { label: 'Thiếu hàng', bg: ERROR },
  InTransit: { label: 'Đang giao hàng', bg: WARNING },
  Delivered: { label: 'Đã giao', bg: SUCCESS },
  Completed: { label: 'Hoàn thành', bg: SUCCESS },
  Returned: { label: 'Đã trả hàng', bg: NEUTRAL },
  CancelRequested: { label: 'Yêu cầu hủy', bg: ERROR },
  CancelledReallocated: { label: 'Đã hủy', bg: ERROR },
  Cancelled: { label: 'Đã hủy', bg: ERROR },
};

const formatPrice = (n: number) => new Intl.NumberFormat('vi-VN').format(n || 0);

function formatDate(iso: string | null | undefined) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('vi-VN');
}

const formatTimeOrDate = (dateStr: string) => {
  if (!dateStr) return '';
  const hasTimezone = /([+-]\d{2}(:?\d{2})?|Z)$/.test(dateStr);
  const d = new Date(hasTimezone ? dateStr : dateStr + 'Z');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${hours}:${minutes} ${day}/${month}`;
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

function KpiCard({ label, value, sub, icon, onClick, highlight }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; onClick?: () => void; highlight?: boolean;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border rounded-lg p-3.5 shadow-sm ${highlight ? 'border-amber-300' : 'border-[#E5E7EB]'} ${onClick ? 'cursor-pointer hover:border-[#1F3B64] hover:shadow-md transition-all' : ''}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-[#6B7280] leading-none font-bold uppercase tracking-wider">{label}</span>
        <span className={highlight ? 'text-amber-500' : 'text-[#9CA3AF]'}>{icon}</span>
      </div>
      <p className="text-[20px] font-extrabold text-[#374151] leading-none tabular-nums mt-1">{value}</p>
      {sub && <p className="text-[10px] text-[#9CA3AF] mt-2 font-medium">{sub}</p>}
    </div>
  );
}

function PanelHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-[#E5E7EB]">
      <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider">{title}</span>
    </div>
  );
}

// Modal danh sách đơn hàng (Orders drill-down)
function DrillDownModal({ title, loading, error, orders, onClose, onRetry, onRowClick }: {
  title: string; loading: boolean; error: string; orders: DashboardOrder[];
  onClose: () => void; onRetry: () => void; onRowClick: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[80vh] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 h-12 border-b border-[#E5E7EB] flex-shrink-0">
          <span className="text-[13px] font-bold text-[#374151]">{title}</span>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#374151] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <RefreshCw className="w-6 h-6 animate-spin text-[#1F3B64]" />
              <span className="text-xs text-slate-500 font-semibold">Đang tải danh sách...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <span className="text-xs text-red-500 font-bold">{error}</span>
              <button onClick={onRetry} className="px-3 py-1 bg-[#1F3B64] text-white rounded text-xs font-semibold cursor-pointer">
                Thử lại
              </button>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">Không có đơn hàng nào phù hợp.</div>
          ) : (
            <table className="w-full text-left" style={{ fontSize: 12 }}>
              <thead className="sticky top-0">
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  {['Mã đơn', 'Khách hàng', 'Thời gian', 'Số tiền (₫)', 'Thanh toán', 'Trạng thái'].map(h => (
                    <th key={h} className={`px-3 py-2 text-[11px] font-bold text-[#6B7280] whitespace-nowrap uppercase tracking-wider ${h === 'Số tiền (₫)' ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o, i) => (
                  <tr
                    key={o.id}
                    onClick={() => onRowClick(o.id)}
                    className="cursor-pointer hover:bg-blue-50/30 transition-colors"
                    style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}
                  >
                    <td className="px-3 py-2 font-bold whitespace-nowrap" style={{ color: PRIMARY }}>{o.orderCode}</td>
                    <td className="px-3 py-2 text-[#374151] max-w-[200px] truncate">{o.customerName}</td>
                    <td className="px-3 py-2 text-[#6B7280] whitespace-nowrap tabular-nums">{formatTimeOrDate(o.createdAt)}</td>
                    <td className="px-3 py-2 text-right font-bold text-[#374151] whitespace-nowrap tabular-nums">{formatPrice(o.finalPayment)}</td>
                    <td className="px-3 py-2"><PaymentBadge method={o.paymentMethod} /></td>
                    <td className="px-3 py-2">
                      <StatusBadge label={ORDER_STATUS[o.orderStatus]?.label || o.orderStatus} bg={ORDER_STATUS[o.orderStatus]?.bg || NEUTRAL} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// Modal danh sách việc cần xử lý (Quotations, ChangeRequests, Conflicts, Marketing)
interface ActionItemModalProps {
  type: 'quotations' | 'changeRequests' | 'deliveryConflicts' | 'marketingPosts';
  title: string;
  loading: boolean;
  error: string;
  items: any[];
  onClose: () => void;
  onRetry: () => void;
  onNavigateToPage: () => void;
}

function ActionItemModal({ type, title, loading, error, items, onClose, onRetry, onNavigateToPage }: ActionItemModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[80vh] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 h-12 border-b border-[#E5E7EB] flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-[#374151]">{title}</span>
            <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full">
              {items.length} mục
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onNavigateToPage}
              className="text-xs font-semibold text-[#1F3B64] hover:underline flex items-center gap-1 cursor-pointer bg-blue-50 px-2.5 py-1 rounded"
            >
              Xem trang quản lý <ExternalLink className="w-3 h-3" />
            </button>
            <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#374151] cursor-pointer ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <RefreshCw className="w-6 h-6 animate-spin text-[#1F3B64]" />
              <span className="text-xs text-slate-500 font-semibold">Đang tải danh sách...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <span className="text-xs text-red-500 font-bold">{error}</span>
              <button onClick={onRetry} className="px-3 py-1 bg-[#1F3B64] text-white rounded text-xs font-semibold cursor-pointer">
                Thử lại
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">Không có mục nào đang chờ xử lý.</div>
          ) : (
            <table className="w-full text-left" style={{ fontSize: 12 }}>
              <thead className="sticky top-0">
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  {type === 'quotations' && ['Mã báo giá', 'Khách hàng', 'Tổng tiền (₫)', 'Ngày gửi', 'Sale phụ trách', 'Thao tác'].map(h => (
                    <th key={h} className={`px-3 py-2 text-[11px] font-bold text-[#6B7280] whitespace-nowrap uppercase tracking-wider ${h === 'Tổng tiền (₫)' ? 'text-right' : ''}`}>{h}</th>
                  ))}
                  {type === 'changeRequests' && ['Khách hàng', 'Sale hiện tại', 'Lý do đổi Sale', 'Thời gian gửi', 'Thao tác'].map(h => (
                    <th key={h} className="px-3 py-2 text-[11px] font-bold text-[#6B7280] whitespace-nowrap uppercase tracking-wider">{h}</th>
                  ))}
                  {type === 'deliveryConflicts' && ['Xe / Ca', 'Ngày giao', 'Đơn hàng liên quan', 'Người gửi', 'Thao tác'].map(h => (
                    <th key={h} className="px-3 py-2 text-[11px] font-bold text-[#6B7280] whitespace-nowrap uppercase tracking-wider">{h}</th>
                  ))}
                  {type === 'marketingPosts' && ['Sản phẩm', 'Nội dung tóm tắt', 'Người tạo', 'Ngày tạo', 'Thao tác'].map(h => (
                    <th key={h} className="px-3 py-2 text-[11px] font-bold text-[#6B7280] whitespace-nowrap uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {type === 'quotations' && items.map((q: any, i: number) => (
                  <tr key={q.id || i} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}>
                    <td className="px-3 py-2 font-bold whitespace-nowrap" style={{ color: PRIMARY }}>{(q.id ? String(q.id).slice(0, 8) : '-') + '...'}</td>
                    <td className="px-3 py-2 text-[#374151] font-medium">{q.customerName || 'Khách hàng'}</td>
                    <td className="px-3 py-2 text-right font-bold text-[#374151] tabular-nums">{formatPrice(q.originalTotal)}</td>
                    <td className="px-3 py-2 text-[#6B7280] whitespace-nowrap tabular-nums">{formatTimeOrDate(q.requestDate)}</td>
                    <td className="px-3 py-2 text-[#6B7280]">{q.salesStaffName || '—'}</td>
                    <td className="px-3 py-2">
                      <button onClick={onNavigateToPage} className="px-2 py-1 bg-[#1F3B64] text-white rounded text-[11px] font-semibold hover:opacity-90 cursor-pointer">
                        Duyệt
                      </button>
                    </td>
                  </tr>
                ))}

                {type === 'changeRequests' && items.map((r: any, i: number) => (
                  <tr key={r.id || i} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}>
                    <td className="px-3 py-2 font-bold" style={{ color: PRIMARY }}>{r.customerName || r.companyName || 'Khách hàng'}</td>
                    <td className="px-3 py-2 text-[#374151]">{r.currentSalesStaffName || '—'}</td>
                    <td className="px-3 py-2 text-[#6B7280] max-w-[240px] truncate">{r.reason || '—'}</td>
                    <td className="px-3 py-2 text-[#6B7280] whitespace-nowrap tabular-nums">{formatTimeOrDate(r.createdAt)}</td>
                    <td className="px-3 py-2">
                      <button onClick={onNavigateToPage} className="px-2 py-1 bg-[#1F3B64] text-white rounded text-[11px] font-semibold hover:opacity-90 cursor-pointer">
                        Xử lý
                      </button>
                    </td>
                  </tr>
                ))}

                {type === 'deliveryConflicts' && items.map((c: any, i: number) => (
                  <tr key={c.id || i} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}>
                    <td className="px-3 py-2 font-bold whitespace-nowrap" style={{ color: PRIMARY }}>Xe {c.vehicleId} — Ca {c.shift}</td>
                    <td className="px-3 py-2 text-[#6B7280] whitespace-nowrap tabular-nums">{formatTimeOrDate(c.requestedDate)}</td>
                    <td className="px-3 py-2 text-[#374151] max-w-[200px] truncate">{(c.orderCodes || []).join(', ') || '—'}</td>
                    <td className="px-3 py-2 text-[#6B7280]">{c.raisedByUserName || '—'}</td>
                    <td className="px-3 py-2">
                      <button onClick={onNavigateToPage} className="px-2 py-1 bg-[#1F3B64] text-white rounded text-[11px] font-semibold hover:opacity-90 cursor-pointer">
                        Điều phối
                      </button>
                    </td>
                  </tr>
                ))}

                {type === 'marketingPosts' && items.map((p: any, i: number) => (
                  <tr key={p.id || i} style={{ borderBottom: '1px solid #F3F4F6', background: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}>
                    <td className="px-3 py-2 font-bold" style={{ color: PRIMARY }}>{p.productName || p.productSku || p.code || 'Bài viết'}</td>
                    <td className="px-3 py-2 text-[#374151] max-w-[260px] truncate">{p.editedCaption || p.promptUsed || '—'}</td>
                    <td className="px-3 py-2 text-[#6B7280] whitespace-nowrap">{p.createdByName || '—'}</td>
                    <td className="px-3 py-2 text-[#6B7280] whitespace-nowrap tabular-nums">{formatTimeOrDate(p.createdAt)}</td>
                    <td className="px-3 py-2">
                      <button onClick={onNavigateToPage} className="px-2 py-1 bg-[#1F3B64] text-white rounded text-[11px] font-semibold hover:opacity-90 cursor-pointer">
                        Duyệt bài
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SalesManagerDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<SalesManagerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getSalesManagerDashboard());
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Không thể tải dữ liệu dashboard.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Drill-down state cho Đơn hàng (Orders drill-down)
  const [drillDown, setDrillDown] = useState<{ metric: string; title: string; staffId?: string } | null>(null);
  const [drillDownOrders, setDrillDownOrders] = useState<DashboardOrder[]>([]);
  const [drillDownLoading, setDrillDownLoading] = useState(false);
  const [drillDownError, setDrillDownError] = useState('');

  const loadDrillDown = async (metric: string, staffId?: string) => {
    setDrillDownLoading(true);
    setDrillDownError('');
    try {
      let url = `/orders/sales-dashboard/drill-down?metric=${metric}`;
      if (staffId) url += `&staffId=${staffId}`;
      const response = await authFetch(url);
      if (response.ok) {
        setDrillDownOrders(await response.json());
      } else {
        setDrillDownError('Không thể tải danh sách đơn hàng.');
      }
    } catch {
      setDrillDownError('Lỗi kết nối tới máy chủ.');
    } finally {
      setDrillDownLoading(false);
    }
  };

  const openDrillDown = (metric: string, title: string, staffId?: string) => {
    setDrillDown({ metric, title, staffId });
    setDrillDownOrders([]);
    loadDrillDown(metric, staffId);
  };

  // Drill-down state cho Hàng trên (Action items modal: Quotations, ChangeRequests, DeliveryConflicts, Marketing)
  const [actionModal, setActionModal] = useState<{
    type: 'quotations' | 'changeRequests' | 'deliveryConflicts' | 'marketingPosts';
    title: string;
    targetPath: string;
  } | null>(null);
  const [actionItems, setActionItems] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');

  const loadActionItems = async (type: 'quotations' | 'changeRequests' | 'deliveryConflicts' | 'marketingPosts') => {
    setActionLoading(true);
    setActionError('');
    try {
      if (type === 'quotations') {
        const res = await getQuotations();
        const list = Array.isArray(res) ? res : res?.pendingQuotations || [];
        const pending = list.filter((q: any) => q.status === 'PendingManager' || q.status === 1 || String(q.status).toLowerCase() === 'pendingmanager');
        setActionItems(pending);
      } else if (type === 'changeRequests') {
        const res = await getManagerList({ status: 'Pending' });
        const list = Array.isArray(res) ? res : res?.items || [];
        const pending = list.filter((r: any) => r.status === 'Pending' || String(r.status).toLowerCase() === 'pending');
        setActionItems(pending);
      } else if (type === 'deliveryConflicts') {
        const res = await getPendingDeliveryConflicts();
        const list = Array.isArray(res) ? res : [];
        setActionItems(list);
      } else if (type === 'marketingPosts') {
        const res = await api.get('/marketing-posts');
        const list = Array.isArray(res.data) ? res.data : [];
        const pending = list.filter((p: any) => p.status === 'Submitted' || String(p.status).toLowerCase() === 'submitted');
        setActionItems(pending);
      }
    } catch {
      setActionError('Không thể tải danh sách chi tiết.');
    } finally {
      setActionLoading(false);
    }
  };

  const openActionModal = (
    type: 'quotations' | 'changeRequests' | 'deliveryConflicts' | 'marketingPosts',
    title: string,
    targetPath: string
  ) => {
    setActionModal({ type, title, targetPath });
    setActionItems([]);
    loadActionItems(type);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="w-8 h-8 animate-spin text-[#1F3B64]" />
          <span className="text-xs text-slate-500 font-semibold">Đang tải dữ liệu dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 h-full">
        <span className="text-xs text-red-500 font-bold">{error}</span>
        <button onClick={load} className="px-3 py-1 bg-[#1F3B64] text-white rounded text-xs font-semibold cursor-pointer">Thử lại</button>
      </div>
    );
  }

  const teamKpi = data?.teamKpi || {
    periodFrom: '', periodTo: '', revenue: 0, completedOrderCount: 0,
    deliverySuccessRate: 0, deliveryAttemptedOrderCount: 0,
    returningCustomerRate: 0, customersInScopeCount: 0,
    monthlyTarget: 0, monthlyRevenue: 0, monthlyTargetAchievementRate: null,
  };
  const staffBreakdown = data?.staffBreakdown || [];
  const openExceptions = data?.openExceptions || [];
  const overdueDebts = data?.overdueDebts || [];
  const slaBreach = data?.codSlaBreachCountToday ?? 0;
  const pendingQuotations = data?.pendingQuotationApprovalCount ?? 0;
  const pendingChangeRequests = data?.pendingSalesChangeRequestCount ?? 0;
  const pendingConflicts = data?.pendingDeliveryConflictCount ?? 0;
  const pendingMarketing = data?.pendingMarketingApprovalCount ?? 0;

  return (
    <div className="flex flex-col h-full" style={{ background: '#F5F7FA' }}>
      {/* Top Header */}
      <div className="bg-white border-b border-[#E5E7EB] px-5 h-11 flex items-center justify-between flex-shrink-0">
        <span className="text-[13px] font-bold text-[#374151]">Dashboard Quản lý — Toàn đội (30 ngày)</span>
        <div className="flex items-center gap-3">
          {slaBreach > 0 && (
            <button
              onClick={() => openDrillDown('codSlaBreach', 'Đơn COD vi phạm SLA hôm nay')}
              className="flex items-center gap-1 text-[11px] text-red-600 font-bold hover:underline cursor-pointer bg-red-50 px-2 py-0.5 rounded border border-red-200 transition-colors"
              title="Bấm để xem danh sách đơn hàng COD vi phạm"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> {slaBreach} đơn COD vi phạm SLA hôm nay (Bấm xem)
            </button>
          )}
          <button onClick={load} className="h-7 px-3 text-[12px] border border-[#D1D5DB] rounded text-[#374151] bg-white hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer">
            <RefreshCw className="w-3 h-3 text-[#9CA3AF]" /> Làm mới
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {/* Hàng 1: Việc cần xử lý — bấm vào hiện danh sách */}
        <div className="grid grid-cols-4 gap-2">
          <KpiCard
            label="Báo giá chờ duyệt"
            value={String(pendingQuotations)}
            sub="Đơn ≥ 100tr đang chờ · Bấm để xem"
            icon={<FileCheck className="w-4 h-4" />}
            highlight={pendingQuotations > 0}
            onClick={() => openActionModal('quotations', 'Báo giá chờ Manager phê duyệt', '/sales-manager/manager-negotiation')}
          />
          <KpiCard
            label="Yêu cầu đổi Sale"
            value={String(pendingChangeRequests)}
            sub="Đang chờ xử lý · Bấm để xem"
            icon={<UserCog className="w-4 h-4" />}
            highlight={pendingChangeRequests > 0}
            onClick={() => openActionModal('changeRequests', 'Yêu cầu đổi Sale đang chờ duyệt', '/sales-manager/change-requests')}
          />
          <KpiCard
            label="Xung đột lịch xe/ca"
            value={String(pendingConflicts)}
            sub="Đang chờ xử lý · Bấm để xem"
            icon={<CalendarClock className="w-4 h-4" />}
            highlight={pendingConflicts > 0}
            onClick={() => openActionModal('deliveryConflicts', 'Xung đột lịch xe/ca chờ điều phối', '/sales-manager/delivery-conflicts')}
          />
          <KpiCard
            label="Bài Marketing chờ duyệt"
            value={String(pendingMarketing)}
            sub="AI đã tạo, chờ duyệt · Bấm để xem"
            icon={<Megaphone className="w-4 h-4" />}
            highlight={pendingMarketing > 0}
            onClick={() => openActionModal('marketingPosts', 'Bài viết Marketing AI chờ phê duyệt', '/sales-manager/ai-marketing-approval')}
          />
        </div>

        {/* Hàng 2: Team KPI */}
        <div className="grid grid-cols-4 gap-2">
          <KpiCard
            label="Doanh thu toàn đội"
            value={formatPrice(teamKpi.revenue) + ' đ'}
            sub={`${teamKpi.completedOrderCount ?? 0} đơn hoàn thành · Bấm để xem`}
            icon={<TrendingUp className="w-4 h-4" />}
            onClick={() => openDrillDown('completedOrders', 'Đơn hoàn thành — Toàn đội')}
          />
          <KpiCard
            label="Tỷ lệ giao thành công"
            value={`${Math.round((teamKpi.deliverySuccessRate ?? 0) * 100)}%`}
            sub={`${teamKpi.deliveryAttemptedOrderCount ?? 0} lượt giao`}
            icon={<Truck className="w-4 h-4" />}
          />
          <KpiCard
            label="Tốc độ xử lý TB"
            value={teamKpi.processingSpeedAvgHours != null ? `${teamKpi.processingSpeedAvgHours.toFixed(1)}h` : '—'}
            sub="Từ lúc tạo đến xác nhận"
            icon={<Clock className="w-4 h-4" />}
          />
          <KpiCard
            label="Khách quay lại"
            value={`${Math.round((teamKpi.returningCustomerRate ?? 0) * 100)}%`}
            sub={`${teamKpi.customersInScopeCount ?? 0} khách trong kỳ`}
            icon={<Users2 className="w-4 h-4" />}
          />
        </div>

        {/* Staff breakdown */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm">
          <PanelHeader title="Hiệu suất theo nhân viên Sale" />
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  {['Nhân viên', 'Doanh thu', 'Đơn hoàn thành', 'Tỷ lệ giao TC', 'Tốc độ xử lý', 'Khách quay lại'].map(h => (
                    <th key={h} className="px-3 py-2 text-[11px] font-bold text-[#6B7280] whitespace-nowrap uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffBreakdown.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-xs text-slate-400">Chưa có nhân viên Sale nào.</td></tr>
                ) : staffBreakdown.map((s) => (
                  <tr
                    key={s.salesStaffId}
                    style={{ borderBottom: '1px solid #F3F4F6' }}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-3 py-2 font-bold" style={{ color: PRIMARY }}>{s.salesStaffName}</td>
                    <td className="px-3 py-2 tabular-nums">{formatPrice(s.kpi?.revenue)} đ</td>
                    <td className="px-3 py-2 tabular-nums">{s.kpi?.completedOrderCount ?? 0}</td>
                    <td className="px-3 py-2 tabular-nums">{Math.round((s.kpi?.deliverySuccessRate ?? 0) * 100)}%</td>
                    <td className="px-3 py-2 tabular-nums">{s.kpi?.processingSpeedAvgHours != null ? `${s.kpi.processingSpeedAvgHours.toFixed(1)}h` : '—'}</td>
                    <td className="px-3 py-2 tabular-nums">{Math.round((s.kpi?.returningCustomerRate ?? 0) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Exceptions + Debts */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm">
            <PanelHeader title={`Ngoại lệ thanh toán đang mở (${openExceptions.length})`} />
            <div className="divide-y divide-[#F3F4F6] max-h-64 overflow-y-auto">
              {openExceptions.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">Không có ngoại lệ nào đang mở.</div>
              ) : openExceptions.map((e) => (
                <div key={e.id} className="px-3 py-2 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold" style={{ color: PRIMARY }}>{e.orderCode}</span>
                    <span className="text-[10px] text-[#9CA3AF]">{formatDate(e.createdAt)}</span>
                  </div>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">{e.reasonCode}{e.description ? ` — ${e.description}` : ''}</p>
                  <p className="text-[10px] text-[#9CA3AF] mt-0.5">Đã thử lại: {e.retryCount} lần</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm">
            <PanelHeader title={`Công nợ quá hạn (${overdueDebts.length})`} />
            <div className="divide-y divide-[#F3F4F6] max-h-64 overflow-y-auto">
              {overdueDebts.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">Không có công nợ quá hạn.</div>
              ) : overdueDebts.map((d) => (
                <div key={d.id} className="px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold truncate" style={{ color: PRIMARY }}>{d.customerName}</p>
                    <p className="text-[10px] text-[#9CA3AF] truncate">{d.orderCode}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[11px] font-bold text-[#374151] tabular-nums">{formatPrice(d.debtAmount)} đ</p>
                    <p className="text-[10px] text-red-500 font-semibold">{d.overdueDays} ngày quá hạn</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal danh sách đơn hàng (Orders drill-down) */}
      {drillDown && (
        <DrillDownModal
          title={drillDown.title}
          loading={drillDownLoading}
          error={drillDownError}
          orders={drillDownOrders}
          onClose={() => setDrillDown(null)}
          onRetry={() => loadDrillDown(drillDown.metric, drillDown.staffId)}
          onRowClick={(id) => { setDrillDown(null); navigate(`/sales-manager/orders/${id}`); }}
        />
      )}

      {/* Modal danh sách việc cần xử lý (Quotations, ChangeRequests, Conflicts, Marketing) */}
      {actionModal && (
        <ActionItemModal
          type={actionModal.type}
          title={actionModal.title}
          loading={actionLoading}
          error={actionError}
          items={actionItems}
          onClose={() => setActionModal(null)}
          onRetry={() => loadActionItems(actionModal.type)}
          onNavigateToPage={() => {
            const path = actionModal.targetPath;
            setActionModal(null);
            navigate(path);
          }}
        />
      )}
    </div>
  );
}

