import { getErrorMessage } from '../../lib/errors';
import { useCallback, useEffect, useState } from 'react';
import { Plus, Clock, Trash2 } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getWarehouseShifts, createWarehouseShift, updateWarehouseShift, deleteWarehouseShift } from '../../services/warehouseService.js';
import type { WarehouseShift } from '../../types/warehouse';

// ─── Modal: Tạo / Sửa ca làm việc ────────────────────────────────────────────
function ShiftModal({ shift, onClose, onSaved }: { shift: WarehouseShift | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const isEdit = !!shift;
  const [form, setForm] = useState({
    name: shift?.name ?? '',
    startTime: shift?.startTime ?? '',
    endTime: shift?.endTime ?? '',
    description: shift?.description ?? '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Vui lòng nhập tên ca.');
    if (!form.startTime || !form.endTime) return toast.error('Vui lòng nhập đủ giờ bắt đầu/kết thúc.');

    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        startTime: form.startTime,
        endTime: form.endTime,
        description: form.description.trim() || undefined,
      };
      if (isEdit) {
        await updateWarehouseShift(shift.id, data);
        toast.success('Cập nhật ca làm việc thành công!');
      } else {
        await createWarehouseShift(data);
        toast.success('Tạo ca làm việc thành công!');
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-[440px] flex flex-col gap-4 shadow-xl">
        <h2 className="text-lg font-semibold text-[#1f3b64] border-b pb-2">{isEdit ? 'Sửa ca làm việc' : 'Thêm ca làm việc'}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-xs font-medium text-gray-600">Tên ca *</label>
            <input className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Giờ bắt đầu *</label>
            <input type="time" className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
              value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Giờ kết thúc *</label>
            <input type="time" className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
              value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-xs font-medium text-gray-600">Mô tả</label>
            <input className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2 border-t pt-3">
          <button onClick={onClose} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Hủy</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium disabled:opacity-50">
            {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo ca'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminWarehouseShiftsPage() {
  const { toast } = useToast();
  const [shifts, setShifts] = useState<WarehouseShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WarehouseShift | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getWarehouseShifts();
      setShifts(Array.isArray(result) ? result : []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa ca làm việc này?')) return;
    try {
      setDeletingId(id);
      await deleteWarehouseShift(id);
      toast.success('Xóa ca làm việc thành công!');
      load();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-[20px] p-[24px]">
      <div className="flex justify-between items-center">
        <h1 className="font-semibold text-[20px] text-[#1f3b64]">Ca làm việc</h1>
        <button onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-[#1f3b64] text-white px-[16px] py-[8px] rounded-[4px] text-[12px] font-medium hover:bg-[#162a4a]">
          <Plus className="w-4 h-4" /> Thêm ca
        </button>
      </div>

      <div className="bg-white border border-[#e5e7eb] rounded-[8px] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f5f7fa] border-b border-[#e5e7eb]">
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Tên ca</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Giờ bắt đầu</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Giờ kết thúc</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Mô tả</th>
              <th className="text-center px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-4 text-sm text-gray-500">Đang tải...</td></tr>
            ) : shifts.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-4 text-sm text-gray-500">Chưa có dữ liệu</td></tr>
            ) : shifts.map(s => (
              <tr key={s.id} className="border-b border-[#f5f7fa] hover:bg-[#f5f7fa]">
                <td className="px-[16px] py-[12px] text-[12px] font-medium text-[#1f3b64] flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-gray-400" /> {s.name}
                </td>
                <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">{s.startTime}</td>
                <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">{s.endTime}</td>
                <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">{s.description || '-'}</td>
                <td className="px-[16px] py-[12px]">
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => setEditTarget(s)} className="text-[#3b82f6] hover:text-[#2563eb] text-[12px] font-medium">Sửa</button>
                    <button onClick={() => handleDelete(s.id)} disabled={deletingId === s.id}
                      className="text-red-500 hover:text-red-600 disabled:opacity-50">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isCreateOpen && <ShiftModal shift={null} onClose={() => setIsCreateOpen(false)} onSaved={load} />}
      {editTarget && <ShiftModal shift={editTarget} onClose={() => setEditTarget(null)} onSaved={load} />}
    </div>
  );
}
