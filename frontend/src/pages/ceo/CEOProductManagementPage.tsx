import { useState, useEffect, useCallback } from 'react';
import { getErrorMessage } from '../../lib/errors';
import {
  getProductsForManagement,
  updateProduct,
  createProduct,
  deleteProduct,
  getProductStats,
  getCategories,
  getCategoriesForManagement,
  createCategory,
  updateCategory,
  getProductById,
  formatPrice,
} from '../../services/productService';
import { Search, Plus, Package, TrendingUp, TrendingDown, Ban, ImageOff, Tags, Pencil, X, Check, Loader2 } from 'lucide-react';
import type { Category, ProductManagementItem, ProductStatsResult, ProductImage } from '../../types/catalog';

const MAX_PRODUCT_IMAGES = 8;

const PRIMARY = '#1f3b64';
const SUCCESS = '#16A34A';
const MUTED = '#9CA3AF';

type StatusFilter = 'all' | 'active' | 'discontinued';

interface ProductFormData {
  name: string;
  sku: string;
  standardListedPrice: string;
  categoryId: string;
  unit: string;
  description: string;
  specifications: string;
  isDiscontinued: boolean;
}

const emptyForm: ProductFormData = {
  name: '', sku: '', standardListedPrice: '', categoryId: '', unit: 'Cái',
  description: '', specifications: '', isDiscontinued: false,
};

