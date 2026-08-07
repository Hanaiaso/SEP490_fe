import { useEffect, useState } from 'react';
import { Plus, Percent } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getDiscountTiers, createDiscountTier, updateDiscountTier } from '../../services/discountTierService.js';

const formatVnd = (n: number) => new Intl.NumberFormat('vi-VN').format(n || 0) + '₫';

// ─── Modal: Tạo / Sửa khung chiết khấu ───────────────────────────────────────
function DiscountTierModal({ tier, onClose, onSaved }: { tier: any | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const isEdit = !!tier;
  const [form, setForm] = useState({
    minAmount: tier?.minAmount ?? '',
    maxAmount: tier?.maxAmount ?? '',
    // Nhập theo % nguyên (vd 5 = 5%) — quy đổi sang phân số 0-1 khi gửi API.
    discountPercentInput: tier?.discountPercent != null ? String(tier.discountPercent * 100) : '',
    isActive: tier?.isActive ?? true,
    description: tier?.description ?? '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (form.minAmount === '') return toast.error('Vui lòng nhập mức tối thiểu.');
    if (form.discountPercentInput === '') return toast.error('Vui lòng nhập % chiết khấu.');

    const payload = {
      minAmount: Number(form.minAmount),
      maxAmount: form.maxAmount === '' ? undefined : Number(form.maxAmount),
      discountPercent: Number(form.discountPercentInput) / 100,
      description: form.description.trim() || undefined,
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updateDiscountTier(tier.id, { ...payload, isActive: form.isActive });
        toast.success('Cập nhật khung chiết khấu thành công!');
      } else {
        await createDiscountTier(payload);
        toast.success('Tạo khung chiết khấu thành công!');
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
        <h2 className="text-lg font-semibold text-[#1f3b64] border-b pb-2">{isEdit ? 'Sửa khung chiết khấu' : 'Thêm khung chiết khấu'}</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Từ (₫) *</label>
            <input type="number" className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
              value={form.minAmount} onChange={e => setForm({ ...form, minAmount: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Đến (₫)</label>
            <input type="number" placeholder="Để trống = không giới hạn" className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
              value={form.maxAmount} onChange={e => setForm({ ...form, maxAmount: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">% Chiết khấu *</label>
            <input type="number" step="0.1" className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
              value={form.discountPercentInput} onChange={e => setForm({ ...form, discountPercentInput: e.target.value })} />
          </div>
          {isEdit && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-600">Trạng thái</label>
              <select className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
                value={form.isActive ? '1' : '0'} onChange={e => setForm({ ...form, isActive: e.target.value === '1' })}>
                <option value="1">Đang áp dụng</option>
                <option value="0">Ngừng áp dụng</option>
              </select>
            </div>
          )}
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
            {saving ? 'Đang lưu...' : isEdit ? 'Lưu thay đổi' : 'Tạo khung'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminDiscountTiersPage() {
  const { toast } = useToast();
  const [tiers, setTiers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    try {
      const result = await getDiscountTiers();
      const items = Array.isArray(result) ? result : result.items || [];
      items.sort((a: any, b: any) => a.minAmount - b.minAmount);
      setTiers(items);
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
        <h1 className="font-semibold text-[20px] text-[#1f3b64]">Khung chiết khấu</h1>
        <button onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-[#1f3b64] text-white px-[16px] py-[8px] rounded-[4px] text-[12px] font-medium hover:bg-[#162a4a]">
          <Plus className="w-4 h-4" /> Thêm khung
        </button>
      </div>

      <div className="bg-white border border-[#e5e7eb] rounded-[8px] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f5f7fa] border-b border-[#e5e7eb]">
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Từ</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Đến</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">% Giảm</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Trạng thái</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Mô tả</th>
              <th className="text-center px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-4 text-sm text-gray-500">Đang tải...</td></tr>
            ) : tiers.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-4 text-sm text-gray-500">Chưa có dữ liệu</td></tr>
            ) : tiers.map(t => (
              <tr key={t.id} className="border-b border-[#f5f7fa] hover:bg-[#f5f7fa]">
                <td className="px-[16px] py-[12px] text-[12px] font-medium text-[#1f3b64]">{formatVnd(t.minAmount)}</td>
                <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">{t.maxAmount != null ? formatVnd(t.maxAmount) : 'Không giới hạn'}</td>
                <td className="px-[16px] py-[12px] text-[12px]">
                  <span className="px-2 py-1 rounded text-xs bg-amber-100 text-amber-700 flex items-center gap-1 w-fit">
                    <Percent className="w-3 h-3" /> {(t.discountPercent * 100).toFixed(1)}%
                  </span>
                </td>
                <td className="px-[16px] py-[12px] text-[12px]">
                  <span className={`px-2 py-1 rounded text-xs ${t.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {t.isActive ? 'Đang áp dụng' : 'Ngừng áp dụng'}
                  </span>
                </td>
                <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">{t.description || '-'}</td>
                <td className="px-[16px] py-[12px]">
                  <div className="flex items-center justify-center">
                    <button onClick={() => setEditTarget(t)} className="text-[#3b82f6] hover:text-[#2563eb] text-[12px] font-medium">Sửa</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isCreateOpen && <DiscountTierModal tier={null} onClose={() => setIsCreateOpen(false)} onSaved={load} />}
      {editTarget && <DiscountTierModal tier={editTarget} onClose={() => setEditTarget(null)} onSaved={load} />}
    </div>
  );
}
