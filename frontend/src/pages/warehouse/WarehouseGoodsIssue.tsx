import { getErrorMessage } from '../../lib/errors';
import { useState, useEffect } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Search, Eye, RefreshCw, Download, ArrowUpFromLine, CheckCircle, Clock, Package2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/sales-ui/dialog';
import { getGoodsIssues, exportGoodsIssueExcel } from '../../services/warehouseService';
import type { GoodsIssue } from '../../types/warehouse';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const ERROR   = '#DC2626';
const WARNING = '#D97706';
const NEUTRAL = '#64748B';

const STATUS_CFG: Record<string, { label: string; bg: string }> = {
  Draft:        { label: 'Nháp',                bg: NEUTRAL },
  ProofPending: { label: 'Chờ ảnh minh chứng',   bg: WARNING },
  ProofUploaded:{ label: 'Đã có ảnh, chờ Post',  bg: WARNING },
  Posted:       { label: 'Đã Post (Trừ TK)',     bg: SUCCESS },
  Cancelled:    { label: 'Đã hủy',               bg: ERROR },
  Reversed:     { label: 'Đã đảo (Reversal)',    bg: NEUTRAL },
};

const TYPE_CFG: Record<string, string> = {
  SalesOrder: 'Bán hàng',
  StockTransfer: 'Điều chuyển kho',
  ProductionMaterial: 'NVL sản xuất',
  Other: 'Khác',
};

function Badge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || { label: status, bg: NEUTRAL };
  return <span className="text-[10px] font-semibold text-white px-2 py-0.5 inline-block whitespace-nowrap" style={{ backgroundColor: c.bg, borderRadius: 4 }}>{c.label}</span>;
}

/**
 * Sổ chứng từ xuất kho — liệt kê TOÀN BỘ GoodsIssue thật (mọi loại: Bán hàng/Điều chuyển kho/
 * NVL sản xuất/Khác) qua GET /api/goods-issues, không còn dựa trên danh sách đơn hàng như trước.
 * Bán hàng + Điều chuyển kho nay được tạo và Post TỰ ĐỘNG ngay khi bàn giao/xuất (xem
 * WarehouseHandover.tsx, WarehouseStockTransfer.tsx) nên trang này chỉ còn vai trò tra cứu +
 * xuất Excel, không còn nút "Post" thủ công cho 2 loại đó. NVL sản xuất/Khác vẫn có thể ở trạng
 * thái chưa Post — bước xử lý tiếp (upload ảnh minh chứng, Post) nằm ở trang "Nguyên vật liệu SX".
 */
