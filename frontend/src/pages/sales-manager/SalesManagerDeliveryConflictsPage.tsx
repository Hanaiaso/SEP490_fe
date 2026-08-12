import { getErrorMessage } from '../../lib/errors';
import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Truck } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getPendingDeliveryConflicts, resolveDeliveryConflict } from '../../services/deliveryConflictService.js';
import type { DeliveryScheduleConflict, ResolveDeliveryConflictRequest } from '../../types/delivery';

// UC-34: Sales Manager giải quyết xung đột lịch xe/ca — xe/ca/ngày trùng với 1 chuyến khác đang
// Scheduled hoặc InDelivery. Backend đã tự tạo bản ghi Pending thay vì chặn cứng Sales Staff.

const SHIFTS = ['Sáng', 'Trưa', 'Chiều'];

function parseUtc(value: string) {
  return new Date(/Z|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`);
}

function formatDate(value: string) {
  return parseUtc(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function ResolveModal({ conflict, onClose, onResolved }: { conflict: DeliveryScheduleConflict; onClose: () => void; onResolved: () => void }) {
  const { toast } = useToast();
  const [action, setAction] = useState<ResolveDeliveryConflictRequest['action']>('Reassign');
  const [newVehicleId, setNewVehicleId] = useState('');
  const [newShift, setNewShift] = useState(conflict.shift);
  const [newDate, setNewDate] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!note.trim()) return toast.error('Vui lòng nhập ghi chú xử lý.');
    if (action === 'Reassign' && (!newVehicleId || !newShift || !newDate)) {
      return toast.error('Vui lòng chọn đủ xe / ca / ngày mới khi chuyển lịch.');
    }

    setSaving(true);
    try {
      const payload: ResolveDeliveryConflictRequest = {
        action,
        note: note.trim(),
        ...(action === 'Reassign'
          ? { newVehicleId: Number(newVehicleId), newShift, newDate: new Date(newDate).toISOString() }
          : {}),
      };
      await resolveDeliveryConflict(conflict.id, payload);
      toast.success('Đã xử lý xung đột lịch giao hàng.');
      onResolved();
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-[460px] flex flex-col gap-4 shadow-xl">
        <div>
          <h2 className="text-lg font-semibold text-[#1f3b64]">Xử lý xung đột lịch giao</h2>
          <p className="text-xs text-gray-500 mt-1">
            Xe {conflict.vehicleId} · Ca {conflict.shift} · {new Date(conflict.requestedDate).toLocaleDateString('vi-VN')} · {conflict.orderCodes.length} đơn: {conflict.orderCodes.join(', ')}
          </p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Hành động</label>
          <select
            className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
            value={action}
            onChange={e => setAction(e.target.value as ResolveDeliveryConflictRequest['action'])}
          >
            <option value="Reassign">Chuyển sang xe/ca/ngày khác</option>
            <option value="Override">Chấp nhận trùng lịch (giữ nguyên xe/ca/ngày gốc)</option>
            <option value="Reject">Từ chối — Sales tự lập lịch lại</option>
          </select>
        </div>

        {action === 'Reassign' && (
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Xe mới</label>
              <select className="border rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                value={newVehicleId} onChange={e => setNewVehicleId(e.target.value)}>
                <option value="">Chọn xe</option>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>Xe {n}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Ca mới</label>
              <select className="border rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                value={newShift} onChange={e => setNewShift(e.target.value)}>
                {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Ngày mới</label>
              <input type="date" className="border rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500"
                value={newDate} onChange={e => setNewDate(e.target.value)} />
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Ghi chú xử lý *</label>
          <textarea rows={3} className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 resize-none"
            value={note} onChange={e => setNote(e.target.value)} placeholder="Lý do quyết định..." />
        </div>

        <div className="flex justify-end gap-2 border-t pt-3">
          <button onClick={onClose} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Hủy</button>
          <button onClick={handleSubmit} disabled={saving}
            className="px-4 py-2 bg-[#1f3b64] text-white rounded text-sm hover:bg-[#162a4a] font-medium disabled:opacity-50">
            {saving ? 'Đang lưu...' : 'Xác nhận'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SalesManagerDeliveryConflictsPage() {
  const { toast } = useToast();
  const [conflicts, setConflicts] = useState<DeliveryScheduleConflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveTarget, setResolveTarget] = useState<DeliveryScheduleConflict | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPendingDeliveryConflicts();
      setConflicts(data || []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <AlertTriangle className="h-5 w-5 text-amber-600" />
          Xung đột lịch xe/ca
        </h1>
        <p className="text-[13px] text-gray-500">Xe/ca/ngày bị trùng với chuyến khác — chọn hướng xử lý cho từng trường hợp.</p>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {['Xe', 'Ca', 'Ngày yêu cầu', 'Đơn hàng', 'Người yêu cầu', 'Gửi lúc', ''].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center">
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-[#1F3B64]" />
                </td></tr>
              ) : conflicts.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-[13px] text-gray-400">Không có xung đột nào đang chờ xử lý</td></tr>
              ) : conflicts.map(c => (
                <tr key={c.id} className="transition-colors hover:bg-gray-50/60">
                  <td className="px-3 py-3 text-[13px] font-semibold text-gray-900">
                    <span className="inline-flex items-center gap-1"><Truck className="h-3.5 w-3.5 text-gray-400" />Xe {c.vehicleId}</span>
                  </td>
                  <td className="px-3 py-3 text-[13px] text-gray-700">{c.shift}</td>
                  <td className="px-3 py-3 text-[13px] text-gray-700">{new Date(c.requestedDate).toLocaleDateString('vi-VN')}</td>
                  <td className="max-w-[220px] px-3 py-3">
                    <p className="truncate text-[13px] text-gray-700" title={c.orderCodes.join(', ')}>{c.orderCodes.join(', ') || '—'}</p>
                  </td>
                  <td className="px-3 py-3 text-[13px] text-gray-700">{c.raisedByUserName || '—'}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-[12px] text-gray-500">{formatDate(c.raisedAt)}</td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => setResolveTarget(c)}
                      className="inline-flex items-center gap-1 text-[12px] font-medium text-[#1F3B64] hover:underline"
                    >
                      Xử lý
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {resolveTarget && (
        <ResolveModal conflict={resolveTarget} onClose={() => setResolveTarget(null)} onResolved={load} />
      )}
    </div>
  );
}
