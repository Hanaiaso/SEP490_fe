import { getErrorMessage } from '../../lib/errors';
import { authFetch } from '../../services/httpClient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Truck, Plus, Play, ArrowRight, X, Package, Clock, AlertTriangle, Ban } from 'lucide-react';
import { getVehicles } from '../../services/vehicleService.js';
import {
  getDeliveryTrips, createDeliveryTrip, startLoadingTrip, addOrdersToTrip, removeOrderFromTrip, startTrip, cancelTrip,
} from '../../services/deliveryTripService.js';
import ConfirmModal from '../../components/ui/ConfirmModal';
import WeightBar from '../../components/delivery/WeightBar';
import type { DeliveryTrip, DeliveryOrderListItem } from '../../types/delivery';
import type { Vehicle } from '../../types/admin';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#D97706';
const INFO = '#2563EB';
const NEUTRAL = '#64748B';

const STATUS_CFG: Record<string, { label: string; bg: string }> = {
  Scheduled: { label: 'Chờ bốc hàng', bg: NEUTRAL },
  Loading: { label: 'Đang bốc hàng', bg: WARNING },
  InDelivery: { label: 'Đang giao', bg: INFO },
  Completed: { label: 'Hoàn tất', bg: SUCCESS },
  Cancelled: { label: 'Đã hủy', bg: '#DC2626' },
};

const SHIFTS = ['Sáng', 'Trưa', 'Chiều'];

function api(path: string, opts?: RequestInit) {
  return authFetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
  });
}

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || { label: status, bg: NEUTRAL };
  return <span className="text-[10px] font-semibold text-white px-2 py-0.5 inline-block whitespace-nowrap" style={{ backgroundColor: c.bg, borderRadius: 4 }}>{c.label}</span>;
}

