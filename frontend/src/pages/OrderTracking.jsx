import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  MapPin,
  CreditCard,
  Phone,
  User,
  CalendarDays,
  AlertCircle,
  ArrowRight,
  Receipt,
  Download,
  Sparkles,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import Header from '../components/Header.jsx';
import Footer from '../components/Footer.jsx';
import { trackOrderPublic, orderStatusMeta, paymentStatusMeta, getOrderTimeline } from '../services/orderService.js';
import { ReturnExchangeRequestDetailModal } from '../components/ReturnExchangeRequests';

const PRIMARY = '#1F3B64';

const formatPrice = (n) =>
  n?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }) ?? '—';

const formatDate = (iso) => {
  if (!iso) return '—';
  let s = iso;
  if (!s.endsWith('Z') && !s.includes('+')) {
    s += 'Z';
  }
  return new Date(s).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function OrderTracking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('code') || searchParams.get('query') || '';
  
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [selectedReturnRequest, setSelectedReturnRequest] = useState(null);

  const handleSearch = async (queryToSearch) => {
    const q = (queryToSearch || searchQuery).trim();
    if (!q) return;

    setLoading(true);
    setError(null);
    try {
      const data = await trackOrderPublic(q);
      setOrder(data);
      setSearchParams({ query: q });
    } catch (err) {
      console.error(err);
      setError(err.message || 'Không tìm thấy thông tin đơn hàng.');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, []);

  const timeline = order ? getOrderTimeline(order.orderStatus, order.deliveryStatus) : [];
  const payMeta = order ? (paymentStatusMeta[order.paymentStatus] || { label: order.paymentStatus, badgeClass: 'bg-gray-100 text-gray-700' }) : null;
  const orderMeta = order ? (orderStatusMeta[order.orderStatus] || { label: order.orderStatus, badgeClass: 'bg-gray-100 text-gray-700' }) : null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Header />

      <main className="flex-1 pt-24 pb-16">
        {/* Hero Search Section */}
        <section className="bg-[#1F3B64] py-12 px-4 text-white relative overflow-hidden shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/30 to-indigo-900/30 backdrop-blur-xs pointer-events-none" />
          
          <div className="relative max-w-4xl mx-auto text-center space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 backdrop-blur-md text-blue-200 border border-white/10">
              <Sparkles className="h-3.5 w-3.5" /> Tra cứu thời gian thực
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Theo Dõi Đơn Hàng Việt Tiến
            </h1>
            <p className="text-slate-200 text-sm max-w-xl mx-auto">
              Nhập mã đơn hàng (ví dụ: <span className="font-mono font-semibold text-white">VT-20260722-001</span> hoặc <span className="font-mono font-semibold text-white">VT-EX-...</span>) hoặc Số điện thoại để kiểm tra hành trình vận chuyển.
            </p>

            {/* Search Input Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="mt-6 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto bg-white p-2 rounded-2xl shadow-2xl border border-white/20"
            >
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Nhập Mã đơn hàng hoặc Số điện thoại mua hàng..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 text-slate-900 placeholder-slate-400 font-medium rounded-xl focus:outline-none text-sm bg-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-[#1F3B64] hover:bg-[#152a48] text-white font-bold text-sm rounded-xl transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    <span>Tra cứu</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </section>

        {/* Results Area */}
        <div className="max-w-5xl mx-auto px-4 mt-8 space-y-6">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50/80 p-6 text-center text-red-700 shadow-sm">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
              <p className="font-semibold">{error}</p>
              <p className="text-xs text-red-500 mt-1">Vui lòng kiểm tra lại mã đơn hàng hoặc liên hệ nhân viên hỗ trợ.</p>
            </div>
          )}

          {!order && !loading && !error && (
            <div className="rounded-3xl border border-slate-200/80 bg-white p-12 text-center shadow-sm space-y-3">
              <Package className="h-16 w-16 mx-auto text-slate-300 stroke-[1.5]" />
              <h3 className="text-lg font-bold text-slate-700">Chưa có thông tin tra cứu</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Nhập Mã đơn hàng vào ô tìm kiếm ở trên để xem tiến trình giao hàng, chi tiết sản phẩm và trạng thái thanh toán.
              </p>
            </div>
          )}

          {order && (
            <>
              {/* Order Status & Progress Timeline */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Mã đơn hàng</span>
                    <h2 className="text-2xl font-black text-slate-900 font-mono tracking-tight mt-0.5">{order.orderCode}</h2>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-slate-400" /> Ngày đặt hàng: <span className="font-semibold text-slate-700">{formatDate(order.createdAt)}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {payMeta && (
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${payMeta.badgeClass}`}>
                        {payMeta.label}
                      </span>
                    )}
                    {orderMeta && (
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${orderMeta.badgeClass}`}>
                        {orderMeta.label}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stepper Timeline */}
                <div className="mt-8">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-6">Lộ trình vận chuyển &amp; xử lý</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 relative">
                    {timeline.map((step, idx) => (
                      <div key={step.key} className="flex flex-col items-center text-center relative z-10">
                        <div
                          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-sm font-extrabold transition-all shadow-xs ${
                            step.done
                              ? 'bg-[#1F3B64] text-white ring-4 ring-blue-50'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {step.done ? <CheckCircle2 className="h-6 w-6" /> : idx + 1}
                        </div>
                        <p className={`mt-3 text-xs font-bold ${step.done ? 'text-slate-900' : 'text-slate-400'}`}>
                          {step.title}
                        </p>
                        {step.done && (
                          <span className="mt-1 text-[11px] font-semibold text-emerald-600">Hoàn thành</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Detail Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left 2 Cols: Shipping & Products */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Shipping Info */}
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4 flex items-center gap-2">
                      <Truck className="h-4 w-4 text-[#1F3B64]" /> Thông tin nhận hàng &amp; Giao vận
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Người nhận hàng</p>
                        <p className="font-semibold text-slate-800 text-sm mt-0.5">{order.customerName}</p>
                      </div>
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Số điện thoại</p>
                        <p className="font-semibold text-slate-800 text-sm mt-0.5">{order.customerPhone}</p>
                      </div>
                      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 sm:col-span-2">
                        <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Địa chỉ giao hàng</p>
                        <p className="font-semibold text-slate-800 text-sm mt-0.5">{order.shippingAddress}</p>
                      </div>
                      {order.deliveryShift && (
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                          <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Ca giao hàng</p>
                          <p className="font-semibold text-slate-800 text-sm mt-0.5">{order.deliveryShift}</p>
                        </div>
                      )}
                      {order.scheduledDeliveryDate && (
                        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                          <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Ngày giao dự kiến</p>
                          <p className="font-semibold text-slate-800 text-sm mt-0.5">{new Date(order.scheduledDeliveryDate).toLocaleDateString('vi-VN')}</p>
                        </div>
                      )}
                    </div>

                    {/* Proof of delivery (POD) */}
                    {(order.customerSignatureUrl || order.deliveryPhotoUrl) && (
                      <div className="mt-4 pt-4 border-t border-slate-100">
                        <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Minh chứng giao hàng (POD)</p>
                        <div className="flex gap-4">
                          {order.customerSignatureUrl && (
                            <img src={order.customerSignatureUrl} alt="Chữ ký" className="h-16 object-contain border rounded-xl p-1 bg-slate-50" />
                          )}
                          {order.deliveryPhotoUrl && (
                            <img src={order.deliveryPhotoUrl} alt="Ảnh giao hàng" className="h-16 w-24 object-cover border rounded-xl p-1 bg-slate-50" />
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4 flex items-center gap-2">
                      <Package className="h-4 w-4 text-[#1F3B64]" /> Danh sách sản phẩm ({order.items?.length || 0})
                    </h3>
                    <div className="divide-y divide-slate-100">
                      {(order.items || []).map((item, idx) => (
                        <div key={idx} className="py-3 flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {item.productImage ? (
                              <img src={item.productImage} alt={item.productName} className="h-12 w-12 rounded-xl object-cover border border-slate-100" />
                            ) : (
                              <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                <Package className="h-6 w-6" />
                              </div>
                            )}
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{item.productName}</p>
                              <p className="text-xs text-slate-400">SKU: <span className="font-mono text-slate-600">{item.productSku || 'N/A'}</span></p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-900">{formatPrice(item.lineTotal || (item.priceSnapshot * item.quantity))}</p>
                            <p className="text-xs text-slate-500">Số lượng: <span className="font-semibold text-slate-800">x{item.quantity}</span></p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Exchange Requests History */}
                  {order.returnExchangeRequests && order.returnExchangeRequests.length > 0 && (
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 mb-4 flex items-center gap-2">
                        <RefreshCw className="h-4 w-4 text-[#1F3B64]" /> Lịch sử Yêu cầu Đổi/Trả ({order.returnExchangeRequests.length})
                      </h3>
                      <div className="space-y-3">
                        {order.returnExchangeRequests.map((req, idx) => (
                          <div key={req.id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-900">Yêu cầu #{idx + 1}</span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  req.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                  req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                }`}>
                                  {req.status === 'Pending' ? 'Đang xử lý' : req.status === 'Approved' ? 'Đã duyệt' : 'Từ chối'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-1">Lý do: {req.reason}</p>
                            </div>
                            <button
                              onClick={() => setSelectedReturnRequest(req)}
                              className="px-3 py-1.5 text-xs font-semibold text-[#1F3B64] bg-white border border-slate-200 rounded-xl hover:bg-slate-100 transition"
                            >
                              Xem chi tiết
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Col: Financial Summary & SePay QR */}
                <div className="space-y-6">
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-[#1F3B64]" /> Chi tiết Thanh toán
                    </h3>
                    
                    <div className="space-y-2.5 text-xs text-slate-600">
                      <div className="flex justify-between">
                        <span>Tạm tính:</span>
                        <span className="font-semibold text-slate-800">{formatPrice(order.totalAmount)}</span>
                      </div>
                      {order.discountAmount > 0 && (
                        <div className="flex justify-between text-emerald-600">
                          <span>Chiết khấu:</span>
                          <span className="font-semibold">- {formatPrice(order.discountAmount)}</span>
                        </div>
                      )}
                      {order.creditApplied > 0 && (
                        <div className="flex justify-between text-blue-600">
                          <span>Cấn trừ Credit:</span>
                          <span className="font-semibold">- {formatPrice(order.creditApplied)}</span>
                        </div>
                      )}
                      <div className="border-t border-slate-100 pt-2.5 flex justify-between text-sm font-bold text-slate-900">
                        <span>Tổng phải trả:</span>
                        <span className="text-base text-[#1F3B64]">{formatPrice(order.finalPayment)}</span>
                      </div>
                    </div>


                  </div>
                </div>

              </div>
            </>
          )}
        </div>
      </main>

      {/* Modal Chi tiết Yêu cầu Đổi/Trả */}
      {selectedReturnRequest && (
        <ReturnExchangeRequestDetailModal
          request={selectedReturnRequest}
          onClose={() => setSelectedReturnRequest(null)}
        />
      )}

      <Footer />
    </div>
  );
}
