import type { ChangeEvent, KeyboardEvent } from 'react';
import { getErrorMessage } from '../../lib/errors';
import React, { useState, useEffect, useCallback } from 'react';
import { Search, AlertCircle, PackageSearch, ArrowLeftRight, Clock, User, Check, RefreshCw, Plus, Filter } from 'lucide-react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/sales-ui/dialog';
import { getWarehouseInventory, createStockAdjustment, getWarehouses, addInventory } from '../../services/warehouseService';
import { getProducts, getCategories, createProduct } from '../../services/productService';
import { getMaterials, createMaterial } from '../../services/materialService';
import type { InventoryItem, PaginatedList, Warehouse } from '../../types/warehouse';
import type { Category, Material, Product } from '../../types/catalog';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#D97706';
const ERROR   = '#DC2626';
const INFO    = '#2563EB';
const NEUTRAL = '#64748B';

export default function WarehouseInventoryCount() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState('all'); // all, Product, Material
  const [minQty, setMinQty] = useState('');
  const [maxQty, setMaxQty] = useState('');
  const [fromDate] = useState('');
  const [toDate] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Edit State
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Add Product / Material State
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetType, setTargetType] = useState<'Product' | 'Material'>('Product');
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [materialsList, setMaterialsList] = useState<Material[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [initialQuantity, setInitialQuantity] = useState('0');

  // New Product Info
  const [newProductName, setNewProductName] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductCategoryId, setNewProductCategoryId] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('0');
  const [newProductUnit, setNewProductUnit] = useState('Cái');
  const [newProductDesc] = useState('');
  const [newProductSpecs] = useState('');
  const [newProductImageFile] = useState<File | null>(null);

  // New Material Info
  const [isNewMaterial, setIsNewMaterial] = useState(false);
  const [newMaterialName, setNewMaterialName] = useState('');
  const [newMaterialUnit, setNewMaterialUnit] = useState('Kg');
  const [newMaterialSafetyThreshold, setNewMaterialSafetyThreshold] = useState('0');

  const fetchWarehousesList = useCallback(async () => {
    try {
      const res: Warehouse[] = await getWarehouses();
      if (res && res.length > 0) {
        setWarehouses(res);
        setWarehouseId(res[0].id);
      }
    } catch (err: unknown) {
      console.error('Error fetching warehouses:', err);
    }
  }, []);

  useEffect(() => {
    fetchWarehousesList();
  }, [fetchWarehousesList]);

  const fetchInventory = useCallback(async (isSearch = false) => {
    if (!warehouseId) return;
    try {
      setLoading(true);
      const currentPage = isSearch ? 1 : page;
      if (isSearch && page !== 1) setPage(1);

      const params: Record<string, string | number> = {
        pageNumber: currentPage,
        pageSize: 10,
        search,
      };
      if (minQty) params.minQty = minQty;
      if (maxQty) params.maxQty = maxQty;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;

      const res: PaginatedList<InventoryItem> = await getWarehouseInventory(warehouseId, params);
      setItems(res.items || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.totalCount || 0);
    } catch (err: unknown) {
      alert('Lỗi khi tải danh sách tồn kho: ' + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [warehouseId, page, search, minQty, maxQty, fromDate, toDate]);

  useEffect(() => {
    if (warehouseId) {
      fetchInventory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [warehouseId, page]);

  const handleSearch = () => {
    fetchInventory(true);
  };

  const openAdjustDialog = (item: InventoryItem) => {
    setEditingItem(item);
    setNewQuantity(item.onHandQuantity.toString());
    setAdjustNote('');
  };

  const handleAdjustSubmit = async () => {
    if (!editingItem) return;
    if (!newQuantity || isNaN(Number(newQuantity)) || parseInt(newQuantity) < 0) {
      alert('Số lượng mới không hợp lệ!');
      return;
    }
    if (!adjustNote.trim()) {
      alert('Vui lòng nhập lý do chênh lệch!');
      return;
    }
    try {
      setSubmitting(true);
      await createStockAdjustment({
        inventoryId: editingItem.id,
        physicalQuantity: parseInt(newQuantity as string, 10),
        reason: adjustNote.trim()
      });
      alert('Đã gửi đề xuất điều chỉnh tồn kho, chờ CEO duyệt.');
      setEditingItem(null);
      fetchInventory();
    } catch (err: unknown) {
      alert('Lỗi khi cập nhật tồn kho: ' + getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const openAddProductModal = async () => {
    try {
      const [prodRes, matRes, catRes] = await Promise.all([
        getProducts({ pageSize: 100 }),
        getMaterials(),
        getCategories()
      ]);
      setProductsList(prodRes.items || []);
      setMaterialsList(matRes || []);
      setCategoriesList(catRes || []);
      
      const wh = warehouses.find(w => w.id === warehouseId);
      if (wh && wh.locations && wh.locations.length > 0) {
        setSelectedLocationId(wh.locations[0].id);
      } else {
        setSelectedLocationId('');
      }

      setShowAddModal(true);
    } catch (err: unknown) {
      alert('Lỗi khi tải danh mục sản phẩm/nguyên liệu: ' + getErrorMessage(err));
    }
  };

  const handleAddSubmit = async () => {
    if (parseInt(initialQuantity) < 0 || isNaN(parseInt(initialQuantity))) {
      alert('Số lượng ban đầu không hợp lệ!');
      return;
    }

    try {
      setSubmitting(true);
      let finalProductId = selectedProductId;
      let finalMaterialId = selectedMaterialId;

      if (targetType === 'Product' && isNewProduct) {
        if (!newProductName.trim() || !newProductSku.trim() || !newProductCategoryId) {
          alert('Vui lòng điền đủ Tên, SKU và Danh mục của sản phẩm mới!');
          return;
        }
        const createdProd = await createProduct({
          name: newProductName,
          sku: newProductSku.toUpperCase(),
          categoryId: newProductCategoryId,
          standardListedPrice: Number(newProductPrice),
          unit: newProductUnit
        }) as Product;
        finalProductId = createdProd.id;
      } else if (targetType === 'Material' && isNewMaterial) {
        if (!newMaterialName.trim()) {
          alert('Vui lòng điền tên nguyên vật liệu mới!');
          return;
        }
        const createdMat = await createMaterial({
          name: newMaterialName,
          unit: newMaterialUnit,
          safetyThreshold: Number(newMaterialSafetyThreshold)
        }) as Material;
        finalMaterialId = createdMat.id;
      }

      await addInventory({
        productId: targetType === 'Product' ? finalProductId : null,
        materialId: targetType === 'Material' ? finalMaterialId : null,
        warehouseId: warehouseId,
        initialQuantity: parseInt(initialQuantity)
      });
      alert(`Thêm ${targetType === 'Product' ? 'sản phẩm' : 'nguyên vật liệu'} vào kho thành công!`);
      setShowAddModal(false);
      fetchInventory();
    } catch (err: unknown) {
      alert('Lỗi: ' + getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = items.filter(item => {
    if (itemTypeFilter === 'all') return true;
    if (itemTypeFilter === 'Material') return item.itemType === 'Material' || item.materialId != null;
    if (itemTypeFilter === 'Product') return item.itemType === 'Product' || (item.productId != null && item.materialId == null);
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* ── Fixed Header ── */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[11px] mb-0.5">
          <span className="text-gray-400">Kho hàng</span>
          <span className="text-gray-300">/</span>
          <span className="text-gray-400">Quản lý tồn kho</span>
          <span className="text-gray-300">/</span>
          <span className="text-gray-800 font-semibold">Kiểm kê tồn kho</span>
        </div>

        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: PRIMARY }}>
              <PackageSearch className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">Kiểm Kê Tồn Kho & Quản Lý Tồn Trực Tiếp</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {totalCount} mặt hàng trong kho · Theo dõi tồn kho thực tế & tồn khả dụng
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={() => fetchInventory()} disabled={loading}>
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Làm mới
            </Button>
            <button
              className="h-7 px-3 text-xs font-medium text-white rounded flex items-center gap-1.5 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: PRIMARY }}
              onClick={openAddProductModal}
            >
              <Plus className="w-3.5 h-3.5" /> Thêm Hàng Vào Kho
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              className="pl-8 h-7 text-xs bg-gray-50"
              placeholder="Mã SKU, tên mặt hàng..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </div>

          <select
            className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600"
            value={warehouseId}
            onChange={e => {
              setWarehouseId(e.target.value);
              setPage(1);
            }}
          >
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.id}>{wh.name}</option>
            ))}
          </select>

          <select
            className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600"
            value={itemTypeFilter}
            onChange={e => setItemTypeFilter(e.target.value)}
          >
            <option value="all">Tất cả loại (SP & NVL)</option>
            <option value="Product">Chỉ Sản phẩm</option>
            <option value="Material">Chỉ Nguyên vật liệu</option>
          </select>

          <Input
            type="number"
            placeholder="Min Qty"
            className="w-20 h-7 text-xs bg-gray-50"
            value={minQty}
            onChange={e => setMinQty(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <Input
            type="number"
            placeholder="Max Qty"
            className="w-20 h-7 text-xs bg-gray-50"
            value={maxQty}
            onChange={e => setMaxQty(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />

          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleSearch}>
            <Filter className="w-3 h-3" /> Lọc
          </Button>
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold w-32">Mã SKU</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Tên hàng hóa / NVL</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold w-28">Phân loại</th>
                <th className="text-right px-3 py-2.5 text-gray-700 font-semibold w-24">Tồn thực tế</th>
                <th className="text-right px-3 py-2.5 text-gray-700 font-semibold w-24">Tồn khả dụng</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold w-40">Cập nhật lần cuối</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: PRIMARY }} />
                      <p className="text-xs text-gray-500">Đang tải dữ liệu tồn kho...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                        <AlertCircle className="w-5 h-5 text-gray-300" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">Không tìm thấy hàng tồn kho</p>
                      <p className="text-xs text-gray-400">Thử thay đổi bộ lọc hoặc chọn kho khác</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item, i) => {
                  const isMaterial = item.itemType === 'Material' || item.materialId != null;
                  return (
                    <tr key={item.id} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                      <td className="px-3 py-2.5 font-mono text-gray-500 font-semibold">{item.productSku || item.itemSku || '-'}</td>
                      <td className="px-3 py-2.5 font-medium text-gray-900">{item.productName || item.itemName || 'N/A'}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className="text-[10px] font-semibold text-white px-2 py-0.5 inline-block whitespace-nowrap"
                          style={{ backgroundColor: isMaterial ? WARNING : PRIMARY, borderRadius: 4 }}
                        >
                          {isMaterial ? 'Nguyên liệu' : 'Sản phẩm'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold" style={{ color: PRIMARY }}>
                        {item.onHandQuantity}
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-600 font-medium">
                        {item.availableQuantity}
                      </td>
                      <td className="px-3 py-2.5 text-gray-500">
                        <div className="flex flex-col gap-0.5">
                          <span className="flex items-center gap-1 text-[10px] text-gray-600"><User className="w-2.5 h-2.5" /> {item.lastUpdatedByUserName || 'System'}</span>
                          <span className="flex items-center gap-1 text-[10px] text-gray-400"><Clock className="w-2.5 h-2.5" /> {item.lastUpdatedAt ? new Date(item.lastUpdatedAt).toLocaleString('vi-VN') : 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          className="h-6 px-2 text-[10px] font-medium rounded border border-blue-200 text-blue-700 hover:bg-blue-50 whitespace-nowrap"
                          onClick={() => openAdjustDialog(item)}
                        >
                          Cập nhật
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <span className="text-xs text-gray-500">Hiển thị {filteredItems.length} / {totalCount} bản ghi</span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="h-6 text-[10px] px-2">Trang trước</Button>
              <span className="text-xs text-gray-600 font-medium px-2">Trang {page} / {totalPages}</span>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="h-6 text-[10px] px-2">Trang sau</Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Dialog Cập Nhật Tồn Kho ── */}
      <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
        <DialogContent className="max-w-lg p-0 overflow-hidden shadow-2xl rounded-xl border border-gray-200" aria-describedby={undefined}>
          <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-gray-900">
              <ArrowLeftRight className="w-4 h-4 text-blue-600" />
              Đề Xuất Điều Chỉnh Tồn Kho
            </DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-1">
                <p className="font-semibold text-gray-900 text-sm">{editingItem.productName || editingItem.itemName}</p>
                <p className="text-gray-500 font-mono text-xs">Mã SKU: <span className="font-semibold text-gray-700">{editingItem.productSku || editingItem.itemSku || '-'}</span></p>
                <p className="text-[11px] text-amber-600">Đề xuất sẽ gửi lên CEO duyệt, số liệu kho sẽ thay đổi sau khi được duyệt.</p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">Tồn kho thực tế mới (đã kiểm đếm) <span className="text-red-500">*</span></label>
                <Input
                  type="number"
                  value={newQuantity}
                  onChange={e => setNewQuantity(e.target.value)}
                  className="h-10 text-base font-bold text-blue-700 font-mono px-3 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">Lý do chênh lệch (Bắt buộc) <span className="text-red-500">*</span></label>
                <Input
                  placeholder="Nhập lý do kiểm kê, hao hụt, hàng hư hỏng..."
                  value={adjustNote}
                  onChange={e => setAdjustNote(e.target.value)}
                  className="h-9 text-xs px-3 border-gray-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button variant="outline" size="sm" className="h-9 px-4 text-xs font-medium border-gray-300" onClick={() => setEditingItem(null)} disabled={submitting}>Hủy bỏ</Button>
                <button
                  className="h-9 px-5 text-xs font-semibold text-white rounded-lg flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
                  style={{ backgroundColor: PRIMARY }}
                  onClick={handleAdjustSubmit}
                  disabled={submitting}
                >
                  <Check className="w-4 h-4" />
                  {submitting ? 'Đang gửi...' : 'Gửi đề xuất'}
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Dialog Thêm Hàng Vào Kho ── */}
      <Dialog open={showAddModal} onOpenChange={() => setShowAddModal(false)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden shadow-2xl rounded-xl border border-gray-200" aria-describedby={undefined}>
          <DialogHeader className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
            <DialogTitle className="text-sm font-bold flex items-center gap-2" style={{ color: PRIMARY }}>
              <PackageSearch className="w-4.5 h-4.5" />
              Thêm Hàng Vào Kho Tồn
            </DialogTitle>
          </DialogHeader>

          <div className="p-6 space-y-5 text-xs">
            {/* Type selector */}
            <div className="flex items-center gap-6 p-3.5 bg-gray-50/80 rounded-lg border border-gray-200">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-800">
                <input type="radio" checked={targetType === 'Product'} onChange={() => setTargetType('Product')} name="targetType" className="w-4 h-4 text-blue-600 focus:ring-blue-500" />
                <span>Sản Phẩm Kinh Doanh</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-800">
                <input type="radio" checked={targetType === 'Material'} onChange={() => setTargetType('Material')} name="targetType" className="w-4 h-4 text-amber-600 focus:ring-amber-500" />
                <span>Nguyên Vật Liệu</span>
              </label>
            </div>

            {targetType === 'Product' ? (
              <>
                <div className="flex items-center gap-5 text-xs pb-1">
                  <label className="flex items-center gap-2 cursor-pointer font-medium text-gray-700">
                    <input type="radio" checked={!isNewProduct} onChange={() => setIsNewProduct(false)} name="productType" className="w-3.5 h-3.5 text-blue-600" />
                    <span>Chọn sản phẩm sẵn có</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-blue-700">
                    <input type="radio" checked={isNewProduct} onChange={() => setIsNewProduct(true)} name="productType" className="w-3.5 h-3.5 text-blue-600" />
                    <span>Tạo mới hoàn toàn</span>
                  </label>
                </div>

                {!isNewProduct ? (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-gray-700">Sản phẩm *</label>
                    <select
                      className="w-full h-9 text-xs border border-gray-300 rounded-lg px-3 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none truncate"
                      value={selectedProductId}
                      onChange={e => setSelectedProductId(e.target.value)}
                    >
                      <option value="">-- Chọn sản phẩm --</option>
                      {productsList.map(p => (
                        <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-3.5 bg-blue-50/40 p-4 rounded-xl border border-blue-100">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-700">Tên sản phẩm *</label>
                      <Input placeholder="Nhập tên sản phẩm mới..." value={newProductName} onChange={e => setNewProductName(e.target.value)} className="h-9 text-xs px-3 bg-white border-gray-300 rounded-lg" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-700">Mã SKU *</label>
                        <Input placeholder="Mã SKU (VD: SP-001)" value={newProductSku} onChange={e => setNewProductSku(e.target.value)} className="h-9 text-xs px-3 uppercase bg-white border-gray-300 rounded-lg font-mono" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-700">Danh mục *</label>
                        <select
                          className="w-full h-9 text-xs border border-gray-300 rounded-lg px-3 bg-white text-gray-800 outline-none"
                          value={newProductCategoryId}
                          onChange={e => setNewProductCategoryId(e.target.value)}
                        >
                          {categoriesList.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-700">Giá niêm yết (VNĐ)</label>
                        <Input type="number" placeholder="0" value={newProductPrice} onChange={e => setNewProductPrice(e.target.value)} className="h-9 text-xs px-3 bg-white border-gray-300 rounded-lg" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-700">Đơn vị tính *</label>
                        <Input placeholder="Cái, Hộp, Bộ..." value={newProductUnit} onChange={e => setNewProductUnit(e.target.value)} className="h-9 text-xs px-3 bg-white border-gray-300 rounded-lg" />
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">Nguyên vật liệu *</label>
                <select
                  className="w-full h-9 text-xs border border-gray-300 rounded-lg px-3 bg-white text-gray-800 focus:ring-2 focus:ring-amber-500 outline-none truncate"
                  value={selectedMaterialId}
                  onChange={e => setSelectedMaterialId(e.target.value)}
                >
                  <option value="">-- Chọn nguyên vật liệu --</option>
                  {materialsList.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.unit || 'Vật tư'})</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">Vị trí lưu trữ *</label>
                <select
                  className="w-full h-9 text-xs border border-gray-300 rounded-lg px-3 bg-white text-gray-800 outline-none"
                  value={selectedLocationId}
                  onChange={e => setSelectedLocationId(e.target.value)}
                >
                  <option value="">-- Chọn vị trí --</option>
                  {warehouses.find(w => w.id === warehouseId)?.locations?.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name || 'Vị trí mặc định'}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-700">Số lượng ban đầu *</label>
                <Input
                  type="number"
                  value={initialQuantity}
                  onChange={e => setInitialQuantity(e.target.value)}
                  className="h-9 text-sm font-bold text-blue-700 font-mono px-3 border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button variant="outline" size="sm" className="h-9 px-4 text-xs font-medium border-gray-300" onClick={() => setShowAddModal(false)} disabled={submitting}>Hủy bỏ</Button>
              <button
                className="h-9 px-5 text-xs font-semibold text-white rounded-lg flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-50 shadow-sm"
                style={{ backgroundColor: PRIMARY }}
                onClick={handleAddSubmit}
                disabled={submitting}
              >
                <Check className="w-4 h-4" />
                {submitting ? 'Đang thêm...' : 'Thêm Vào Kho'}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
