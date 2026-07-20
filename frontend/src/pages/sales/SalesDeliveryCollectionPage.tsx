import { AlertCircle, Camera, CheckCircle, DollarSign, MapPin, Pen, Phone, RefreshCw, Truck, X, XCircle } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

type DeliveryOrder = {
  id: string;
  orderCode: string;
  customer: string;
  phone: string;
  address: string;
  total: number;
  amountPaid: number;
  payment: 'COD' | 'SePay' | 'Cash';
  orderStatus: string;
  deliveryStatus: string;
  failedCount: number;
  isBlocked: boolean;
  itemCount: number;
  vehicleId?: number;
  shift?: string;
};

type ModalState = {
  order: DeliveryOrder;
  amountInput: string;
  outcome: 'delivered' | 'partially_delivered' | 'failed';
  notes: string;
} | null;

function api(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('accessToken');
  return fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) },
  });
}

const STATUS_CFG: Record<string, { label: string; color: string }> = {
  Scheduled:          { label: 'Chờ xuất phát',  color: '#6366F1' },
  InDelivery:         { label: 'Đang giao',       color: '#F97316' },
  Delivered:          { label: 'Đã giao',         color: '#16A34A' },
  PartiallyDelivered: { label: 'Giao 1 phần',     color: '#D97706' },
  Failed:             { label: 'Thất bại',        color: '#DC2626' },
  Rescheduled:        { label: 'Hẹn lại',         color: '#64748B' },
};

