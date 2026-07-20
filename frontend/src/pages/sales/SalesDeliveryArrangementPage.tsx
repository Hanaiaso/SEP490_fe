import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, Lock, MapPin, Package, RefreshCw, Truck, User, X } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type DeliveryOrder = {
  id: string;           // Guid from API
  orderCode: string;
  customer: string;
  address: string;
  amount: number;
  payment: 'COD' | 'SePay' | 'Cash';
  deliveryStatus: string;
  itemCount: number;
  isBlocked: boolean;
  scheduledDeliveryDate?: string;
  deliveryShift?: string;
  vehicleId?: number;
};

type Vehicle = {
  id: number;           // 1-5
  label: string;
  orders: DeliveryOrder[];
};

const SHIFTS = [
  { key: 'Sáng', label: 'Ca sáng (6:00 - 14:00)' },
  { key: 'Trưa', label: 'Ca trưa (14:00 - 22:00)' },
  { key: 'Chiều', label: 'Ca chiều (22:00 - 6:00)' },
];

const INITIAL_VEHICLES: Vehicle[] = [
  { id: 1, label: 'Xe 1', orders: [] },
  { id: 2, label: 'Xe 2', orders: [] },
  { id: 3, label: 'Xe 3', orders: [] },
  { id: 4, label: 'Xe 4', orders: [] },
  { id: 5, label: 'Xe 5', orders: [] },
];

function api(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('accessToken');
  return fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) },
  });
}

