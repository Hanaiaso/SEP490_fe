import { useEffect, useState } from 'react';
import {
  FileText,
  Search,
  CheckCircle,
  XCircle,
  Filter,
  RefreshCw,
  ShoppingCart,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { exportInvoiceToPdf } from '../../utils/exportPdf';
import ConfirmModal from '../../components/ui/ConfirmModal';

const PRIMARY = '#1F3B64';
const INFO = '#2563EB';
const SUCCESS = '#16A34A';
const WARNING = '#F97316';
const ERROR = '#DC2626';
const NEUTRAL = '#64748B';

const ORDER_STATUS: Record<string, { label: string; bg: string }> = {
  // Trạng thái đơn mới / chờ xác nhận
  Draft: { label: 'Chờ xác nhận', bg: WARNING },
  New: { label: 'Chờ xác nhận', bg: WARNING },
  PendingConfirmation: { label: 'Chờ xác nhận', bg: WARNING },
  
  // Thanh toán
  PendingPayment: { label: 'Chờ thanh toán', bg: INFO },
  PaidReviewRequired: { label: 'Chờ duyệt TT', bg: '#8B5CF6' },
  
  // Xác nhận & Xử lý kho
  Confirmed: { label: 'Đã xác nhận', bg: '#2563EB' },
  Received: { label: 'Đã nhận đơn', bg: '#2563EB' },
  Processing: { label: 'Đang đóng gói', bg: '#8B5CF6' },
  Packing: { label: 'Đang đóng gói', bg: '#8B5CF6' },
  Shortage: { label: 'Thiếu hàng', bg: ERROR },
  
  // Giao hàng
  InTransit: { label: 'Đang giao hàng', bg: WARNING },
  Delivered: { label: 'Đã giao', bg: SUCCESS },
  Completed: { label: 'Hoàn thành', bg: SUCCESS },
  
  // Hủy đơn
  CancelRequested: { label: 'Yêu cầu hủy', bg: ERROR },
  CancelledReallocated: { label: 'Đã hủy', bg: ERROR },
  Cancelled: { label: 'Đã hủy', bg: ERROR },
};

type SalesOrder = {
  id: string;
  orderCode: string;
  customerName: string;
  createdAt: string;
  finalPayment: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  invoicePdfUrl?: string | null;
};

type SalesDashboardPayload = {
  kpi?: {
    newOrdersCount?: number;
    processingOrdersCount?: number;
    deliveredTodayCount?: number;
    revenueToday?: number;
  };
};

function StatusBadge({ label, bg }: { label: string; bg: string }) {
  return (
    <span
      className="inline-flex min-w-[80px] items-center justify-center px-2 text-white text-[11px] font-medium"
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
      className="inline-flex w-[68px] items-center justify-center px-2 text-white text-[11px] font-medium"
      style={{ backgroundColor: bg, borderRadius: 4, lineHeight: '22px', height: 22 }}
    >
      {method}
    </span>
  );
}

function SummaryCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">{label}</p>
      <p className="mt-2 text-[22px] font-extrabold leading-none text-[#374151]">{value}</p>
      <p className="mt-2 text-[11px] text-[#9CA3AF]">{hint}</p>
    </div>
  );
}

const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN').format(price);

const parseDate = (dateStr: string) => {
  const hasTimezone = /([+-]\d{2}(:?\d{2})?|Z)$/.test(dateStr);
  return new Date(hasTimezone ? dateStr : `${dateStr}Z`);
};

