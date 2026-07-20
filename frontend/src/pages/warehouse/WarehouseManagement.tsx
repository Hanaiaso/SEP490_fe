import React, { useState, useEffect } from 'react';
import { Settings, Plus, Edit, Trash, Building, AlertCircle, Check } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from '../../services/warehouseService';

const PRIMARY = '#3b82f6';
const ERROR = '#ef4444';

export default function WarehouseManagement() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);

  const [formData, setFormData] = useState({ name: '', code: '', locationNames: '' });
  const [submitting, setSubmitting] = useState(false);

  // Xóa kho
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      setError('');
      const res: any = await getWarehouses();
      setWarehouses(res || []);
    } catch (err: any) {
      setError('Lỗi khi tải danh sách kho: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (warehouse: any = null) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormData({
        name: warehouse.name,
        code: warehouse.code,
        locationNames: warehouse.locations?.map((l: any) => l.name).join(', ') || ''
      });
    } else {
      setEditingWarehouse(null);
      setFormData({ name: '', code: '', locationNames: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingWarehouse(null);
    setFormData({ name: '', code: '', locationNames: '' });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.code) {
      alert('Vui lòng nhập đầy đủ Tên kho và Mã kho!');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: formData.name,
        code: formData.code,
        locationNames: formData.locationNames.split(',').map(n => n.trim()).filter(n => n)
      };

      if (editingWarehouse) {
        await updateWarehouse(editingWarehouse.id, payload);
        alert('Cập nhật kho thành công!');
      } else {
        await createWarehouse(payload);
        alert('Thêm kho mới thành công!');
      }
      handleCloseModal();
      fetchWarehouses();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa kho này? Hệ thống sẽ tự động xóa tất cả vị trí lưu trữ bên trong. Lưu ý: Không thể xóa kho nếu đang có hàng tồn kho.')) {
      return;
    }

    try {
      setDeletingId(id);
      await deleteWarehouse(id);
      alert('Xóa kho thành công!');
      fetchWarehouses();
    } catch (err: any) {
      alert('Lỗi khi xóa kho: ' + err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building className="w-6 h-6 text-blue-600" />
            Cấu hình Danh mục Kho
          </h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý danh sách các kho bãi trong hệ thống (Dành cho CEO)</p>
        </div>

        <Button
          onClick={() => handleOpenModal()}
          style={{ backgroundColor: PRIMARY }}
          className="gap-2 shadow-sm hover:shadow"
        >
          <Plus className="w-4 h-4" /> Thêm kho mới
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded flex items-center gap-2 text-sm border border-red-100">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-auto">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700 w-24">Mã Kho</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 w-48">Tên Kho</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Vị trí (Kệ/Khu)</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700 w-32">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : warehouses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Building className="w-10 h-10 text-gray-300 mb-2" />
                      Chưa có kho nào trong hệ thống.
                    </div>
                  </td>
                </tr>
              ) : (
                warehouses.map((wh) => (
                  <tr key={wh.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-blue-700">{wh.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{wh.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {wh.locations && wh.locations.length > 0 ? (
                          wh.locations.map((loc: any) => (
                            <span key={loc.id} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full border border-gray-200">
                              {loc.name}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">Chưa cập nhập vị trí</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Nút Chỉnh sửa */}
                        <button
                          type="button"
                          className="h-8 w-8 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-center transition-colors bg-white cursor-pointer"
                          onClick={() => handleOpenModal(wh)}
                          title="Chỉnh sửa kho"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Nút Xóa */}
                        <button
                          type="button"
                          className="h-8 w-8 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-colors bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={() => handleDelete(wh.id)}
                          disabled={deletingId === wh.id}
                          title="Xóa kho"
                        >
                          {deletingId === wh.id ? (
                            <div className="animate-spin w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full" />
                          ) : (
                            <Trash className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-base font-bold flex items-center gap-2 text-gray-800">
                <Settings className="w-5 h-5 text-gray-500" />
                {editingWarehouse ? 'Cập nhật thông tin kho' : 'Thêm kho mới'}
              </h3>
            </div>

            <div className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Mã kho (VD: WH-HCM)</label>
                <Input
                  placeholder="Nhập mã kho..."
                  value={formData.code}
                  onChange={(e: any) => setFormData({ ...formData, code: e.target.value })}
                  className="font-mono text-sm uppercase"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Tên kho</label>
                <Input
                  placeholder="Nhập tên kho..."
                  value={formData.name}
                  onChange={(e: any) => setFormData({ ...formData, name: e.target.value })}
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Vị trí lưu trữ (Kệ/Khu)</label>
                <textarea
                  placeholder="Nhập tên các vị trí, cách nhau bởi dấu phẩy (VD: Kệ A, Kệ B, Khu 1)..."
                  value={formData.locationNames}
                  onChange={(e: any) => setFormData({ ...formData, locationNames: e.target.value })}
                  className="w-full text-sm min-h-[80px] p-2 border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="text-[10px] text-gray-500">
                  Lưu ý: Việc xóa tên vị trí khỏi danh sách này sẽ xóa vị trí đó trong hệ thống (nếu vị trí chưa chứa hàng).
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleCloseModal} disabled={submitting}>Hủy bỏ</Button>
                <Button style={{ backgroundColor: PRIMARY }} onClick={handleSubmit} disabled={submitting} className="gap-2">
                  {submitting ? (
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  {editingWarehouse ? 'Lưu cập nhật' : 'Tạo mới'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}