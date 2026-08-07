import { useState, useEffect } from 'react';
import { getMaterials, createMaterial, updateMaterial, deleteMaterial } from '../../services/materialService.js';
import { Search, Plus, Edit2, Trash2, ShieldAlert } from 'lucide-react';

export default function CEOMaterialManagementPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    unit: 'Kg',
    safetyThreshold: 0
  });

  const loadMaterials = async () => {
    try {
      setLoading(true);
      const data = await getMaterials({ search });
      setMaterials(Array.isArray(data) ? data : data.items || []);
    } catch (err: any) {
      alert("Lỗi khi tải danh sách nguyên liệu: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadMaterials();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  const handleOpenModal = (material: any = null) => {
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
    } catch (err: any) {
      alert(err.message || "Đã xảy ra lỗi");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xoá nguyên liệu "${name}" không?`)) {
      try {
        await deleteMaterial(id);
        alert("Xoá thành công!");
        loadMaterials();
      } catch (err: any) {
        alert(err.message || "Không thể xoá nguyên liệu này");
      }
    }
  };

  const PRIMARY = '#1F3B64';
  const SUCCESS = '#16A34A';
  const WARNING = '#F97316';
  const ERROR   = '#DC2626';

  const criticalCount = materials.filter(m => m.isBelowSafetyThreshold).length;

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3">
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

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-[500px]">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold text-[#1f3b64]">
                {editingMaterial ? 'Sửa thông tin nguyên liệu' : 'Thêm nguyên liệu mới'}
              </h2>
            </div>
            <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Tên nguyên liệu *</label>
                <input 
                  type="text" required 
                  className="border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" 
                  value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} 
                  placeholder="VD: Vải Kaki, Lõi giấy..."
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Đơn vị tính *</label>
                <input 
                  type="text" required 
                  className="border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" 
                  value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} 
                  placeholder="VD: Kg, Mét, Cuộn..."
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Ngưỡng an toàn (Cảnh báo tồn kho) *</label>
                <input 
                  type="number" min="0" step="0.1" required 
                  className="border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500" 
                  value={formData.safetyThreshold} onChange={e => setFormData({...formData, safetyThreshold: Number(e.target.value)})} 
                />
                <p className="text-xs text-gray-500 mt-1">
                  Khi tồn kho giảm xuống dưới mức này, hệ thống sẽ cảnh báo (hiện icon màu đỏ) để bạn kịp thời mua thêm.
                </p>
              </div>
              
              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded text-sm bg-gray-50 hover:bg-gray-100 font-medium">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium shadow-sm">
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