export default function CEOProductManagementPage() {
  const [products, setProducts] = useState<ProductManagementItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [stats, setStats] = useState<ProductStatsResult | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductManagementItem | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(emptyForm);
  // Ảnh hiện có trên sản phẩm (khi sửa) — mỗi ảnh có Id để có thể chọn xóa qua RemoveImageIds
  const [existingImages, setExistingImages] = useState<ProductImage[]>([]);
  const [removeImageIds, setRemoveImageIds] = useState<string[]>([]);
  // Ảnh mới người dùng chọn thêm (chưa upload) — gửi lên qua ImageFiles
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const totalImageCount = existingImages.length - removeImageIds.length + newImageFiles.length;

  const loadCategories = useCallback(async () => {
    try {
      const data = await getCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch {
      // Không chặn trang nếu lỗi tải danh mục
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const data = await getProductStats({});
      setStats(data);
    } catch (err: unknown) {
      console.error('Lỗi khi tải thống kê sản phẩm:', getErrorMessage(err));
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const isDiscontinued = statusFilter === 'all' ? undefined : statusFilter === 'discontinued';
      const data = await getProductsForManagement({
        page, pageSize: 10, categoryId: categoryFilter || undefined, search: search || undefined, isDiscontinued,
      });
      setProducts(data.items || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
    } catch (err: unknown) {
      alert('Lỗi khi tải danh sách sản phẩm: ' + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, categoryFilter, statusFilter, search]);

  useEffect(() => { loadCategories(); loadStats(); }, [loadCategories, loadStats]);

  // Reset về trang 1 mỗi khi filter/search thay đổi
  useEffect(() => { setPage(1); }, [search, categoryFilter, statusFilter]);

  // Debounce fetch: chạy lại mỗi khi page/filter/search thay đổi (loadProducts được tạo lại theo các dep đó)
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => { loadProducts(); }, 400);
    return () => clearTimeout(delayDebounceFn);
  }, [loadProducts]);

  const handleOpenModal = async (product: ProductManagementItem | null = null) => {
    setNewImageFiles([]);
    setNewImagePreviews([]);
    setRemoveImageIds([]);
    if (product) {
      setEditingProduct(product);
      // Danh sách quản lý không trả về description/specifications/gallery đầy đủ -> phải lấy chi tiết,
      // nếu không form sẽ luôn gửi rỗng và xóa mất 2 trường này khi lưu.
      setFormData({
        name: product.name,
        sku: product.sku,
        standardListedPrice: String(product.standardListedPrice),
        categoryId: product.categoryId,
        unit: product.unit,
        description: '',
        specifications: '',
        isDiscontinued: product.isDiscontinued,
      });
      setExistingImages(product.imageUrl ? [{ id: '', imageUrl: product.imageUrl, sortOrder: 0 }] : []);
      setIsModalOpen(true);
      try {
        const detail = await getProductById(product.id);
        setFormData((prev) => ({
          ...prev,
          description: detail.description || '',
          specifications: detail.specifications || '',
        }));
        setExistingImages(detail.images || []);
      } catch {
        // Giữ nguyên form nếu không lấy được chi tiết; người dùng vẫn có thể lưu các trường khác.
      }
    } else {
      setEditingProduct(null);
      setFormData(emptyForm);
      setExistingImages([]);
      setIsModalOpen(true);
    }
  };

  const handleImagesAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ''; // cho phép chọn lại cùng 1 file lần sau
    if (files.length === 0) return;

    const remainingSlots = MAX_PRODUCT_IMAGES - totalImageCount;
    if (remainingSlots <= 0) {
      alert(`Chỉ được tối đa ${MAX_PRODUCT_IMAGES} ảnh cho mỗi sản phẩm.`);
      return;
    }
    const accepted = files.slice(0, remainingSlots);

    setNewImageFiles((prev) => [...prev, ...accepted]);
    setNewImagePreviews((prev) => [...prev, ...accepted.map((f) => URL.createObjectURL(f))]);
  };

  const handleRemoveExistingImage = (image: ProductImage) => {
    setExistingImages((prev) => prev.filter((img) => img !== image));
    if (image.id) setRemoveImageIds((prev) => [...prev, image.id]);
  };

  const handleRemoveNewImage = (index: number) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const fd = new FormData();
      fd.append('Name', formData.name);
      fd.append('Sku', formData.sku);
      fd.append('CategoryId', formData.categoryId);
      fd.append('StandardListedPrice', formData.standardListedPrice);
      fd.append('Unit', formData.unit);
      // Luon gui (ke ca rong) - backend coi thieu truong = "khong doi", chuoi rong = "xoa".
      fd.append('Description', formData.description);
      fd.append('Specifications', formData.specifications);
      newImageFiles.forEach((file) => fd.append('ImageFiles', file));

      if (editingProduct) {
        fd.append('IsDiscontinued', String(formData.isDiscontinued));
        removeImageIds.forEach((id) => fd.append('RemoveImageIds', id));
        await updateProduct(editingProduct.id, fd);
        alert('Cập nhật sản phẩm thành công!');
      } else {
        await createProduct(fd);
        alert('Thêm sản phẩm thành công!');
      }
      setIsModalOpen(false);
      loadProducts();
      loadStats();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Đã xảy ra lỗi'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: ProductManagementItem) => {
    if (window.confirm(`Bạn có chắc chắn muốn ngừng kinh doanh sản phẩm "${product.name}" không?\nSản phẩm sẽ bị ẩn khỏi cửa hàng nhưng vẫn có thể khôi phục sau.`)) {
      try {
        await deleteProduct(product.id);
        alert('Đã ngừng kinh doanh sản phẩm.');
        loadProducts();
        loadStats();
      } catch (err: unknown) {
        alert(getErrorMessage(err, 'Không thể xóa sản phẩm này'));
      }
    }
  };

  const summary = stats?.summary;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-5 py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Quản lý sản phẩm</h2>
            <p className="text-xs text-gray-500 mt-0.5">{totalCount} sản phẩm</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-gray-700 rounded border border-gray-200 hover:bg-gray-50"
              onClick={() => setIsCategoryModalOpen(true)}
            >
              <Tags className="w-3.5 h-3.5" /> Quản lý danh mục
            </button>
            <button
              className="flex items-center gap-1.5 h-8 px-3 text-xs font-medium text-white rounded bg-blue-600 hover:bg-blue-700"
              onClick={() => handleOpenModal()}
            >
              <Plus className="w-3.5 h-3.5" /> Thêm sản phẩm
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              className="w-full pl-8 h-8 text-xs bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-blue-500"
              placeholder="Tìm tên, SKU sản phẩm..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-8 px-2 text-xs bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-blue-500"
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
          >
            <option value="">Tất cả danh mục</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            className="h-8 px-2 text-xs bg-gray-50 border border-gray-200 rounded focus:outline-none focus:border-blue-500"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="active">Đang bán</option>
            <option value="discontinued">Ngừng kinh doanh</option>
            <option value="all">Tất cả trạng thái</option>
          </select>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-4 flex-1">
        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<Package className="w-4 h-4" />} label="Tổng sản phẩm" value={summary?.totalProducts ?? '-'} color={PRIMARY} loading={statsLoading} />
          <StatCard icon={<Package className="w-4 h-4" />} label="Đang bán" value={summary?.activeProducts ?? '-'} color={SUCCESS} loading={statsLoading} />
          <StatCard icon={<Ban className="w-4 h-4" />} label="Ngừng kinh doanh" value={summary?.discontinuedProducts ?? '-'} color={MUTED} loading={statsLoading} />
          <StatCard icon={<TrendingUp className="w-4 h-4" />} label="SL bán ra (30 ngày)" value={summary?.totalUnitsSold ?? '-'} color="#2563EB" loading={statsLoading} />
        </div>

        {/* Best sellers / slow movers */}
        {stats && (stats.bestSellers.length > 0 || stats.slowMovers.length > 0) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <TopProductsTable
              title="Top sản phẩm bán chạy (30 ngày)"
              icon={<TrendingUp className="w-3.5 h-3.5" style={{ color: SUCCESS }} />}
              items={stats.bestSellers}
            />
            <TopProductsTable
              title="Sản phẩm bán chậm (30 ngày)"
              icon={<TrendingDown className="w-3.5 h-3.5" style={{ color: '#DC2626' }} />}
              items={stats.slowMovers}
            />
          </div>
        )}

        {/* Product table */}
        {loading ? (
          <div className="text-center py-10 text-xs text-gray-500">Đang tải dữ liệu...</div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-gray-700 font-semibold">Sản phẩm</th>
                  <th className="text-left px-4 py-3 text-gray-700 font-semibold">Danh mục</th>
                  <th className="text-right px-4 py-3 text-gray-700 font-semibold">Giá niêm yết</th>
                  <th className="text-right px-4 py-3 text-gray-700 font-semibold">Tồn kho</th>
                  <th className="text-right px-4 py-3 text-gray-700 font-semibold">Đã bán (all-time)</th>
                  <th className="text-center px-4 py-3 text-gray-700 font-semibold">Trạng thái</th>
                  <th className="text-center px-4 py-3 text-gray-700 font-semibold">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Không tìm thấy sản phẩm nào.</td></tr>
                ) : (
                  products.map((p, i) => (
                    <tr key={p.id} className="hover:bg-[#F9FAFB] transition-colors" style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="w-8 h-8 rounded object-cover border border-gray-200 flex-shrink-0" />
                          ) : (
                            <div className="w-8 h-8 rounded border border-gray-200 flex items-center justify-center text-gray-300 flex-shrink-0">
                              <ImageOff className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 truncate">{p.name}</p>
                            <p className="text-[10px] text-gray-400">{p.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{p.categoryName}</td>
                      <td className="px-4 py-3 text-right text-gray-700 tabular-nums">{formatPrice(p.standardListedPrice)}</td>
                      <td className="px-4 py-3 text-right text-gray-500 tabular-nums">{p.availableStock ?? '-'}</td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700 tabular-nums">{p.unitsSoldTotal.toLocaleString('vi-VN')}</td>
                      <td className="px-4 py-3 text-center">
                        {p.isDiscontinued ? (
                          <span className="text-[10px] font-medium text-white px-2 py-0.5 whitespace-nowrap" style={{ backgroundColor: MUTED, borderRadius: 4 }}>Ngừng KD</span>
                        ) : (
                          <span className="text-[10px] font-medium text-white px-2 py-0.5 whitespace-nowrap" style={{ backgroundColor: SUCCESS, borderRadius: 4 }}>Đang bán</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleOpenModal(p)} className="px-2 py-1 rounded text-[10px] border border-gray-200 hover:bg-gray-50 text-gray-600">Sửa</button>
                          {!p.isDiscontinued && (
                            <button onClick={() => handleDelete(p)} className="px-2 py-1 rounded text-[10px] border border-red-200 hover:bg-red-50 text-red-600">Xóa</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-[12px] text-gray-500">
            <span>Trang {page} / {totalPages}</span>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">Trước</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">Sau</button>
            </div>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-[560px] max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold" style={{ color: PRIMARY }}>
                {editingProduct ? 'Sửa thông tin sản phẩm' : 'Thêm sản phẩm mới'}
              </h2>
            </div>
            <form onSubmit={handleSave} className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Ảnh sản phẩm <span className="text-gray-400 font-normal">({totalImageCount}/{MAX_PRODUCT_IMAGES})</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {existingImages.map((img, idx) => (
                    <div key={img.id || `existing-${idx}`} className="relative w-20 h-20 rounded border border-gray-200 overflow-hidden group">
                      <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => handleRemoveExistingImage(img)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {newImagePreviews.map((src, idx) => (
                    <div key={`new-${idx}`} className="relative w-20 h-20 rounded border border-blue-300 overflow-hidden group">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => handleRemoveNewImage(idx)}
                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {totalImageCount < MAX_PRODUCT_IMAGES && (
                    <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-blue-400 flex-shrink-0">
                      <Plus className="w-5 h-5 text-gray-300" />
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleImagesAdd} />
                    </label>
                  )}
                  {totalImageCount === 0 && (
                    <div className="w-20 h-20 rounded border border-gray-100 flex items-center justify-center text-gray-300 flex-shrink-0">
                      <ImageOff className="w-6 h-6" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1 flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">Tên sản phẩm *</label>
                    <input type="text" required
                      className="border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium text-gray-700">SKU *</label>
                    <input type="text" required
                      className="border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                      value={formData.sku} onChange={e => setFormData({ ...formData, sku: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Danh mục *</label>
                  <select required
                    className="border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    value={formData.categoryId} onChange={e => setFormData({ ...formData, categoryId: e.target.value })}>
                    <option value="">-- Chọn danh mục --</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Đơn vị tính *</label>
                  <input type="text" required
                    className="border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    placeholder="VD: Cái, Hộp, Cuộn..." />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Giá niêm yết (VNĐ) *</label>
                {editingProduct ? (
                  <>
                    <input type="number" readOnly disabled
                      className="border rounded px-3 py-2 text-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                      value={formData.standardListedPrice} />
                    <p className="text-xs text-gray-500 mt-0.5">
                      Giá sản phẩm đã có không còn sửa trực tiếp ở đây — vào mục &quot;Cập nhật giá hàng hóa&quot; để đề xuất đợt cập nhật giá mới.
                    </p>
                  </>
                ) : (
                  <input type="number" min="1" step="1" required
                    className="border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                    value={formData.standardListedPrice} onChange={e => setFormData({ ...formData, standardListedPrice: e.target.value })} />
                )}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Mô tả</label>
                <textarea rows={2}
                  className="border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Thông số kỹ thuật</label>
                <textarea rows={2}
                  className="border rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
                  value={formData.specifications} onChange={e => setFormData({ ...formData, specifications: e.target.value })} />
              </div>

              {editingProduct && (
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={formData.isDiscontinued}
                    onChange={e => setFormData({ ...formData, isDiscontinued: e.target.checked })} />
                  Ngừng kinh doanh sản phẩm này
                </label>
              )}

              <div className="flex justify-end gap-3 mt-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded text-sm bg-gray-50 hover:bg-gray-100 font-medium">Hủy</button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium shadow-sm disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {editingProduct ? 'Đang lưu...' : 'Đang thêm...'}
                    </>
                  ) : (
                    editingProduct ? 'Lưu thay đổi' : 'Thêm mới'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCategoryModalOpen && (
        <CategoryManagerModal
          onClose={() => setIsCategoryModalOpen(false)}
          onCategoriesChanged={loadCategories}
        />
      )}
    </div>
  );
}

// ─── P2-8: Quản lý danh mục (Admin/CEO) ─────────────────────────────────────
function CategoryManagerModal({ onClose, onCategoriesChanged }: { onClose: () => void; onCategoriesChanged: () => void }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await getCategoriesForManagement();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      alert('Lỗi khi tải danh mục: ' + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return alert('Vui lòng nhập tên danh mục.');
    try {
      setSaving(true);
      await createCategory({ name: newName.trim(), description: newDescription.trim() || undefined });
      setNewName('');
      setNewDescription('');
      await load();
      onCategoriesChanged();
    } catch (err: unknown) {
      alert(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c: Category) => {
    setEditingId(c.id);
    setEditName(c.name);
    setEditDescription(c.description || '');
  };

  const handleSaveEdit = async (c: Category) => {
    if (!editName.trim()) return alert('Vui lòng nhập tên danh mục.');
    try {
      setSaving(true);
      await updateCategory(c.id, { name: editName.trim(), description: editDescription.trim() || undefined, isActive: c.isActive });
      setEditingId(null);
      await load();
      onCategoriesChanged();
    } catch (err: unknown) {
      alert(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (c: Category) => {
    try {
      await updateCategory(c.id, { name: c.name, description: c.description, isActive: !c.isActive });
      await load();
      onCategoriesChanged();
    } catch (err: unknown) {
      alert(getErrorMessage(err));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl w-[520px] max-h-[85vh] overflow-y-auto">
        <div className="px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-bold" style={{ color: PRIMARY }}>Quản lý danh mục</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleCreate} className="px-6 py-4 border-b flex flex-col gap-2 bg-gray-50">
          <label className="text-xs font-semibold text-gray-600">Thêm danh mục mới</label>
          <div className="flex gap-2">
            <input type="text" placeholder="Tên danh mục *" value={newName} onChange={e => setNewName(e.target.value)}
              className="flex-1 border rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-500" />
            <input type="text" placeholder="Mô tả (tùy chọn)" value={newDescription} onChange={e => setNewDescription(e.target.value)}
              className="flex-1 border rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-blue-500" />
            <button
              type="submit"
              disabled={saving}
              className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap inline-flex items-center gap-1.5"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Đang thêm...
                </>
              ) : (
                'Thêm'
              )}
            </button>
          </div>
        </form>

        <div className="p-3">
          {loading ? (
            <p className="text-center text-xs text-gray-500 py-6">Đang tải...</p>
          ) : categories.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-6">Chưa có danh mục nào.</p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {categories.map(c => (
                <div key={c.id} className="py-2.5 flex items-center gap-2">
                  {editingId === c.id ? (
                    <>
                      <div className="flex-1 flex flex-col gap-1">
                        <input value={editName} onChange={e => setEditName(e.target.value)}
                          className="border rounded px-2 py-1 text-sm focus:outline-none focus:border-blue-500" />
                        <input value={editDescription} onChange={e => setEditDescription(e.target.value)}
                          placeholder="Mô tả" className="border rounded px-2 py-1 text-xs focus:outline-none focus:border-blue-500" />
                      </div>
                      <button onClick={() => handleSaveEdit(c)} disabled={saving} title="Lưu" className="text-green-600 hover:text-green-800">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} title="Hủy" className="text-gray-400 hover:text-gray-600">
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                        {c.description && <p className="text-xs text-gray-400 truncate">{c.description}</p>}
                      </div>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded whitespace-nowrap ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.isActive ? 'Đang bật' : 'Đã tắt'}
                      </span>
                      <button onClick={() => startEdit(c)} title="Sửa" className="text-gray-400 hover:text-blue-600">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleToggleActive(c)} title={c.isActive ? 'Tắt danh mục' : 'Bật danh mục'}
                        className={`px-2 py-1 rounded text-[10px] border whitespace-nowrap ${c.isActive ? 'border-red-200 text-red-600 hover:bg-red-50' : 'border-green-200 text-green-600 hover:bg-green-50'}`}>
                        {c.isActive ? 'Tắt' : 'Bật'}
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, loading }: { icon: React.ReactNode; label: string; value: number | string; color: string; loading: boolean }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}1A`, color }}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-gray-500 truncate">{label}</p>
        <p className="text-base font-bold text-gray-900 tabular-nums">{loading ? '...' : value}</p>
      </div>
    </div>
  );
}

function TopProductsTable({ title, icon, items }: { title: string; icon: React.ReactNode; items: { productId: string; name: string; unitsSold: number; revenue: number }[] }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-200 flex items-center gap-1.5">
        {icon}
        <p className="text-xs font-semibold text-gray-700">{title}</p>
      </div>
      {items.length === 0 ? (
        <p className="px-4 py-4 text-xs text-gray-400 text-center">Chưa có dữ liệu bán hàng trong kỳ.</p>
      ) : (
        <table className="w-full text-xs">
          <tbody className="divide-y divide-gray-50">
            {items.map((it, idx) => (
              <tr key={it.productId}>
                <td className="px-4 py-2 text-gray-400 w-6">{idx + 1}</td>
                <td className="px-4 py-2 text-gray-700 truncate max-w-[160px]">{it.name}</td>
                <td className="px-4 py-2 text-right text-gray-500 tabular-nums whitespace-nowrap">{it.unitsSold.toLocaleString('vi-VN')} SP</td>
                <td className="px-4 py-2 text-right font-medium text-gray-700 tabular-nums whitespace-nowrap">{formatPrice(it.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
