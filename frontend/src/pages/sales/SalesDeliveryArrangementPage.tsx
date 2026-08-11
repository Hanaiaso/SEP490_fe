import { getErrorMessage } from '../../lib/errors';
import { API_BASE } from '../../services/apiBase';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle, Lock, MapPin, Package, RefreshCw, Truck, User, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import type { DeliveryOrderListItem, PendingPickup } from '../../types/delivery';

// ─── Types ───────────────────────────────────────────────────────────────────

type DeliveryOrder = {
  id: string;           // Guid from API
  orderCode: string;
  customer: string;
  address: string;
  amount: number;
  payment: 'COD' | 'SePay' | 'Cash' | 'Transfer' | 'Pickup';
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

// ─── Location grouping helpers ─────────────────────────────────────────────
// Gán màu + nhãn (A, B, C...) cho từng địa điểm khác nhau trong 1 xe, để Sale
// nhận biết ngay trên từng thẻ đơn xem đơn nào cùng chỗ, đơn nào khác chỗ.
const LOCATION_COLORS = [
  { bg: 'bg-emerald-50', border: 'border-emerald-300', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  { bg: 'bg-sky-50', border: 'border-sky-300', text: 'text-sky-700', dot: 'bg-sky-500' },
  { bg: 'bg-fuchsia-50', border: 'border-fuchsia-300', text: 'text-fuchsia-700', dot: 'bg-fuchsia-500' },
  { bg: 'bg-lime-50', border: 'border-lime-300', text: 'text-lime-700', dot: 'bg-lime-500' },
  { bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-700', dot: 'bg-rose-500' },
  { bg: 'bg-indigo-50', border: 'border-indigo-300', text: 'text-indigo-700', dot: 'bg-indigo-500' },
];

const normalizeAddress = (address: string) => address.toLowerCase().trim();

type LocationGroup = {
  label: string;
  address: string;
  color: typeof LOCATION_COLORS[number];
  orders: DeliveryOrder[];
};

function groupOrdersByLocation(orders: DeliveryOrder[]): LocationGroup[] {
  const groups: LocationGroup[] = [];
  const indexByKey = new Map<string, number>();
  orders.forEach((order) => {
    const key = normalizeAddress(order.address);
    let idx = indexByKey.get(key);
    if (idx === undefined) {
      idx = groups.length;
      indexByKey.set(key, idx);
      groups.push({
        label: String.fromCharCode(65 + (idx % 26)),
        address: order.address,
        color: LOCATION_COLORS[idx % LOCATION_COLORS.length],
        orders: [],
      });
    }
    groups[idx].orders.push(order);
  });
  return groups;
}

function api(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('accessToken');
  return fetch(`${API_BASE}${path.startsWith('/api') ? path.slice(4) : path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) },
  });
}

export default function SalesDeliveryArrangementPage() {
  const [activeShift, setActiveShift] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [available, setAvailable] = useState<DeliveryOrder[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'order' | 'transfer' | 'pickup'>('all');
  const [dragging, setDragging] = useState<DeliveryOrder | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

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

  const VEHICLES_META = useCallback((): Vehicle[] => INITIAL_VEHICLES.map((v) => ({ ...v, orders: [] })), []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const [resOrders, resPickups] = await Promise.all([
        api('/api/delivery/orders'),
        api('/api/delivery/pickups')
      ]);

      const unscheduled: DeliveryOrder[] = [];
      const newVehicles: Vehicle[] = VEHICLES_META();

      if (resOrders.ok) {
        const data: DeliveryOrderListItem[] = await resOrders.json();
        data.forEach((o) => {
          const isTransfer = o.paymentMethod === 'Transfer';
          const mapped: DeliveryOrder = {
            id: o.id,
            orderCode: o.orderCode,
            customer: o.customerName,
            address: o.shippingAddress,
            amount: o.finalPayment,
            payment: isTransfer ? 'Transfer' : (o.paymentMethod as 'COD' | 'SePay' | 'Cash'),
            deliveryStatus: o.deliveryStatus,
            itemCount: o.itemCount,
            isBlocked: o.isBlocked,
            scheduledDeliveryDate: o.scheduledDeliveryDate,
            deliveryShift: o.shift,
            vehicleId: o.vehicleId,
          };

          if (o.deliveryStatus === 'Scheduled' && o.vehicleId) {
            const orderDateStr = o.scheduledDeliveryDate ? o.scheduledDeliveryDate.split('T')[0] : '';
            if (orderDateStr === selectedDate && o.shift === SHIFTS[activeShift].key) {
              const v = newVehicles.find((v) => v.id === o.vehicleId);
              if (v) v.orders.push(mapped);
            } else {
              if (['NotScheduled', 'Rescheduled'].includes(o.deliveryStatus)) {
                unscheduled.push(mapped);
              }
            }
          } else if (o.deliveryStatus === 'NotScheduled' || o.deliveryStatus === 'Rescheduled') {
            unscheduled.push(mapped);
          }
        });
      }

      if (resPickups.ok) {
        const pickupData: PendingPickup[] = await resPickups.json();
        pickupData.forEach((p) => {
          const mapped: DeliveryOrder = {
            id: p.requestId,
            orderCode: p.requestCode || p.orderCode,
            customer: p.customerName || 'Khách thu hồi',
            address: p.shippingAddress,
            amount: 0,
            payment: 'Pickup',
            deliveryStatus: p.pickupStatus,
            itemCount: p.returnProductNames?.length || 1,
            isBlocked: false,
            scheduledDeliveryDate: p.scheduledPickupDate,
            deliveryShift: p.pickupShift,
            vehicleId: p.pickupVehicleId,
          };

          if (p.pickupStatus === 'Scheduled' && p.pickupVehicleId) {
            const reqDateStr = p.scheduledPickupDate ? p.scheduledPickupDate.split('T')[0] : '';
            if (reqDateStr === selectedDate && p.pickupShift === SHIFTS[activeShift].key) {
              const v = newVehicles.find((v) => v.id === p.pickupVehicleId);
              if (v) v.orders.push(mapped);
            }
          } else if (p.pickupStatus === 'NotScheduled') {
            unscheduled.push(mapped);
          }
        });
      }

      setVehicles(newVehicles);
      setAvailable(unscheduled);
    } catch {
      toast.error('Không thể tải danh sách vận chuyển và thu hồi.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, activeShift, toast, VEHICLES_META]);

  // Reload danh sách khi đổi Ngày giao hoặc Ca giao
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Chỉ tính số lượng đơn mới được xếp lên xe trong phiên làm việc hiện tại (chưa chốt trên server)
  const newlyAssignedCount = useMemo(() => {
    return vehicles.reduce((sum, v) => {
      const unsavedInVehicle = v.orders.filter(o => o.deliveryStatus !== 'Scheduled').length;
      return sum + unsavedInVehicle;
    }, 0);
  }, [vehicles]);

  const handleDropOnVehicle = (vehicleId: number) => {
    if (!dragging || !shiftEditable) return;

    // Nhắc nhở ngay khi thả nếu đơn này khác địa điểm với các đơn đã có sẵn trong xe
    const targetVehicle = vehicles.find((v) => v.id === vehicleId);
    const hasDifferentLocation =
      !!targetVehicle &&
      targetVehicle.orders.length > 0 &&
      !targetVehicle.orders.some((o) => normalizeAddress(o.address) === normalizeAddress(dragging.address));

    setVehicles((prev) =>
      prev.map((v) => (v.id !== vehicleId ? v : { ...v, orders: [...v.orders, dragging] }))
    );
    setAvailable((prev) => prev.filter((o) => o.id !== dragging.id));

    if (hasDifferentLocation && targetVehicle) {
      toast.warning(
        `Đơn "${dragging.orderCode}" có địa chỉ giao khác với các đơn đã xếp trong ${targetVehicle.label}. Vui lòng kiểm tra lại trước khi xác nhận phân xe.`,
        'Khác địa điểm giao hàng'
      );
    }

    setDragging(null);
    setDragOver(null);
  };

  const removeFromVehicle = (vehicleId: number, orderId: string) => {
    if (!shiftEditable) return;
    const v = vehicles.find((v) => v.id === vehicleId);
    const order = v?.orders.find((o) => o.id === orderId);
    if (!order) return;

    if (order.deliveryStatus === 'Scheduled') {
      toast.error('Đơn đã được chốt lịch trên hệ thống. Không thể gỡ bỏ.');
      return;
    }

    setVehicles((prev) => prev.map((v) => (v.id !== vehicleId ? v : { ...v, orders: v.orders.filter((o) => o.id !== orderId) })));
    setAvailable((prev) => [...prev, order]);
  };

  const handleConfirmSchedule = async () => {
    if (newlyAssignedCount === 0) return;
    if (!shiftEditable) {
      toast.error('Ca làm việc đã bị khóa. Không thể thực hiện xác nhận phân xe.');
      return;
    }

    setSaving(true);
    const shiftKey = SHIFTS[activeShift].key;
    const promises: Promise<void>[] = [];

    for (const v of vehicles) {
      const unsaved = v.orders.filter((o) => o.deliveryStatus !== 'Scheduled');
      
      const unsavedOrders = unsaved.filter((o) => o.payment !== 'Pickup');
      if (unsavedOrders.length > 0) {
        promises.push(
          api('/api/delivery/schedule', {
            method: 'POST',
            body: JSON.stringify({
              vehicleId: v.id,
              shift: shiftKey,
              deliveryDate: selectedDate,
              orderIds: unsavedOrders.map((o) => o.id)
            }),
          }).then(async (res) => {
            if (!res.ok) {
              const err = await res.json();
              const error = new Error(getErrorMessage(err)) as Error & { code?: string };
              error.code = err.code;
              throw error;
            }
          })
        );
      }

      const unsavedPickups = unsaved.filter((o) => o.payment === 'Pickup');
      for (const p of unsavedPickups) {
        promises.push(
          api(`/api/delivery/pickups/${p.id}/schedule`, {
            method: 'POST',
            body: JSON.stringify({
              vehicleId: v.id,
              shift: shiftKey,
              pickupDate: selectedDate
            }),
          }).then(async (res) => {
            if (!res.ok) {
              const err = await res.json();
              throw new Error(getErrorMessage(err));
            }
          })
        );
      }
    }

    try {
      await Promise.all(promises);
      const fmtDate = new Date(selectedDate).toLocaleDateString('vi-VN');
      toast.success(`Lập lịch thành công cho các đơn giao/thu hồi ca ${shiftKey} ngày ${fmtDate}!`);
      await fetchOrders();
    } catch (err: unknown) {
      const code = (err as { code?: string } | undefined)?.code;
      if (code === 'SCHEDULE_CONFLICT') {
        // UC-34: xe/ca đã có lịch trùng — backend đã tự tạo yêu cầu xử lý cho Sales Manager,
        // không phải lỗi cần Sales tự sửa ngay.
        toast.error('Xe/ca đã có lịch trùng. Yêu cầu xử lý xung đột đã được gửi tới Sales Manager.');
      } else {
        toast.error(getErrorMessage(err, 'Có lỗi xảy ra khi lập lịch.'));
      }
      // Vẫn làm mới danh sách: các xe khác trong cùng lượt xác nhận có thể đã lập lịch thành công
      // trước khi 1 xe gặp xung đột (Promise.all dừng sớm nhưng các promise khác vẫn chạy nền).
      await fetchOrders();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
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
        <div className="flex w-80 flex-shrink-0 flex-col border-r border-gray-200 bg-gray-50">
          <div className="border-b border-gray-200 bg-white px-3 py-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-700">Đơn chờ phân xe</h3>
              <p className="text-[10px] text-gray-400">{available.length} nhiệm vụ</p>
            </div>
            
            {/* Filter buttons */}
            <div className="mt-2 flex gap-1 text-[10px]">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2 py-1 rounded transition-colors ${filterType === 'all' ? 'bg-gray-800 text-white font-semibold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Tất cả ({available.length})
              </button>
              <button
                onClick={() => setFilterType('order')}
                className={`px-2 py-1 rounded transition-colors ${filterType === 'order' ? 'bg-blue-600 text-white font-semibold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Giao hàng
              </button>
              <button
                onClick={() => setFilterType('transfer')}
                className={`px-2 py-1 rounded transition-colors ${filterType === 'transfer' ? 'bg-amber-600 text-white font-semibold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Nội bộ
              </button>
              <button
                onClick={() => setFilterType('pickup')}
                className={`px-2 py-1 rounded transition-colors ${filterType === 'pickup' ? 'bg-purple-600 text-white font-semibold' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                Thu hồi
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
            {loading && (
              <div className="py-8 text-center text-xs text-gray-400">Đang tải...</div>
            )}
            {!loading && available.length === 0 && (
              <div className="py-8 text-center text-gray-400">
                <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-400" />
                <p className="text-xs">Đã phân hết nhiệm vụ</p>
              </div>
            )}
            {available
              .filter((o) => {
                if (filterType === 'order') return o.payment !== 'Transfer' && o.payment !== 'Pickup';
                if (filterType === 'transfer') return o.payment === 'Transfer';
                if (filterType === 'pickup') return o.payment === 'Pickup';
                return true;
              })
              .map((order) => (
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
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-[#1F3B64]">{order.orderCode}</span>
                      {order.payment === 'Transfer' && (
                        <span className="rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[9px] font-medium text-amber-700">Nội bộ</span>
                      )}
                      {order.payment === 'Pickup' && (
                        <span className="rounded-full border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[9px] font-medium text-purple-700">Thu hồi</span>
                      )}
                    </div>
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
                      order.payment === 'Pickup' ? 'bg-purple-600' : order.payment === 'Transfer' ? 'bg-amber-500' : order.payment === 'COD' ? 'bg-[#F97316]' : 'bg-[#2563EB]'
                    }`}>
                      {order.payment === 'Pickup' ? 'THU HỒI' : order.payment === 'Transfer' ? 'CHUYỂN KHO' : order.payment}
                    </span>
                    {order.payment !== 'Pickup' && (
                      <span className="text-[10px] font-semibold text-gray-800">
                        {order.amount.toLocaleString('vi-VN')}đ
                      </span>
                    )}
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
              const locationGroups = groupOrdersByLocation(vehicle.orders);
              const groupByOrderId = new Map(
                locationGroups.flatMap((g) => g.orders.map((o) => [o.id, g] as const))
              );
              // Khi đang kéo 1 đơn qua xe này: xe rỗng hoặc trùng địa chỉ với đơn đã có -> Cùng địa điểm.
              // Có đơn khác địa chỉ -> cảnh báo Khác địa điểm ngay khi đang kéo, trước khi thả.
              const draggingSameLocation =
                !dragging || vehicle.orders.length === 0
                  ? true
                  : vehicle.orders.some((o) => normalizeAddress(o.address) === normalizeAddress(dragging.address));
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
                    isDragOver
                      ? draggingSameLocation
                        ? 'border-green-400 bg-green-50/50 shadow-md'
                        : 'border-amber-400 bg-amber-50/50 shadow-md'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="border-b border-gray-100 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#1E3A5F]">
                          <Truck className="h-4 w-4 text-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-gray-900">{vehicle.label}</p>
                          <p className="flex items-center gap-0.5 text-[10px] text-gray-500">
                            <User className="h-3 w-3" /> {vehicle.orders.length} nhiệm vụ · {totalAmount.toLocaleString('vi-VN')}đ
                          </p>
                          {vehicle.orders.length > 1 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {locationGroups.length === 1 ? (
                                <span
                                  className="inline-flex min-w-0 max-w-full items-center gap-1 rounded border border-green-100 bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700"
                                  title={locationGroups[0].address}
                                >
                                  <MapPin className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">Cùng 1 địa điểm: {locationGroups[0].address}</span>
                                </span>
                              ) : (
                                locationGroups.map((g) => (
                                  <span
                                    key={g.label}
                                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium border ${g.color.bg} ${g.color.border} ${g.color.text}`}
                                    title={g.address}
                                  >
                                    <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${g.color.dot}`} />
                                    {g.label} · {g.orders.length} đơn
                                  </span>
                                ))
                              )}
                            </div>
                          )}
                          {vehicle.orders.length > 1 && locationGroups.length > 1 && (
                            <p className="mt-1 flex items-center gap-1 text-[9px] font-semibold text-amber-600">
                              <AlertCircle className="h-2.5 w-2.5 flex-shrink-0" /> {locationGroups.length} địa điểm khác nhau — kiểm tra lại trước khi xác nhận
                            </p>
                          )}
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
                      <div className={`rounded border-2 border-dashed p-2 text-center text-xs ${
                        draggingSameLocation ? 'border-green-300 bg-green-50/80 text-green-600' : 'border-amber-300 bg-amber-50/80 text-amber-700'
                      }`}>
                        {draggingSameLocation ? 'Cùng địa điểm — thả vào đây' : '⚠ Khác địa điểm với đơn đã có trong xe — vẫn thả?'}
                      </div>
                    )}
                    {vehicle.orders.map((order) => {
                      const isLocked = order.deliveryStatus === 'Scheduled';
                      const group = groupByOrderId.get(order.id);
                      return (
                        <div
                          key={order.id}
                          className={`flex items-center gap-2 rounded border p-2 text-xs transition-all ${
                            isLocked
                              ? 'border-gray-200 bg-gray-100/70 text-gray-600 shadow-none'
                              : order.payment === 'Pickup'
                              ? 'border-purple-100 bg-purple-50/40 hover:bg-purple-50/80'
                              : 'border-blue-100 bg-blue-50/40 hover:bg-blue-50/80'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              {isLocked && <span title="Đã chốt lịch"><Lock className="h-3 w-3 text-gray-400" /></span>}
                              <span className="font-semibold text-[#1F3B64]">{order.orderCode}</span>
                              {locationGroups.length > 1 && group && (
                                <span
                                  className={`inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[9px] font-semibold border flex-shrink-0 ${group.color.bg} ${group.color.border} ${group.color.text}`}
                                  title={`Địa điểm ${group.label}: ${group.address}`}
                                >
                                  <span className={`h-1.5 w-1.5 rounded-full ${group.color.dot}`} /> {group.label}
                                </span>
                              )}
                            </div>
                            <p className="truncate text-[11px] text-gray-600 mt-0.5">{order.customer}</p>
                            <div className="mt-0.5 flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5 text-gray-400 flex-shrink-0" />
                              <p className="truncate text-[10px] text-gray-500" title={order.address}>{order.address}</p>
                            </div>
                          </div>
                          <span className={`inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-semibold text-white flex-shrink-0 ${
                            order.payment === 'Pickup' ? 'bg-purple-600' : order.payment === 'Transfer' ? 'bg-amber-500' : order.payment === 'COD' ? 'bg-[#F97316]' : 'bg-[#2563EB]'
                          }`}>
                            {order.payment === 'Pickup' ? 'THU HỒI' : order.payment === 'Transfer' ? 'CHUYỂN KHO' : order.payment}
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