export default function WarehouseGoodsIssue() {
  const [data, setData] = useState<GoodsIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detail, setDetail] = useState<GoodsIssue | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchIssues = async () => {
    setLoading(true);
    try {
      const result: GoodsIssue[] = await getGoodsIssues();
      setData(result);
    } catch (e: unknown) {
      alert('Không lấy được danh sách phiếu xuất kho: ' + getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, []);

  const handleExport = async (issue: GoodsIssue) => {
    setExporting(true);
    try {
      await exportGoodsIssueExcel(issue.id, issue.code);
    } catch (e: unknown) {
      alert('Lỗi khi xuất Excel: ' + getErrorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  const filtered = data.filter(d => {
    const q = search.toLowerCase();
    const ms = !q || d.code.toLowerCase().includes(q) || (d.referenceId || '').toLowerCase().includes(q);
    const mt = typeFilter === 'all' || d.type === typeFilter;
    const mst = statusFilter === 'all' || d.status === statusFilter;
    return ms && mt && mst;
  });

  const STATS = [
    { label: 'Đã Post', value: data.filter(d => d.status === 'Posted').length, icon: <CheckCircle className="w-4 h-4" />, color: SUCCESS },
    { label: 'Chờ xử lý', value: data.filter(d => ['Draft', 'ProofPending', 'ProofUploaded'].includes(d.status)).length, icon: <Clock className="w-4 h-4" />, color: WARNING },
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
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={fetchIssues}><RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Làm mới</Button>
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
            <Input className="pl-8 h-7 text-xs bg-gray-50" placeholder="Mã phiếu, mã tham chiếu..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">Tất cả loại xuất</option>
            {Object.entries(TYPE_CFG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
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
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Mã chứng từ (GI)</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Loại xuất</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Kho xuất</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Người xuất</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Tổng SL</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Ngày tạo</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Trạng thái</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center"><div className="flex flex-col items-center gap-2"><div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><Package2 className="w-5 h-5 text-gray-400" /></div><p className="text-sm font-medium text-gray-500">{loading ? 'Đang tải...' : 'Không có chứng từ'}</p></div></td></tr>
              ) : filtered.map((d, i) => (
                <tr key={d.id} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-3 py-2.5 font-semibold" style={{ color: PRIMARY }}>{d.code}</td>
                  <td className="px-3 py-2.5 text-gray-700">{TYPE_CFG[d.type] || d.type}</td>
                  <td className="px-3 py-2.5 text-gray-700">{d.warehouseName}</td>
                  <td className="px-3 py-2.5 text-gray-700">{d.issuedByName}</td>
                  <td className="px-3 py-2.5 text-center font-semibold text-gray-800">{d.items.reduce((s, it) => s + it.quantity, 0)}</td>
                  <td className="px-3 py-2.5 text-gray-500">{new Date(d.createdAt).toLocaleString('vi-VN')}</td>
                  <td className="px-3 py-2.5 text-center"><Badge status={d.status} /></td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" onClick={() => setDetail(d)}><Eye className="w-3.5 h-3.5" /></button>
                      {d.status === 'Posted' && (
                        <button className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600" title="Xuất Excel" onClick={() => handleExport(d)}><Download className="w-3.5 h-3.5" /></button>
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
                  <div className="flex justify-between"><span className="text-gray-500">Mã chứng từ:</span><span className="font-semibold" style={{ color: PRIMARY }}>{detail.code}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Kho xuất:</span><span className="font-medium">{detail.warehouseName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Người xuất:</span><span className="font-medium">{detail.issuedByName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Trạng thái:</span><Badge status={detail.status} /></div>
                </div>
                <div className="bg-gray-50 rounded p-3 space-y-1.5">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Thông tin xuất</p>
                  <div className="flex justify-between"><span className="text-gray-500">Loại xuất:</span><span className="font-semibold text-gray-800">{TYPE_CFG[detail.type] || detail.type}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Ngày tạo:</span><span className="font-medium">{new Date(detail.createdAt).toLocaleString('vi-VN')}</span></div>
                  {detail.note && <div className="flex justify-between"><span className="text-gray-500">Ghi chú:</span><span className="font-medium text-right">{detail.note}</span></div>}
                </div>
              </div>

              <div>
                <p className="font-semibold text-gray-600 text-[10px] uppercase tracking-wide mb-2">Danh sách hàng hóa</p>
                <table className="w-full border border-gray-200 rounded overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-2 text-gray-700 font-semibold">Mã SP/NVL</th>
                      <th className="text-left px-3 py-2 text-gray-700 font-semibold">Tên hàng</th>
                      <th className="text-center px-3 py-2 text-gray-700 font-semibold">SL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {detail.items.map(item => (
                      <tr key={item.id}>
                        <td className="px-3 py-2 font-mono text-gray-500">{item.itemSku}</td>
                        <td className="px-3 py-2 text-gray-800">{item.itemName}</td>
                        <td className="px-3 py-2 text-center font-semibold">{item.quantity} {item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {['Draft', 'ProofPending', 'ProofUploaded'].includes(detail.status) && (
                <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                  Chứng từ chưa Post — vào mục &quot;Nguyên vật liệu SX&quot; để tải ảnh minh chứng và Post phiếu này.
                </p>
              )}

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                {detail.status === 'Posted' && (
                  <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: SUCCESS }} disabled={exporting} onClick={() => handleExport(detail)}>
                    <ArrowUpFromLine className="w-3.5 h-3.5" /> {exporting ? 'Đang xuất...' : 'Xuất Excel'}
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
