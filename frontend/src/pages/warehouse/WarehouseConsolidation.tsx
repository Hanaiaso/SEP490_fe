import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Search, Eye, RefreshCw, Download, ArrowRight, RotateCcw, Clock, Package2, CheckCircle, AlertTriangle, X, Truck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/sales-ui/dialog';
import { getWarehouseOrders, consolidateWarehouseOrder } from '../../services/warehouseService';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#D97706';
const ERROR   = '#DC2626';
const INFO    = '#2563EB';
const NEUTRAL = '#64748B';

const STATUS_CFG: Record<string, { label: string; bg: string }> = {
  waiting:   { label: 'Chờ tập kết',  bg: NEUTRAL },
  ready:     { label: 'Sẵn sàng',     bg: SUCCESS },
  delayed:   { label: 'Trễ hạn',      bg: ERROR   },
  completed: { label: 'Đã bàn giao',  bg: INFO    },
};

interface ConsolidationItem {
  id: string; fulfillmentId: string; warehouse: string; warehouseCode: string;
  quantity: number;
  status: 'waiting' | 'ready' | 'delayed' | 'completed';
  products?: { sku: string; name: string; quantity: number; transferStatus?: string; requiredTransferQuantity?: number }[];
  pickTasks?: { id: string; warehouse: string; status: string; items: { name: string; requestedQty: number; packedQty: number }[] }[];
  requiresTransfer?: boolean;
}

function Badge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || { label: status, bg: NEUTRAL };
  return <span className="text-[10px] font-semibold text-white px-2 py-0.5 inline-block whitespace-nowrap" style={{ backgroundColor: c.bg, borderRadius: 4 }}>{c.label}</span>;
}

