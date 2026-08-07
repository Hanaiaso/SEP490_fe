import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { ReturnExchangeRequestDetailModal, ReturnExchangeRequestsSection } from '../../components/ReturnExchangeRequests';
import { useAuth } from '../../context/AuthContext';
import {
  Package, MapPin, Phone, User, Calendar, CreditCard, ArrowLeft,
  Clock, AlertTriangle, CheckCircle, XCircle, Truck, Building2,
  Mail, Hash, FileText, Download, ChevronRight, Box, Wallet,
  ShieldCheck, CircleDot, Timer
} from 'lucide-react';

const PRIMARY = '#1F3B64';

const ORDER_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  Draft:               { label: 'Chờ xác nhận (COD)', color: '#92400E', bg: '#FEF3C7' },
  PendingPayment:      { label: 'Chờ thanh toán',     color: '#9A3412', bg: '#FFEDD5' },
  PendingConfirmation: { label: 'Chờ xác nhận',       color: '#92400E', bg: '#FEF3C7' },
  Confirmed:           { label: 'Đã xác nhận',        color: '#1E40AF', bg: '#DBEAFE' },
  Processing:          { label: 'Đang xử lý',         color: '#6D28D9', bg: '#EDE9FE' },
  Completed:           { label: 'Hoàn thành',         color: '#065F46', bg: '#D1FAE5' },
  Cancelled:           { label: 'Đã hủy',             color: '#991B1B', bg: '#FEE2E2' },
  CancelRequested:     { label: 'Yêu cầu hủy',       color: '#991B1B', bg: '#FEE2E2' },
  CancelledReallocated:{ label: 'Đã hủy & chuyển',    color: '#991B1B', bg: '#FEE2E2' },
  PaidReviewRequired:  { label: 'Cần duyệt thanh toán', color: '#92400E', bg: '#FEF3C7' },
  Returned:            { label: 'Đã đổi/trả',         color: '#9A3412', bg: '#FFEDD5' },
};

const FULFILLMENT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  Unallocated:    { label: 'Chưa phân bổ',   color: '#6B7280', bg: '#F3F4F6' },
  Reserved:       { label: 'Đã giữ kho',     color: '#1D4ED8', bg: '#DBEAFE' },
  Allocated:      { label: 'Đã phân bổ',     color: '#1D4ED8', bg: '#DBEAFE' },
  Picking:        { label: 'Đang lấy hàng',  color: '#7C3AED', bg: '#EDE9FE' },
  PartiallyReady: { label: 'Sẵn sàng 1 phần', color: '#D97706', bg: '#FEF3C7' },
  Ready:          { label: 'Sẵn sàng',       color: '#059669', bg: '#D1FAE5' },
  Consolidating:  { label: 'Đang gom',       color: '#7C3AED', bg: '#EDE9FE' },
  Consolidated:   { label: 'Đã gom',         color: '#059669', bg: '#D1FAE5' },
  HandedOver:     { label: 'Đã bàn giao',    color: '#059669', bg: '#D1FAE5' },
  Fulfilled:      { label: 'Đã hoàn tất',    color: '#065F46', bg: '#D1FAE5' },
};

const DELIVERY_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  NotScheduled:      { label: 'Chưa lên lịch',    color: '#6B7280', bg: '#F3F4F6' },
  Scheduled:         { label: 'Đã lên lịch',      color: '#1D4ED8', bg: '#DBEAFE' },
  InDelivery:        { label: 'Đang giao',         color: '#D97706', bg: '#FEF3C7' },
  Delivered:         { label: 'Đã giao thành công', color: '#065F46', bg: '#D1FAE5' },
  Failed:            { label: 'Giao thất bại',     color: '#991B1B', bg: '#FEE2E2' },
  PartiallyDelivered:{ label: 'Giao 1 phần',       color: '#D97706', bg: '#FEF3C7' },
  Rescheduled:       { label: 'Đã dời lịch',       color: '#D97706', bg: '#FEF3C7' },
  Cancelled:         { label: 'Đã hủy giao',       color: '#991B1B', bg: '#FEE2E2' },
};

