import type { ChangeEvent } from 'react';
import { getErrorMessage } from '../../lib/errors';
import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle, Search, ArrowRight, Package } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { getWarehouses, getWarehouseInventory } from '../../services/warehouseService';
import { useNavigate } from 'react-router-dom';
import type { InventoryItem, PaginatedList, Warehouse } from '../../types/warehouse';

const PRIMARY = '#3b82f6';

export default function WarehouseLowStock() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [itemTypeFilter, setItemTypeFilter] = useState('all');

  const fetchWarehouses = useCallback(async () => {
    try {
      const res: Warehouse[] = await getWarehouses();
      if (res && res.length > 0) {
        setWarehouses(res);
        setWarehouseId(res[0].id);
      }
    } catch (err) {
      console.error('Failed to load warehouses', err);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  const fetchInventory = useCallback(async () => {
    try {
      setLoading(true);
      const res: PaginatedList<InventoryItem> = await getWarehouseInventory(warehouseId, { pageNumber: 1, pageSize: 1000 });
      const allItems = res.items || [];
      // Filter pseudo-low-stock based on availableQuantity < 50
      const lowStock = allItems.filter((item) => item.availableQuantity < 50);
      setItems(lowStock);
    } catch (err: unknown) {
      alert('Lỗi tải dữ liệu tồn kho: ' + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    if (warehouseId) {
      fetchInventory();
    }
  }, [warehouseId, fetchInventory]);

  const filteredItems = items.filter(item => {
    const term = search.toLowerCase();
    const nameMatch = (item.productName || item.itemName || '').toLowerCase().includes(term);
    const skuMatch = (item.productSku || item.itemSku || '').toLowerCase().includes(term);
    const matchesSearch = nameMatch || skuMatch;
    
    if (!matchesSearch) return false;
    if (itemTypeFilter === 'all') return true;
    if (itemTypeFilter === 'Product') return item.itemType === 'Product' || (item.productId && !item.materialId);
    if (itemTypeFilter === 'Material') return item.itemType === 'Material' || item.materialId;
    return true;
  });

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <AlertCircle className="w-6 h-6 text-red-500" />
            Cảnh Báo Gần Hết Hàng
          </h1>
          <p className="text-xs text-gray-500 mt-1">Danh sách sản phẩm và nguyên vật liệu dưới mức tồn kho tối thiểu</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            className="h-9 text-sm font-semibold border border-blue-200 rounded-lg px-3 bg-blue-50 text-blue-900 outline-none"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
          >
            {warehouses.map(wh => (
              <option key={wh.id} value={wh.id}>{wh.name}</option>
            ))}
          </select>
          <Button style={{ backgroundColor: PRIMARY }} className="text-xs gap-2" onClick={() => navigate('/warehouse/purchase/orders')}>
            <Package className="w-4 h-4" /> Tạo Yêu Cầu Nhập Hàng
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Tìm kiếm</label>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input 
              placeholder="Nhập mã SKU hoặc tên..." 
              className="pl-9 h-9 text-sm"
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="w-48 space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Phân loại</label>
          <select 
            className="h-9 text-sm border border-gray-200 rounded-md px-2.5 bg-white w-full"
            value={itemTypeFilter}
            onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setItemTypeFilter(e.target.value)}
          >
            <option value="all">Tất cả</option>
            <option value="Product">Sản phẩm</option>
            <option value="Material">Nguyên vật liệu</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-gray-200 text-gray-700 font-semibold">
              <tr>
                <th className="px-4 py-3 w-32">Mã SKU</th>
                <th className="px-4 py-3">Tên hàng hóa</th>
                <th className="px-4 py-3 text-center">Phân loại</th>
                <th className="px-4 py-3 text-right text-red-600">Tồn hiện tại</th>
                <th className="px-4 py-3 text-right">Tồn khả dụng</th>
                <th className="px-4 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">Đang tải...</td></tr>
              ) : filteredItems.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-500">Không có hàng tồn kho nào dưới mức cảnh báo</td></tr>
              ) : filteredItems.map(item => {
                const isMaterial = item.itemType === 'Material' || item.materialId;
                return (
                  <tr key={item.id} className="hover:bg-red-50/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-500">{item.productSku || item.itemSku}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.productName || item.itemName}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        !isMaterial ? 'bg-blue-50 text-blue-800' : 'bg-amber-50 text-amber-800'
                      }`}>
                        {!isMaterial ? 'Sản phẩm' : 'Nguyên vật liệu'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-red-600">
                      {item.onHandQuantity}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-600 font-medium">
                      {item.availableQuantity}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Button size="sm" variant="outline" className="h-7 text-xs border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => navigate('/warehouse/purchase/orders')}>
                        Lên đơn nhập <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
