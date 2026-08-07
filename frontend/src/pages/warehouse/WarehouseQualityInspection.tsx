import { useState, useEffect } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Search, Eye, RefreshCw, CheckCircle, XCircle, AlertTriangle, Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/sales-ui/dialog';
import { getQuarantineList, dispatchQuarantine } from '../../services/warehouseService.js';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#D97706';
const ERROR   = '#DC2626';
const NEUTRAL = '#64748B';

const STATUS_CFG: Record<string, { label: string; bg: string }> = {
  waiting:   { label: 'Chờ kiểm tra',    bg: NEUTRAL },
  available: { label: 'Đạt yêu cầu',     bg: SUCCESS },
  damaged:   { label: 'Không đạt (Lỗi)', bg: ERROR   },
};

interface InspectionItem {
  id: string; // quarantineId
  quarantineCode: string;
  sku: string; 
  product: string; 
  quantity: number;
  status: 'waiting' | 'available' | 'damaged';
  inspectionDate: string;
  notes: string;
}

function Badge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || { label: status, bg: NEUTRAL };
  return <span className="text-[10px] font-semibold text-white px-2 py-0.5 inline-block whitespace-nowrap" style={{ backgroundColor: c.bg, borderRadius: 4 }}>{c.label}</span>;
}

export default function WarehouseQualityInspection() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [detail, setDetail] = useState<InspectionItem | null>(null);
  const [items, setItems] = useState<InspectionItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Custom UI Modal Confirmation State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    actionType: 'approve' | 'reject';
    item: InspectionItem;
  } | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getQuarantineList();
      const mapped = data.map((d: any) => ({
        id: d.id,
        quarantineCode: d.quarantineCode,
        sku: d.sku || '-',
        product: d.productName || '-',
        quantity: d.quantity,
        status: d.status?.toLowerCase() === 'waiting' ? 'waiting' : d.dispatchedAction || 'waiting',
        inspectionDate: d.createdAt ? new Date(d.createdAt).toLocaleString('vi-VN') : '',
        notes: d.notes || ''
      }));
      setItems(mapped);
    } catch (err: any) {
      showToast('Lỗi lấy danh sách cách ly: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = items.filter(d => {
    const q = search.toLowerCase();
    const ms = !q || d.quarantineCode.toLowerCase().includes(q) || d.sku.toLowerCase().includes(q) || d.product.toLowerCase().includes(q);
    return ms && (statusFilter === 'all' || d.status === statusFilter);
  });

  const promptApprove = (item: InspectionItem) => {
    setConfirmState({
      isOpen: true,
      title: 'Xác nhận Đạt Chất Lượng',
      message: `Bạn có chắc chắn muốn xác nhận mã hàng ${item.quarantineCode} đạt yêu cầu chất lượng và nhập vào Kho Tồn Khai Thác?`,
      actionType: 'approve',
      item
    });
  };

  const promptReject = (item: InspectionItem) => {
    setConfirmState({
      isOpen: true,
      title: 'Xác nhận Hàng Lỗi / Trả NCC',
      message: `Bạn có chắc chắn muốn xác nhận mã hàng ${item.quarantineCode} không đạt chất lượng và chuyển trạng thái Lỗi (Xuất trả NCC)?`,
      actionType: 'reject',
      item
    });
  };

  const handleExecuteAction = async () => {
    if (!confirmState) return;
    const { actionType, item } = confirmState;
    setConfirmState(null);
    setLoading(true);

    try {
      await dispatchQuarantine(item.id, actionType === 'approve' ? 'available' : 'damaged');
      showToast(
        actionType === 'approve'
          ? `Đã xác nhận ${item.quarantineCode} đạt yêu cầu và chuyển vào kho tồn thành công!`
          : `Đã ghi nhận ${item.quarantineCode} lỗi và tạo yêu cầu xuất trả NCC!`,
        'success'
      );
      setDetail(null);
      await loadData();
    } catch (err: any) {
      showToast('Lỗi xử lý: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-top-2 transition-all ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {toast.type === 'success' ? <Check className="w-4 h-4 text-emerald-600" /> : <X className="w-4 h-4 text-rose-600" />}
          <span>{toast.text}</span>
        </div>
      )}

      <div className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] mb-0.5">
          <span className="text-gray-400">Kho hàng</span><span className="text-gray-400">/</span><span className="text-gray-400">Nhập kho (Inbound)</span><span className="text-gray-400">/</span><span className="text-gray-800 font-semibold">Kiểm tra chất lượng</span>
        </div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Kiểm tra chất lượng (Quality Inspection)</h2>
            <p className="text-xs text-gray-500 mt-0.5">{items.length} lệnh kiểm tra · {items.filter(i => i.status === 'waiting').length} đang xử lý</p>
          </div>
          <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={loadData} disabled={loading}><RefreshCw className="w-3 h-3" /> Làm mới</Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input className="pl-8 h-7 text-xs bg-gray-50" placeholder="Mã kiểm tra, SKU, sản phẩm..." value={search} onChange={e => setSearch(e.target.value)} />
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
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Mã cách ly (Quarantine)</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">SKU</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Sản phẩm</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Số lượng</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Ngày tạo phiếu</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Trạng thái</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={12} className="py-12 text-center"><div className="flex flex-col items-center gap-2"><div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><span className="text-gray-400 text-xl">📋</span></div><p className="text-sm font-medium text-gray-500">Không có dữ liệu</p><p className="text-xs text-gray-400">Thay đổi bộ lọc để xem kết quả khác</p></div></td></tr>
              )}
              {filtered.map((d, i) => (
                <tr key={d.id} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-3 py-2.5 font-semibold" style={{ color: PRIMARY }}>{d.quarantineCode}</td>
                  <td className="px-3 py-2.5 font-mono text-gray-500">{d.sku}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-800">{d.product}</td>
                  <td className="px-3 py-2.5 text-center font-semibold">{d.quantity}</td>
                  <td className="px-3 py-2.5 text-gray-500">{d.inspectionDate}</td>
                  <td className="px-3 py-2.5 text-center"><Badge status={d.status} /></td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" onClick={() => setDetail(d)} title="Xem chi tiết"><Eye className="w-3.5 h-3.5" /></button>
                      {d.status === 'waiting' && (
                        <>
                          <button className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600" onClick={() => promptApprove(d)} title="Duyệt đạt (Về kho tồn)"><CheckCircle className="w-3.5 h-3.5" /></button>
                          <button className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600" onClick={() => promptReject(d)} title="Lỗi (Báo NCC)"><XCircle className="w-3.5 h-3.5" /></button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <span className="text-xs text-gray-500">Hiển thị {filtered.length} / {items.length} bản ghi</span>
            <button className="w-6 h-6 text-xs rounded font-medium text-white flex items-center justify-center" style={{ backgroundColor: PRIMARY }}>1</button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Chi tiết kiểm tra — {detail?.quarantineCode || detail?.id}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded p-3 space-y-1.5 border border-gray-100">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Thông tin kiểm tra</p>
                  <div className="flex justify-between"><span className="text-gray-500">Mã kiểm tra:</span><span className="font-semibold" style={{ color: PRIMARY }}>{detail.quarantineCode}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">SKU:</span><span className="font-mono">{detail.sku}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Sản phẩm:</span><span className="font-medium text-gray-800">{detail.product}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Số lượng:</span><span className="font-semibold">{detail.quantity}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Ngày kiểm:</span><span>{detail.inspectionDate}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Trạng thái:</span><Badge status={detail.status} /></div>
                </div>
                <div className="bg-gray-50 rounded p-3 space-y-1.5 border border-gray-100">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Kết quả kiểm tra</p>
                  {detail.notes ? (
                    <div className="space-y-1"><span className="text-gray-500">Ghi chú:</span><p className="text-gray-700 mt-0.5">{detail.notes}</p></div>
                  ) : (
                    <p className="text-gray-400 italic">Chưa có ghi chú kiểm tra thêm.</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                {detail.status === 'waiting' && (
                  <>
                    <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: SUCCESS }} onClick={() => promptApprove(detail)}><CheckCircle className="w-3.5 h-3.5" /> Đạt (Chuyển sang Tồn kho)</Button>
                    <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: ERROR }} onClick={() => promptReject(detail)}><XCircle className="w-3.5 h-3.5" /> Lỗi (Trả NCC)</Button>
                  </>
                )}
                <Button variant="outline" size="sm" className="h-7 text-xs ml-auto" onClick={() => setDetail(null)}>Đóng</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modern UI Confirm Modal */}
      {confirmState && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                confirmState.actionType === 'approve' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'
              }`}>
                {confirmState.actionType === 'approve' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">{confirmState.title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">Mã phiếu: <span className="font-semibold text-gray-800">{confirmState.item.quarantineCode}</span></p>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-xs text-gray-700 leading-relaxed">
              {confirmState.message}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmState(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleExecuteAction}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all ${
                  confirmState.actionType === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {confirmState.actionType === 'approve' ? 'Đồng Ý Nhập Kho Tồn' : 'Xác Nhận Xuất Trả NCC'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