const PAYMENT_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  Unpaid:        { label: 'Chưa thanh toán',  color: '#991B1B', bg: '#FEE2E2' },
  Pending:       { label: 'Đang chờ',         color: '#D97706', bg: '#FEF3C7' },
  Paid:          { label: 'Đã thanh toán',    color: '#065F46', bg: '#D1FAE5' },
  PartiallyPaid: { label: 'Thanh toán 1 phần', color: '#D97706', bg: '#FEF3C7' },
  Failed:        { label: 'Thất bại',          color: '#991B1B', bg: '#FEE2E2' },
};

function StatusChip({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 text-[12px] font-semibold rounded-full"
      style={{ backgroundColor: bg, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN').format(price);
const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '--';
  const hasTimezone = /([+-]\d{2}(:?\d{2})?|Z)$/.test(dateStr);
  const date = new Date(hasTimezone ? dateStr : `${dateStr}Z`);
  return date.toLocaleString('vi-VN', {
    hour: '2-digit', minute: '2-digit',
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

type OrderItem = {
  id?: string;
  productId?: string;
  productName: string;
  productSku?: string;
  productImageUrl?: string;
  quantity: number;
  priceSnapshot: number;
  lineTotal: number;
};

type SalesOrderDetail = {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  companyName?: string;
  shippingAddress?: string;
  createdAt: string;
  totalAmount: number;
  discountAmount: number;
  vatAmount: number;
  finalPayment: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  fulfillmentStatus?: string;
  deliveryStatus?: string;
  invoicePdfUrl?: string;
  items: OrderItem[];
  scheduledDeliveryDate?: string;
  deliveryShift?: string;
  deliveryVehicleId?: number;
  failedDeliveryCount?: number;
  customerSignatureUrl?: string;
  deliveryPhotoUrl?: string;
  amountPaid?: number;
  creditApplied: number;
  returnExchangeRequests?: any[];
};

// ─── Timeline Steps ─────────────────────────────────────────────────────
function getTimelineSteps(order: SalesOrderDetail) {
  const os = order.orderStatus;
  const fs = order.fulfillmentStatus || 'Unallocated';
  const ds = order.deliveryStatus || 'NotScheduled';

  const steps = [
    {
      label: 'Đơn hàng được tạo',
      icon: FileText,
      done: true,
      time: order.createdAt,
    },
    {
      label: order.paymentMethod === 'COD' ? 'Sales xác nhận COD' : 'Thanh toán thành công',
      icon: Wallet,
      done: ['Confirmed', 'Processing', 'Completed', 'Returned'].includes(os),
    },
    {
      label: 'Kho xử lý & đóng gói',
      icon: Box,
      done: ['Picking', 'PartiallyReady', 'Ready', 'Consolidating', 'Consolidated', 'HandedOver', 'Fulfilled'].includes(fs) || os === 'Returned' || os === 'Completed',
    },
    {
      label: 'Bàn giao vận chuyển',
      icon: Truck,
      done: ['HandedOver', 'Fulfilled'].includes(fs) || os === 'Returned' || os === 'Completed',
    },
    {
      label: 'Giao hàng thành công',
      icon: CheckCircle,
      done: ds === 'Delivered' || os === 'Completed' || os === 'Returned',
    },
  ];

  return steps;
}

export default function SalesOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth() as any;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [order, setOrder] = useState<SalesOrderDetail | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const [showDirectCancelModal, setShowDirectCancelModal] = useState(false);
  const [directCancelReason, setDirectCancelReason] = useState('');
  const [showDirectConfirmModal, setShowDirectConfirmModal] = useState(false);

  const [selectedReturnRequest, setSelectedReturnRequest] = useState<any | null>(null);
  const [showCreateReplacementModal, setShowCreateReplacementModal] = useState(false);
  const [pendingReplacementRequestId, setPendingReplacementRequestId] = useState<string | null>(null);

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/orders/sales/${id}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
        });
        if (!res.ok) throw new Error('Không thể tải chi tiết đơn hàng.');
        const data = await res.json();
        setOrder(data);

        // Tính giờ đếm ngược 35 phút cho đơn COD nháp
        if (data.paymentMethod === 'COD' && (data.orderStatus === 'Draft' || data.orderStatus === 'PendingConfirmation')) {
          const createdAt = new Date(data.createdAt).getTime();
          const limitTime = createdAt + 35 * 60 * 1000;
          const now = new Date().getTime();
          setTimeLeft(Math.max(0, Math.floor((limitTime - now) / 1000)));
        }
      } catch (err: any) {
        setError(err.message || 'Có lỗi xảy ra.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchDetail();
  }, [id]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0) {
      const timerId = setInterval(() => setTimeLeft(t => (t && t > 0 ? t - 1 : 0)), 1000);
      return () => clearInterval(timerId);
    }
  }, [timeLeft]);

  const handleConfirmOrder = async () => {
    if (!order) return;
    setIsConfirming(true);
    try {
      const response = await fetch(`/api/orders/sales/${order.id}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Lỗi khi xác nhận đơn hàng.');
      }

      alert('Xác nhận thành công!');
      const res = await fetch(`/api/orders/sales/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const data = await res.json();
      setOrder(data);
      setTimeLeft(null);
    } catch (err: any) {
      alert(err.message || 'Lỗi không xác định.');
    } finally {
      setIsConfirming(false);
    }
  };

  const [isCreatingReplacement, setIsCreatingReplacement] = useState(false);

  const handleCreateExchangeReplacement = async (requestId: string) => {
    if (isCreatingReplacement) return;
    setIsCreatingReplacement(true);
    try {
      const response = await fetch(`/api/delivery/exchange/${requestId}/replacement`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
      });

      let data: any = {};
      try {
        const text = await response.text();
        if (text) data = JSON.parse(text);
      } catch (e) {
        console.error("Parse error", e);
      }
      
      if (!response.ok) throw new Error(data.message || `Lỗi từ server: ${response.status} ${response.statusText}`);

      alert(data.message || 'Tạo đơn thay thế thành công!');
      
      const res = await fetch(`/api/orders/sales/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const orderData = await res.json();
      setOrder(orderData);
      setSelectedReturnRequest(null);
    } catch (err: any) {
      alert(err.message || 'Lỗi không xác định.');
    } finally {
      setIsCreatingReplacement(false);
    }
  };

  const handleProcessCancelRequest = async (isApproved: boolean, reason: string) => {
    if (!order) return;
    try {
      const response = await fetch(`/api/orders/sales/${order.id}/process-cancel-request`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}` 
        },
        body: JSON.stringify({ isApproved, reason })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Lỗi khi xử lý yêu cầu hủy.');
      }

      alert('Đã xử lý yêu cầu hủy đơn thành công!');
      // Reload order
      const res = await fetch(`/api/orders/sales/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      const data = await res.json();
      setOrder(data);
    } catch (err: any) {
      alert(err.message || 'Lỗi không xác định.');
    }
  };

  const formatTimeLeft = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-[#1F3B64]" />
          <p className="text-sm text-slate-500">Đang tải chi tiết đơn hàng...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="rounded-full bg-red-50 p-4">
          <XCircle className="h-8 w-8 text-red-400" />
        </div>
        <p className="text-red-600 font-medium">{error || 'Không tìm thấy thông tin đơn hàng'}</p>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
        </button>
      </div>
    );
  }

  const isCOD = order.paymentMethod === 'COD';
  const isPending = order.orderStatus === 'Draft' || order.orderStatus === 'PendingConfirmation';
  const timeline = getTimelineSteps(order);
  const activeStep = timeline.filter(s => s.done).length;

  const orderMeta = ORDER_STATUS[order.orderStatus] || { label: order.orderStatus, color: '#6B7280', bg: '#F3F4F6' };
  const paymentMeta = PAYMENT_STATUS[order.paymentStatus] || { label: order.paymentStatus, color: '#6B7280', bg: '#F3F4F6' };
  const fulfillmentMeta = FULFILLMENT_STATUS[order.fulfillmentStatus || ''] || { label: order.fulfillmentStatus || '--', color: '#6B7280', bg: '#F3F4F6' };
  const deliveryMeta = DELIVERY_STATUS[order.deliveryStatus || ''] || { label: order.deliveryStatus || '--', color: '#6B7280', bg: '#F3F4F6' };

  const totalQty = order.items.reduce((s, i) => s + i.quantity, 0);
  const failedDeliveryCount = order.failedDeliveryCount ?? 0;
  const amountPaid = order.amountPaid ?? 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 border-b bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900">Đơn hàng #{order.orderCode}</h1>
                <StatusChip {...orderMeta} />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Ngày tạo: {formatDateTime(order.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(order.orderStatus === 'Draft' || order.orderStatus === 'New' || order.orderStatus === 'PendingConfirmation') && (user?.role === 'SalesManager' || user?.role === 'Admin') && (
              <>
                <button
                  onClick={() => setShowDirectConfirmModal(true)}
                  disabled={isConfirming}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Xác nhận
                </button>
                <button
                  onClick={() => setShowDirectCancelModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Hủy đơn
                </button>
              </>
            )}
            {order.invoicePdfUrl && (
              <a
                href={order.invoicePdfUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Tải hóa đơn
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* ── Cancel Requested Banner ─────────────────────────────────── */}
        {order.orderStatus === 'CancelRequested' && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-red-100 p-2 rounded-full flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-red-800 font-bold">Khách hàng yêu cầu hủy đơn</h3>
                <p className="text-sm text-red-700 mt-1">Đơn hàng đang chờ bạn duyệt yêu cầu hủy.</p>
              </div>
            </div>
            {(user?.role === 'SalesManager' || user?.role === 'Admin') && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-white border border-red-200 text-red-600 font-medium rounded-xl hover:bg-red-50 transition-colors"
                >
                  Từ chối hủy
                </button>
                <button
                  onClick={() => setShowAcceptConfirm(true)}
                  className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white font-medium rounded-xl hover:bg-red-700 transition-colors shadow-sm"
                >
                  Chấp nhận hủy
                </button>
              </div>
            )}
          </div>
        )}
        {/* ── COD Confirmation Banner ─────────────────────────────────── */}
        {isPending && (
          <div
            className={`mb-6 rounded-2xl border p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between ${
              isCOD
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200'
                : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {isCOD ? (
                <div className="rounded-xl bg-amber-100 p-2.5 shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
              ) : (
                <div className="rounded-xl bg-blue-100 p-2.5 shrink-0">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
              )}
              <div>
                <h3 className={`font-semibold text-sm ${isCOD ? 'text-amber-800' : 'text-blue-800'}`}>
                  {isCOD ? 'Đơn hàng COD đang chờ bạn xác nhận' : 'Chờ khách hàng thanh toán SePay'}
                </h3>
                <p className={`text-xs mt-1 ${isCOD ? 'text-amber-600' : 'text-blue-600'}`}>
                  {isCOD
                    ? 'Kiểm tra lại địa chỉ, SĐT khách hàng. Thời gian giới hạn 35 phút kể từ khi đặt.'
                    : 'Hệ thống tự động xác nhận khi webhook SePay trả về kết quả thanh toán thành công.'}
                </p>
              </div>
            </div>

            {isCOD && (
              <div className="flex items-center gap-2.5 shrink-0">
                {timeLeft !== null && (
                  <div
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-mono text-sm font-bold ${
                      timeLeft < 300
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : 'bg-white text-amber-700 border border-amber-200'
                    }`}
                  >
                    <Timer className="w-4 h-4" />
                    {formatTimeLeft(timeLeft)}
                  </div>
                )}
                <button
                  className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-all"
                >
                  <XCircle className="w-3.5 h-3.5 text-red-500" />
                  Từ chối
                </button>
                <button
                  onClick={handleConfirmOrder}
                  disabled={isConfirming || timeLeft === 0}
                  className="px-4 py-2 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ backgroundColor: PRIMARY }}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  {isConfirming ? 'Đang xử lý...' : 'Xác nhận COD'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Timeline Progress ───────────────────────────────────────── */}
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <ChevronRight className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900">Tiến trình xử lý đơn</h3>
            <span className="text-xs text-slate-400 ml-auto">{activeStep}/{timeline.length} bước</span>
          </div>
          <div className="flex items-start justify-between relative">
            {timeline.map((step, i) => {
              const Icon = step.icon;
              const isDone = step.done;
              const isCurrent = i === activeStep;
              return (
                <div key={i} className="flex flex-col items-center relative z-10 flex-1">
                  {i < timeline.length - 1 && (
                    <div className="absolute top-5 left-1/2 w-full h-0.5 bg-slate-100" style={{ zIndex: -1 }} />
                  )}
                  {i < activeStep - 1 && (
                    <div className="absolute top-5 left-1/2 w-full h-0.5 transition-all duration-500" style={{ backgroundColor: PRIMARY, zIndex: -1 }} />
                  )}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                      isDone
                        ? 'text-white shadow-md'
                        : isCurrent
                        ? 'bg-white border-2 text-slate-400 shadow-sm'
                        : 'bg-slate-100 text-slate-300'
                    }`}
                    style={isDone ? { backgroundColor: PRIMARY } : isCurrent ? { borderColor: PRIMARY, color: PRIMARY } : {}}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <p
                    className={`mt-2 text-[11px] text-center max-w-[100px] leading-tight font-medium ${
                      isDone ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    {step.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ── Left Column: Info Cards ────────────────────────────────── */}
          <div className="lg:col-span-1 space-y-5">
            {/* Khách hàng */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#EEF2FF' }}>
                  <User className="w-4 h-4" style={{ color: PRIMARY }} />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">Khách hàng</h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Người liên hệ</p>
                    <p className="text-sm font-medium text-slate-900 truncate">{order.customerName}</p>
                  </div>
                </div>

                {order.companyName && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                    <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Công ty</p>
                      <p className="text-sm font-medium text-slate-900 truncate">{order.companyName}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Điện thoại</p>
                    <p className="text-sm font-medium text-slate-900">{order.customerPhone || '---'}</p>
                  </div>
                </div>

                {order.customerEmail && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                    <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Email</p>
                      <p className="text-sm font-medium text-slate-900 truncate">{order.customerEmail}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Giao hàng */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50">
                  <Truck className="w-4 h-4 text-emerald-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">Giao hàng</h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Địa chỉ giao</p>
                    <p className="text-sm font-medium text-slate-900 leading-relaxed">{order.shippingAddress || '---'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Kho</p>
                    <div className="mt-1">
                      <StatusChip {...fulfillmentMeta} />
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Vận chuyển</p>
                    <div className="mt-1">
                      <StatusChip {...deliveryMeta} />
                    </div>
                  </div>
                </div>

                {order.scheduledDeliveryDate && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-slate-50">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Ngày giao dự kiến</p>
                      <p className="text-xs font-semibold text-slate-700 mt-1">{new Date(order.scheduledDeliveryDate).toLocaleDateString('vi-VN')}</p>
                    </div>
                    {order.deliveryShift && (
                      <div className="p-3 rounded-xl bg-slate-50">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Ca giao</p>
                        <p className="text-xs font-semibold text-slate-700 mt-1">{order.deliveryShift}</p>
                      </div>
                    )}
                  </div>
                )}

                {order.deliveryVehicleId && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50">
                    <Truck className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Xe giao hàng</p>
                      <p className="text-sm font-medium text-slate-900">Xe {order.deliveryVehicleId}</p>
                    </div>
                  </div>
                )}

                {failedDeliveryCount > 0 && (
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 text-red-700">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-wider text-red-400 font-semibold">Số lần giao thất bại</p>
                      <p className="text-sm font-bold">{failedDeliveryCount} lần</p>
                    </div>
                  </div>
                )}

                {(order.customerSignatureUrl || order.deliveryPhotoUrl) && (
                  <div className="border-t border-slate-100 pt-3 space-y-2">
                    <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Bằng chứng giao hàng (POD)</p>
                    <div className="flex gap-3">
                      {order.customerSignatureUrl && (
                        <div className="flex-1">
                          <p className="text-[9px] text-slate-400 mb-1">Chữ ký khách hàng</p>
                          <div className="border border-slate-150 rounded-lg p-1 bg-slate-50 flex justify-center">
                            <img src={order.customerSignatureUrl} alt="Chữ ký" className="h-14 object-contain animate-fadeIn" />
                          </div>
                        </div>
                      )}
                      {order.deliveryPhotoUrl && (
                        <div className="flex-1">
                          <p className="text-[9px] text-slate-400 mb-1">Ảnh thực tế</p>
                          <div className="border border-slate-150 rounded-lg p-1 bg-slate-50 flex justify-center">
                            <img src={order.deliveryPhotoUrl} alt="Ảnh hiện trường" className="h-14 w-full object-cover rounded animate-fadeIn" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Thanh toán */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-violet-50">
                  <CreditCard className="w-4 h-4 text-violet-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">Thanh toán</h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                  <span className="text-xs text-slate-500">Phương thức</span>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-white text-slate-700 border border-slate-200">
                    {order.paymentMethod}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                  <span className="text-xs text-slate-500">Trạng thái</span>
                  <StatusChip {...paymentMeta} />
                </div>
              </div>

              {/* Bảng tóm tắt chi phí */}
              <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Tạm tính</span>
                  <span className="font-medium text-slate-700 tabular-nums">{formatPrice(order.totalAmount)} ₫</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-emerald-600">Chiết khấu</span>
                    <span className="font-medium text-emerald-600 tabular-nums">-{formatPrice(order.discountAmount)} ₫</span>
                  </div>
                )}
                {order.vatAmount > 0 && (
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Thuế VAT (10%)</span>
                    <span className="font-medium text-slate-700 tabular-nums">{formatPrice(order.vatAmount)} ₫</span>
                  </div>
                )}
                {order.creditApplied > 0 && (
                  <div className="flex justify-between text-xs text-blue-600">
                    <span>Thanh toán bằng Credit</span>
                    <span className="font-medium tabular-nums">-{formatPrice(order.creditApplied)} ₫</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t border-dashed border-slate-200">
                  <span className="text-sm font-bold text-slate-900">{order.creditApplied > 0 ? "Khách cần trả thêm" : "Tổng cộng"}</span>
                  <span className="text-xl font-extrabold tabular-nums" style={{ color: PRIMARY }}>
                    {formatPrice(order.finalPayment)} ₫
                  </span>
                </div>
                {(amountPaid > 0 || order.paymentStatus === 'PartiallyPaid') && (
                  <div className="border-t border-dashed border-slate-200 pt-3 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Đã thanh toán (Thực thu)</span>
                      <span className="font-semibold text-emerald-600 tabular-nums">{formatPrice(amountPaid)} ₫</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Còn thiếu (Công nợ)</span>
                      <span className="font-semibold text-amber-600 tabular-nums">{formatPrice(Math.max(0, order.finalPayment - amountPaid))} ₫</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Right Column: Product List ─────────────────────────────── */}
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-slate-500" />
                  <h3 className="text-sm font-semibold text-slate-900">Chi tiết sản phẩm</h3>
                </div>
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                  {order.items.length} sản phẩm · {totalQty} đơn vị
                </span>
              </div>

              {/* Product Cards */}
              <div className="divide-y divide-slate-100">
                {order.items?.map((item, idx) => (
                  <div key={item.id || item.productId || idx} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                    {/* Product Image */}
                    <div className="w-14 h-14 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0">
                      {item.productImageUrl ? (
                        <img
                          src={item.productImageUrl}
                          alt={item.productName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-slate-300" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{item.productName}</p>
                      {item.productSku && (
                        <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          {item.productSku}
                        </p>
                      )}
                    </div>

                    {/* Quantity */}
                    <div className="text-center shrink-0 w-16">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">SL</p>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">{item.quantity}</p>
                    </div>

                    {/* Unit Price */}
                    <div className="text-right shrink-0 w-28">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Đơn giá</p>
                      <p className="text-sm font-medium text-slate-600 tabular-nums mt-0.5">{formatPrice(item.priceSnapshot)} ₫</p>
                    </div>

                    {/* Line Total */}
                    <div className="text-right shrink-0 w-32">
                      <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Thành tiền</p>
                      <p className="text-sm font-bold text-slate-900 tabular-nums mt-0.5">{formatPrice(item.lineTotal)} ₫</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer Summary */}
              <div className="border-t border-slate-200 bg-slate-50/50 px-5 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    Tổng {order.items.length} sản phẩm ({totalQty} đơn vị)
                  </span>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 mr-2">Tổng tiền hàng:</span>
                    <span className="text-lg font-extrabold tabular-nums" style={{ color: PRIMARY }}>
                      {formatPrice(order.totalAmount)} ₫
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-center">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-2">
                  <Hash className="w-4 h-4 text-blue-600" />
                </div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Mã đơn</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{order.orderCode}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-center">
                <div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center mx-auto mb-2">
                  <Calendar className="w-4 h-4 text-violet-600" />
                </div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Ngày đặt</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{formatDateTime(order.createdAt).split(',')[0] || formatDateTime(order.createdAt)}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-center">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-2">
                  <Package className="w-4 h-4 text-emerald-600" />
                </div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Sản phẩm</p>
                <p className="text-sm font-bold text-slate-900 mt-0.5">{totalQty} đơn vị</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2" style={{ backgroundColor: '#EEF2FF' }}>
                  <Wallet className="w-4 h-4" style={{ color: PRIMARY }} />
                </div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">Thanh toán</p>
                <p className="text-sm font-bold mt-0.5" style={{ color: PRIMARY }}>
                  {formatPrice(order.finalPayment)} ₫
                </p>
              </div>
            </div>

            <ReturnExchangeRequestsSection
              requests={order.returnExchangeRequests}
              description="Lịch sử yêu cầu từ khách hàng"
              onSelect={setSelectedReturnRequest}
            />
          </div>
        </div>
      </div>

      {/* Modal Chi tiết Yêu cầu Đổi/Trả */}
      {selectedReturnRequest && (
        <ReturnExchangeRequestDetailModal
          request={selectedReturnRequest}
          onClose={() => setSelectedReturnRequest(null)}
        />
      )}

      {/* Modals cho Yêu cầu hủy đơn */}
      <ConfirmModal
        isOpen={showAcceptConfirm}
        title="Xác nhận hủy đơn"
        message="Bạn có chắc chắn muốn chấp nhận yêu cầu hủy đơn hàng này?"
        onConfirm={() => {
          setShowAcceptConfirm(false);
          handleProcessCancelRequest(true, 'Đồng ý hủy theo yêu cầu khách hàng');
        }}
        onCancel={() => setShowAcceptConfirm(false)}
        confirmText="Chấp nhận hủy"
      />

      {showRejectModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold text-gray-900">Từ chối yêu cầu hủy đơn</h3>
            <p className="mb-4 text-sm text-gray-500">Vui lòng nhập lý do từ chối yêu cầu hủy đơn hàng này của khách hàng.</p>
            <textarea
              className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              rows={3}
              placeholder="Nhập lý do từ chối..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Hủy
              </button>
              <button
                onClick={() => {
                  if (!rejectReason.trim()) {
                    alert('Vui lòng nhập lý do');
                    return;
                  }
                  setShowRejectModal(false);
                  handleProcessCancelRequest(false, rejectReason);
                }}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showDirectConfirmModal}
        title="Xác nhận đơn hàng"
        message="Bạn có chắc muốn xác nhận đơn hàng này và chuyển xuống kho?"
        onConfirm={() => {
          setShowDirectConfirmModal(false);
          handleConfirmOrder();
        }}
        onCancel={() => setShowDirectConfirmModal(false)}
        confirmText="Xác nhận"
      />

      {showDirectCancelModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold text-gray-900">Hủy đơn hàng</h3>
            <p className="mb-4 text-sm text-gray-500">Vui lòng nhập lý do hủy đơn hàng này.</p>
            <textarea
              className="w-full rounded-xl border border-gray-300 p-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              rows={3}
              placeholder="Nhập lý do hủy..."
              value={directCancelReason}
              onChange={(e) => setDirectCancelReason(e.target.value)}
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowDirectCancelModal(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  if (!directCancelReason.trim()) {
                    alert('Vui lòng nhập lý do');
                    return;
                  }
                  setShowDirectCancelModal(false);
                  handleProcessCancelRequest(true, directCancelReason);
                }}
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
