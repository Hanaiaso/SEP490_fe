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

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex justify-between items-center px-6 py-4 bg-white border-b shadow-sm">
        <h1 className="text-xl font-bold text-[#1f3b64]">Danh mục Nguyên liệu</h1>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm nguyên liệu..." 
              className="pl-9 pr-4 py-2 border rounded-md text-sm w-[250px] focus:outline-none focus:border-blue-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 font-medium"
          >
            <Plus className="w-4 h-4" /> Thêm nguyên liệu
          </button>
        </div>
      </div>

      <div className="p-6 flex-1 overflow-auto">
        {loading ? (
          <div className="text-center py-10 text-gray-500">Đang tải dữ liệu...</div>
        ) : (
          <div className="bg-white rounded-lg shadow border overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-100 text-[#1f3b64] font-semibold border-b">
                <tr>
                  <th className="px-4 py-3">Tên Nguyên liệu</th>
                  <th className="px-4 py-3 w-[150px]">ĐVT</th>
                  <th className="px-4 py-3 w-[200px] text-right">Ngưỡng an toàn</th>
                  <th className="px-4 py-3 w-[200px] text-right">Tồn kho hiện tại</th>
                  <th className="px-4 py-3 w-[120px] text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {materials.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">Không tìm thấy nguyên liệu nào.</td></tr>
                ) : (
                  materials.map((m) => (
                    <tr key={m.id} className="border-b hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800 flex items-center gap-2">
                        {m.name}
                        {m.isBelowSafetyThreshold && (
                          <span title="Dưới ngưỡng an toàn, cần nhập thêm!">
                            <ShieldAlert className="w-4 h-4 text-red-500" />
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{m.unit}</td>
                      <td className="px-4 py-3 text-right text-orange-600 font-medium">{m.safetyThreshold.toLocaleString()}</td>
                      <td className={`px-4 py-3 text-right font-bold ${m.isBelowSafetyThreshold ? 'text-red-600' : 'text-green-600'}`}>
                        {m.currentStock.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleOpenModal(m)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Sửa">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(m.id, m.name)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Xóa">
                            <Trash2 className="w-4 h-4" />
                          </button>
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
