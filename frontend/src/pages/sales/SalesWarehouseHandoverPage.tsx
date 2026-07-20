import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Search, Eye, RefreshCw, Download, CheckCircle2, ShieldCheck, CheckCircle, Package2, Clock, AlertTriangle, Truck, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/sales-ui/dialog';
import { getWarehouseOrders, handoverWarehouseOrder } from '../../services/warehouseService';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#D97706';
const ERROR   = '#DC2626';
const INFO    = '#2563EB';
const NEUTRAL = '#64748B';

const STATUS_CFG: Record<string, { label: string; bg: string }> = {
  waiting_warehouse: { label: 'Chờ kho xác nhận',  bg: WARNING },
  waiting_sales:     { label: 'Chờ Sales xác nhận',bg: INFO    },
  completed:         { label: 'Đã hoàn tất',       bg: SUCCESS },
  cancelled:         { label: 'Đã hủy',            bg: ERROR   },
};

interface Handover {
  id: string; fulfillmentId: string; warehouseStaff: string; salesStaff: string;
  vehicle: string; packageCount: number;
  warehouseConfirmed: boolean; salesConfirmed: boolean;
  handoverTime: string;
  status: 'waiting_warehouse' | 'waiting_sales' | 'completed' | 'cancelled';
  packages: { boxNo: string; weight: string; items: string }[];
  notes: string;
  timeline: { time: string; event: string; user: string }[];
}

function Badge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || { label: status, bg: NEUTRAL };
  return <span className="text-[10px] font-semibold text-white px-2 py-0.5 inline-block whitespace-nowrap" style={{ backgroundColor: c.bg, borderRadius: 4 }}>{c.label}</span>;
}

function SignaturePad({ title, onSign, onClear }: { title: string, onSign: (base64: string) => void, onClear: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSig, setHasSig] = useState(false);

  const getPos = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      return { 
        x: (e.touches[0].clientX - rect.left) * scaleX, 
        y: (e.touches[0].clientY - rect.top) * scaleY 
      };
    }
    return { 
      x: ((e as React.MouseEvent).clientX - rect.left) * scaleX, 
      y: ((e as React.MouseEvent).clientY - rect.top) * scaleY 
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasSig(true);
  };

  const stopDraw = () => {
    setIsDrawing(false);
    if (hasSig) {
      onSign(canvasRef.current?.toDataURL('image/png') || '');
    }
  };

  const clearCanvas = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    setHasSig(false);
    onClear();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-700 text-xs">{title}</span>
        {hasSig && <button onClick={clearCanvas} className="text-[10px] text-red-500 hover:underline">Xóa</button>}
      </div>
      <div className="border border-gray-300 rounded bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          width={280}
          height={120}
          className="cursor-crosshair bg-gray-50/50 touch-none w-full"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
      </div>
    </div>
  );
}

