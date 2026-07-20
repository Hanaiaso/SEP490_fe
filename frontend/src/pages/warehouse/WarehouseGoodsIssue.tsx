import React, { useState, useEffect } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Search, Eye, RefreshCw, Download, ArrowUpFromLine, CheckCircle, Package2, ShieldCheck, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/sales-ui/dialog';
import { getWarehouseOrders, postGoodsIssueWarehouseOrder } from '../../services/warehouseService';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#D97706';
const ERROR   = '#DC2626';
const INFO    = '#2563EB';
const NEUTRAL = '#64748B';

const STATUS_CFG: Record<string, { label: string; bg: string }> = {
  draft:     { label: 'Nháp',             bg: NEUTRAL },
  ready:     { label: 'Sẵn sàng Post',    bg: INFO },
  posted:    { label: 'Đã Post (Trừ TK)', bg: SUCCESS },
  cancelled: { label: 'Đã hủy',           bg: ERROR },
};

interface GoodsIssue {
  id: string; 
  fulfillmentId: string;
  orderId: string;
  warehouse: string;
  type: string;
  creator: string;
  totalQuantity: number;
  status: 'draft' | 'ready' | 'posted' | 'cancelled';
  createdAt: string;
  postedAt: string;
  items: { sku: string; name: string; qty: number; actualQty: number; unit: string }[];
  proofImage: string;
  notes: string;
}

function Badge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || { label: status, bg: NEUTRAL };
  return <span className="text-[10px] font-semibold text-white px-2 py-0.5 inline-block whitespace-nowrap" style={{ backgroundColor: c.bg, borderRadius: 4 }}>{c.label}</span>;
}

export default function WarehouseGoodsIssue() {
  const [data, setData] = useState<GoodsIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<GoodsIssue | null>(null);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const result = await getWarehouseOrders('GoodsIssue');
      const mapped = result.map((d: any) => ({
        id: 'GI-' + d.orderCode,
        fulfillmentId: d.orderCode,
        orderId: d.orderId,
        warehouse: 'Kho Chính',
        type: 'Xuất Bán Hàng',
        creator: 'Hệ thống',
        totalQuantity: d.totalQuantity,
        status: 'ready',
        createdAt: new Date(d.confirmedAt).toLocaleString('vi-VN'),
        postedAt: '',
        items: [],
        proofImage: '',
        notes: ''
      }));
      setData(mapped);
    } catch (e: any) {
      alert('Không lấy được danh sách Phiếu Xuất: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handlePost = async (orderId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn POST phiếu xuất này không? Hành động này sẽ trừ tồn kho vĩnh viễn và không thể hoàn tác.')) return;
    try {
      await postGoodsIssueWarehouseOrder(orderId);
      alert('Phát hành phiếu xuất và trừ tồn kho thành công!');
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
    return ms && mst;
  });

  const STATS = [
    { label: 'Sẵn sàng Post', value: data.filter(d => d.status === 'ready').length,  icon: <Package2 className="w-4 h-4" />, color: INFO },
    { label: 'Đã Post',       value: data.filter(d => d.status === 'posted').length, icon: <CheckCircle className="w-4 h-4" />, color: SUCCESS },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] mb-0.5">
          <span className="text-gray-400">Kho hàng</span> <span className="text-gray-300">/</span> <span className="text-gray-400">Xuất kho (Outbound)</span> <span className="text-gray-300">/</span> <span className="text-gray-800 font-semibold">Phiếu xuất kho</span>
        </div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Phiếu xuất kho (Goods Issue)</h2>
            <p className="text-xs text-gray-500 mt-0.5">{data.length} chứng từ</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={fetchOrders}><RefreshCw className="w-3 h-3" /> Làm mới</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"><Download className="w-3 h-3" /> Xuất Excel</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3 max-w-sm">
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
            <Input className="pl-8 h-7 text-xs bg-gray-50" placeholder="Mã phiếu xuất, lệnh xuất..." value={search} onChange={e => setSearch(e.target.value)} />
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
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Mã chứng từ (GI)</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Tham chiếu</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Loại xuất</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Kho xuất</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Tổng SL</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Ngày tạo</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Trạng thái</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center"><div className="flex flex-col items-center gap-2"><div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><ArrowUpFromLine className="w-5 h-5 text-gray-400" /></div><p className="text-sm font-medium text-gray-500">{loading ? 'Đang tải...' : 'Không có chứng từ'}</p></div></td></tr>
              ) : filtered.map((d, i) => (
                <tr key={d.id} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-3 py-2.5"><input type="checkbox" className="w-3.5 h-3.5" checked={selected.includes(d.id)} onChange={e => setSelected(prev => e.target.checked ? [...prev, d.id] : prev.filter(x => x !== d.id))} /></td>
                  <td className="px-3 py-2.5 font-semibold" style={{ color: PRIMARY }}>{d.id}</td>
                  <td className="px-3 py-2.5 text-gray-600">{d.fulfillmentId}</td>
                  <td className="px-3 py-2.5 text-gray-700">{d.type}</td>
                  <td className="px-3 py-2.5 text-gray-700">{d.warehouse}</td>
                  <td className="px-3 py-2.5 text-center font-semibold text-gray-800">{d.totalQuantity}</td>
                  <td className="px-3 py-2.5 text-gray-500">{d.createdAt}</td>
                  <td className="px-3 py-2.5 text-center"><Badge status={d.status} /></td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" onClick={() => setDetail(d)}><Eye className="w-3.5 h-3.5" /></button>
                      {d.status === 'ready' && (
                        <button className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600" title="Post (Trừ kho)" onClick={() => handlePost(d.orderId)}><ArrowUpFromLine className="w-3.5 h-3.5" /></button>
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
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Chi tiết Phiếu xuất kho</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded p-3 space-y-1.5">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Thông tin chung</p>
                  <div className="flex justify-between"><span className="text-gray-500">Mã chứng từ:</span><span className="font-semibold" style={{ color: PRIMARY }}>{detail.id}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Tham chiếu:</span><span className="font-medium">{detail.fulfillmentId}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Trạng thái:</span><Badge status={detail.status} /></div>
                </div>
                <div className="bg-gray-50 rounded p-3 space-y-1.5">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Thông tin xuất</p>
                  <div className="flex justify-between"><span className="text-gray-500">Loại xuất:</span><span className="font-semibold text-gray-800">{detail.type}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Tổng SL:</span><span className="font-semibold">{detail.totalQuantity}</span></div>
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                {detail.status === 'ready' && (
                  <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: SUCCESS }} onClick={() => handlePost(detail.orderId)}>
                    <ArrowUpFromLine className="w-3.5 h-3.5" /> Post Phiếu Xuất (Trừ kho)
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
