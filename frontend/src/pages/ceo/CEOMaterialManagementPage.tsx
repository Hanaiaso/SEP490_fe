import { getErrorMessage } from '../../lib/errors';
import { useState, useEffect, useCallback } from 'react';
import { getMaterials, createMaterial, updateMaterial, deleteMaterial } from '../../services/materialService.js';
import { Search, Plus } from 'lucide-react';
import type { Material } from '../../types/catalog';

export default function CEOMaterialManagementPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    unit: 'Kg',
    safetyThreshold: 0
  });

  const loadMaterials = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMaterials({ search });
      setMaterials(Array.isArray(data) ? data : data.items || []);
    } catch (err: unknown) {
      alert("Lỗi khi tải danh sách nguyên liệu: " + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadMaterials();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [loadMaterials]);

  const handleOpenModal = (material: Material | null = null) => {
    if (material) {
      setEditingMaterial(material);
      setFormData({
        name: material.name,
        unit: material.unit,
        safetyThreshold: material.safetyThreshold
      });
    } else {
      setEditingMaterial(null);
      setFormData({ name: '', unit: 'Kg', safetyThreshold: 0 });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingMaterial) {
        await updateMaterial(editingMaterial.id, formData);
        alert("Cập nhật thành công!");
      } else {
        await createMaterial(formData);
        alert("Thêm nguyên liệu thành công!");
      }
      setIsModalOpen(false);
      loadMaterials();
    } catch (err: unknown) {
      alert(getErrorMessage(err, "Đã xảy ra lỗi"));
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xoá nguyên liệu "${name}" không?`)) {
      try {
        await deleteMaterial(id);
        alert("Xoá thành công!");
        loadMaterials();
      } catch (err: unknown) {
        alert(getErrorMessage(err, "Không thể xoá nguyên liệu này"));
      }
    }
  };

  const SUCCESS = '#16A34A';
  const ERROR   = '#DC2626';

  const criticalCount = materials.filter(m => m.isBelowSafetyThreshold).length;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-5 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Quản lý Nguyên vật liệu</h2>
            <p className="text-xs text-gray-500 mt-0.5">{materials.length} loại · {criticalCount} cần chú ý</p>
          </div>
          <div className="flex gap-2">
            <button 
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-white rounded bg-blue-600 hover:bg-blue-700"
              onClick={() => handleOpenModal()}
            >
              <Plus className="w-3.5 h-3.5" /> Thêm nguyên liệu
            </button>
          </div>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input 
            type="text"
            className="w-full pl-8 h-8 text-xs bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-blue-500" 
            placeholder="Tìm mã, tên nguyên liệu..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
          />
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4 flex-1">
        {loading ? (
          <div className="text-center py-10 text-xs text-gray-500">Đang tải dữ liệu...</div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-gray-700 font-semibold">Tên nguyên liệu</th>
                  <th className="text-center px-4 py-3 text-gray-700 font-semibold">Đơn vị</th>
                  <th className="text-right px-4 py-3 text-gray-700 font-semibold">Ngưỡng an toàn</th>
                  <th className="text-right px-4 py-3 text-gray-700 font-semibold">Tồn kho hiện tại</th>
                  <th className="text-center px-4 py-3 text-gray-700 font-semibold">Trạng thái</th>
                  <th className="text-center px-4 py-3 text-gray-700 font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {materials.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">Không tìm thấy nguyên liệu nào.</td></tr>
                ) : (
                  materials.map((m, i) => (
                    <tr key={m.id} className="hover:bg-[#F9FAFB] transition-colors" style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                      <td className="px-4 py-3 font-semibold text-gray-800">{m.name}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{m.unit}</td>
                      <td className="px-4 py-3 text-right text-gray-500 tabular-nums">{m.safetyThreshold.toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums" style={{ color: m.isBelowSafetyThreshold ? ERROR : '#374151' }}>
                        {m.currentStock.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {m.isBelowSafetyThreshold ? (
                          <span className="text-[10px] font-medium text-white px-2 py-0.5 whitespace-nowrap" style={{ backgroundColor: ERROR, borderRadius: 4 }}>
                            Thiếu
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-white px-2 py-0.5 whitespace-nowrap" style={{ backgroundColor: SUCCESS, borderRadius: 4 }}>
                            Đủ hàng
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleOpenModal(m)} className="px-2 py-1 rounded text-[10px] border border-gray-200 hover:bg-gray-50 text-gray-600">Sửa</button>
                          <button onClick={() => handleDelete(m.id, m.name)} className="px-2 py-1 rounded text-[10px] border border-red-200 hover:bg-red-50 text-red-600">Xóa</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/45 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h2 className="text-sm font-bold text-[#1F3B64]">
                {editingMaterial ? 'Sửa Thông Tin Nguyên Liệu' : 'Thêm Nguyên Liệu Mới'}
              </h2>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-6 flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700">Tên nguyên liệu *</label>
                <input 
                  type="text" required 
                  className="border border-gray-300 rounded-lg px-3 h-9 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="VD: Vải Kaki, Lõi giấy..."
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700">Đơn vị tính *</label>
                <input 
                  type="text" required 
                  className="border border-gray-300 rounded-lg px-3 h-9 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} 
                  placeholder="VD: Kg, Mét, Cuộn..."
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-700">Ngưỡng an toàn (Cảnh báo tồn kho) *</label>
                <input 
                  type="number" min="0" step="0.1" required 
                  className="border border-gray-300 rounded-lg px-3 h-9 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono font-bold text-blue-700" 
                  value={formData.safetyThreshold} onChange={e => setFormData({...formData, safetyThreshold: Number(e.target.value)})} 
                />
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Khi tồn kho giảm xuống dưới mức này, hệ thống sẽ cảnh báo (hiện icon màu đỏ) để kịp thời mua bổ sung.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 h-9 border border-gray-300 rounded-lg text-xs font-medium bg-white hover:bg-gray-50 text-gray-700">Hủy bỏ</button>
                <button type="submit" className="px-5 h-9 bg-[#1F3B64] text-white rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity shadow-sm">
                  {editingMaterial ? 'Lưu thay đổi' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
