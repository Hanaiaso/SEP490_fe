import React, { useState, useEffect } from 'react';
import { Search, Filter, AlertCircle, PackageSearch, ArrowLeftRight, Clock, User, Check } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getWarehouseInventory, adjustInventory, getWarehouses, addInventory } from '../../services/warehouseService';
import { getProducts, getCategories, createProduct } from '../../services/productService';

const PRIMARY = '#3b82f6';

export default function WarehouseInventoryCount() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [search, setSearch] = useState('');
  const [minQty, setMinQty] = useState('');
  const [maxQty, setMaxQty] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Edit State
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [adjustNote, setAdjustNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Add Product State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isNewProduct, setIsNewProduct] = useState(false);
  const [productsList, setProductsList] = useState<any[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [initialQuantity, setInitialQuantity] = useState('0');
  
  // New Product Info
  const [newProductName, setNewProductName] = useState('');
  const [newProductSku, setNewProductSku] = useState('');
  const [newProductCategoryId, setNewProductCategoryId] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('0');
  const [newProductUnit, setNewProductUnit] = useState('Cái');
  const [newProductDesc, setNewProductDesc] = useState('');
  const [newProductSpecs, setNewProductSpecs] = useState('');
  const [newProductImageFile, setNewProductImageFile] = useState<File | null>(null);

  useEffect(() => {
    fetchWarehousesList();
  }, []);

  const fetchWarehousesList = async () => {
    try {
      const res: any = await getWarehouses();
      if (res && res.length > 0) {
        setWarehouses(res);
        setWarehouseId(res[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching warehouses:', err);
    }
  };

  useEffect(() => {
    if (warehouseId) {
      fetchInventory();
    }
  }, [warehouseId, page]);

  const fetchInventory = async (isSearch = false) => {
    try {
      setLoading(true);
      const currentPage = isSearch ? 1 : page;
      if (isSearch && page !== 1) setPage(1);

      const params: any = {
        pageNumber: currentPage,
        pageSize: 10,
        search,
      };
      if (minQty) params.minQty = minQty;
      if (maxQty) params.maxQty = maxQty;
      if (fromDate) params.fromDate = fromDate;
      if (toDate) params.toDate = toDate;

      const res: any = await getWarehouseInventory(warehouseId, params);
      setItems(res.items || []);
      setTotalPages(res.totalPages || 1);
      setTotalCount(res.totalCount || 0);
    } catch (err: any) {
      alert('Lỗi khi tải danh sách tồn kho: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchInventory(true);
  };

  const openAdjustDialog = (item: any) => {
    setEditingItem(item);
    setNewQuantity(item.onHandQuantity.toString());
    setAdjustNote('');
  };

  const handleAdjustSubmit = async () => {
    if (!newQuantity || isNaN(newQuantity) || parseInt(newQuantity) < 0) {
      alert('Số lượng mới không hợp lệ!');
      return;
    }
    try {
      setSubmitting(true);
      await adjustInventory(editingItem.id, {
        newQuantity: parseInt(newQuantity as string, 10),
        note: adjustNote
      });
      alert('Cập nhật tồn kho thành công!');
      setEditingItem(null);
      fetchInventory(); // Reload current page
    } catch (err: any) {
      alert('Lỗi khi cập nhật tồn kho: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openAddProductModal = async () => {
    try {
      setLoading(true);
      const [res, cats]: any = await Promise.all([
        getProducts({ page: 1, pageSize: 200 }),
        getCategories()
      ]);
      setProductsList(res.items || []);
      setCategoriesList(cats || []);
      if (res.items && res.items.length > 0) {
        setSelectedProductId(res.items[0].id);
      }
      if (cats && cats.length > 0) {
        setNewProductCategoryId(cats[0].id);
      }
      
      const currWh = warehouses.find(w => w.id === warehouseId);
      if (currWh && currWh.locations && currWh.locations.length > 0) {
        setSelectedLocationId(currWh.locations[0].id);
      } else {
        setSelectedLocationId('');
      }
      
      setInitialQuantity('0');
      setNewProductName('');
      setNewProductSku('');
      setNewProductPrice('0');
      setNewProductUnit('Cái');
      setNewProductDesc('');
      setNewProductSpecs('');
      setNewProductImageFile(null);
      setIsNewProduct(false);
      setShowAddModal(true);
    } catch (err: any) {
      alert("Lỗi tải dữ liệu sản phẩm: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async () => {
    let finalProductId = selectedProductId;

    if (isNewProduct) {
      if (!newProductName || !newProductSku || !newProductCategoryId || !newProductUnit) return alert("Vui lòng điền đủ Tên, Mã SKU, Đơn vị tính và Danh mục cho sản phẩm mới.");
      if (isNaN(newProductPrice as any)) return alert("Giá sản phẩm không hợp lệ.");
    } else {
      if (!selectedProductId) return alert("Vui lòng chọn sản phẩm.");
    }

    if (!selectedLocationId) return alert("Vui lòng chọn vị trí lưu trữ.");
    if (!initialQuantity || isNaN(initialQuantity as any) || parseInt(initialQuantity) < 0) return alert("Số lượng không hợp lệ.");

    try {
      setSubmitting(true);
      
      if (isNewProduct) {
        const formData = new FormData();
        formData.append('Name', newProductName);
        formData.append('Sku', newProductSku);
        formData.append('CategoryId', newProductCategoryId);
        formData.append('StandardListedPrice', newProductPrice);
        formData.append('Unit', newProductUnit);
        if (newProductDesc) formData.append('Description', newProductDesc);
        if (newProductSpecs) formData.append('Specifications', newProductSpecs);
        if (newProductImageFile) formData.append('ImageFile', newProductImageFile);

        const createdProd: any = await createProduct(formData);
        finalProductId = createdProd.id;
      }

      await addInventory({
        productId: finalProductId,
        warehouseLocationId: selectedLocationId,
        initialQuantity: parseInt(initialQuantity)
      });
      alert('Thêm sản phẩm vào kho thành công!');
      setShowAddModal(false);
      fetchInventory();
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <PackageSearch className="w-6 h-6 text-blue-600" />
            Quản lý tồn kho trực tiếp
          </h1>
          <p className="text-sm text-gray-500 mt-1">Xem và cập nhật số lượng tồn kho vật lý tại kho</p>
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button onClick={openAddProductModal} className="h-10 text-sm whitespace-nowrap" style={{ backgroundColor: PRIMARY }}>
            + Thêm sản phẩm
          </Button>
          <select 
            value={warehouseId} 
            onChange={(e: any) => setWarehouseId(e.target.value)}
            className="w-full sm:w-[250px] bg-white border border-gray-300 rounded text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
          >
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.id}>{wh.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-end flex-wrap">
        <div className="flex-1 w-full md:min-w-[200px] space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Tìm kiếm (Tên / SKU)</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input 
              placeholder="Nhập mã hoặc tên sản phẩm..." 
              className="pl-9 h-9 text-sm w-full"
              value={search}
              onChange={(e: any) => setSearch(e.target.value)}
              onKeyDown={(e: any) => e.key === 'Enter' && handleSearch()}
            />
          </div>
        </div>
        
        <div className="w-full md:w-32 space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Tồn kho Min</label>
          <Input type="number" placeholder="0" className="h-9 text-sm" value={minQty} onChange={(e: any) => setMinQty(e.target.value)} onKeyDown={(e: any) => e.key === 'Enter' && handleSearch()} />
        </div>
        <div className="w-full md:w-32 space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Tồn kho Max</label>
          <Input type="number" placeholder="1000" className="h-9 text-sm" value={maxQty} onChange={(e: any) => setMaxQty(e.target.value)} onKeyDown={(e: any) => e.key === 'Enter' && handleSearch()} />
        </div>
        <div className="w-full md:w-32 space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Cập nhật từ</label>
          <Input type="date" className="h-9 text-sm" value={fromDate} onChange={(e: any) => setFromDate(e.target.value)} />
        </div>
        <div className="w-full md:w-32 space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Đến ngày</label>
          <Input type="date" className="h-9 text-sm" value={toDate} onChange={(e: any) => setToDate(e.target.value)} />
        </div>

        <Button onClick={handleSearch} className="h-9 gap-2 w-full md:w-auto" style={{ backgroundColor: PRIMARY }}>
          <Filter className="w-4 h-4" /> Lọc dữ liệu
        </Button>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-700 w-32">Mã SKU</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Tên sản phẩm</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Tồn vật lý</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-700">Tồn khả dụng</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Cập nhật lần cuối</th>
                <th className="text-center px-4 py-3 font-semibold text-gray-700 w-28">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-500 flex flex-col items-center">
                    <AlertCircle className="w-10 h-10 text-gray-300 mb-2" />
                    Không tìm thấy sản phẩm nào trong kho này.
                  </td>
                </tr>
              ) : (
                items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-500">{item.productSku}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.productName}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded text-sm border border-blue-100">
                        {item.onHandQuantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 font-medium">
                      {item.availableQuantity}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="flex items-center gap-1 text-[11px] text-gray-600"><User className="w-3 h-3" /> {item.lastUpdatedByUserName || 'System'}</span>
                        <span className="flex items-center gap-1 text-[11px] text-gray-400"><Clock className="w-3 h-3" /> {item.lastUpdatedAt ? new Date(item.lastUpdatedAt).toLocaleString('vi-VN') : 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button size="sm" variant="outline" className="h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => openAdjustDialog(item)}>
                        Cập nhật
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && items.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="text-xs text-gray-500">Hiển thị {items.length} / {totalCount} sản phẩm</span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Trang trước</Button>
              <span className="text-xs px-2 font-medium">Trang {page} / {totalPages}</span>
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Trang sau</Button>
            </div>
          </div>
        )}
      </div>

      {/* Adjust Inventory Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-base font-bold flex items-center gap-2 text-blue-700">
                <ArrowLeftRight className="w-5 h-5" />
                Điều chỉnh tồn kho
              </h3>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="bg-slate-50 p-3 rounded border border-slate-100 space-y-1">
                <div className="text-xs text-gray-500 font-mono">{editingItem.productSku}</div>
                <div className="font-semibold text-gray-800 text-sm">{editingItem.productName}</div>
                <div className="flex justify-between mt-2 pt-2 border-t border-slate-200">
                  <span className="text-xs text-gray-500">Tồn hiện tại hệ thống:</span>
                  <span className="font-bold text-gray-700">{editingItem.onHandQuantity}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Tồn kho thực tế (đã đếm)</label>
                <Input 
                  type="number" 
                  value={newQuantity} 
                  onChange={(e: any) => setNewQuantity(e.target.value)} 
                  className="font-mono text-lg font-bold text-blue-600"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Ghi chú (Tùy chọn)</label>
                <Input 
                  placeholder="Ví dụ: Kiểm kê định kỳ, sai lệch do hàng hỏng..." 
                  value={adjustNote} 
                  onChange={(e: any) => setAdjustNote(e.target.value)} 
                  className="text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setEditingItem(null)} disabled={submitting}>Hủy bỏ</Button>
                <Button style={{ backgroundColor: PRIMARY }} onClick={handleAdjustSubmit} disabled={submitting} className="gap-2">
                  <Check className="w-4 h-4" /> {submitting ? 'Đang lưu...' : 'Lưu điều chỉnh'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h3 className="text-base font-bold flex items-center gap-2 text-blue-700">
                <PackageSearch className="w-5 h-5" />
                Thêm sản phẩm vào kho
              </h3>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="flex gap-4 mb-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="radio" checked={!isNewProduct} onChange={() => setIsNewProduct(false)} name="productType" className="w-4 h-4 text-blue-600" />
                  <span>Chọn sản phẩm có sẵn</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="radio" checked={isNewProduct} onChange={() => setIsNewProduct(true)} name="productType" className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-blue-700">Tạo mới hoàn toàn</span>
                </label>
              </div>

              {!isNewProduct ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Chọn sản phẩm</label>
                  <select 
                    className="w-full text-sm h-9 border border-gray-300 rounded px-2"
                    value={selectedProductId}
                    onChange={(e: any) => setSelectedProductId(e.target.value)}
                  >
                    <option value="">-- Chọn sản phẩm --</option>
                    {productsList.map(p => (
                      <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3 bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">Tên sản phẩm *</label>
                    <Input placeholder="Nhập tên sản phẩm mới" value={newProductName} onChange={(e: any) => setNewProductName(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">Mã SKU *</label>
                      <Input placeholder="Nhập mã SKU" value={newProductSku} onChange={(e: any) => setNewProductSku(e.target.value)} className="h-8 text-sm uppercase" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">Danh mục *</label>
                      <select 
                        className="w-full text-sm h-8 border border-gray-300 rounded px-2"
                        value={newProductCategoryId}
                        onChange={(e: any) => setNewProductCategoryId(e.target.value)}
                      >
                        {categoriesList.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">Giá niêm yết (VNĐ)</label>
                      <Input type="number" placeholder="0" value={newProductPrice} onChange={(e: any) => setNewProductPrice(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">Đơn vị tính *</label>
                      <Input placeholder="Cái, Hộp, Kg..." value={newProductUnit} onChange={(e: any) => setNewProductUnit(e.target.value)} className="h-8 text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-700">Mô tả ngắn</label>
                    <Input placeholder="Nhập mô tả sản phẩm" value={newProductDesc} onChange={(e: any) => setNewProductDesc(e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">Thông số kỹ thuật</label>
                      <Input placeholder="Nhập thông số kỹ thuật" value={newProductSpecs} onChange={(e: any) => setNewProductSpecs(e.target.value)} className="h-8 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-700">Tải lên hình ảnh</label>
                      <Input type="file" accept="image/*" onChange={(e: any) => setNewProductImageFile(e.target.files[0])} className="h-8 text-sm pt-1" />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Chọn vị trí lưu trữ</label>
                <select 
                  className="w-full text-sm h-9 border border-gray-300 rounded px-2"
                  value={selectedLocationId}
                  onChange={(e: any) => setSelectedLocationId(e.target.value)}
                >
                  {warehouses.find(w => w.id === warehouseId)?.locations?.length === 0 && (
                    <option value="">Kho này chưa có vị trí</option>
                  )}
                  {warehouses.find(w => w.id === warehouseId)?.locations?.map((loc: any) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
                {warehouses.find(w => w.id === warehouseId)?.locations?.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">Vui lòng sang trang Quản lý kho tạo vị trí trước.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Số lượng ban đầu</label>
                <Input 
                  type="number" 
                  value={initialQuantity} 
                  onChange={(e: any) => setInitialQuantity(e.target.value)} 
                  className="font-mono text-lg font-bold text-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={submitting}>Hủy bỏ</Button>
                <Button style={{ backgroundColor: PRIMARY }} onClick={handleAddSubmit} disabled={submitting || !selectedLocationId} className="gap-2">
                  <Check className="w-4 h-4" /> {submitting ? 'Đang lưu...' : 'Lưu sản phẩm'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
