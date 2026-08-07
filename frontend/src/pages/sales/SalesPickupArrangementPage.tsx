import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, MapPin, Package, RefreshCw, Truck, User, X } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type PickupRequest = {
  id: string;
  requestCode: string;
  orderCode: string;
  customer: string;
  customerPhone: string;
  address: string;
  pickupStatus: string;
  scheduledPickupDate?: string;
  pickupShift?: string;
  vehicleId?: number;
  returnProductNames: string[];
};

type Vehicle = {
  id: number;           // 1-5
  label: string;
  requests: PickupRequest[];
};

const SHIFTS = [
  { key: 'Sáng', label: 'Ca sáng (6:00 - 14:00)' },
  { key: 'Trưa', label: 'Ca trưa (14:00 - 22:00)' },
  { key: 'Chiều', label: 'Ca chiều (22:00 - 6:00)' },
];

const INITIAL_VEHICLES: Vehicle[] = [
  { id: 1, label: 'Xe 1', requests: [] },
  { id: 2, label: 'Xe 2', requests: [] },
  { id: 3, label: 'Xe 3', requests: [] },
  { id: 4, label: 'Xe 4', requests: [] },
  { id: 5, label: 'Xe 5', requests: [] },
];

function api(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('accessToken');
  return fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) },
  });
}