export default function SalesWarehouseHandoverPage() {
  const [data, setData] = useState<Handover[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<Handover | null>(null);
  const [warehouseSig, setWarehouseSig] = useState('');
  const [salesSig, setSalesSig] = useState('');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const result = await getWarehouseOrders('Handover');
      const mapped = result.map((d: any) => {
        let status = 'waiting_warehouse';
        if (d.status === 'HandedOver') status = 'completed';
        else if (d.warehouseConfirmed && d.salesConfirmed) status = 'completed';
        else if (d.warehouseConfirmed) status = 'waiting_sales';

        return {
          id: d.orderId,
          fulfillmentId: d.orderCode,
          warehouseStaff: 'Kho',
          salesStaff: 'Sales',
          vehicle: 'Xe giao hàng',
          packageCount: d.totalQuantity,
          warehouseConfirmed: d.warehouseConfirmed,
          salesConfirmed: d.salesConfirmed,
          handoverTime: '',
          status,
          packages: [],
          notes: '',
          timeline: []
        };
      });
      setData(mapped);
    } catch (e: any) {
      alert('Không lấy được danh sách bàn giao: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleHandover = async () => {
    if (!detail) return;
    if (!salesSig) {
      alert('Vui lòng nhập chữ ký của Sales.');
      return;
    }
    
    try {
      await handoverWarehouseOrder(detail.id, null, salesSig);
      alert('Đã xác nhận chữ ký Sales thành công!');
      setDetail(null);
      setWarehouseSig('');
      setSalesSig('');
      fetchOrders();
    } catch (e: any) {
      alert('Lỗi: ' + e.message);
    }
  };

  const filtered = data.filter(d => {
    const q = search.toLowerCase();
    const ms = !q || d.id.toLowerCase().includes(q) || d.fulfillmentId.toLowerCase().includes(q);
    const mst = statusFilter === 'all' || d.status === statusFilter;
    return ms && mst;
  });

  const STATS = [
    { label: 'Chờ kho XN',  value: data.filter(d => d.status === 'waiting_warehouse').length, icon: <Clock className="w-4 h-4" />, color: WARNING },
    { label: 'Chờ Sales XN',value: data.filter(d => d.status === 'waiting_sales').length,     icon: <ShieldCheck className="w-4 h-4" />, color: INFO },
    { label: 'Đã hoàn tất', value: data.filter(d => d.status === 'completed').length,         icon: <CheckCircle className="w-4 h-4" />, color: SUCCESS },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] mb-0.5">
          <span className="text-gray-400">Giao hàng</span> <span className="text-gray-300">/</span> <span className="text-gray-800 font-semibold">Bàn giao từ Kho</span>
        </div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Quản lý Bàn giao hàng hóa</h2>
            <p className="text-xs text-gray-500 mt-0.5">{data.length} phiếu chờ xử lý</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={fetchOrders}><RefreshCw className="w-3 h-3" /> Làm mới</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"><Download className="w-3 h-3" /> Xuất Excel</Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
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
            <Input className="pl-8 h-7 text-xs bg-gray-50" placeholder="Mã biên bản, lệnh xuất..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5"><input type="checkbox" className="w-3.5 h-3.5" checked={selected.length === filtered.length && filtered.length > 0} onChange={e => setSelected(e.target.checked ? filtered.map(d => d.id) : [])} /></th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Mã bàn giao</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Mã lệnh xuất</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Xe & Tuyến</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Tổng kiện</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">NV Kho XN</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Sales XN</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Trạng thái</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center"><div className="flex flex-col items-center gap-2"><div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><Truck className="w-5 h-5 text-gray-400" /></div><p className="text-sm font-medium text-gray-500">{loading ? 'Đang tải...' : 'Không có phiếu bàn giao'}</p></div></td></tr>
              ) : filtered.map((d, i) => (
                <tr key={d.id} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-3 py-2.5"><input type="checkbox" className="w-3.5 h-3.5" checked={selected.includes(d.id)} onChange={e => setSelected(prev => e.target.checked ? [...prev, d.id] : prev.filter(x => x !== d.id))} /></td>
                  <td className="px-3 py-2.5 font-semibold" style={{ color: PRIMARY }}>{d.id}</td>
                  <td className="px-3 py-2.5 text-gray-600">{d.fulfillmentId}</td>
                  <td className="px-3 py-2.5 text-gray-700">{d.vehicle}</td>
                  <td className="px-3 py-2.5 text-center font-semibold text-gray-800">{d.packageCount}</td>
                  <td className="px-3 py-2.5 text-center">{d.warehouseConfirmed ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /> : <Clock className="w-4 h-4 text-orange-400 mx-auto" />}</td>
                  <td className="px-3 py-2.5 text-center">{d.salesConfirmed ? <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" /> : <Clock className="w-4 h-4 text-orange-400 mx-auto" />}</td>
                  <td className="px-3 py-2.5 text-center"><Badge status={d.status} /></td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" onClick={() => setDetail(d)}><Eye className="w-3.5 h-3.5" /></button>
                      <button className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600" title="Bàn giao (Xác nhận kép)" onClick={() => { setDetail(d); setWarehouseSig(''); setSalesSig(''); }}><ShieldCheck className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Chi tiết bàn giao</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded p-3 space-y-1.5">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Thông tin chung</p>
                  <div className="flex justify-between"><span className="text-gray-500">Mã đơn hàng:</span><span className="font-semibold" style={{ color: PRIMARY }}>{detail.id}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Mã lệnh xuất:</span><span className="font-medium">{detail.fulfillmentId}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Trạng thái:</span><Badge status={detail.status} /></div>
                </div>
                <div className="bg-gray-50 rounded p-3 space-y-1.5">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Xác nhận kép</p>
                  <div className="flex items-center justify-between"><span className="text-gray-500">Kho xác nhận:</span>{detail.warehouseConfirmed ? <span className="text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Đã XN</span> : <span className="text-orange-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Chờ XN</span>}</div>
                  <div className="flex items-center justify-between"><span className="text-gray-500">Sales xác nhận:</span>{detail.salesConfirmed ? <span className="text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Đã XN</span> : <span className="text-orange-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Chờ XN</span>}</div>
                </div>
              </div>
              
              {detail.status !== 'completed' && detail.status !== 'cancelled' && !detail.salesConfirmed && (
                <div className="mt-4">
                  <SignaturePad title="Chữ ký Sales / Người nhận" onSign={setSalesSig} onClear={() => setSalesSig('')} />
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t border-gray-100">
                {detail.status !== 'completed' && detail.status !== 'cancelled' && !detail.salesConfirmed && detail.warehouseConfirmed && (
                  <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: SUCCESS }} onClick={handleHandover}>
                    <ShieldCheck className="w-3.5 h-3.5" /> Xác nhận chữ ký Sales
                  </Button>
                )}
                {!detail.warehouseConfirmed && detail.status !== 'completed' && (
                  <span className="text-sm text-orange-600 font-medium my-auto">Vui lòng chờ Kho ký xác nhận trước...</span>
                )}
                {detail.salesConfirmed && detail.status !== 'completed' && (
                  <span className="text-sm text-green-600 font-medium my-auto">Đã gửi chữ ký Sales. Đợi hoàn tất...</span>
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
