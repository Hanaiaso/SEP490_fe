import { useEffect, useState } from 'react';
import { Plus, Truck } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getVehicles, createVehicle, updateVehicle } from '../../services/vehicleService.js';

function formatCapacity(c: number | null | undefined) {
  if (c === null || c === undefined) return '-';
  return `${new Intl.NumberFormat('vi-VN').format(c)} kg`;
}

// ─── Modal: Tạo / Sửa xe ─────────────────────────────────────────────────────
function VehicleModal({ vehicle, onClose, onSaved }: { vehicle: any | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const isEdit = !!vehicle;
  const [form, setForm] = useState({
    vehicleNumber: vehicle?.vehicleNumber ?? '',
    licensePlate: vehicle?.licensePlate ?? '',
    capacity: vehicle?.capacity ?? '',
    isActive: vehicle?.isActive ?? true,
    note: vehicle?.note ?? '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!isEdit && !form.vehicleNumber) return toast.error('Vui lòng nhập số xe.');
    if (!form.licensePlate.trim()) return toast.error('Vui lòng nhập biển số.');

    setSaving(true);
    try {
      if (isEdit) {
        await updateVehicle(vehicle.id, {
          licensePlate: form.licensePlate.trim(),
          capacity: form.capacity === '' ? undefined : Number(form.capacity),
          isActive: form.isActive,
          note: form.note.trim() || undefined,
        });
        toast.success('Cập nhật xe thành công!');
      } else {
        await createVehicle({
          vehicleNumber: Number(form.vehicleNumber),
          licensePlate: form.licensePlate.trim(),
          capacity: form.capacity === '' ? undefined : Number(form.capacity),
          note: form.note.trim() || undefined,
        });
        toast.success('Tạo xe thành công!');
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-[440px] flex flex-col gap-4 shadow-xl">
        <h2 className="text-lg font-semibold text-[#1f3b64] border-b pb-2">{isEdit ? 'Sửa thông tin xe' : 'Thêm xe mới'}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Số xe *</label>
            <input type="number" disabled={isEdit}
              className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
              value={form.vehicleNumber} onChange={e => setForm({ ...form, vehicleNumber: e.target.value })} />
            {isEdit && <span className="text-[10px] text-gray-400">Không thể thay đổi sau khi tạo.</span>}
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Biển số *</label>
            <input className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
              value={form.licensePlate} onChange={e => setForm({ ...form, licensePlate: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Tải trọng (kg)</label>
            <input type="number" className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
              value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
          </div>
          {isEdit && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Trạng thái</label>
              <select className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
                value={form.isActive ? '1' : '0'} onChange={e => setForm({ ...form, isActive: e.target.value === '1' })}>
                <option value="1">Đang hoạt động</option>
                <option value="0">Ngừng hoạt động</option>
              </select>
            </div>
          )}
          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-xs font-medium text-gray-600">Ghi chú</label>
            <input className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
              value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2 border-t pt-3">
          <button onClick={onClose} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Hủy</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium disabled:opacity-50">
            {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo xe'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminVehiclesPage() {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await getVehicles();
      setVehicles(Array.isArray(result) ? result : result.items || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="flex flex-col gap-[20px] p-[24px]">
      <div className="flex justify-between items-center">
        <h1 className="font-semibold text-[20px] text-[#1f3b64]">Xe giao hàng</h1>
        <button onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-[#1f3b64] text-white px-[16px] py-[8px] rounded-[4px] text-[12px] font-medium hover:bg-[#162a4a]">
          <Plus className="w-4 h-4" /> Thêm xe
        </button>
      </div>

      <div className="bg-white border border-[#e5e7eb] rounded-[8px] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f5f7fa] border-b border-[#e5e7eb]">
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Số xe</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Biển số</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Tải trọng</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Trạng thái</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Ghi chú</th>
              <th className="text-center px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-4 text-sm text-gray-500">Đang tải...</td></tr>
            ) : vehicles.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-4 text-sm text-gray-500">Chưa có dữ liệu</td></tr>
            ) : vehicles.map(v => (
              <tr key={v.id} className="border-b border-[#f5f7fa] hover:bg-[#f5f7fa]">
                <td className="px-[16px] py-[12px] text-[12px] font-medium text-[#1f3b64] flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5 text-gray-400" /> {v.vehicleNumber}
                </td>
                <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">{v.licensePlate}</td>
                <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">{formatCapacity(v.capacity)}</td>
                <td className="px-[16px] py-[12px] text-[12px]">
                  <span className={`px-2 py-1 rounded text-xs ${v.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {v.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}
                  </span>
                </td>
                <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">{v.note || '-'}</td>
                <td className="px-[16px] py-[12px]">
                  <div className="flex items-center justify-center">
                    <button onClick={() => setEditTarget(v)} className="text-[#3b82f6] hover:text-[#2563eb] text-[12px] font-medium">Sửa</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isCreateOpen && <VehicleModal vehicle={null} onClose={() => setIsCreateOpen(false)} onSaved={load} />}
      {editTarget && <VehicleModal vehicle={editTarget} onClose={() => setEditTarget(null)} onSaved={load} />}
    </div>
  );
}