export default function SalesPickupArrangementPage() {
  const navigate = useNavigate();
  const [activeShift, setActiveShift] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [vehicles, setVehicles] = useState<Vehicle[]>(INITIAL_VEHICLES);
  const [available, setAvailable] = useState<PickupRequest[]>([]);
  const [dragging, setDragging] = useState<PickupRequest | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Shift Cutoff Logic ────────────────────────────────────────────────────
  const shiftEditable = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    if (selectedDate < todayStr) return false;
    if (selectedDate > todayStr) return true;

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

  const fetchPickups = async () => {
    setLoading(true);
    try {
      const res = await api('/api/delivery/pickups');
      if (!res.ok) throw new Error();
      const data: any[] = await res.json();

      const unscheduled: PickupRequest[] = [];
      const newVehicles: Vehicle[] = VEHICLES_META();

      data.forEach((o) => {
        const mapped: PickupRequest = {
          id: o.requestId,
          requestCode: o.requestCode,
          orderCode: o.orderCode,
          customer: o.customerName,
          customerPhone: o.customerPhone,
          address: o.shippingAddress,
          pickupStatus: o.pickupStatus,
          scheduledPickupDate: o.scheduledPickupDate,
          pickupShift: o.pickupShift,
          vehicleId: o.pickupVehicleId,
          returnProductNames: o.returnProductNames || [],
        };

        if (o.pickupStatus === 'Scheduled' && o.pickupVehicleId) {
          const reqDateStr = o.scheduledPickupDate ? o.scheduledPickupDate.split('T')[0] : '';
          if (reqDateStr === selectedDate && o.pickupShift === SHIFTS[activeShift].key) {
            const v = newVehicles.find((v) => v.id === o.pickupVehicleId);
            if (v) v.requests.push(mapped);
          } else {
            // Wait, if it's scheduled on another day/shift, it shouldn't show in the unscheduled list
          }
        } else if (o.pickupStatus === 'NotScheduled') {
          unscheduled.push(mapped);
        }
      });

      setVehicles(newVehicles);
      setAvailable(unscheduled);
    } catch {
      showToast('Không thể tải danh sách đơn thu hồi.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPickups();
  }, [selectedDate, activeShift]);

  const VEHICLES_META = (): Vehicle[] => INITIAL_VEHICLES.map((v) => ({ ...v, requests: [] }));

  const newlyAssignedCount = useMemo(() => {
    return vehicles.reduce((sum, v) => {
      const unsavedInVehicle = v.requests.filter(o => o.pickupStatus !== 'Scheduled').length;
      return sum + unsavedInVehicle;
    }, 0);
  }, [vehicles]);

  const handleDropOnVehicle = (vehicleId: number) => {
    if (!dragging || !shiftEditable) return;
    setVehicles((prev) =>
      prev.map((v) => (v.id !== vehicleId ? v : { ...v, requests: [...v.requests, dragging] }))
    );
    setAvailable((prev) => prev.filter((o) => o.id !== dragging.id));
    setDragging(null);
    setDragOver(null);
  };

  const removeFromVehicle = (vehicleId: number, requestId: string) => {
    if (!shiftEditable) return;
    const v = vehicles.find((v) => v.id === vehicleId);
    const req = v?.requests.find((o) => o.id === requestId);
    if (!req) return;

    if (req.pickupStatus === 'Scheduled') {
      showToast('Yêu cầu thu hồi đã được chốt lịch. Không thể gỡ bỏ.', 'error');
      return;
    }

    setVehicles((prev) => prev.map((v) => (v.id !== vehicleId ? v : { ...v, requests: v.requests.filter((o) => o.id !== requestId) })));
    setAvailable((prev) => [...prev, req]);
  };

  const handleConfirmSchedule = async () => {
    if (newlyAssignedCount === 0) return;
    if (!shiftEditable) {
      showToast('Ca thu hồi đã bị khóa. Không thể thực hiện xác nhận phân xe.', 'error');
      return;
    }

    setSaving(true);
    const shiftKey = SHIFTS[activeShift].key;
    const promises: Promise<void>[] = [];
    
    for (const v of vehicles) {
      const unsavedRequests = v.requests.filter((o) => o.pickupStatus !== 'Scheduled');
      for (const req of unsavedRequests) {
        promises.push(
          api(`/api/delivery/pickups/${req.id}/schedule`, {
            method: 'POST',
            body: JSON.stringify({
              vehicleId: v.id,
              shift: shiftKey,
              pickupDate: selectedDate
            }),
          }).then(async (res) => {
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.message);
            }
          })
        );
      }
    }

    try {
      await Promise.all(promises);
      const fmtDate = new Date(selectedDate).toLocaleDateString('vi-VN');
      showToast(`Lập lịch thành công cho các đơn thu hồi ca ${shiftKey} ngày ${fmtDate}!`);
      await fetchPickups();
    } catch (err: any) {
      showToast(err.message || 'Có lỗi xảy ra khi lập lịch thu hồi.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {toast && (
        <div className={`fixed right-4 top-14 z-50 rounded-lg px-4 py-2.5 text-sm text-white shadow-lg transition-all ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="border-b border-gray-200 bg-white px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Điều xe thu hồi</h2>
            <p className="mt-0.5 text-xs text-gray-500">Kéo thả yêu cầu đổi trả vào xe để phân công thu hồi.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 font-medium">Ngày thu hồi:</span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-8 rounded border border-gray-200 px-2 text-xs text-gray-700 font-semibold focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              onClick={fetchPickups}
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

      {!shiftEditable && (
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 flex items-center gap-2 text-xs text-amber-800">
          <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <span>
            <strong>Ca thu hồi đã bị khóa:</strong> Bạn không thể thay đổi, thêm hoặc gỡ bỏ bất kỳ yêu cầu nào trong ca này (do quá thời gian lập lịch hoặc ngày trong quá khứ).
          </span>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden bg-gray-50">
        <div className="flex w-80 flex-col border-r border-gray-200 bg-white shadow-[2px_0_8px_-4px_rgba(0,0,0,0.1)] z-10">
          <div className="border-b border-gray-100 bg-gray-50/50 px-4 py-3">
            <h3 className="text-sm font-bold text-gray-800">Yêu cầu thu hồi chờ xếp xe</h3>
            <p className="text-xs text-gray-500">{available.length} yêu cầu cần xếp lịch</p>
          </div>
          <div className="flex-1 overflow-auto p-3 space-y-2">
            {available.length === 0 && !loading && (
              <div className="flex h-32 flex-col items-center justify-center text-gray-400">
                <CheckCircle className="mb-2 h-8 w-8 text-green-500 opacity-20" />
                <span className="text-xs">Không có yêu cầu nào cần thu hồi</span>
              </div>
            )}
            {available.map((req) => (
              <div
                key={req.id}
                draggable={shiftEditable}
                onDragStart={(e) => {
                  setDragging(req);
                  e.dataTransfer.setData('text/plain', req.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                className={`relative rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-all ${
                  shiftEditable ? 'cursor-grab hover:border-blue-400 hover:shadow-md' : 'cursor-not-allowed opacity-75'
                }`}
              >
                <div className="mb-2 flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-semibold text-blue-700">YCTH: {req.requestCode}</span>
                    <span className="text-[10px] text-gray-500 font-mono">Order: {req.orderCode}</span>
                  </div>
                  <span className="rounded bg-yellow-100 px-1.5 py-0.5 text-[9px] font-semibold text-yellow-800 border border-yellow-200">
                    Chưa điều xe
                  </span>
                </div>
                <div className="mb-2 space-y-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-gray-700">
                    <User className="h-3 w-3 text-gray-400" />
                    <span className="font-medium">{req.customer}</span>
                    <span className="text-gray-400">·</span>
                    <span>{req.customerPhone}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-[11px] text-gray-600">
                    <MapPin className="mt-0.5 h-3 w-3 text-gray-400 flex-shrink-0" />
                    <span className="line-clamp-2 leading-tight">{req.address}</span>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
                  <div className="flex items-center gap-1 text-[10px] text-gray-500">
                    <Package className="h-3 w-3" />
                    <span>{req.returnProductNames.length} SP hoàn</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
            {vehicles.map((v) => (
              <div
                key={v.id}
                onDragOver={(e) => {
                  if (!shiftEditable) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                  setDragOver(v.id);
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  handleDropOnVehicle(v.id);
                }}
                className={`flex flex-col rounded-xl border ${
                  dragOver === v.id
                    ? 'border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-500/20'
                    : 'border-gray-200 bg-white'
                } transition-all`}
              >
                <div className="flex items-center justify-between rounded-t-xl bg-white px-4 py-3 border-b border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-100 text-blue-700">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-gray-800">{v.label}</h3>
                      <p className="text-[10px] text-gray-500">Tài xế {v.id}</p>
                    </div>
                  </div>
                  <div className="flex h-6 items-center justify-center rounded-full bg-blue-50 px-2.5 text-xs font-semibold text-blue-700">
                    {v.requests.length} YCTH
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[200px]">
                  {v.requests.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                      <p className="text-xs font-medium text-gray-400">Kéo yêu cầu vào đây</p>
                    </div>
                  ) : (
                    v.requests.map((req) => (
                      <div
                        key={req.id}
                        className={`group relative rounded-lg border bg-white p-3 shadow-sm transition-all ${
                          req.pickupStatus === 'Scheduled'
                            ? 'border-green-200 shadow-[0_0_0_1px_rgba(34,197,94,0.1)]'
                            : 'border-blue-200 shadow-[0_0_0_1px_rgba(59,130,246,0.1)]'
                        }`}
                      >
                        <div className="mb-2 flex justify-between">
                           <div className="flex flex-col">
                            <span className="text-[11px] font-semibold text-gray-800">{req.requestCode}</span>
                          </div>
                          {req.pickupStatus === 'Scheduled' ? (
                            <span className="flex items-center gap-1 rounded bg-green-50 px-1.5 py-0.5 text-[9px] font-bold text-green-700 border border-green-200">
                              <CheckCircle className="h-2.5 w-2.5" />
                              Đã chốt
                            </span>
                          ) : (
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700 border border-blue-200">
                              Mới gán
                            </span>
                          )}
                        </div>

                        <div className="mb-1 text-[11px] font-medium text-gray-700 line-clamp-1">{req.customer}</div>
                        <div className="mb-1 text-[10px] text-gray-500 line-clamp-1">{req.address}</div>

                        {req.pickupStatus !== 'Scheduled' && shiftEditable && (
                          <button
                            onClick={() => removeFromVehicle(v.id, req.id)}
                            className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-white text-gray-400 shadow hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity border border-gray-200"
                            title="Gỡ khỏi xe"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