const formatDateTime = (dateStr?: string) => {
  if (!dateStr) return '--';
  const date = parseDate(dateStr);
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export default function SalesManagerOrdersPage() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<SalesDashboardPayload | null>(null);
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [page, setPage] = useState(1);

  const [orderToConfirm, setOrderToConfirm] = useState<string | null>(null);
  const [cancelModalOrder, setCancelModalOrder] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const handleCancelOrder = (orderId: string) => {
    setCancelReason('');
    setCancelModalOrder(orderId);
  };

  const executeCancelOrder = async () => {
    if (!cancelModalOrder) return;
    if (!cancelReason.trim()) {
      alert('Vui lòng nhập lý do hủy đơn');
      return;
    }
    try {
      const response = await fetch(`/api/orders/sales/${cancelModalOrder}/process-cancel-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ isApproved: true, reason: cancelReason })
      });
      if (response.ok) {
        alert('Đã hủy đơn hàng thành công!');
        fetchOrdersList();
        fetchDashboard();
      } else {
        const data = await response.json();
        alert(data.message || 'Lỗi khi hủy đơn hàng');
      }
    } catch (err) {
      alert('Đã xảy ra lỗi khi kết nối với máy chủ');
    } finally {
      setCancelModalOrder(null);
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await fetch('/api/orders/sales-dashboard', {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setDashboard(data);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats', err);
    }
  };

  const fetchOrdersList = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '50'
      });
      if (searchQuery) params.append('searchQuery', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (paymentFilter !== 'all') params.append('paymentMethod', paymentFilter);

      const response = await fetch(`/api/orders/sales?${params.toString()}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });

      if (!response.ok) throw new Error('Không thể tải danh sách đơn hàng.');
      const data = await response.json();
      
      setOrders(data.items || []);
      setTotalOrders(data.totalCount || 0);

      const now = new Date();
      setLastUpdated(
        now.toLocaleString('vi-VN', {
          hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi kết nối tới máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOrder = (orderId: string) => {
    setOrderToConfirm(orderId);
  };

  const executeConfirmOrder = async () => {
    if (!orderToConfirm) return;
    
    setConfirmingId(orderToConfirm);
    const orderId = orderToConfirm;
    setOrderToConfirm(null);

    try {
      const response = await fetch(`/api/orders/sales/${orderId}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Lỗi khi xác nhận đơn hàng.');
      }
      
      alert('Xác nhận thành công!');
      fetchDashboard();
      fetchOrdersList();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Lỗi không xác định.');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleExportPdf = async (orderId: string) => {
    try {
      const response = await fetch(`/api/orders/sales/${orderId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });

      if (!response.ok) {
        throw new Error('Không thể lấy chi tiết đơn hàng để xuất PDF.');
      }

      const orderDetail = await response.json();
      await exportInvoiceToPdf(orderDetail, 'view');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Có lỗi xảy ra khi xuất PDF.');
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchOrdersList();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, paymentFilter, page]);

  return (
    <div className="flex h-full flex-col bg-[#F5F7FA]">
      <div className="flex h-11 items-center justify-between border-b border-[#E5E7EB] bg-white px-5">
        <div>
          <span className="text-[13px] font-bold text-[#374151]">Quản lý đơn hàng Sales</span>
          <span className="ml-3 text-[11px] text-[#9CA3AF]">Cập nhật lúc: {lastUpdated || '--'}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { fetchDashboard(); fetchOrdersList(); }}
            className="flex h-7 items-center gap-1.5 rounded border border-[#D1D5DB] bg-white px-3 text-[12px] text-[#374151] transition-colors hover:bg-gray-50"
          >
            <RefreshCw className={`h-3 w-3 text-[#9CA3AF] ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <button
            onClick={() => navigate('/sales-manager/direct-purchase')}
            className="flex h-7 items-center gap-1.5 rounded px-3 text-[12px] text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: PRIMARY }}
          >
            <ShoppingCart className="h-3 w-3" />
            Tạo đơn POS
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            label="Đơn mới"
            value={String(dashboard?.kpi?.newOrdersCount ?? 0)}
            hint="Cần ưu tiên xử lý"
          />
          <SummaryCard
            label="Đang xử lý"
            value={String(dashboard?.kpi?.processingOrdersCount ?? 0)}
            hint="Chờ xác nhận, kho, giao hàng"
          />
          <SummaryCard
            label="Đã giao hôm nay"
            value={String(dashboard?.kpi?.deliveredTodayCount ?? 0)}
            hint="Kết quả giao hàng trong ngày"
          />
          <SummaryCard
            label="Doanh thu hôm nay"
            value={`${formatPrice(dashboard?.kpi?.revenueToday ?? 0)} đ`}
            hint="Tổng doanh thu ghi nhận"
          />
        </div>

        <div className="mt-4 rounded-lg border border-[#E5E7EB] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Danh sách đơn hàng</p>
              <p className="mt-1 text-xs text-[#9CA3AF]">Lọc theo mã đơn, khách hàng, trạng thái và thanh toán</p>
            </div>
            <div className="rounded-full bg-[#EEF2F8] px-3 py-1 text-[11px] font-semibold text-[#1F3B64]">
              {totalOrders} đơn
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-b border-[#E5E7EB] bg-[#F9FAFB] px-4 py-3 lg:grid-cols-[minmax(0,1.4fr)_180px_180px]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
              <input
                value={searchQuery}
                onChange={(event) => { setSearchQuery(event.target.value); setPage(1); }}
                placeholder="Tìm mã đơn hoặc tên khách hàng..."
                className="h-9 w-full rounded border border-[#D1D5DB] bg-white pl-9 pr-3 text-sm text-[#374151] outline-none transition-colors focus:border-[#1F3B64]"
              />
            </label>

            <label className="relative">
              <Filter className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#9CA3AF]" />
              <select
                value={statusFilter}
                onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}
                className="h-9 w-full rounded border border-[#D1D5DB] bg-white pl-9 pr-3 text-sm text-[#374151] outline-none transition-colors focus:border-[#1F3B64]"
              >
                <option value="all">Tất cả trạng thái</option>
                {Object.entries(ORDER_STATUS).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </label>

            <select
              value={paymentFilter}
              onChange={(event) => { setPaymentFilter(event.target.value); setPage(1); }}
              className="h-9 w-full rounded border border-[#D1D5DB] bg-white px-3 text-sm text-[#374151] outline-none transition-colors focus:border-[#1F3B64]"
            >
              <option value="all">Tất cả thanh toán</option>
              <option value="SePay">SePay</option>
              <option value="COD">COD</option>
              <option value="Cash">Cash</option>
            </select>
          </div>

          {loading && orders.length === 0 ? (
            <div className="flex h-52 items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-8 w-8 animate-spin text-[#1F3B64]" />
                <span className="text-xs font-semibold text-slate-500">Đang tải danh sách đơn hàng...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-52 flex-col items-center justify-center gap-3 px-4 text-center">
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button
                onClick={fetchOrdersList}
                className="rounded px-3 py-1.5 text-xs font-semibold text-white"
                style={{ backgroundColor: PRIMARY }}
              >
                Thử lại
              </button>
            </div>
          ) : orders.length === 0 ? (
            <div className="flex h-52 flex-col items-center justify-center gap-3 px-4 text-center">
              <div className="rounded-full bg-slate-100 p-4 text-slate-400">
                <FileText className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700">Không có đơn hàng phù hợp</p>
                <p className="mt-1 text-xs text-slate-400">Thử đổi từ khóa tìm kiếm hoặc bỏ bớt bộ lọc.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    {['Mã đơn', 'Khách hàng', 'Thời gian đặt', 'Tổng tiền', 'Thanh toán', 'Trạng thái', 'Hóa đơn', 'Thao tác'].map((header) => (
                      <th
                        key={header}
                        className={`px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-[#6B7280] ${header === 'Tổng tiền' ? 'text-right' : header === 'Thao tác' ? 'text-center' : ''}`}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, index) => (
                    <tr
                      key={order.id}
                      className="transition-colors hover:bg-blue-50/30"
                      style={{
                        borderBottom: '1px solid #F3F4F6',
                        background: index % 2 === 1 ? '#FAFAFA' : '#FFFFFF',
                      }}
                    >
                      <td 
                        className="px-4 py-3 font-bold cursor-pointer hover:text-blue-700 underline" 
                        style={{ color: PRIMARY }}
                        onClick={() => navigate(`/sales-manager/orders/${order.id}`)}
                      >
                        {order.orderCode}
                      </td>
                      <td className="max-w-[240px] truncate px-4 py-3 text-[#374151]">
                        {order.customerName}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap tabular-nums text-[#6B7280]">
                        {formatDateTime(order.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold whitespace-nowrap text-[#374151]">
                        {formatPrice(order.finalPayment)}
                      </td>
                      <td className="px-4 py-3">
                        <PaymentBadge method={order.paymentMethod} />
                        {order.paymentStatus === 'Paid' && <span className="ml-1 text-[10px] text-green-600 font-bold">(Đã thanh toán)</span>}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={ORDER_STATUS[order.orderStatus]?.label || order.orderStatus}
                          bg={ORDER_STATUS[order.orderStatus]?.bg || NEUTRAL}
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleExportPdf(order.id)}
                          className="inline-flex items-center gap-1 rounded bg-blue-50 border border-blue-200 px-2 py-1 text-[11px] font-semibold text-[#1F3B64] hover:bg-blue-100 transition-colors"
                          title="In / Xem PDF Hóa đơn"
                        >
                          <FileText className="h-3 w-3 text-blue-600" />
                          Hóa đơn
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(order.orderStatus === 'Draft' || order.orderStatus === 'New' || order.orderStatus === 'PendingConfirmation') ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleConfirmOrder(order.id)}
                              disabled={confirmingId === order.id}
                              className="inline-flex items-center gap-1 rounded bg-[#2563EB] px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-[#1D4ED8] disabled:opacity-50 shadow-sm"
                              title="Xác nhận đơn hàng mới"
                            >
                              {confirmingId === order.id ? (
                                <RefreshCw className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckCircle className="h-3 w-3" />
                              )}
                              Xác nhận
                            </button>
                            <button
                              onClick={() => navigate(`/sales-manager/orders/${order.id}`)}
                              className="inline-flex items-center gap-1 rounded bg-gray-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-gray-700"
                              title="Xem chi tiết đơn hàng"
                            >
                              <FileText className="h-3 w-3" />
                              Chi tiết
                            </button>
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              className="inline-flex items-center gap-1 rounded bg-red-100 border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-200"
                              title="Hủy đơn hàng"
                            >
                              <XCircle className="h-3 w-3" />
                              Hủy
                            </button>
                          </div>
                        ) : order.orderStatus === 'CancelRequested' ? (
                          <div className="flex justify-center gap-1.5">
                            <button
                              onClick={() => navigate(`/sales-manager/orders/${order.id}`)}
                              className="inline-flex items-center gap-1 rounded bg-gray-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-gray-700"
                              title="Xem chi tiết đơn hàng"
                            >
                              <FileText className="h-3 w-3" />
                              Chi tiết
                            </button>
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              className="inline-flex items-center gap-1 rounded bg-red-100 border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-200"
                              title="Hủy đơn hàng"
                            >
                              <XCircle className="h-3 w-3" />
                              Duyệt hủy
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-center gap-1.5">
                            <button
                              onClick={() => navigate(`/sales-manager/orders/${order.id}`)}
                              className="inline-flex items-center gap-1 rounded bg-gray-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-gray-700"
                              title="Xem chi tiết đơn hàng"
                            >
                              <FileText className="h-3 w-3" />
                              Chi tiết
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div className="flex items-center justify-between border-t border-[#E5E7EB] bg-white px-4 py-3">
                <span className="text-xs text-gray-500">
                  Hiển thị trang {page} (Tối đa 50 đơn/trang)
                </span>
                <div className="flex gap-2">
                  <button 
                    disabled={page === 1} 
                    onClick={() => setPage(p => p - 1)}
                    className="rounded border px-3 py-1 text-xs disabled:opacity-50"
                  >
                    Trước
                  </button>
                  <button 
                    disabled={orders.length < 50} 
                    onClick={() => setPage(p => p + 1)}
                    className="rounded border px-3 py-1 text-xs disabled:opacity-50"
                  >
                    Sau
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={!!orderToConfirm}
        title="Xác nhận đơn hàng"
        message="Bạn có chắc muốn xác nhận đơn hàng này và chuyển xuống kho?"
        onConfirm={executeConfirmOrder}
        onCancel={() => setOrderToConfirm(null)}
      />

      {cancelModalOrder && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold text-gray-900">Hủy đơn hàng</h3>
            <p className="mb-4 text-sm text-gray-500">Vui lòng nhập lý do hủy đơn hàng này.</p>
            <textarea
              className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              rows={3}
              placeholder="Nhập lý do hủy..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setCancelModalOrder(null)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Đóng
              </button>
              <button
                onClick={executeCancelOrder}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
