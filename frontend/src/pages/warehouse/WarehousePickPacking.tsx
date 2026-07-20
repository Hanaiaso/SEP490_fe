import React, { useState, useRef } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Search, Eye, Download, RefreshCw, Play, CheckCircle, Printer, Upload, X, Package, Save } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/sales-ui/dialog';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#D97706';
const ERROR   = '#DC2626';
const INFO    = '#2563EB';
const NEUTRAL = '#64748B';
const PURPLE  = '#7C3AED';

const STATUS_CFG: Record<string, { label: string; bg: string }> = {
  waiting:   { label: 'Chờ picking',     bg: NEUTRAL },
  picking:   { label: 'Đang picking',    bg: INFO    },
  picked:    { label: 'Đã pick xong',    bg: '#0891B2' },
  packing:   { label: 'Đang packing',    bg: PURPLE  },
  completed: { label: 'Hoàn tất',        bg: SUCCESS },
  cancelled: { label: 'Đã hủy',          bg: ERROR   },
};

interface PickItem {
  sku: string; name: string; aisle: string; rack: string; shelf: string; bin: string;
  barcode: string; batch: string; lot: string;
  requestedQty: number; pickedQty: number;
  productId: string; evidenceUrl?: string;
}

interface PickTask {
  id: string; fulfillmentId: string; warehouse: string; picker: string; orderCode: string;
  priority: 'urgent' | 'high' | 'normal';
  totalItems: number; pickedItems: number; packingStatus: string;
  startedTime: string; completedTime: string;
  status: 'waiting' | 'picking' | 'picked' | 'packing' | 'completed' | 'cancelled';
  boxCount: number; weight: string; packingNotes: string; orderProgress: number;
  items: PickItem[];
}

const TASKS: PickTask[] = []; // Replaced by API call

function Breadcrumb() {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-0.5">
      <span className="text-gray-400">Kho hàng</span>
      <span className="text-gray-300">/</span>
      <span className="text-gray-400">Xuất kho (Outbound)</span>
      <span className="text-gray-300">/</span>
      <span className="text-gray-800 font-semibold">Pick &amp; Packing</span>
    </div>
  );
}

function Badge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || { label: status, bg: NEUTRAL };
  return <span className="text-[10px] font-semibold text-white px-2 py-0.5 inline-block whitespace-nowrap" style={{ backgroundColor: c.bg, borderRadius: 4 }}>{c.label}</span>;
}

function PriBadge({ p }: { p: string }) {
  const m: Record<string, { label: string; bg: string }> = {
    urgent: { label: 'Khẩn cấp', bg: ERROR },
    high:   { label: 'Cao',      bg: WARNING },
    normal: { label: 'Thường',   bg: NEUTRAL },
  };
  const c = m[p] || m.normal;
  return <span className="text-[10px] font-semibold text-white px-2 py-0.5 inline-block whitespace-nowrap" style={{ backgroundColor: c.bg, borderRadius: 4 }}>{c.label}</span>;
}

