import { getErrorMessage } from '../../lib/errors';
import { useState, useEffect, useCallback } from 'react';
import { Eye, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../../components/sales-ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/sales-ui/dialog';
import { useToast } from '../../context/ToastContext';
import { getStockAdjustments, decideStockAdjustment } from '../../services/warehouseService';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#D97706';
const ERROR = '#DC2626';
const NEUTRAL = '#64748B';

const STATUS_CFG: Record<string, { label: string; bg: string }> = {
  Pending: { label: 'Chờ duyệt', bg: WARNING },
  Approved: { label: 'Đã duyệt', bg: SUCCESS },
  Rejected: { label: 'Từ chối', bg: ERROR },
};

const TABS = [
  { id: 'Pending', label: 'Chờ duyệt' },
  { id: 'Approved', label: 'Đã duyệt' },
  { id: 'Rejected', label: 'Từ chối' },
  { id: 'all', label: 'Tất cả' },
];

// Khớp StockAdjustmentDto (SEP490_be/VietTien.API/DTOs/Warehouse/StockAdjustmentDtos.cs)
interface StockAdjustment {
  id: string;
  inventoryId: string;
  itemName: string;
  itemSku: string;
  warehouseName: string;
  systemQuantity: number;
  physicalQuantity: number;
  variance: number;
  reason: string;
  status: string;
  proposedByUserId: string;
  proposedByName: string;
  proposedAt: string;
  decidedByUserId?: string | null;
  decidedByName?: string | null;
  decidedAt?: string | null;
  decisionNote?: string | null;
}

function Badge({ status }: { status: string }) {
  const c = STATUS_CFG[status] || { label: status, bg: NEUTRAL };
  return <span className="text-[10px] font-semibold text-white px-2 py-0.5 inline-block whitespace-nowrap" style={{ backgroundColor: c.bg, borderRadius: 4 }}>{c.label}</span>;
}

function formatDate(iso?: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('vi-VN');
}

// P0-1: CEO duyệt/từ chối đề xuất điều chỉnh tồn kho do Warehouse Staff gửi sau khi kiểm kê.
export default function CEOStockAdjustmentPage() {
  const { toast } = useToast();
  const [tab, setTab] = useState<string>('Pending');
  const [items, setItems] = useState<StockAdjustment[]>([]);
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState<StockAdjustment | null>(null);
  const [decisionNote, setDecisionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = tab === 'all' ? undefined : { status: tab };
      const data = await getStockAdjustments(params) as StockAdjustment[];
      setItems(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [tab, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const openDetail = (item: StockAdjustment) => {
    setDetail(item);
    setDecisionNote('');
  };

  const decide = async (decision: 'Approved' | 'Rejected') => {
    if (!detail) return;
    if (decision === 'Rejected' && !decisionNote.trim()) {
      toast.error('Vui lòng nhập ghi chú lý do từ chối.');
      return;
    }
    try {
      setSubmitting(true);
      await decideStockAdjustment(detail.id, { decision, note: decisionNote.trim() || undefined });
      toast.success(decision === 'Approved' ? 'Đã duyệt điều chỉnh tồn kho.' : 'Đã từ chối đề xuất.');
      setDetail(null);
      loadData();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-[24px]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-[20px] text-[#1f3b64]">Duyệt điều chỉnh tồn kho</h1>
          <p className="text-xs text-gray-500 mt-0.5">Đề xuất do Warehouse Staff gửi sau khi kiểm kê thực tế</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={loadData} disabled={loading}>
          <RefreshCw className="w-3.5 h-3.5" /> {loading ? 'Đang tải...' : 'Làm mới'}
        </Button>
      </div>

      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded ${tab === t.id ? 'text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            style={tab === t.id ? { backgroundColor: PRIMARY } : {}}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-600 uppercase">Sản phẩm / Vật tư</th>
              <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-600 uppercase">Kho</th>
              <th className="text-center px-3 py-2.5 text-[11px] font-semibold text-gray-600 uppercase">SL hệ thống</th>
              <th className="text-center px-3 py-2.5 text-[11px] font-semibold text-gray-600 uppercase">SL thực tế</th>
              <th className="text-center px-3 py-2.5 text-[11px] font-semibold text-gray-600 uppercase">Chênh lệch</th>
              <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-600 uppercase">Người đề xuất</th>
              <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-gray-600 uppercase">Ngày đề xuất</th>
              <th className="text-center px-3 py-2.5 text-[11px] font-semibold text-gray-600 uppercase">Trạng thái</th>
              <th className="text-center px-3 py-2.5 text-[11px] font-semibold text-gray-600 uppercase">Chi tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!loading && items.length === 0 && (
              <tr><td colSpan={9} className="p-8 text-center text-gray-400 italic">Không có đề xuất nào</td></tr>
            )}
            {items.map(d => (
              <tr key={d.id} className="hover:bg-gray-50/60">
                <td className="px-3 py-2.5"><p className="font-mono text-gray-500 text-xs">{d.itemSku || '-'}</p><p className="text-gray-800 font-medium">{d.itemName}</p></td>
                <td className="px-3 py-2.5 text-gray-700">{d.warehouseName}</td>
                <td className="px-3 py-2.5 text-center font-semibold">{d.systemQuantity}</td>
                <td className="px-3 py-2.5 text-center font-semibold">{d.physicalQuantity}</td>
                <td className="px-3 py-2.5 text-center font-mono font-semibold" style={{ color: d.variance < 0 ? ERROR : d.variance > 0 ? SUCCESS : NEUTRAL }}>
                  {d.variance > 0 ? '+' : ''}{d.variance}
                </td>
                <td className="px-3 py-2.5 text-gray-700">{d.proposedByName}</td>
                <td className="px-3 py-2.5 text-gray-500">{formatDate(d.proposedAt)}</td>
                <td className="px-3 py-2.5 text-center"><Badge status={d.status} /></td>
                <td className="px-3 py-2.5 text-center">
                  <button className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" onClick={() => openDetail(d)}><Eye className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Chi tiết đề xuất điều chỉnh tồn kho</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-xs">
              <div className="bg-gray-50 rounded p-3 space-y-1.5">
                <div className="flex justify-between"><span className="text-gray-500">Sản phẩm / Vật tư:</span><span className="font-medium">{detail.itemName} ({detail.itemSku || '-'})</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Kho:</span><span className="font-medium">{detail.warehouseName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">SL hệ thống:</span><span className="font-semibold">{detail.systemQuantity}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">SL thực tế:</span><span className="font-semibold">{detail.physicalQuantity}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Chênh lệch:</span><span className="font-semibold" style={{ color: detail.variance < 0 ? ERROR : detail.variance > 0 ? SUCCESS : NEUTRAL }}>{detail.variance > 0 ? '+' : ''}{detail.variance}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Người đề xuất:</span><span>{detail.proposedByName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Ngày đề xuất:</span><span>{formatDate(detail.proposedAt)}</span></div>
              </div>
              <div className="bg-gray-50 rounded p-3 space-y-1">
                <p className="text-gray-500">Lý do chênh lệch (Warehouse Staff):</p>
                <p className="text-gray-800 italic">"{detail.reason}"</p>
              </div>

              {detail.status === 'Pending' ? (
                <div className="space-y-2">
                  <label className="text-gray-500 text-[11px]">Ghi chú quyết định (bắt buộc khi Từ chối)</label>
                  <textarea
                    className="w-full border border-gray-300 rounded-md p-2 text-xs outline-none focus:border-blue-400"
                    rows={3}
                    placeholder="Nhập ghi chú..."
                    value={decisionNote}
                    onChange={e => setDecisionNote(e.target.value)}
                  />
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <Button size="sm" className="gap-1.5" style={{ backgroundColor: SUCCESS }} disabled={submitting} onClick={() => decide('Approved')}>
                      <CheckCircle className="w-3.5 h-3.5" /> Duyệt
                    </Button>
                    <Button size="sm" className="gap-1.5" style={{ backgroundColor: ERROR }} disabled={submitting} onClick={() => decide('Rejected')}>
                      <XCircle className="w-3.5 h-3.5" /> Từ chối
                    </Button>
                    <Button variant="outline" size="sm" className="ml-auto" onClick={() => setDetail(null)} disabled={submitting}>Đóng</Button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded p-3 space-y-1.5">
                  <div className="flex justify-between"><span className="text-gray-500">Trạng thái:</span><Badge status={detail.status} /></div>
                  <div className="flex justify-between"><span className="text-gray-500">Người duyệt:</span><span>{detail.decidedByName || '-'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Ngày duyệt:</span><span>{formatDate(detail.decidedAt)}</span></div>
                  {detail.decisionNote && <div className="pt-1 border-t border-gray-200"><p className="text-gray-500 mb-0.5">Ghi chú:</p><p className="text-gray-800 italic">"{detail.decisionNote}"</p></div>}
                  <div className="flex justify-end pt-2 border-t border-gray-100">
                    <Button variant="outline" size="sm" onClick={() => setDetail(null)}>Đóng</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
