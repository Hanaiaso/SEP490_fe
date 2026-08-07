import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  CreditCard,
  Download,
  ExternalLink,
  MapPin,
  Package,
  Phone,
  Receipt,
  RefreshCw,
  User,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import Footer from '../components/Footer.jsx'
import Header from '../components/Header.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Button } from '../components/ui/Button.jsx'
import {
  downloadInvoicePdf,
  getOrderDetail,
  getOrderTimeline,
  orderStatusMeta,
  paymentStatusMeta,
  redInvoiceStatusMeta,
  requestVatInvoice,
  requestCancelOrder,
  createExchangeRequest
} from '../services/orderService.js'
import { exportInvoiceToPdf } from '../utils/exportPdf.js'
import ExchangeRequestModal from './sales/ExchangeRequestModal.tsx'
import { ReturnExchangeRequestDetailModal } from '../components/ReturnExchangeRequests'

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-gray-50 px-4 py-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-gray-700 shadow-sm">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</p>
        <p className="mt-1 text-sm font-medium text-gray-900 break-words">{value || '—'}</p>
      </div>
    </div>
  )
}

const formatPrice = (n) =>
  n?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }) ?? '—'

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
}

export default function OrderDetail() {
  const { orderId } = useParams()
  const navigate    = useNavigate()

  const [order,      setOrder]      = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [vatLoading, setVatLoading] = useState(false)
  const [vatDone, setVatDone] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [showExchangeModal, setShowExchangeModal] = useState(false)
  const [selectedReturnRequest, setSelectedReturnRequest] = useState(null)

  const fetchOrder = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getOrderDetail(orderId)
      setOrder(data)
    } catch (err) {
      console.error(err)
      setError(err?.response?.data?.message || 'Không thể tải chi tiết đơn hàng')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrder()
  }, [orderId])

  const handleRequestCancel = async () => {
    if (!cancelReason.trim()) {
      alert('Vui lòng nhập lý do hủy đơn')
      return
    }
    try {
      setCancelLoading(true)
      await requestCancelOrder(orderId, { reason: cancelReason })
      setCancelModalOpen(false)
      fetchOrder()
    } catch (err) {
      console.error(err)
      alert(err?.response?.data?.message || 'Có lỗi xảy ra khi yêu cầu hủy đơn')
    } finally {
      setCancelLoading(false)
    }
  }

  const handleRequestVat = async () => {
    setVatLoading(true)
    try {
      await requestVatInvoice(order.id)
      setOrder((prev) => ({ ...prev, canRequestVat: false, redInvoiceStatus: 'Pending' }))
      setVatDone(true)
    } catch (err) {
      alert(err.message || 'Lỗi khi yêu cầu hóa đơn VAT.')
    } finally {
      setVatLoading(false)
    }
  }

  async function handleDownloadPdf() {
    try {
      if (!order) return
      // Hiển thị trạng thái đang tải (có thể dùng button loading sau này)
      await exportInvoiceToPdf(order)
    } catch (err) {
      alert(err.message)
    }
  }

  const handleExchangeRequest = async (payload) => {
    try {
      await createExchangeRequest(order.id, payload)
      alert('Đã gửi yêu cầu đổi/trả hàng thành công!')
      setShowExchangeModal(false)
      fetchOrder()
    } catch (err) {
      alert(err.message || 'Lỗi khi tạo yêu cầu.')
    }
  }

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex flex-col items-center justify-center pt-40">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
          <p className="mt-4 text-sm text-gray-500">Đang tải chi tiết đơn hàng...</p>
        </div>
        <Footer />
      </div>
    )
  }

  // ─── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex flex-col items-center justify-center pt-40">
          <AlertCircle className="h-12 w-12 text-red-400" />
          <p className="mt-3 text-sm font-medium text-gray-700">{error}</p>
          <div className="mt-5 flex gap-3">
            <Button variant="outline" className="rounded-full gap-2" onClick={fetchOrder}>
              <RefreshCw className="h-4 w-4" />
              Thử lại
            </Button>
            <Link to="/profile?tab=orders">
              <Button variant="outline" className="rounded-full">
                Về lịch sử đơn hàng
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!order) return null

  const payMeta   = paymentStatusMeta[order.paymentStatus]   || { label: order.paymentStatus,   badgeClass: 'bg-gray-100 text-gray-500' }
  const orderMeta = orderStatusMeta[order.orderStatus]       || { label: order.orderStatus,     badgeClass: 'bg-gray-100 text-gray-500' }
  const vatMeta   = redInvoiceStatusMeta[order.redInvoiceStatus] || redInvoiceStatusMeta.None
  const timeline  = getOrderTimeline(order.orderStatus, order.deliveryStatus)

  const vatDeadlineStr = order.vatDeadline
    ? new Date(order.vatDeadline).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="pt-20">
        {/* Breadcrumb */}
        <div className="border-b border-gray-100 bg-white">
          <div className="mx-auto max-w-[1440px] px-6 py-4 lg:px-8">
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <Link to="/" className="hover:text-gray-900">Trang Chủ</Link>
              <ChevronRight className="h-4 w-4" />
              <Link to="/profile?tab=orders" className="hover:text-gray-900">Lịch sử đơn hàng</Link>
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium text-gray-900">{order.orderCode}</span>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1440px] px-6 py-8 lg:px-8">
          {/* Header row */}
          <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link
                to="/profile?tab=orders"
                className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại lịch sử đơn hàng
              </Link>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Chi tiết đơn hàng {order.orderCode}
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-gray-500">
                Theo dõi trạng thái đơn hàng, xem lại thông tin giao nhận và kiểm tra chứng từ.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Badge className={`${payMeta.badgeClass} px-3 py-1.5 text-xs font-medium hover:opacity-100`}>
                {payMeta.label}
              </Badge>
              <Badge className={`${orderMeta.badgeClass} px-3 py-1.5 text-xs font-medium hover:opacity-100`}>
                {orderMeta.label}
              </Badge>

              {/* Nút tải PDF */}
              <Button
                variant="outline"
                className="rounded-full text-sm gap-2"
                onClick={handleDownloadPdf}
                title="Tải hóa đơn PDF"
              >
                <Download className="h-4 w-4" />
                Tải PDF
              </Button>

              {/* Nút yêu cầu VAT */}
              {order.canRequestVat && !vatDone && (
                <Button
                  variant="outline"
                  className="rounded-full text-sm text-blue-600 hover:bg-blue-50 hover:text-blue-700 gap-2"
                  onClick={handleRequestVat}
                  disabled={vatLoading}
                >
                  <Receipt className="h-4 w-4" />
                  {vatLoading ? 'Đang gửi...' : 'Yêu cầu VAT'}
                </Button>
              )}

              {/* Nút yêu cầu hủy đơn */}
              {['PendingPayment', 'PendingConfirmation', 'Confirmed', 'Processing'].includes(order.orderStatus) && (
                <Button
                  variant="outline"
                  className="rounded-full text-sm text-red-600 hover:bg-red-50 hover:text-red-700 gap-2"
                  onClick={() => setCancelModalOpen(true)}
                >
                  <AlertCircle className="h-4 w-4" />
                  Yêu cầu hủy đơn
                </Button>
              )}

              {/* Nút yêu cầu đổi/trả */}
              {order.orderStatus !== 'Returned' && 
               !(order.returnExchangeRequests && order.returnExchangeRequests.length > 0) &&
               (order.orderStatus === 'Completed' || ['Delivered', 'PartiallyDelivered'].includes(order.deliveryStatus)) && (
                <Button
                  variant="outline"
                  className="rounded-full text-sm text-orange-600 hover:bg-orange-50 hover:text-orange-700 gap-2"
                  onClick={() => setShowExchangeModal(true)}
                >
                  <RefreshCw className="h-4 w-4" />
                  Yêu cầu đổi/trả
                </Button>
              )}

              {/* Trạng thái VAT (sau khi đã yêu cầu) */}
              {(!order.canRequestVat || vatDone) && order.redInvoiceStatus !== 'None' && (
                <Badge className={`${vatMeta.badgeClass} px-3 py-1.5 text-xs font-medium hover:opacity-100`}>
                  VAT: {vatMeta.label}
                </Badge>
              )}
            </div>
          </div>

          {/* Cancel Requested Banner */}
          {order.orderStatus === 'CancelRequested' && (
            <div className="mb-4 flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>Đơn hàng đang chờ Sales duyệt yêu cầu hủy.</span>
              </div>
            </div>
          )}

          {/* VAT deadline banner */}
          {order.canRequestVat && vatDeadlineStr && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              <Receipt className="h-4 w-4 flex-shrink-0" />
              <span>Bạn có thể yêu cầu hóa đơn VAT trước <strong>{vatDeadlineStr}</strong>.</span>
            </div>
          )}

          {/* VAT done banner */}
          {vatDone && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <Receipt className="h-4 w-4 flex-shrink-0" />
              Yêu cầu hóa đơn VAT đã được ghi nhận. Đội kế toán sẽ liên hệ trong thời gian sớm nhất.
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            {/* Left column */}
            <div className="space-y-6">
              {/* Order overview */}
              <section className="rounded-[1.75rem] border border-gray-100 bg-white p-6">
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Tổng quan</p>
                    <h2 className="mt-2 text-xl font-semibold text-gray-900">Thông tin đơn hàng</h2>
                  </div>
                  <div className="rounded-2xl bg-gray-50 px-4 py-3 text-right">
                    <p className="text-xs uppercase tracking-wide text-gray-400">Tổng thanh toán</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{formatPrice(order.finalPayment)}</p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <InfoRow icon={Package}      label="Mã đơn hàng"       value={order.orderCode} />
                  <InfoRow icon={CalendarDays}  label="Ngày đặt"          value={formatDate(order.createdAt)} />
                  <InfoRow icon={CreditCard}    label="Thanh toán"        value={order.paymentMethod} />
                  <InfoRow icon={User}          label="Người nhận"        value={order.customerName || order.receiverName} />
                  <InfoRow icon={Phone}         label="Số điện thoại"     value={order.customerPhone || order.receiverPhone} />
                  <InfoRow icon={MapPin}        label="Địa chỉ giao hàng" value={order.shippingAddress || order.address} />
                  {order.deliveryShift && (
                    <InfoRow icon={MapPin} label="Ca giao hàng" value={order.deliveryShift} />
                  )}
                </div>
              </section>

              {/* Delivery info */}
              {order.deliveryStatus && order.deliveryStatus !== 'NotScheduled' && (
                <section className="rounded-[1.75rem] border border-gray-100 bg-white p-6">
                  <div className="mb-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Vận chuyển</p>
                    <h2 className="mt-2 text-xl font-semibold text-gray-900">Chi tiết giao nhận &amp; COD</h2>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <InfoRow icon={MapPin} label="Trạng thái giao" value={
                      order.deliveryStatus === 'Scheduled' ? 'Đã xếp lịch' :
                      order.deliveryStatus === 'InDelivery' ? 'Đang đi giao' :
                      order.deliveryStatus === 'Delivered' ? 'Đã giao thành công' :
                      order.deliveryStatus === 'PartiallyDelivered' ? 'Giao một phần' :
                      order.deliveryStatus === 'Failed' ? 'Thất bại' :
                      order.deliveryStatus === 'Rescheduled' ? 'Hẹn giao lại' : order.deliveryStatus
                    } />
                    <InfoRow icon={CalendarDays} label="Ngày giao dự kiến" value={order.scheduledDeliveryDate ? new Date(order.scheduledDeliveryDate).toLocaleDateString('vi-VN') : '—'} />
                    <InfoRow icon={MapPin} label="Ca giao" value={order.deliveryShift || '—'} />
                    <InfoRow icon={Package} label="Xe giao hàng" value={order.deliveryVehicleId ? `Xe ${order.deliveryVehicleId}` : '—'} />
                    <InfoRow icon={CreditCard} label="Số tiền đã thu (COD)" value={formatPrice(order.amountPaid)} />
                    {order.failedDeliveryCount > 0 && (
                      <InfoRow icon={AlertCircle} label="Số lần giao thất bại" value={`${order.failedDeliveryCount} lần`} />
                    )}
                  </div>

                  {/* Proof of Delivery (POD) images */}
                  {(order.customerSignatureUrl || order.deliveryPhotoUrl) && (
                    <div className="mt-6 border-t border-gray-100 pt-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-3">Minh chứng bàn giao hàng (POD)</h3>
                      <div className="flex flex-wrap gap-4">
                        {order.customerSignatureUrl && (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs text-gray-400 font-medium">Chữ ký khách hàng</span>
                            <div className="border border-gray-100 rounded-2xl bg-gray-50 p-2">
                              <img src={order.customerSignatureUrl} alt="Chữ ký" className="h-20 object-contain" />
                            </div>
                          </div>
                        )}
                        {order.deliveryPhotoUrl && (
                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs text-gray-400 font-medium">Ảnh hiện trường giao hàng</span>
                            <div className="border border-gray-100 rounded-2xl bg-gray-50 p-1">
                              <img src={order.deliveryPhotoUrl} alt="Ảnh giao hàng" className="h-20 w-32 object-cover rounded-xl" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Product list */}
              <section className="rounded-[1.75rem] border border-gray-100 bg-white p-6">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Sản phẩm</p>
                    <h2 className="mt-2 text-xl font-semibold text-gray-900">Danh sách sản phẩm</h2>
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                    {order.items?.length ?? 0} sản phẩm
                  </span>
                </div>

                <div className="space-y-4">
                  {(order.items || []).map((item) => (
                    <div
                      key={item.productId}
                      className="grid gap-4 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 md:grid-cols-[2fr_0.8fr_0.8fr_0.8fr]"
                    >
                      <div className="flex items-center gap-3">
                        {item.productImage && (
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="h-12 w-12 rounded-xl object-cover flex-shrink-0"
                          />
                        )}
                        <div>
                          <p className="text-base font-semibold text-gray-900">{item.productName}</p>
                          {item.productSku && (
                            <p className="mt-0.5 text-xs text-gray-400">SKU: {item.productSku}</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400">Đơn giá</p>
                        <p className="mt-1 text-sm font-medium text-gray-900">{formatPrice(item.priceSnapshot)}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400">Số lượng</p>
                        <p className="mt-1 text-sm font-medium text-gray-900">{item.quantity}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-wide text-gray-400">Thành tiền</p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">{formatPrice(item.lineTotal)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Lịch sử yêu cầu đổi/trả */}
              {order.returnExchangeRequests && order.returnExchangeRequests.length > 0 && (
                <section className="rounded-[1.75rem] border border-gray-100 bg-white p-6">
                  <div className="mb-5 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Đổi/Trả</p>
                      <h2 className="mt-2 text-xl font-semibold text-gray-900">Lịch sử Yêu cầu Đổi/Trả</h2>
                    </div>
                  </div>
                  <div className="space-y-4">
                    {order.returnExchangeRequests.map((req, idx) => (
                      <div key={req.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-5 flex justify-between items-center transition-colors hover:bg-gray-100">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-semibold text-gray-900">Yêu cầu #{idx + 1}</h3>
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              req.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                              req.status === 'Approved' ? 'bg-green-100 text-green-700' :
                              req.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                              'bg-gray-200 text-gray-700'
                            }`}>
                              {req.status === 'Pending' ? 'Đang xử lý' :
                               req.status === 'Approved' ? 'Đã duyệt' :
                               req.status === 'Rejected' ? 'Từ chối' : req.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 truncate max-w-[200px] sm:max-w-md">Lý do: {req.reason}</p>
                        </div>
                        <button
                          onClick={() => setSelectedReturnRequest(req)}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-700 bg-white border border-gray-200 px-4 py-2 rounded-xl shadow-sm hover:border-gray-300 transition-colors"
                        >
                          Xem chi tiết
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Timeline */}
              <section className="rounded-[1.75rem] border border-gray-100 bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Tiến trình</p>
                <h2 className="mt-2 text-xl font-semibold text-gray-900">Lộ trình xử lý đơn</h2>

                <div className="mt-6 space-y-4">
                  {timeline.map((step, index) => (
                    <div key={step.key} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${
                            step.done ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {index + 1}
                        </div>
                        {index < timeline.length - 1 && (
                          <div className={`mt-2 h-full w-px ${step.done ? 'bg-gray-300' : 'bg-gray-100'}`} />
                        )}
                      </div>
                      <div className="pb-6">
                        <p className={`text-base font-semibold ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>
                          {step.title}
                        </p>
                        {step.done && (
                          <p className="mt-1 text-sm text-emerald-600">Hoàn thành</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* Right column */}
            <div className="space-y-6">
              {/* Payment summary */}
              <section className="rounded-[1.75rem] border border-gray-100 bg-white p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Thanh toán</p>
                <h2 className="mt-2 text-xl font-semibold text-gray-900">Tóm tắt chi phí</h2>

                <div className="mt-5 space-y-4 text-sm text-gray-600">
                  <div className="flex items-center justify-between">
                    <span>Tạm tính</span>
                    <span className="font-medium text-gray-900">{formatPrice(order.totalAmount)}</span>
                  </div>
                  {order.discountAmount > 0 && (
                    <div className="flex items-center justify-between">
                      <span>Chiết khấu</span>
                      <span className="font-medium text-emerald-600">- {formatPrice(order.discountAmount)}</span>
                    </div>
                  )}
                  {order.vatAmount > 0 && (
                    <div className="flex items-center justify-between">
                      <span>VAT (10%)</span>
                      <span className="font-medium text-gray-900">{formatPrice(order.vatAmount)}</span>
                    </div>
                  )}
                  {order.creditApplied > 0 && (
                    <div className="flex items-center justify-between text-blue-600">
                      <span>Thanh toán bằng Credit</span>
                      <span className="font-medium">- {formatPrice(order.creditApplied)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span>Trạng thái hóa đơn VAT</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${order.canRequestVat ? 'text-blue-600' : vatMeta.badgeClass.includes('emerald') ? 'text-emerald-600' : 'text-gray-500'}`}>
                        {vatMeta.label}
                      </span>
                      <Link to="/profile?tab=tax" target="_blank" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-0.5">
                        <ExternalLink className="h-3 w-3" /> Hồ sơ MST
                      </Link>
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-semibold text-gray-900">{order.creditApplied > 0 ? "Khách cần trả thêm" : "Tổng cộng"}</span>
                      <span className="text-xl font-bold text-gray-900">{formatPrice(order.finalPayment)}</span>
                    </div>
                  </div>
                  {(order.amountPaid > 0 || order.paymentStatus === 'PartiallyPaid') && (
                    <div className="border-t border-dashed border-gray-100 pt-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-gray-600">
                        <span>Đã thu (Thực tế)</span>
                        <span className="font-semibold text-emerald-600">{formatPrice(order.amountPaid)}</span>
                      </div>
                      <div className="flex items-center justify-between text-gray-600">
                        <span>Còn thiếu (Công nợ)</span>
                        <span className="font-semibold text-amber-600">{formatPrice(Math.max(0, order.finalPayment - order.amountPaid))}</span>
                      </div>
                    </div>
                  )}


                </div>
              </section>

              {/* Support */}
              <section className="rounded-[1.75rem] border border-gray-100 bg-gradient-to-br from-gray-50 to-white p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Hỗ trợ</p>
                <h2 className="mt-2 text-xl font-semibold text-gray-900">Cần hỗ trợ đơn hàng?</h2>
                <p className="mt-3 text-sm leading-7 text-gray-500">
                  Nếu bạn cần kiểm tra chứng từ, thay đổi người nhận hoặc xác nhận tiến độ giao hàng, đội Sales sẽ hỗ trợ nhanh nhất.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button className="rounded-full bg-gray-900 text-white hover:bg-gray-800">
                    <ExternalLink className="h-4 w-4" />
                    Liên hệ Sales
                  </Button>
                  <Link to="/profile?tab=orders">
                    <Button variant="outline" className="rounded-full">Xem đơn khác</Button>
                  </Link>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>

      <Footer />

      {/* Modal Yêu cầu hủy đơn */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
            <h2 className="mb-4 text-xl font-bold text-gray-900">Yêu cầu hủy đơn hàng</h2>
            <p className="mb-4 text-sm text-gray-500">
              Vui lòng cho chúng tôi biết lý do bạn muốn hủy đơn hàng này. Yêu cầu của bạn sẽ được chuyển đến bộ phận Sales để xử lý.
            </p>
            <textarea
              className="mb-4 w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              rows={4}
              placeholder="Nhập lý do hủy đơn..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setCancelModalOpen(false)}>
                Đóng
              </Button>
              <Button onClick={handleRequestCancel} disabled={cancelLoading} className="bg-red-600 hover:bg-red-700 text-white">
                {cancelLoading ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showExchangeModal && (
        <ExchangeRequestModal
          order={order}
          onClose={() => setShowExchangeModal(false)}
          onSubmit={handleExchangeRequest}
        />
      )}

      {selectedReturnRequest && (
        <ReturnExchangeRequestDetailModal
          request={selectedReturnRequest}
          onClose={() => setSelectedReturnRequest(null)}
        />
      )}
    </div>
  )
}