export default function WarehousePickPacking() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<PickTask | null>(null);
  const [tasks, setTasks] = useState<PickTask[]>([]);
  const [loading, setLoading] = useState(false);

  const [uploadingTask, setUploadingTask] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const { getPickTasks } = await import('../../services/warehouseService.js');
      const data = await getPickTasks('All');
      const mapped: PickTask[] = data.map((d: any) => {
        const tRequested = d.items?.reduce((s:number, i:any) => s + i.requestedQuantity, 0) || 0;
        const tPacked = d.items?.reduce((s:number, i:any) => s + i.packedQuantity, 0) || 0;
        return {
          id: d.pickTaskId,
          orderCode: d.orderCode || '—',
          fulfillmentId: d.pickTaskId.substring(0, 8).toUpperCase(),
          warehouse: d.warehouseName,
          picker: 'Nhân viên kho',
          priority: 'normal',
          totalItems: tRequested,
          pickedItems: tPacked,
          packingStatus: 'Chưa bắt đầu',
          startedTime: '—',
          completedTime: '—',
          status: d.status.toLowerCase() === 'pending' ? 'waiting' : d.status.toLowerCase() === 'picking' ? 'picking' : d.status.toLowerCase() === 'completed' ? 'completed' : 'picking',
          boxCount: 0,
          weight: '0 kg',
          packingNotes: '',
          orderProgress: tRequested > 0 ? Math.round(tPacked * 100 / tRequested) : 0,
          items: d.items?.map((i:any) => ({
            sku: i.sku,
            name: i.productName,
            aisle: 'A1', rack: 'R1', shelf: 'S1', bin: 'B1',
            barcode: i.sku, batch: '-', lot: '-',
            requestedQty: i.requestedQuantity,
            pickedQty: i.packedQuantity,
            productId: i.productId,
            evidenceUrl: i.evidenceImageUrl
          })) || []
        };
      });
      setTasks(mapped);
    } catch (e: any) {
      console.error(e);
      alert('Không thể tải danh sách Pick Task: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchTasks();
  }, []);

  const filtered = tasks.filter(t => {
    const q = search.toLowerCase();
    const ms = !q || t.id.toLowerCase().includes(q) || t.fulfillmentId.toLowerCase().includes(q) || t.picker.toLowerCase().includes(q);
    const mst = statusFilter === 'all' || t.status === statusFilter;
    return ms && mst;
  });

  const toggleSelect = (id: string) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map(t => t.id));

  const updateStatus = (id: string, status: PickTask['status']) => {
    setTasks(p => p.map(t => t.id === id ? { ...t, status } : t));
    setDetail(prev => prev?.id === id ? { ...prev, status } : prev);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingTask || !detail) return;
    try {
      const { updateItemPickProgress } = await import('../../services/warehouseService.js');
      const item = detail.items.find(i => i.productId === uploadingTask);
      if (!item) return;

      await updateItemPickProgress(detail.id, uploadingTask, item.pickedQty, file);
      alert('Tải ảnh bằng chứng thành công!');
      
      setDetail({
        ...detail,
        items: detail.items.map(i => i.productId === uploadingTask ? { ...i, evidenceUrl: 'uploaded' } : i)
      });
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tải ảnh');
    } finally {
      setUploadingTask(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSaveProgress = async () => {
    if (!detail) return;
    try {
      const { updateItemPickProgress } = await import('../../services/warehouseService.js');
      for (const item of detail.items) {
        await updateItemPickProgress(detail.id, item.productId, item.pickedQty, null);
      }
      alert('Lưu tiến độ thành công!');
      fetchTasks();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu tiến độ');
    }
  };

  const handleCompletePick = async () => {
    if (!detail) return;
    try {
      const { completePickTask, updateItemPickProgress } = await import('../../services/warehouseService.js');
      // Auto-save progress first
      for (const item of detail.items) {
        await updateItemPickProgress(detail.id, item.productId, item.pickedQty, null);
      }
      
      await completePickTask(detail.id);
      alert('Hoàn tất Pick Task thành công!');
      updateStatus(detail.id, 'picked');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi hoàn tất Pick Task');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
        <Breadcrumb />
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Pick &amp; Packing</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {tasks.length} tác vụ · {tasks.filter(t => t.status === 'picking').length} đang picking
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={fetchTasks}><RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Làm mới</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"><Download className="w-3 h-3" /> Xuất Excel</Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input className="pl-8 h-7 text-xs bg-gray-50" placeholder="Mã pick, mã lệnh, người pick..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)}>
            <option value="">Tất cả kho</option>
            <option>Kho Hà Nội</option>
            <option>Kho HCM</option>
            <option>Kho Đà Nẵng</option>
          </select>
          <input type="date" className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="Từ ngày" />
          <input type="date" className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={dateTo} onChange={e => setDateTo(e.target.value)} title="Đến ngày" />
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        {selected.length > 0 && (
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded px-3 py-2 mb-2 flex items-center gap-2 text-xs">
            <span className="font-semibold text-blue-700">Đã chọn {selected.length} tác vụ</span>
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100">Bắt đầu Picking</button>
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100">Hoàn tất Picking</button>
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100 ml-auto" onClick={() => setSelected([])}>Hủy chọn</button>
          </div>
        )}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} className="w-3.5 h-3.5" /></th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Mã Pick Task</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Mã đơn hàng</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Mã lệnh</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Tên kho chứa</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Tiến độ</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Bắt đầu</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Hoàn tất</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Trạng thái</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><Package className="w-5 h-5 text-gray-400" /></div>
                    <p className="text-sm font-medium text-gray-500">Không có Pick Task</p>
                    <p className="text-xs text-gray-400">Thay đổi bộ lọc để xem kết quả khác</p>
                  </div>
                </td></tr>
              )}
              {filtered.map((t, i) => (
                <tr key={t.id} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-3 py-2.5"><input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggleSelect(t.id)} className="w-3.5 h-3.5" /></td>
                  <td className="px-3 py-2.5 font-semibold" style={{ color: PRIMARY }}>{t.id}</td>
                  <td className="px-3 py-2.5 font-semibold text-gray-800">{t.orderCode}</td>
                  <td className="px-3 py-2.5 text-gray-600">{t.fulfillmentId}</td>
                  <td className="px-3 py-2.5 text-gray-700">{t.warehouse}</td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${t.orderProgress}%`, backgroundColor: SUCCESS }} />
                      </div>
                      <span className="text-gray-600 font-mono text-[10px]">{t.orderProgress}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500">{t.startedTime}</td>
                  <td className="px-3 py-2.5 text-gray-500">{t.completedTime}</td>
                  <td className="px-3 py-2.5 text-center"><Badge status={t.status} /></td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" onClick={async () => {
                        try {
                          const { getPickTaskById } = await import('../../services/warehouseService.js');
                          const data = await getPickTaskById(t.id);
                          const mappedItems = data.items.map((i: any) => ({
                            sku: i.sku,
                            name: i.productName,
                            aisle: 'A', rack: '01', shelf: '1', bin: '01',
                            barcode: '—', batch: '—', lot: '—',
                            requestedQty: i.requestedQuantity,
                            pickedQty: i.packedQuantity || 0,
                            productId: i.productId,
                            evidenceUrl: i.evidenceImageUrl
                          }));
                          setDetail({ ...t, 
                            items: mappedItems, 
                            orderProgress: data.orderProgress || 0,
                            startedTime: data.pickingStartedAt ? new Date(data.pickingStartedAt).toLocaleDateString('vi-VN') : t.startedTime,
                            completedTime: data.pickingCompletedAt ? new Date(data.pickingCompletedAt).toLocaleDateString('vi-VN') : '—'
                          });
                        } catch (e: any) {
                          alert('Lỗi lấy chi tiết task: ' + e.message);
                        }
                      }}><Eye className="w-3.5 h-3.5" /></button>
                      {t.status === 'waiting' && <button className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600" onClick={async () => {
                        try {
                          const { acceptPickTask } = await import('../../services/warehouseService.js');
                          await acceptPickTask(t.id);
                          alert('Nhận Pick Task thành công!');
                          fetchTasks();
                        } catch(e:any) { alert(e.message); }
                      }}><Play className="w-3.5 h-3.5" /></button>}
                      {t.status === 'picking' && <button className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" onClick={() => updateStatus(t.id, 'picked')}><CheckCircle className="w-3.5 h-3.5" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <span className="text-xs text-gray-500">Hiển thị {filtered.length} / {tasks.length} bản ghi</span>
            <div className="flex items-center gap-1">
              <button className="w-6 h-6 text-xs rounded font-medium text-white flex items-center justify-center" style={{ backgroundColor: PRIMARY }}>1</button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Package className="w-4 h-4" style={{ color: PRIMARY }} />
              Chi tiết Pick &amp; Packing — {detail?.id}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded p-3 space-y-1.5">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Thông tin tác vụ</p>
                  <div className="flex justify-between"><span className="text-gray-500">Mã Pick Task:</span><span className="font-semibold" style={{ color: PRIMARY }}>{detail.id}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Mã lệnh xuất:</span><span className="font-medium">{detail.fulfillmentId}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Kho chứa:</span><span>{detail.warehouse}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Trạng thái:</span><Badge status={detail.status} /></div>
                </div>
                <div className="bg-gray-50 rounded p-3 space-y-1.5">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Thông tin picking</p>
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between"><span className="text-gray-500">Tiến độ:</span><span className="font-semibold">{detail.items.reduce((s, i) => s + (i.pickedQty || 0), 0)}/{detail.items.reduce((s, i) => s + i.requestedQty, 0)} items</span></div>
                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${detail.items.reduce((s, i) => s + i.requestedQty, 0) > 0 ? (detail.items.reduce((s, i) => s + (i.pickedQty || 0), 0) * 100 / detail.items.reduce((s, i) => s + i.requestedQty, 0)) : 0}%` }} />
                    </div>
                  </div>
                  <div className="flex justify-between mt-2"><span className="text-gray-500">Bắt đầu:</span><span>{detail.startedTime}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Hoàn tất:</span><span>{detail.completedTime}</span></div>
                </div>
              </div>

              {detail.items.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-600 text-[10px] uppercase tracking-wide mb-2">Danh sách pick</p>
                  <table className="w-full border border-gray-200 rounded overflow-hidden">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-3 py-2 text-gray-700 font-semibold">Mã SP</th>
                        <th className="text-left px-3 py-2 text-gray-700 font-semibold">Sản phẩm</th>
                        <th className="text-center px-3 py-2 text-gray-700 font-semibold">Yêu cầu</th>
                        <th className="text-center px-3 py-2 text-gray-700 font-semibold">Đã đóng gói</th>
                        <th className="text-center px-3 py-2 text-gray-700 font-semibold">Còn lại</th>
                        <th className="text-center px-3 py-2 text-gray-700 font-semibold">Bằng chứng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {detail.items.map(item => {
                        const remaining = item.requestedQty - item.pickedQty;
                        return (
                          <tr key={item.sku} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono text-gray-500">{item.sku}</td>
                            <td className="px-3 py-2 text-gray-800">{item.name}</td>
                            <td className="px-3 py-2 text-center font-semibold">{item.requestedQty}</td>
                            <td className="px-3 py-2 text-center">
                              {detail.status === 'picking' ? (
                                <Input 
                                  type="number" 
                                  min="0" max={item.requestedQty}
                                  className="w-16 h-7 text-center mx-auto text-xs" 
                                  value={item.pickedQty} 
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setDetail({
                                      ...detail,
                                      items: detail.items.map(i => i.sku === item.sku ? { ...i, pickedQty: val > i.requestedQty ? i.requestedQty : val } : i)
                                    });
                                  }}
                                />
                              ) : (
                                <span className="font-semibold" style={{ color: item.pickedQty >= item.requestedQty ? SUCCESS : WARNING }}>{item.pickedQty}</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center font-semibold" style={{ color: remaining > 0 ? ERROR : SUCCESS }}>{remaining}</td>
                            <td className="px-3 py-2 text-center">
                              {detail.status === 'picking' && (
                                <Button size="sm" variant="outline" className="h-6 text-[10px] px-2" onClick={() => {
                                  setUploadingTask(item.productId);
                                  fileInputRef.current?.click();
                                }}>
                                  <Upload className="w-3 h-3 mr-1" /> Tải ảnh
                                </Button>
                              )}
                              {item.evidenceUrl && <span className="text-[10px] text-green-600 ml-1">Đã có ảnh</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                {detail.status === 'waiting' && (
                  <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: PRIMARY }} onClick={async () => {
                    try {
                      const { acceptPickTask } = await import('../../services/warehouseService.js');
                      await acceptPickTask(detail.id);
                      updateStatus(detail.id, 'picking');
                      alert('Bắt đầu Picking thành công!');
                    } catch (e: any) {
                      alert('Lỗi: ' + e.message);
                    }
                  }}>
                    <Play className="w-3.5 h-3.5" /> Bắt đầu Picking
                  </Button>
                )}
                {detail.status === 'picking' && (
                  <>
                    <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleSaveProgress}>
                      <Save className="w-3.5 h-3.5" /> Lưu tiến độ
                    </Button>
                    <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: SUCCESS }} onClick={handleCompletePick}>
                      <CheckCircle className="w-3.5 h-3.5" /> Hoàn tất Picking
                    </Button>
                  </>
                )}
                {(detail.status === 'picked' || detail.status === 'packing') && (
                  <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: PURPLE }} onClick={() => updateStatus(detail.id, 'completed')}>
                    <CheckCircle className="w-3.5 h-3.5" /> Hoàn tất Packing
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
