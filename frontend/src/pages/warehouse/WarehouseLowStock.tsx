import type { ChangeEvent } from 'react';
import { getErrorMessage } from '../../lib/errors';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertTriangle, Search, ArrowRight, Package, RefreshCw, ShoppingCart } from 'lucide-react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { getLowStockAlerts } from '../../services/warehouseService';
import { useNavigate } from 'react-router-dom';
import type { LowStockAlert } from '../../types/warehouse';

const PRIMARY  = '#1F3B64';
const WARNING  = '#D97706';
const ERROR    = '#DC2626';

function SeverityBadge({ qty }: { qty: number }) {
  if (qty < 20) {
    return (
      <span className="text-[10px] font-semibold text-white px-2 py-0.5 inline-block whitespace-nowrap" style={{ backgroundColor: ERROR, borderRadius: 4 }}>
        Nguy hiểm
      </span>
    );
  }
  return (
    <span className="text-[10px] font-semibold text-white px-2 py-0.5 inline-block whitespace-nowrap" style={{ backgroundColor: WARNING, borderRadius: 4 }}>
      Thấp
    </span>
  );
}

export default function WarehouseLowStock() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [itemTypeFilter, setItemTypeFilter] = useState('all');

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const res: LowStockAlert[] = await getLowStockAlerts();
      setAlerts(res || []);
    } catch (err: unknown) {
      alert('Lỗi tải cảnh báo tồn kho thấp: ' + getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const warehouseOptions = useMemo(() => {
    const names = new Map<string, string>();
    alerts.forEach((a) => {
      if (a.warehouseId && a.warehouseName) names.set(a.warehouseId, a.warehouseName);
    });
    return Array.from(names.entries());
  }, [alerts]);

  const filteredAlerts = alerts.filter((item) => {
    const term = search.toLowerCase();
    const nameMatch = item.itemName.toLowerCase().includes(term);
    const skuMatch = (item.itemSku || '').toLowerCase().includes(term);
    if (!nameMatch && !skuMatch) return false;
    if (itemTypeFilter !== 'all' && item.itemType !== itemTypeFilter) return false;
    if (warehouseFilter !== 'all' && item.warehouseId !== warehouseFilter) return false;
    return true;
  });

  const criticalCount = filteredAlerts.filter(i => i.availableQuantity < 20).length;

  return (
    <div className="warehouse-hallmark-type flex flex-col h-full bg-[#F5F7FA]">
      {/* ── Fixed Header ── */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[11px] mb-0.5">
          <span className="text-gray-400">Kho hàng</span>
          <span className="text-gray-300">/</span>
          <span className="text-gray-400">Cảnh báo</span>
          <span className="text-gray-300">/</span>
          <span className="text-gray-800 font-semibold">Cảnh báo gần hết hàng</span>
        </div>

        {/* Title row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: ERROR }}>
              <AlertTriangle className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">Cảnh Báo Gần Hết Hàng</h2>
              <p className="text-xs text-gray-500">
                <span className="font-semibold" style={{ color: ERROR }}>{filteredAlerts.length}</span> mặt hàng dưới ngưỡng ·{' '}
                <span className="font-semibold" style={{ color: WARNING }}>{criticalCount}</span> nguy hiểm
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={fetchAlerts} disabled={loading}>
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Làm mới
            </Button>
            <button
              className="h-7 px-3 text-xs font-medium text-white rounded flex items-center gap-1.5 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: PRIMARY }}
              onClick={() => navigate('/warehouse/purchase/orders')}
            >
              <ShoppingCart className="w-3.5 h-3.5" /> Tạo Yêu Cầu Nhập
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              className="pl-8 h-7 text-xs bg-gray-50"
              placeholder="Mã SKU, tên hàng hóa..."
              value={search}
              onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600 focus:outline-none"
            value={itemTypeFilter}
            onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setItemTypeFilter(e.target.value)}
          >
            <option value="all">Tất cả loại</option>
            <option value="Product">Sản phẩm</option>
            <option value="Material">Nguyên vật liệu</option>
          </select>
          <select
            className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600 focus:outline-none"
            value={warehouseFilter}
            onChange={(e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setWarehouseFilter(e.target.value)}
          >
            <option value="all">Tất cả kho</option>
            {warehouseOptions.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        {/* Alert banner */}
        {filteredAlerts.length > 0 && (
          <div className="flex items-center gap-2 p-2 bg-red-50 border border-red-200 rounded mb-3">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            <span className="text-red-700 text-[11px]">
              <strong>{filteredAlerts.length} mặt hàng</strong> đang dưới ngưỡng tồn kho tối thiểu
              {criticalCount > 0 && <> · <strong>{criticalCount}</strong> ở mức nguy hiểm &lt;20 đơn vị</>}, cần đặt hàng ngay.
            </span>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold w-32">Mã SKU</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Tên hàng hóa</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold w-32">Phân loại</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Kho</th>
                <th className="text-right px-3 py-2.5 font-semibold w-28" style={{ color: ERROR }}>Tồn khả dụng</th>
                <th className="text-right px-3 py-2.5 text-gray-700 font-semibold w-28">Ngưỡng cảnh báo</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold w-28">Mức cảnh báo</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold w-28">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: PRIMARY }} />
                      <p className="text-xs text-gray-500">Đang tải dữ liệu...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                        <Package className="w-5 h-5 text-green-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">Không có hàng dưới ngưỡng</p>
                      <p className="text-xs text-gray-400">Tất cả mặt hàng đều đủ tồn kho</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((item, i) => {
                  const isMaterial = item.itemType === 'Material';
                  const isCritical = item.availableQuantity < 20;
                  return (
                    <tr
                      key={`${item.itemType}-${item.itemId}-${item.warehouseId ?? ''}`}
                      className={`hover:bg-red-50/20 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''} ${isCritical ? 'border-l-2 border-l-red-400' : ''}`}
                    >
                      <td className="px-3 py-2.5 font-mono text-gray-500">{item.itemSku || '—'}</td>
                      <td className="px-3 py-2.5 font-medium text-gray-900">{item.itemName}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span
                          className="text-[10px] font-semibold text-white px-2 py-0.5 inline-block whitespace-nowrap"
                          style={{ backgroundColor: isMaterial ? WARNING : PRIMARY, borderRadius: 4 }}
                        >
                          {isMaterial ? 'NVL' : 'Sản phẩm'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{item.warehouseName || 'Tất cả kho'}</td>
                      <td className="px-3 py-2.5 text-right font-bold" style={{ color: isCritical ? ERROR : WARNING }}>
                        {item.availableQuantity}
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-600 font-medium">
                        {item.threshold}
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <SeverityBadge qty={item.availableQuantity} />
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <button
                          className="h-6 px-2 text-[10px] font-medium rounded border border-blue-200 text-blue-700 hover:bg-blue-50 whitespace-nowrap flex items-center gap-1 mx-auto"
                          onClick={() => navigate('/warehouse/purchase/orders')}
                        >
                          Lên đơn nhập <ArrowRight className="w-2.5 h-2.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