export default function WarehouseConsolidation() {
  const navigate = useNavigate();
  const [data, setData] = useState<ConsolidationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<ConsolidationItem | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const result = await getWarehouseOrders('Consolidation');
      const mapped = result.map((d: any) => ({
        id: d.orderId,
        fulfillmentId: d.orderCode,
        warehouse: d.allocatedWarehouse || 'Kho mặc định',
        warehouseCode: d.allocatedWarehouseCode || 'WH-DEFAULT',
        quantity: d.totalQuantity,
        status: d.status === 'Ready' ? 'ready' : d.status === 'Consolidating' ? 'waiting' : 'waiting',
        requiresTransfer: d.requiresTransfer,
      }));
      setData(mapped);
    } catch (e: any) {
      alert('Không lấy được danh sách tập kết: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleConsolidate = async (id: string) => {
    try {
      await consolidateWarehouseOrder(id);
      alert('Tập kết đơn hàng thành công!');
      setDetail(null);
      fetchOrders();
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    }
  };

  const filtered = data.filter(d => {
    const q = search.toLowerCase();
    const ms = !q || d.id.toLowerCase().includes(q) || d.fulfillmentId.toLowerCase().includes(q);
    const mst = statusFilter === 'all' || d.status === statusFilter;
    const mw = warehouseFilter === 'all' || d.warehouse === warehouseFilter;
    return ms && mst && mw;
  });

  const STATS = [
    { label: 'Chờ tập kết', value: data.filter(d => d.status === 'waiting').length, icon: <Clock className="w-4 h-4" />, color: NEUTRAL },
    { label: 'Sẵn sàng',    value: data.filter(d => d.status === 'ready').length,   icon: <CheckCircle className="w-4 h-4" />, color: SUCCESS },
    { label: 'Trễ hạn',     value: data.filter(d => d.status === 'delayed').length, icon: <AlertTriangle className="w-4 h-4" />, color: ERROR },
    { label: 'Đã bàn giao', value: data.filter(d => d.status === 'completed').length, icon: <Package2 className="w-4 h-4" />, color: INFO },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] mb-0.5">
          <span className="text-gray-400">Kho hàng</span> <span className="text-gray-300">/</span> <span className="text-gray-400">Xuất kho (Outbound)</span> <span className="text-gray-300">/</span> <span className="text-gray-800 font-semibold">Khu tập kết hàng</span>
        </div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Khu tập kết hàng (Consolidation Area)</h2>
            <p className="text-xs text-gray-500 mt-0.5">{data.length} lô hàng đang quản lý</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={fetchOrders}><RefreshCw className="w-3 h-3" /> Làm mới</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"><Download className="w-3 h-3" /> Xuất Excel</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 mb-3">
          {STATS.map(s => (
            <div key={s.label} className="flex items-center gap-2 bg-gray-50 rounded px-3 py-2 border border-gray-200">
              <span style={{ color: s.color }}>{s.icon}</span>
              <div>
                <p className="text-[11px] text-gray-500">{s.label}</p>
                <p className="text-base font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input className="pl-8 h-7 text-xs bg-gray-50" placeholder="Mã consolidation, lệnh xuất..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)}>
            <option value="all">Tất cả kho</option>
            <option value="Kho Chính">Kho Chính</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5"><input type="checkbox" className="w-3.5 h-3.5" checked={selected.length === filtered.length && filtered.length > 0} onChange={e => setSelected(e.target.checked ? filtered.map(d => d.id) : [])} /></th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Mã đơn hàng</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Mã lệnh xuất</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Kho hiện tại</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Số lượng hàng hóa</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Trạng thái</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="py-12 text-center"><div className="flex flex-col items-center gap-2"><div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><Package2 className="w-5 h-5 text-gray-400" /></div><p className="text-sm font-medium text-gray-500">{loading ? 'Đang tải...' : 'Không có dữ liệu tập kết'}</p></div></td></tr>
              ) : filtered.map((d, i) => (
                <tr key={d.id} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-3 py-2.5"><input type="checkbox" className="w-3.5 h-3.5" checked={selected.includes(d.id)} onChange={e => setSelected(prev => e.target.checked ? [...prev, d.id] : prev.filter(x => x !== d.id))} /></td>
                  <td className="px-3 py-2.5 font-semibold" style={{ color: PRIMARY }}>{d.fulfillmentId}</td>
                  <td className="px-3 py-2.5 font-semibold text-gray-600">{d.id.substring(0,8).toUpperCase()}</td>
                  <td className="px-3 py-2.5 text-gray-700">{d.warehouse}</td>
                  <td className="px-3 py-2.5 text-center font-semibold text-gray-800">{d.quantity}</td>
                  <td className="px-3 py-2.5 text-center"><Badge status={d.status} /></td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" title="Xem chi tiết" onClick={async () => {
                        try {
                          const { getWarehouseOrderDetail } = await import('../../services/warehouseService.js');
                          const data = await getWarehouseOrderDetail(d.id);
                          setDetail({
                            ...d,
                            products: data.items.map((i: any) => ({
                              sku: i.sku, name: i.productName, quantity: i.requestedQuantity, requiredTransferQuantity: i.requiredTransferQuantity, transferStatus: '—'
                            })),
                            pickTasks: data.pickTasks?.map((pt: any) => ({
                              id: pt.pickTaskId,
                              warehouse: pt.warehouseName,
                              status: pt.status,
                              items: pt.items.map((i: any) => ({
                                name: i.productName, requestedQty: i.requestedQuantity, packedQty: i.packedQuantity
                              }))
                            })) || []
                          });
                        } catch(e: any) { alert(e.message); }
                      }}><Eye className="w-3.5 h-3.5" /></button>
                      {(!d.requiresTransfer) ? (
                        <button className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600" title="Hoàn tất tập kết" onClick={() => handleConsolidate(d.id)}><ArrowRight className="w-3.5 h-3.5" /></button>
                      ) : (
                        <button className="p-1 rounded hover:bg-purple-50 text-gray-400 hover:text-purple-600" title="Điều chuyển nội bộ" onClick={async () => {
                          try {
                            const { getWarehouseOrderDetail } = await import('../../services/warehouseService.js');
                            const data = await getWarehouseOrderDetail(d.id);
                            const products = data.items.filter((i: any) => i.requiredTransferQuantity > 0).map((i: any) => ({
                              sku: i.sku, name: i.productName, quantity: i.requiredTransferQuantity, transferStatus: '—'
                            }));
                            navigate('/warehouse/transfer/stock-transfer', { state: { prefill: { sourceWarehouse: d.warehouse, orderId: d.id, items: products } } });
                          } catch(e: any) { alert(e.message); }
                        }}><Truck className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Chi tiết tập kết</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-gray-50 rounded p-3 space-y-1.5">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Thông tin lệnh</p>
                  <div className="flex justify-between"><span className="text-gray-500">Mã đơn hàng:</span><span className="font-semibold" style={{ color: PRIMARY }}>{detail.fulfillmentId}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Mã lệnh xuất:</span><span className="font-medium text-gray-600">{detail.id.substring(0,8).toUpperCase()}</span></div>
                </div>
                <div className="bg-gray-50 rounded p-3 space-y-1.5">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Tập kết</p>
                  <div className="flex justify-between"><span className="text-gray-500">Kho hiện tại:</span><span className="font-semibold">{detail.warehouse}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Trạng thái:</span><Badge status={detail.status} /></div>
                </div>
              </div>

              {detail.pickTasks && detail.pickTasks.length > 0 && (
                <div className="mb-4">
                  <p className="font-semibold text-gray-600 text-[10px] uppercase tracking-wide mb-2">Các lệnh xuất kho (Pick Tasks)</p>
                  <div className="space-y-2">
                    {detail.pickTasks.map(pt => (
                      <div key={pt.id} className="border border-gray-200 rounded overflow-hidden">
                        <div className="bg-gray-50 px-3 py-2 flex items-center justify-between border-b border-gray-200">
                          <div>
                            <span className="font-semibold text-gray-700">Mã: {pt.id.substring(0,8).toUpperCase()}</span>
                            <span className="ml-2 text-gray-500">Kho: {pt.warehouse}</span>
                          </div>
                          <Badge status={pt.status === 'Completed' ? 'completed' : 'waiting'} />
                        </div>
                        <div className="px-3 py-2 bg-white">
                          <table className="w-full text-[11px]">
                            <thead>
                              <tr className="text-gray-500 border-b border-gray-100">
                                <th className="text-left font-medium pb-1">Tên hàng</th>
                                <th className="text-center font-medium pb-1">SL Yêu cầu</th>
                                <th className="text-center font-medium pb-1">SL Đã pick</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pt.items.map((i, idx) => (
                                <tr key={idx}>
                                  <td className="py-1 text-gray-700">{i.name}</td>
                                  <td className="py-1 text-center font-medium">{i.requestedQty}</td>
                                  <td className="py-1 text-center text-green-600 font-medium">{i.packedQty}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detail.products && detail.products.length > 0 && (
                <div className="mb-4">
                  <p className="font-semibold text-gray-600 text-[10px] uppercase tracking-wide mb-2">Tổng quan hàng hóa cần tập kết</p>
                  <table className="w-full border border-gray-200 rounded overflow-hidden">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-3 py-2 text-gray-700 font-semibold">Mã SP</th>
                        <th className="text-left px-3 py-2 text-gray-700 font-semibold">Tên hàng</th>
                        <th className="text-center px-3 py-2 text-gray-700 font-semibold">Tổng Yêu cầu</th>
                        <th className="text-center px-3 py-2 text-gray-700 font-semibold">Sẵn sàng ở Kho Chính</th>
                        <th className="text-center px-3 py-2 text-gray-700 font-semibold">Cần điều chuyển thêm</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {detail.products.map(p => {
                        const readyQty = p.quantity - (p.requiredTransferQuantity || 0);
                        return (
                          <tr key={p.sku} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono text-gray-500">{p.sku}</td>
                            <td className="px-3 py-2 text-gray-800">{p.name}</td>
                            <td className="px-3 py-2 text-center font-semibold">{p.quantity}</td>
                            <td className={`px-3 py-2 text-center font-semibold ${readyQty > 0 ? 'text-green-600' : 'text-gray-400'}`}>{readyQty}</td>
                            <td className={`px-3 py-2 text-center font-semibold ${p.requiredTransferQuantity > 0 ? 'text-red-500' : 'text-gray-400'}`}>{p.requiredTransferQuantity || 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                {(!detail.products || detail.products.every((p: any) => p.requiredTransferQuantity === undefined || p.requiredTransferQuantity === 0)) ? (
                  <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: PRIMARY }} onClick={() => handleConsolidate(detail.id)}>
                    <ArrowRight className="w-3.5 h-3.5" /> Hoàn tất tập kết
                  </Button>
                ) : (
                  <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: '#7C3AED' }} onClick={() => {
                    const productsToTransfer = (detail.products || []).filter((p: any) => p.requiredTransferQuantity > 0).map((p: any) => ({
                      sku: p.sku, name: p.name, quantity: p.requiredTransferQuantity, transferStatus: '—'
                    }));
                    navigate('/warehouse/transfer/stock-transfer', { state: { prefill: { sourceWarehouse: detail.warehouse, orderId: detail.id, items: productsToTransfer } } });
                  }}>
                    <Truck className="w-3.5 h-3.5" /> Điều chuyển nội bộ
                  </Button>
                )}
                <Button variant="outline" size="sm" className="h-7 text-xs ml-auto" onClick={() => setDetail(null)}>Đóng</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