export default function SalesDeliveryCollectionPage() {
  const [orders, setOrders] = useState<DeliveryOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Canvas chữ ký số
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawing, setDrawing] = useState(false);
  const [hasSig, setHasSig] = useState(false);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  };

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api('/api/delivery/orders');
      if (!res.ok) throw new Error();
      const data: any[] = await res.json();
      setOrders(
        data.map((o) => ({
          id: o.id,
          orderCode: o.orderCode,
          customer: o.customerName,
          phone: o.customerPhone,
          address: o.shippingAddress,
          total: o.finalPayment,
          amountPaid: o.amountPaid,
          payment: o.paymentMethod as any,
          orderStatus: o.orderStatus,
          deliveryStatus: o.deliveryStatus,
          failedCount: o.failedDeliveryCount,
          isBlocked: o.isBlocked,
          itemCount: o.itemCount,
          vehicleId: o.vehicleId,
          shift: o.shift,
        }))
      );
    } catch {
      showToast('Không thể tải danh sách giao hàng.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // ─── Canvas signature ─────────────────────────────────────────────────────

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if ('touches' in e) {
      return { 
        x: (e.touches[0].clientX - rect.left) * scaleX, 
        y: (e.touches[0].clientY - rect.top) * scaleY 
      };
    }
    return { 
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, 
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY 
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!drawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1F3B64';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSig(true);
  };

  const endDraw = () => setDrawing(false);

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    setHasSig(false);
  };

  const getSignatureBase64 = () => canvasRef.current?.toDataURL('image/png') ?? null;

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  const openModal = (order: DeliveryOrder) => {
    setModal({ order, amountInput: String(order.total), outcome: 'delivered', notes: '' });
    setHasSig(false);
    setPhotoBase64(null);
    setTimeout(() => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }, 50);
  };

  const handleSubmit = async () => {
    if (!modal) return;
    setSubmitting(true);
    try {
      const sigBase64 = hasSig ? getSignatureBase64() : null;
      const body = {
        customerSignatureBase64: sigBase64,
        deliveryPhotoBase64: photoBase64,
        amountCollected: parseFloat(modal.amountInput.replace(/\./g, '').replace(',', '.')) || 0,
        deliveryOutcome: modal.outcome,
        notes: modal.notes,
      };
      const res = await api(`/api/delivery/${modal.order.id}/complete`, { method: 'POST', body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      showToast(data.message || 'Ghi nhận thành công!');
      setModal(null);
      await fetchOrders();
    } catch (err: any) {
      showToast(err.message || 'Có lỗi xảy ra.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingOrders = orders.filter((o) => ['Scheduled', 'InDelivery', 'Rescheduled', 'Failed'].includes(o.deliveryStatus));
  const doneOrders = orders.filter((o) => ['Delivered', 'PartiallyDelivered'].includes(o.deliveryStatus));

  return (
    <div className="flex h-full flex-col">
      {/* Toast */}
      {toast && (
        <div className={`fixed right-4 top-14 z-50 rounded-lg px-4 py-2.5 text-sm text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Giao hàng & Thu tiền COD</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {loading ? 'Đang tải...' : `${pendingOrders.length} đơn chờ · ${doneOrders.length} đơn hoàn thành`}
            </p>
          </div>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex h-8 items-center gap-1.5 rounded border border-gray-200 px-3 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Tải lại
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        {/* Pending section */}
        {pendingOrders.length > 0 && (
          <div className="mb-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Đang giao / Chờ xử lý</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {pendingOrders.map((o) => {
                const cfg = STATUS_CFG[o.deliveryStatus] ?? { label: o.deliveryStatus, color: '#64748B' };
                return (
                  <div key={o.id} className={`rounded-lg border bg-white p-3 shadow-sm ${o.isBlocked ? 'border-red-300' : 'border-gray-200'}`}>
                    <div className="mb-2 flex items-start justify-between">
                      <span className="text-xs font-bold text-[#1F3B64]">{o.orderCode}</span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-gray-800">{o.customer}</p>
                    <div className="mt-1 flex items-center gap-1 text-[10px] text-gray-500">
                      <Phone className="h-3 w-3" />{o.phone}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{o.address}</span>
                    </div>
                    {o.vehicleId && (
                      <div className="flex items-center gap-1 text-[10px] text-gray-500">
                        <Truck className="h-3 w-3" /> Xe {o.vehicleId} · Ca {o.shift}
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-gray-500">Cần thu</p>
                        <p className="text-sm font-bold text-gray-900">{o.total.toLocaleString('vi-VN')}đ</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-500">PT: <span className={`font-semibold ${o.payment === 'COD' ? 'text-orange-600' : 'text-blue-600'}`}>{o.payment}</span></p>
                        {o.failedCount > 0 && <p className="text-[10px] font-semibold text-red-500">Thất bại: {o.failedCount}/3</p>}
                      </div>
                    </div>
                    {o.isBlocked ? (
                      <div className="mt-2 rounded border border-red-200 bg-red-50 p-1.5 text-center text-[10px] font-medium text-red-600">
                        ⛔ Đơn bị khóa – Liên hệ Sales Manager
                      </div>
                    ) : (
                      <button
                        onClick={() => openModal(o)}
                        className="mt-2 flex w-full items-center justify-center gap-1.5 rounded bg-[#1F3B64] py-1.5 text-xs font-medium text-white hover:bg-[#162D4E]"
                      >
                        <DollarSign className="h-3.5 w-3.5" />
                        Ghi nhận giao hàng
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Done section */}
        {doneOrders.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Đã hoàn thành hôm nay</h3>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {doneOrders.map((o) => {
                const cfg = STATUS_CFG[o.deliveryStatus] ?? { label: o.deliveryStatus, color: '#64748B' };
                return (
                  <div key={o.id} className="rounded-lg border border-gray-200 bg-white p-3 opacity-80 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1F3B64]">{o.orderCode}</span>
                      <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-gray-700">{o.customer}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-500">Đã thu: <strong>{o.amountPaid.toLocaleString('vi-VN')}đ</strong></span>
                      {o.amountPaid < o.total && (
                        <span className="text-[10px] font-semibold text-red-500">Còn nợ: {(o.total - o.amountPaid).toLocaleString('vi-VN')}đ</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!loading && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Truck className="mb-3 h-12 w-12" />
            <p className="text-sm font-medium">Chưa có đơn hàng nào cần giao hôm nay.</p>
            <p className="mt-1 text-xs">Hãy kiểm tra lại phần Sắp xếp vận chuyển.</p>
          </div>
        )}
      </div>

      {/* ─── Modal ghi nhận giao hàng ─────────────────────────────────────────── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-3.5">
              <div>
                <p className="text-sm font-bold text-gray-900">Ghi nhận giao hàng</p>
                <p className="text-xs text-[#1F3B64]">{modal.order.orderCode} · {modal.order.customer}</p>
              </div>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {/* Thông tin đơn */}
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-50 p-3 text-xs">
                <div><span className="text-gray-500">Khách hàng:</span><p className="font-medium text-gray-800">{modal.order.customer}</p></div>
                <div><span className="text-gray-500">SĐT:</span><p className="font-medium text-gray-800">{modal.order.phone}</p></div>
                <div className="col-span-2"><span className="text-gray-500">Địa chỉ:</span><p className="font-medium text-gray-800">{modal.order.address}</p></div>
                <div><span className="text-gray-500">Cần thu:</span><p className="text-base font-bold text-[#1F3B64]">{modal.order.total.toLocaleString('vi-VN')}đ</p></div>
                <div><span className="text-gray-500">Phương thức:</span><p className={`font-bold ${modal.order.payment === 'COD' ? 'text-orange-600' : 'text-blue-600'}`}>{modal.order.payment}</p></div>
              </div>

              {/* Kết quả giao hàng */}
              <div>
                <p className="mb-1.5 text-xs font-semibold text-gray-700">Kết quả giao hàng</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'delivered', label: 'Giao thành công', icon: CheckCircle, color: 'green' },
                    { key: 'partially_delivered', label: 'Giao 1 phần', icon: AlertCircle, color: 'orange' },
                    { key: 'failed', label: 'Thất bại', icon: XCircle, color: 'red' },
                  ].map(({ key, label, icon: Icon, color }) => (
                    <button
                      key={key}
                      onClick={() => setModal((m) => m ? { ...m, outcome: key as any } : m)}
                      className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2 text-center text-[10px] font-medium transition-all ${
                        modal.outcome === key
                          ? `border-${color}-500 bg-${color}-50 text-${color}-700`
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${modal.outcome === key ? `text-${color}-500` : 'text-gray-400'}`} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Số tiền thu */}
              {modal.outcome !== 'failed' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">Số tiền thực thu (VNĐ)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={modal.amountInput}
                      onChange={(e) => setModal((m) => m ? { ...m, amountInput: e.target.value } : m)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      placeholder="Nhập số tiền..."
                    />
                    <button
                      onClick={() => setModal((m) => m ? { ...m, amountInput: String(m.order.total) } : m)}
                      className="whitespace-nowrap rounded border border-gray-200 px-2 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
                    >
                      Đủ tiền
                    </button>
                  </div>
                  {parseFloat(modal.amountInput) < modal.order.total && parseFloat(modal.amountInput) > 0 && (
                    <p className="mt-1 text-xs font-medium text-orange-600">
                      ⚠ Còn thiếu {(modal.order.total - parseFloat(modal.amountInput)).toLocaleString('vi-VN')}đ → Sẽ tạo sổ công nợ
                    </p>
                  )}
                </div>
              )}

              {/* Chữ ký số của khách */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                    <Pen className="h-3.5 w-3.5" /> Chữ ký khách hàng (tuỳ chọn)
                  </p>
                  {hasSig && <button onClick={clearCanvas} className="text-[10px] text-red-500 hover:underline">Xóa</button>}
                </div>
                <canvas
                  ref={canvasRef}
                  width={420}
                  height={120}
                  className="w-full rounded-lg border border-dashed border-gray-300 bg-gray-50 cursor-crosshair touch-none"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={endDraw}
                  onMouseLeave={endDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={endDraw}
                />
                {!hasSig && <p className="mt-0.5 text-center text-[10px] text-gray-400">Vẽ chữ ký vào đây</p>}
              </div>

              {/* Ảnh hiện trường */}
              <div>
                <p className="mb-1.5 text-xs font-semibold text-gray-700 flex items-center gap-1">
                  <Camera className="h-3.5 w-3.5" /> Ảnh hiện trường (tuỳ chọn)
                </p>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
                {photoBase64 ? (
                  <div className="relative">
                    <img src={photoBase64} alt="POD" className="h-24 w-full rounded-lg border border-gray-200 object-cover" />
                    <button onClick={() => setPhotoBase64(null)} className="absolute right-1 top-1 rounded-full bg-red-500 p-0.5 text-white">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 py-3 text-xs text-gray-500 hover:bg-gray-50"
                  >
                    <Camera className="h-4 w-4" /> Chụp ảnh / Chọn file
                  </button>
                )}
              </div>

              {/* Ghi chú */}
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Ghi chú</label>
                <textarea
                  rows={2}
                  value={modal.notes}
                  onChange={(e) => setModal((m) => m ? { ...m, notes: e.target.value } : m)}
                  placeholder="Ghi chú về lần giao hàng này..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-1">
                <button onClick={() => setModal(null)} className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                  Hủy
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-[#1F3B64] py-2.5 text-sm font-semibold text-white hover:bg-[#162D4E] disabled:opacity-60"
                >
                  {submitting ? 'Đang lưu...' : 'Xác nhận giao hàng'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