export default function SalesDeliveryArrangementPage() {
  const navigate = useNavigate();
  const [activeShift, setActiveShift] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [available, setAvailable] = useState<DeliveryOrder[]>([]);
  const [dragging, setDragging] = useState<DeliveryOrder | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Shift Cutoff Logic ────────────────────────────────────────────────────
  const shiftEditable = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (selectedDate < todayStr) return false; // Ngày quá khứ -> Khóa hoàn toàn
    if (selectedDate > todayStr) return true;  // Ngày tương lai -> Được phép sửa

    // Ngày hôm nay -> Kiểm tra giờ hiện tại (GMT+7)
    const currentHour = new Date().getHours();
    const shiftKey = SHIFTS[activeShift].key;
    if (shiftKey === 'Sáng' && currentHour >= 10) return false;
    if (shiftKey === 'Trưa' && currentHour >= 14) return false;
    if (shiftKey === 'Chiều' && currentHour >= 22) return false;

    return true;
  }, [selectedDate, activeShift]);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api('/api/delivery/orders');
      if (!res.ok) throw new Error();
      const data: any[] = await res.json();

      const unscheduled: DeliveryOrder[] = [];
      const newVehicles: Vehicle[] = VEHICLES_META();

      data.forEach((o) => {
        const mapped: DeliveryOrder = {
          id: o.id,
          orderCode: o.orderCode,
          customer: o.customerName,
          address: o.shippingAddress,
          amount: o.finalPayment,
          payment: o.paymentMethod as any,
          deliveryStatus: o.deliveryStatus,
          itemCount: o.itemCount,
          isBlocked: o.isBlocked,
          scheduledDeliveryDate: o.scheduledDeliveryDate,
          deliveryShift: o.shift,
          vehicleId: o.vehicleId,
        };

        if (o.deliveryStatus === 'Scheduled' && o.vehicleId) {
          // Chỉ đưa vào xe nếu trùng khớp cả Ngày giao và Ca giao đang chọn
          const orderDateStr = o.scheduledDeliveryDate ? o.scheduledDeliveryDate.split('T')[0] : '';
          if (orderDateStr === selectedDate && o.shift === SHIFTS[activeShift].key) {
            const v = newVehicles.find((v) => v.id === o.vehicleId);
            if (v) v.orders.push(mapped);
          } else {
            // Khác ngày hoặc khác ca -> Không hiển thị ở xe ca này.
            // Nếu thuộc về salesStaff này nhưng chưa giao (hoặc bị failed, reschedule)
            if (['NotScheduled', 'Rescheduled'].includes(o.deliveryStatus)) {
              unscheduled.push(mapped);
            }
          }
        } else if (o.deliveryStatus === 'NotScheduled' || o.deliveryStatus === 'Rescheduled') {
          unscheduled.push(mapped);
        }
      });

      setVehicles(newVehicles);
      setAvailable(unscheduled);
    } catch {
      showToast('Không thể tải danh sách đơn giao hàng.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Reload danh sách khi đổi Ngày giao hoặc Ca giao
  useEffect(() => {
    fetchOrders();
  }, [selectedDate, activeShift]);

  const VEHICLES_META = (): Vehicle[] => INITIAL_VEHICLES.map((v) => ({ ...v, orders: [] }));

  // Chỉ tính số lượng đơn mới được xếp lên xe trong phiên làm việc hiện tại (chưa chốt trên server)
  const newlyAssignedCount = useMemo(() => {
    return vehicles.reduce((sum, v) => {
      const unsavedInVehicle = v.orders.filter(o => o.deliveryStatus !== 'Scheduled').length;
      return sum + unsavedInVehicle;
    }, 0);
  }, [vehicles]);

  const handleDropOnVehicle = (vehicleId: number) => {
    if (!dragging || !shiftEditable) return;
    setVehicles((prev) =>
      prev.map((v) => (v.id !== vehicleId ? v : { ...v, orders: [...v.orders, dragging] }))
    );
    setAvailable((prev) => prev.filter((o) => o.id !== dragging.id));
    setDragging(null);
    setDragOver(null);
  };

  const removeFromVehicle = (vehicleId: number, orderId: string) => {
    if (!shiftEditable) return;
    const v = vehicles.find((v) => v.id === vehicleId);
    const order = v?.orders.find((o) => o.id === orderId);
    if (!order) return;

    // Không cho phép sửa đơn hàng đã được chốt (Scheduled) từ cơ sở dữ liệu trên giao diện này
    if (order.deliveryStatus === 'Scheduled') {
      showToast('Đơn hàng đã được chốt lịch trên hệ thống. Không thể gỡ bỏ.', 'error');
      return;
    }

    setVehicles((prev) => prev.map((v) => (v.id !== vehicleId ? v : { ...v, orders: v.orders.filter((o) => o.id !== orderId) })));
    setAvailable((prev) => [...prev, order]);
  };

  const handleConfirmSchedule = async () => {
    if (newlyAssignedCount === 0) return;
    if (!shiftEditable) {
      showToast('Ca giao hàng đã bị khóa. Không thể thực hiện xác nhận phân xe.', 'error');
      return;
    }

    setSaving(true);
    const shiftKey = SHIFTS[activeShift].key;

    // Chỉ gửi các đơn hàng mới chưa được Scheduled lên server
    const promises: Promise<void>[] = [];
    for (const v of vehicles) {
      const unsavedOrderIds = v.orders
        .filter((o) => o.deliveryStatus !== 'Scheduled')
        .map((o) => o.id);

      if (unsavedOrderIds.length === 0) continue;

      promises.push(
        api('/api/delivery/schedule', {
          method: 'POST',
          body: JSON.stringify({
            vehicleId: v.id,
            shift: shiftKey,
            deliveryDate: selectedDate,
            orderIds: unsavedOrderIds
          }),
        }).then(async (res) => {
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message);
          }
        })
      );
    }

    try {
      await Promise.all(promises);
      const fmtDate = new Date(selectedDate).toLocaleDateString('vi-VN');
      showToast(`Lập lịch thành công cho các đơn hàng mới ca ${shiftKey} ngày ${fmtDate}!`);
      await fetchOrders();
    } catch (err: any) {
      showToast(err.message || 'Có lỗi xảy ra khi lập lịch.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Toast */}
      {toast && (
        <div className={`fixed right-4 top-14 z-50 rounded-lg px-4 py-2.5 text-sm text-white shadow-lg transition-all ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Sắp xếp vận chuyển</h2>
            <p className="mt-0.5 text-xs text-gray-500">Kéo thả đơn hàng vào xe để phân công giao theo ca.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 font-medium">Ngày giao:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-8 rounded border border-gray-200 px-2 text-xs text-gray-700 font-semibold focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              onClick={fetchOrders}
              disabled={loading}
              className="flex h-8 items-center gap-1.5 rounded border border-gray-200 px-3 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Tải lại
            </button>
            <button
              onClick={handleConfirmSchedule}
              disabled={newlyAssignedCount === 0 || saving || !shiftEditable}
              className="flex h-8 items-center gap-1.5 rounded bg-[#1F3B64] px-3 text-xs text-white transition-colors hover:bg-[#162D4E] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <CheckCircle className="h-3.5 w-3.5" />
              {saving ? 'Đang lưu...' : `Xác nhận phân xe (${newlyAssignedCount})`}
            </button>
          </div>
        </div>

        {/* Shift tabs */}
        <div className="mt-3 flex gap-0 overflow-auto">
          {SHIFTS.map((shift, index) => (
            <button
              key={shift.key}
              onClick={() => setActiveShift(index)}
              className={`border-b-2 px-4 py-1.5 text-xs transition-colors ${
                activeShift === index
                  ? 'border-[#2563EB] font-semibold text-[#2563EB]'
                  : 'border-transparent text-gray-500 hover:text-gray-800'
              }`}
            >
              {shift.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lock banner if shift is locked */}
      {!shiftEditable && (
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center gap-2 text-xs text-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Ca giao hàng đã bị khóa:</strong> Bạn không thể thay đổi, thêm hoặc gỡ bỏ bất kỳ đơn hàng nào trong ca này (do quá thời gian lập lịch hoặc ngày trong quá khứ).
          </span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel: Available Orders */}
        <div className="flex w-72 flex-shrink-0 flex-col border-r border-gray-200 bg-gray-50">
          <div className="border-b border-gray-200 bg-white px-4 py-3">
            <h3 className="text-xs font-semibold text-gray-700">Đơn chờ phân xe</h3>
            <p className="mt-0.5 text-[10px] text-gray-400">{available.length} đơn cần phân công</p>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {loading && (
              <div className="py-8 text-center text-xs text-gray-400">Đang tải...</div>
            )}
            {!loading && available.length === 0 && (
              <div className="py-8 text-center text-gray-400">
                <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-400" />
                <p className="text-xs">Đã phân hết đơn hàng</p>
              </div>
            )}
            {available.map((order) => (
              <div
                key={order.id}
                draggable={shiftEditable && !order.isBlocked}
                onDragStart={() => setDragging(order)}
                onDragEnd={() => { setDragging(null); setDragOver(null); }}
                className={`rounded-lg border bg-white p-3 transition-all ${
                  order.isBlocked ? 'border-red-300 opacity-60' : 'border-gray-200'
                } ${
                  shiftEditable && !order.isBlocked 
                    ? 'cursor-grab active:cursor-grabbing hover:border-blue-200 hover:shadow-sm' 
                    : 'cursor-not-allowed opacity-75'
                } ${dragging?.id === order.id ? 'scale-95 opacity-50' : ''}`}
              >
                <div className="mb-1.5 flex items-start justify-between">
                  <span className="text-xs font-semibold text-[#1F3B64]">{order.orderCode}</span>
                  {order.isBlocked && (
                    <span className="rounded-full border border-red-200 bg-red-50 px-1.5 py-0.5 text-[9px] font-medium text-red-600">KHÓA</span>
                  )}
                </div>
                <p className="truncate text-xs font-medium text-gray-800">{order.customer}</p>
                <div className="mt-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-gray-400" />
                  <p className="truncate text-[10px] text-gray-500">{order.address}</p>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
                    <Package className="h-3 w-3" /> {order.itemCount} sản phẩm
                  </span>
                  <span className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-semibold text-white ${
                    order.payment === 'COD' ? 'bg-[#F97316]' : 'bg-[#2563EB]'
                  }`}>
                    {order.payment}
                  </span>
                  <span className="text-[10px] font-semibold text-gray-800">
                    {order.amount.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Vehicles */}
        <div className="flex-1 overflow-auto p-4">
          <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
            {vehicles.map((vehicle) => {
              const isDragOver = dragOver === vehicle.id;
              const totalAmount = vehicle.orders.reduce((s, o) => s + o.amount, 0);
              return (
                <div
                  key={vehicle.id}
                  onDragOver={(e) => {
                    if (!shiftEditable) return;
                    e.preventDefault();
                    setDragOver(vehicle.id);
                  }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={() => handleDropOnVehicle(vehicle.id)}
                  className={`rounded-lg border-2 bg-white transition-all ${
                    isDragOver ? 'border-blue-400 bg-blue-50/50 shadow-md' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="border-b border-gray-100 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#1E3A5F]">
                          <Truck className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900">{vehicle.label}</p>
                          <p className="flex items-center gap-0.5 text-[10px] text-gray-500">
                            <User className="h-3 w-3" /> {vehicle.orders.length} đơn · {totalAmount.toLocaleString('vi-VN')}đ
                          </p>
                        </div>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        vehicle.orders.length > 0 ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-400'
                      }`}>
                        {SHIFTS[activeShift].key}
                      </span>
                    </div>
                  </div>

                  <div className="min-h-[110px] space-y-1.5 p-2">
                    {isDragOver && dragging && (
                      <div className="rounded border-2 border-dashed border-blue-300 bg-blue-50/80 p-2 text-center text-xs text-blue-500">
                        Thả vào đây
                      </div>
                    )}
                    {vehicle.orders.map((order) => {
                      const isLocked = order.deliveryStatus === 'Scheduled';
                      return (
                        <div
                          key={order.id}
                          className={`flex items-center gap-2 rounded border p-2 text-xs transition-all ${
                            isLocked 
                              ? 'border-gray-200 bg-gray-100/70 text-gray-600 shadow-none' 
                              : 'border-blue-100 bg-blue-50/40 hover:bg-blue-50/80'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {isLocked && <span title="Đã chốt lịch"><Lock className="h-3 w-3 text-gray-400" /></span>}
                              <span className="font-semibold text-[#1F3B64]">{order.orderCode}</span>
                            </div>
                            <p className="truncate text-[11px] text-gray-600 mt-0.5">{order.customer}</p>
                          </div>
                          <span className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-semibold text-white flex-shrink-0 ${
                            order.payment === 'COD' ? 'bg-[#F97316]' : 'bg-[#2563EB]'
                          }`}>
                            {order.payment}
                          </span>
                          
                          {/* Chỉ cho phép xóa nếu Ca giao chưa bị khóa VÀ đơn hàng đó chưa được lưu chốt (Scheduled) */}
                          {shiftEditable && !isLocked && (
                            <button
                              onClick={() => removeFromVehicle(vehicle.id, order.id)}
                              className="flex-shrink-0 text-gray-300 transition-colors hover:text-red-400"
                              title="Gỡ đơn"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {vehicle.orders.length === 0 && !isDragOver && (
                      <div className="flex h-20 flex-col items-center justify-center rounded-md border border-dashed border-gray-200 text-gray-300">
                        <Package className="mb-1 h-5 w-5" />
                        <p className="text-[10px]">Kéo đơn vào đây</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
