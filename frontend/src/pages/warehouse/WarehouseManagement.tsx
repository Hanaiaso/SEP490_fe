import type { ChangeEvent } from 'react';
import { getErrorMessage } from '../../lib/errors';
import React, { useState, useEffect } from 'react';
import { Settings, Plus, Edit, Trash, Building, AlertCircle, Check } from 'lucide-react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse } from '../../services/warehouseService';
import type { Warehouse } from '../../types/warehouse';

const PRIMARY = '#1F3B64';
const ERROR = '#DC2626';

export default function WarehouseManagement() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);

  const [formData, setFormData] = useState({ name: '', code: '', locationNames: '' });
  const [submitting, setSubmitting] = useState(false);

  // Xóa kho
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      setError('');
      const res: Warehouse[] = await getWarehouses();
      setWarehouses(res || []);
    } catch (err: unknown) {
      setError('Lỗi khi tải danh sách kho: ' + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleOpenModal = (warehouse: Warehouse | null = null) => {
    if (warehouse) {
      setEditingWarehouse(warehouse);
      setFormData({
        name: warehouse.name,
        code: warehouse.code,
        locationNames: warehouse.locations?.map((l) => l.name).join(', ') || ''
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
    } catch (err: unknown) {
      alert('Lỗi: ' + getErrorMessage(err));
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
    } catch (err: unknown) {
      alert('Lỗi khi xóa kho: ' + getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="warehouse-hallmark-type p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Building className="w-6 h-6" style={{ color: PRIMARY }} />
            Cấu hình Danh mục Kho
          </h1>
          <p className="text-sm text-gray-500 mt-1">Quản lý danh sách các kho bãi trong hệ thống</p>
        </div>

        <Button
          onClick={() => handleOpenModal()}
          style={{ backgroundColor: PRIMARY }}
          className="gap-2 shadow-sm hover:shadow text-white"
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
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-gray-200 text-gray-700 font-semibold text-sm">
              <tr>
                <th className="px-4 py-3 w-24">Mã Kho</th>
                <th className="px-4 py-3">Tên Kho</th>
                <th className="px-4 py-3 text-center w-32">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={3} className="text-center py-12 text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2" style={{ borderColor: PRIMARY, borderTopColor: 'transparent' }}></div>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : warehouses.length === 0 ? (
                <tr>
                  <td colSpan={3} className="text-center py-12 text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <Building className="w-10 h-10 text-gray-300 mb-2" />
                      Chưa có kho nào trong hệ thống.
                    </div>
                  </td>
                </tr>
              ) : (
                warehouses.map((wh) => (
                  <tr key={wh.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium" style={{ color: PRIMARY }}>{wh.code}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{wh.name}</td>
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
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold flex items-center gap-2 text-gray-900">
                <Settings className="w-5 h-5 text-gray-500" />
                {editingWarehouse ? 'Cập nhật thông tin kho' : 'Thêm kho mới'}
              </h3>
            </div>

            <div className="p-4 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Mã kho (VD: WH-HCM)</label>
                <Input
                  placeholder="Nhập mã kho..."
                  value={formData.code}
                  onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setFormData({ ...formData, code: e.target.value })}
                  className="font-mono text-sm uppercase w-full"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700">Tên kho</label>
                <Input
                  placeholder="Nhập tên kho..."
                  value={formData.name}
                  onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setFormData({ ...formData, name: e.target.value })}
                  className="text-sm w-full"
                />
              </div>

              {editingWarehouse && (
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700">Vị trí lưu trữ (Kệ/Khu)</label>
                  <textarea
                    placeholder="Nhập tên các vị trí, cách nhau bởi dấu phẩy (VD: Kệ A, Kệ B, Khu 1)..."
                    value={formData.locationNames}
                    onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setFormData({ ...formData, locationNames: e.target.value })}
                    className="w-full text-sm min-h-[80px] p-3 border border-gray-200 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500">
                    Lưu ý: Việc xóa tên vị trí khỏi danh sách này sẽ xóa vị trí đó trong hệ thống (nếu vị trí chưa chứa hàng).
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={handleCloseModal} disabled={submitting}>Hủy bỏ</Button>
                <Button style={{ backgroundColor: PRIMARY }} onClick={handleSubmit} disabled={submitting} className="gap-2 text-white">
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