function formatDateTimeLocal(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SalesDeliveryTripsPage() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [trips, setTrips] = useState<DeliveryTrip[]>([]);
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [unscheduledOrders, setUnscheduledOrders] = useState<DeliveryOrderListItem[]>([]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newVehicleId, setNewVehicleId] = useState('');
  const [newShift, setNewShift] = useState(SHIFTS[0]);
  const [newOrderIds, setNewOrderIds] = useState<string[]>([]);
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [newTripDate, setNewTripDate] = useState(todayStr);

  const [loadingModalTripId, setLoadingModalTripId] = useState<string | null>(null);
  const [plannedDeparture, setPlannedDeparture] = useState('');
  const [plannedArrival, setPlannedArrival] = useState('');

  const [addOrdersTripId, setAddOrdersTripId] = useState<string | null>(null);
  const [addOrderIds, setAddOrderIds] = useState<string[]>([]);

  const [confirmDepartTripId, setConfirmDepartTripId] = useState<string | null>(null);
  const [confirmCancelTripId, setConfirmCancelTripId] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const data: DeliveryTrip[] = await getDeliveryTrips({ date: selectedDate });
      setTrips(data || []);
    } catch (e: unknown) {
      alert('Lỗi tải danh sách chuyến giao: ' + getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  const fetchUnscheduledOrders = useCallback(async () => {
    try {
      const res = await api('/delivery/orders');
      if (!res.ok) return;
      const data: DeliveryOrderListItem[] = await res.json();
      // Chỉ lấy đơn hàng thật (loại trừ StockTransfer trộn chung trong endpoint này) và chưa lên lịch.
      setUnscheduledOrders(data.filter((o) => o.paymentMethod !== 'Transfer' && (o.deliveryStatus === 'NotScheduled' || o.deliveryStatus === 'Rescheduled')));
    } catch {
      // Không chặn trang nếu lỗi tải danh sách đơn — vẫn xem được các chuyến đã có.
    }
  }, []);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);
  useEffect(() => { getVehicles().then(setVehicles).catch(() => {}); fetchUnscheduledOrders(); }, [fetchUnscheduledOrders]);

  const newOrdersWeight = useMemo(
    () => unscheduledOrders.filter((o) => newOrderIds.includes(o.id)).reduce((sum, o) => sum + (o.totalPackedWeightKg ?? 0), 0),
    [unscheduledOrders, newOrderIds],
  );
  const selectedVehicle = vehicles.find((v) => v.id === newVehicleId);

  const handleCreateTrip = async () => {
    if (!newVehicleId) return alert('Vui lòng chọn xe.');
    if (newOrderIds.length === 0) return alert('Vui lòng chọn ít nhất 1 đơn hàng.');
    if (newTripDate < todayStr) return alert('Không thể tạo chuyến giao cho ngày trong quá khứ.');
    setCreating(true);
    try {
      await createDeliveryTrip({ vehicleId: newVehicleId, shift: newShift, tripDate: newTripDate, orderIds: newOrderIds });
      alert('Tạo chuyến giao hàng thành công!');
      setIsCreateOpen(false);
      setNewVehicleId(''); setNewOrderIds([]);
      fetchTrips();
      fetchUnscheduledOrders();
    } catch (e: unknown) {
      alert('Lỗi: ' + getErrorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const handleStartLoading = async () => {
    if (!loadingModalTripId) return;
    const now = new Date();
    if (plannedDeparture && new Date(plannedDeparture) < now) return alert('Giờ xuất phát dự kiến không được ở trong quá khứ.');
    if (plannedArrival && new Date(plannedArrival) < now) return alert('Giờ đến dự kiến không được ở trong quá khứ.');
    if (plannedDeparture && plannedArrival && new Date(plannedArrival) < new Date(plannedDeparture)) return alert('Giờ đến dự kiến không được trước giờ xuất phát dự kiến.');
    try {
      await startLoadingTrip(loadingModalTripId, {
        plannedDepartureAt: plannedDeparture || undefined,
        plannedArrivalAt: plannedArrival || undefined,
      });
      setLoadingModalTripId(null);
      setPlannedDeparture(''); setPlannedArrival('');
      fetchTrips();
    } catch (e: unknown) {
      alert('Lỗi: ' + getErrorMessage(e));
    }
  };

  const handleCancelTrip = async () => {
    if (!confirmCancelTripId) return;
    try {
      await cancelTrip(confirmCancelTripId);
      alert('Đã hủy chuyến giao hàng. Các đơn trong chuyến có thể xếp sang chuyến/xe khác.');
      setConfirmCancelTripId(null);
      fetchTrips();
      fetchUnscheduledOrders();
    } catch (e: unknown) {
      alert('Lỗi: ' + getErrorMessage(e));
      setConfirmCancelTripId(null);
    }
  };

  const handleAddOrders = async () => {
    if (!addOrdersTripId || addOrderIds.length === 0) return;
    try {
      await addOrdersToTrip(addOrdersTripId, addOrderIds);
      setAddOrdersTripId(null); setAddOrderIds([]);
      fetchTrips();
      fetchUnscheduledOrders();
    } catch (e: unknown) {
      alert('Lỗi: ' + getErrorMessage(e));
    }
  };

  const handleRemoveOrder = async (tripId: string, orderId: string) => {
    if (!window.confirm('Rút đơn hàng này khỏi chuyến?')) return;
    try {
      await removeOrderFromTrip(tripId, orderId);
      fetchTrips();
      fetchUnscheduledOrders();
    } catch (e: unknown) {
      alert('Lỗi: ' + getErrorMessage(e));
    }
  };

  const handleDepart = async () => {
    if (!confirmDepartTripId) return;
    try {
      await startTrip(confirmDepartTripId);
      alert('Chuyến đã xuất phát!');
      setConfirmDepartTripId(null);
      fetchTrips();
    } catch (e: unknown) {
      alert('Lỗi: ' + getErrorMessage(e));
      setConfirmDepartTripId(null);
    }
  };

  const departingTrip = trips.find((t) => t.id === confirmDepartTripId);
  const cancelingTrip = trips.find((t) => t.id === confirmCancelTripId);

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-5 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Chuyến giao hàng theo xe</h2>
            <p className="text-xs text-gray-500 mt-0.5">{trips.length} chuyến trong ngày</p>
          </div>
          <button
            className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-white rounded bg-blue-600 hover:bg-blue-700"
            onClick={() => { setNewTripDate(todayStr); setIsCreateOpen(true); }}
          >
            <Plus className="w-3.5 h-3.5" /> Tạo chuyến mới
          </button>
        </div>
        <input
          type="date"
          className="h-8 px-2 text-xs bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-blue-500"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
      </div>

      {unscheduledOrders.length > 0 && (
        <button
          type="button"
          onClick={() => { setNewTripDate(todayStr); setIsCreateOpen(true); }}
          className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 rounded border border-amber-200 bg-amber-50 hover:bg-amber-100 text-left transition-colors"
        >
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-xs text-amber-800">
            <strong className="font-semibold">{unscheduledOrders.length} đơn hàng</strong> đang chờ xếp lịch xe giao — bấm để xếp chuyến ngay.
          </span>
        </button>
      )}

      <div className="p-4 flex flex-col gap-3 flex-1">
        {loading ? (
          <div className="text-center py-10 text-xs text-gray-500">Đang tải dữ liệu...</div>
        ) : trips.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12">
            <Truck className="w-8 h-8 text-gray-300" />
            <p className="text-sm text-gray-500">Chưa có chuyến giao nào trong ngày này.</p>
          </div>
        ) : (
          trips.map((trip) => (
            <div key={trip.id} className="bg-white rounded-lg border border-gray-200 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded flex items-center justify-center bg-blue-50 text-blue-600">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800">Xe {trip.vehicleNumber} · Ca {trip.shift}</p>
                    <p className="text-[11px] text-gray-400">{trip.orderIds.length} đơn hàng</p>
                  </div>
                </div>
                <StatusBadge status={trip.status} />
              </div>

              <WeightBar used={trip.totalWeightKg} capacity={trip.vehicleCapacityKg} />

              {(trip.plannedDepartureAt || trip.plannedArrivalAt) && (
                <div className="flex items-center gap-3 text-[11px] text-gray-500">
                  {trip.plannedDepartureAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Xuất phát dự kiến: {new Date(trip.plannedDepartureAt).toLocaleString('vi-VN')}</span>}
                  {trip.plannedArrivalAt && <span className="flex items-center gap-1"><ArrowRight className="w-3 h-3" /> Đến dự kiến: {new Date(trip.plannedArrivalAt).toLocaleString('vi-VN')}</span>}
                </div>
              )}

              {(trip.startedAt || trip.completedAt) && (
                <div className="flex items-center gap-3 text-[11px] text-gray-500">
                  {trip.startedAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Xuất phát thực tế: {new Date(trip.startedAt).toLocaleString('vi-VN')}</span>}
                  {trip.completedAt && <span className="flex items-center gap-1"><ArrowRight className="w-3 h-3" /> Hoàn tất thực tế: {new Date(trip.completedAt).toLocaleString('vi-VN')}</span>}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {trip.orderCodes.map((code, idx) => (
                  <span key={code} className="flex items-center gap-1 text-[10px] bg-gray-50 border border-gray-200 rounded px-2 py-1 text-gray-600">
                    {code}
                    {trip.status === 'Loading' && (
                      <button onClick={() => handleRemoveOrder(trip.id, trip.orderIds[idx])} className="text-gray-400 hover:text-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                {trip.status === 'Scheduled' && (
                  <button
                    className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-white rounded bg-amber-600 hover:bg-amber-700"
                    onClick={() => { setLoadingModalTripId(trip.id); setPlannedDeparture(formatDateTimeLocal(trip.plannedDepartureAt)); setPlannedArrival(formatDateTimeLocal(trip.plannedArrivalAt)); }}
                  >
                    <Package className="w-3.5 h-3.5" /> Bắt đầu bốc hàng
                  </button>
                )}
                {trip.status === 'Loading' && (
                  <>
                    <button
                      className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-gray-700 rounded border border-gray-200 hover:bg-gray-50"
                      onClick={() => { setAddOrdersTripId(trip.id); setAddOrderIds([]); }}
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm đơn
                    </button>
                    <button
                      className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-white rounded bg-blue-600 hover:bg-blue-700"
                      onClick={() => setConfirmDepartTripId(trip.id)}
                    >
                      <Play className="w-3.5 h-3.5" /> Xuất phát
                    </button>
                  </>
                )}
                {(trip.status === 'Scheduled' || trip.status === 'Loading') && (
                  <button
                    className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-red-600 rounded border border-red-200 hover:bg-red-50 ml-auto"
                    onClick={() => setConfirmCancelTripId(trip.id)}
                  >
                    <Ban className="w-3.5 h-3.5" /> Hủy chuyến
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Tạo chuyến mới */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-[560px] max-h-[85vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold" style={{ color: PRIMARY }}>Tạo chuyến giao hàng mới</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Xe *</label>
                  <select className="border rounded px-3 py-2 text-sm" value={newVehicleId} onChange={(e) => setNewVehicleId(e.target.value)}>
                    <option value="">-- Chọn xe --</option>
                    {vehicles.filter((v) => v.isActive).map((v) => (
                      <option key={v.id} value={v.id}>Xe {v.vehicleNumber} ({v.licensePlate}){v.capacity ? ` — tối đa ${v.capacity.toLocaleString('vi-VN')}kg` : ''}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Ca *</label>
                  <select className="border rounded px-3 py-2 text-sm" value={newShift} onChange={(e) => setNewShift(e.target.value)}>
                    {SHIFTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Ngày giao *</label>
                  <input
                    type="date"
                    min={todayStr}
                    className="border rounded px-3 py-2 text-sm"
                    value={newTripDate}
                    onChange={(e) => setNewTripDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Chọn đơn hàng ({newOrderIds.length} đã chọn)</label>
                <div className="border rounded max-h-64 overflow-y-auto divide-y divide-gray-100">
                  {unscheduledOrders.length === 0 ? (
                    <p className="text-xs text-gray-400 p-3">Không có đơn hàng nào chờ lên lịch.</p>
                  ) : unscheduledOrders.map((o) => (
                    <label key={o.id} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newOrderIds.includes(o.id)}
                        onChange={(e) => setNewOrderIds((prev) => e.target.checked ? [...prev, o.id] : prev.filter((id) => id !== o.id))}
                      />
                      <span className="font-medium text-gray-700 flex-shrink-0">{o.orderCode}</span>
                      <span className="text-gray-400 truncate flex-1">{o.customerName}</span>
                      <span className="text-gray-500 flex-shrink-0">{(o.totalPackedWeightKg ?? 0).toLocaleString('vi-VN')} kg</span>
                    </label>
                  ))}
                </div>
              </div>

              {newVehicleId && (
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-gray-500">Tổng trọng lượng đã chọn</label>
                  <WeightBar used={newOrdersWeight} capacity={selectedVehicle?.capacity} />
                  {selectedVehicle?.capacity && newOrdersWeight > selectedVehicle.capacity && (
                    <p className="text-[11px] text-red-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Vượt tải trọng xe — hệ thống sẽ chặn khi lưu.</p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setIsCreateOpen(false)} className="px-4 py-2 border rounded text-sm bg-gray-50 hover:bg-gray-100 font-medium">Hủy</button>
                <button
                  type="button"
                  disabled={creating}
                  onClick={handleCreateTrip}
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium shadow-sm disabled:opacity-50"
                >
                  {creating ? 'Đang tạo...' : 'Tạo chuyến'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bắt đầu bốc hàng — nhập giờ dự kiến */}
      {loadingModalTripId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-[420px]">
            <div className="px-6 py-4 border-b">
              <h2 className="text-base font-bold" style={{ color: PRIMARY }}>Bắt đầu bốc hàng lên xe</h2>
            </div>
            <div className="p-6 flex flex-col gap-3">
              <p className="text-xs text-gray-500">Nhập giờ xuất phát / đến dự kiến (tuỳ chọn) — sẽ hiển thị cho khách hàng.</p>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Giờ xuất phát dự kiến</label>
                <input type="datetime-local" min={formatDateTimeLocal(new Date().toISOString())} className="border rounded px-3 py-2 text-sm" value={plannedDeparture} onChange={(e) => setPlannedDeparture(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Giờ đến dự kiến</label>
                <input type="datetime-local" min={plannedDeparture || formatDateTimeLocal(new Date().toISOString())} className="border rounded px-3 py-2 text-sm" value={plannedArrival} onChange={(e) => setPlannedArrival(e.target.value)} />
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setLoadingModalTripId(null)} className="px-4 py-2 border rounded text-sm bg-gray-50 hover:bg-gray-100 font-medium">Hủy</button>
                <button type="button" onClick={handleStartLoading} className="px-4 py-2 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 font-medium">Bắt đầu bốc hàng</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Thêm đơn vào chuyến đang Loading */}
      {addOrdersTripId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-[480px] max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-base font-bold" style={{ color: PRIMARY }}>Thêm đơn vào chuyến</h2>
              <button onClick={() => setAddOrdersTripId(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 flex flex-col gap-3">
              <div className="border rounded max-h-64 overflow-y-auto divide-y divide-gray-100">
                {unscheduledOrders.length === 0 ? (
                  <p className="text-xs text-gray-400 p-3">Không có đơn hàng nào chờ lên lịch.</p>
                ) : unscheduledOrders.map((o) => (
                  <label key={o.id} className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={addOrderIds.includes(o.id)}
                      onChange={(e) => setAddOrderIds((prev) => e.target.checked ? [...prev, o.id] : prev.filter((id) => id !== o.id))}
                    />
                    <span className="font-medium text-gray-700 flex-shrink-0">{o.orderCode}</span>
                    <span className="text-gray-400 truncate flex-1">{o.customerName}</span>
                    <span className="text-gray-500 flex-shrink-0">{(o.totalPackedWeightKg ?? 0).toLocaleString('vi-VN')} kg</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setAddOrdersTripId(null)} className="px-4 py-2 border rounded text-sm bg-gray-50 hover:bg-gray-100 font-medium">Hủy</button>
                <button type="button" onClick={handleAddOrders} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium">Thêm vào chuyến</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmDepartTripId}
        title="Xác nhận xuất phát"
        message={departingTrip ? `Xác nhận chuyến Xe ${departingTrip.vehicleNumber} · Ca ${departingTrip.shift} với ${departingTrip.orderIds.length} đơn hàng sẽ xuất phát? Chuyến sẽ khóa danh sách đơn, không thể thêm/rút đơn sau khi xuất phát.` : ''}
        confirmText="Xác nhận xuất phát"
        cancelText="Hủy"
        onConfirm={handleDepart}
        onCancel={() => setConfirmDepartTripId(null)}
      />

      <ConfirmModal
        isOpen={!!confirmCancelTripId}
        title="Xác nhận hủy chuyến"
        message={cancelingTrip ? `Hủy chuyến Xe ${cancelingTrip.vehicleNumber} · Ca ${cancelingTrip.shift} với ${cancelingTrip.orderIds.length} đơn hàng? Toàn bộ đơn trong chuyến sẽ được nhả về danh sách chờ để xếp sang chuyến/xe khác.` : ''}
        confirmText="Hủy chuyến"
        cancelText="Đóng"
        onConfirm={handleCancelTrip}
        onCancel={() => setConfirmCancelTripId(null)}
      />
    </div>
  );
}
