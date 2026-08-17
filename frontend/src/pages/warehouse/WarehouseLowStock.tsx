import type { ChangeEvent } from 'react';
import { getErrorMessage } from '../../lib/errors';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AlertTriangle, Search, ArrowRight, Package, RefreshCw, ShoppingCart, Archive } from 'lucide-react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { getLowStockAlerts, getExcessStockAlerts } from '../../services/warehouseService';
import { useNavigate } from 'react-router-dom';
import type { LowStockAlert, ExcessStockAlert } from '../../types/warehouse';

const PRIMARY  = '#1F3B64';
const WARNING  = '#D97706';
const ERROR    = '#DC2626';
const EXCESS   = '#7C3AED';

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
  const [activeTab, setActiveTab] = useState<'low' | 'excess'>('low');
  const [search, setSearch] = useState('');
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [excessAlerts, setExcessAlerts] = useState<ExcessStockAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [excessLoading, setExcessLoading] = useState(false);
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

  const fetchExcessAlerts = useCallback(async () => {
    try {
      setExcessLoading(true);
      const res: ExcessStockAlert[] = await getExcessStockAlerts();
      setExcessAlerts(res || []);
    } catch (err: unknown) {
      alert('Lỗi tải cảnh báo tồn đọng: ' + getErrorMessage(err));
    } finally {
      setExcessLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
    fetchExcessAlerts();
  }, [fetchAlerts, fetchExcessAlerts]);

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

  const filteredExcessAlerts = excessAlerts.filter((item) => {
    const term = search.toLowerCase();
    const nameMatch = item.itemName.toLowerCase().includes(term);
    const skuMatch = (item.itemSku || '').toLowerCase().includes(term);
    if (!nameMatch && !skuMatch) return false;
    if (itemTypeFilter !== 'all' && item.itemType !== itemTypeFilter) return false;
    return true;
  });

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
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: activeTab === 'low' ? ERROR : EXCESS }}>
              {activeTab === 'low' ? <AlertTriangle className="w-3.5 h-3.5 text-white" /> : <Archive className="w-3.5 h-3.5 text-white" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 leading-tight">
                {activeTab === 'low' ? 'Cảnh Báo Gần Hết Hàng' : 'Cảnh Báo Tồn Đọng'}
              </h2>
              {activeTab === 'low' ? (
                <p className="text-xs text-gray-500">
                  <span className="font-semibold" style={{ color: ERROR }}>{filteredAlerts.length}</span> mặt hàng dưới ngưỡng ·{' '}
                  <span className="font-semibold" style={{ color: WARNING }}>{criticalCount}</span> nguy hiểm
                </p>
              ) : (
                <p className="text-xs text-gray-500">
                  <span className="font-semibold" style={{ color: EXCESS }}>{filteredExcessAlerts.length}</span> mặt hàng vượt ngưỡng tồn đọng
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm" className="h-7 text-xs gap-1.5"
              onClick={activeTab === 'low' ? fetchAlerts : fetchExcessAlerts}
              disabled={activeTab === 'low' ? loading : excessLoading}
            >
              <RefreshCw className={`w-3 h-3 ${(activeTab === 'low' ? loading : excessLoading) ? 'animate-spin' : ''}`} /> Làm mới
            </Button>
            {activeTab === 'low' && (
              <button
                className="h-7 px-3 text-xs font-medium text-white rounded flex items-center gap-1.5 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: PRIMARY }}
                onClick={() => navigate('/warehouse/purchase/orders')}
              >
                <ShoppingCart className="w-3.5 h-3.5" /> Tạo Yêu Cầu Nhập
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-3 border-b border-gray-200">
          <button
            className="px-3 py-1.5 text-xs font-semibold border-b-2 -mb-px transition-colors"
            style={activeTab === 'low' ? { color: ERROR, borderColor: ERROR } : { color: '#9CA3AF', borderColor: 'transparent' }}
            onClick={() => setActiveTab('low')}
          >
            Tồn thấp
          </button>
          <button
            className="px-3 py-1.5 text-xs font-semibold border-b-2 -mb-px transition-colors"
            style={activeTab === 'excess' ? { color: EXCESS, borderColor: EXCESS } : { color: '#9CA3AF', borderColor: 'transparent' }}
            onClick={() => setActiveTab('excess')}
          >
            Tồn đọng
          </button>
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
          {activeTab === 'low' && (
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
          )}
        </div>
      </div>

      {/* ── Scrollable Body ── */}
      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        {activeTab === 'excess' ? (
        <>
        {/* Alert banner */}
        {filteredExcessAlerts.length > 0 && (
          <div className="flex items-center gap-2 p-2 rounded mb-3" style={{ backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE' }}>
            <Archive className="w-3.5 h-3.5 flex-shrink-0" style={{ color: EXCESS }} />
            <span className="text-[11px]" style={{ color: '#5B21B6' }}>
              <strong>{filteredExcessAlerts.length} mặt hàng</strong> đang vượt ngưỡng tồn đọng, cân nhắc khuyến mãi hoặc tạm dừng nhập thêm.
            </span>
          </div>
        )}

        {/* Excess table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold w-32">Mã SKU</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Tên hàng hóa</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold w-32">Phân loại</th>
                <th className="text-right px-3 py-2.5 font-semibold w-28" style={{ color: EXCESS }}>Tồn khả dụng</th>
                <th className="text-right px-3 py-2.5 text-gray-700 font-semibold w-28">Ngưỡng tồn đọng</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Gợi ý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {excessLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: PRIMARY }} />
                      <p className="text-xs text-gray-500">Đang tải dữ liệu...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredExcessAlerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                        <Package className="w-5 h-5 text-green-400" />
                      </div>
                      <p className="text-sm font-medium text-gray-500">Không có hàng tồn đọng</p>
                      <p className="text-xs text-gray-400">Chưa mặt hàng nào vượt ngưỡng tồn đọng</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExcessAlerts.map((item, i) => {
                  const isMaterial = item.itemType === 'Material';
                  return (
                    <tr
                      key={`${item.itemType}-${item.itemId}`}
                      className={`hover:bg-purple-50/20 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}
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
                      <td className="px-3 py-2.5 text-right font-bold" style={{ color: EXCESS }}>
                        {item.availableQuantity}
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-600 font-medium">
                        {item.threshold}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{item.suggestedAction}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        </>
        ) : (
        <>
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
        </>
        )}
      </div>
    </div>
  );
}
