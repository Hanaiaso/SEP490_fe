import { getErrorMessage } from '../../lib/errors';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/sales-ui/dialog';
import { Save, CheckCircle, AlertCircle, Lock, Eye, RefreshCw } from 'lucide-react';
import {
  getWarehouses,
  getInventoryCountSessions,
  openInventoryCountSession,
  recordInventoryCountItem,
  closeInventoryCountSession,
} from '../../services/warehouseService';
import type { Warehouse, InventoryCountSession, CloseInventoryCountSessionResult } from '../../types/warehouse';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#D97706';
const ERROR = '#DC2626';
const NEUTRAL = '#64748B';

function formatDate(iso?: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('vi-VN');
}

function StatusBadge({ status }: { status: string }) {
  const cfg = status === 'Open'
    ? { label: 'Đang mở', bg: WARNING }
    : { label: 'Đã đóng', bg: SUCCESS };
  return <span className="text-[10px] font-semibold text-white px-2 py-0.5 inline-block whitespace-nowrap" style={{ backgroundColor: cfg.bg, borderRadius: 4 }}>{cfg.label}</span>;
}

// Bản nháp số đếm đang chỉnh cho từng dòng — key = itemId, giữ tách biệt với dữ liệu server để
// biết dòng nào đã lưu / đang sửa dở, tránh việc gõ số bị ghi đè bởi lần refetch trước đó.
interface DraftItem {
  physicalQuantity: string;
  note: string;
  saving: boolean;
  saved: boolean;
}

export default function WarehouseCountSessions() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [openNote, setOpenNote] = useState('');
  const [opening, setOpening] = useState(false);

  const [sessions, setSessions] = useState<InventoryCountSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [activeSession, setActiveSession] = useState<InventoryCountSession | null>(null);
  const [drafts, setDrafts] = useState<Record<string, DraftItem>>({});
  const [closing, setClosing] = useState(false);
  const [closeResult, setCloseResult] = useState<CloseInventoryCountSessionResult | null>(null);
  const [detail, setDetail] = useState<InventoryCountSession | null>(null);
  const [error, setError] = useState('');

  const loadSessions = useCallback(async () => {
    try {
      setLoadingSessions(true);
      setError('');
      const data = await getInventoryCountSessions() as InventoryCountSession[];
      const list = Array.isArray(data) ? data : [];
      setSessions(list);
      const open = list.find(s => s.status === 'Open') || null;
      setActiveSession(open);
      if (open) {
        setDrafts(Object.fromEntries(open.items.map(i => [i.id, {
          physicalQuantity: i.physicalQuantity != null ? String(i.physicalQuantity) : '',
          note: i.note || '',
          saving: false,
          saved: i.physicalQuantity != null,
        }])));
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Không thể tải danh sách phiên kiểm kê.'));
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    getWarehouses().then((res: Warehouse[]) => {
      setWarehouses(res || []);
      if (res && res.length > 0) setSelectedWarehouseId(res[0].id);
    }).catch(() => setWarehouses([]));
    loadSessions();
  }, [loadSessions]);

  const handleOpenSession = async () => {
    if (!selectedWarehouseId) return;
    try {
      setOpening(true);
      setError('');
      setCloseResult(null);
      await openInventoryCountSession({ warehouseId: selectedWarehouseId, note: openNote || undefined });
      setOpenNote('');
      await loadSessions();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Không thể mở phiên kiểm kê.'));
    } finally {
      setOpening(false);
    }
  };

  const updateDraft = (itemId: string, patch: Partial<DraftItem>) => {
    setDrafts(prev => ({ ...prev, [itemId]: { ...prev[itemId], ...patch, saved: false } }));
  };

  const handleSaveItem = async (itemId: string) => {
    if (!activeSession) return;
    const draft = drafts[itemId];
    if (!draft || draft.physicalQuantity === '') return;
    const parsed = Math.max(0, Math.floor(Number(draft.physicalQuantity)));
    if (Number.isNaN(parsed)) return;

    try {
      updateDraft(itemId, { saving: true });
      const updated = await recordInventoryCountItem(activeSession.id, itemId, {
        physicalQuantity: parsed,
        note: draft.note || undefined,
      }) as InventoryCountSession;
      setActiveSession(updated);
      updateDraft(itemId, { saving: false, saved: true, physicalQuantity: String(parsed) });
    } catch (err: unknown) {
      updateDraft(itemId, { saving: false });
      alert(getErrorMessage(err, 'Không thể lưu số đếm.'));
    }
  };

  const uncountedCount = activeSession
    ? activeSession.items.filter(i => !drafts[i.id] || drafts[i.id].physicalQuantity === '' || !drafts[i.id].saved).length
    : 0;

  const handleCloseSession = async () => {
    if (!activeSession) return;
    if (uncountedCount > 0) {
      alert(`Còn ${uncountedCount} dòng chưa nhập/lưu số đếm thực tế. Hãy đếm và lưu đủ trước khi đóng phiên.`);
      return;
    }
    if (!confirm('Đóng phiên kiểm kê? Dòng chênh lệch trong ngưỡng sẽ áp dụng thẳng vào tồn kho, dòng vượt ngưỡng sẽ chuyển CEO duyệt. Không thể hoàn tác.')) return;

    try {
      setClosing(true);
      setError('');
      const result = await closeInventoryCountSession(activeSession.id) as CloseInventoryCountSessionResult;
      setCloseResult(result);
      setActiveSession(null);
      await loadSessions();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Không thể đóng phiên kiểm kê.'));
    } finally {
      setClosing(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] mb-0.5">
          <span className="text-gray-400">Kho hàng</span><span className="text-gray-300">/</span>
          <span className="text-gray-400">Quản lý tồn kho (Inventory)</span><span className="text-gray-300">/</span>
          <span className="text-gray-800 font-semibold">Phiên kiểm kê tồn kho</span>
        </div>
        <h2 className="text-base font-bold text-gray-900">Phiên kiểm kê tồn kho</h2>
        <p className="text-xs text-gray-500 mt-0.5">Mở phiên để chốt số lý thuyết, đếm thực tế, rồi đóng phiên để áp dụng chênh lệch (trong ngưỡng) hoặc gửi CEO duyệt (vượt ngưỡng).</p>
      </div>

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-5 py-2 text-xs text-red-700 font-medium flex items-center gap-2 flex-shrink-0">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </div>
      )}

      {closeResult && (
        <div className="bg-green-50 border-b border-green-200 px-5 py-2 text-xs text-green-700 font-medium flex items-center gap-2 flex-shrink-0">
          <CheckCircle className="w-3.5 h-3.5" />
          Đã đóng phiên kiểm kê: {closeResult.autoAppliedCount} dòng áp dụng tự động
          {closeResult.pendingApprovalCount > 0 ? `, ${closeResult.pendingApprovalCount} dòng đã gửi CEO duyệt.` : ', không có dòng nào vượt ngưỡng.'}
        </div>
      )}

      <div className="flex-1 overflow-auto bg-gray-50 p-4 space-y-4">
        {!activeSession ? (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Mở phiên kiểm kê mới</h3>
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Kho</label>
                <select
                  className="h-8 text-xs font-semibold border border-blue-200 rounded-lg px-2.5 bg-blue-50 text-blue-900 outline-none disabled:opacity-60"
                  value={selectedWarehouseId}
                  onChange={e => setSelectedWarehouseId(e.target.value)}
                  disabled={opening}
                >
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Ghi chú (tuỳ chọn)</label>
                <Input className="h-8 text-xs" placeholder="VD: Kiểm kê định kỳ tháng..." value={openNote} onChange={e => setOpenNote(e.target.value)} disabled={opening} />
              </div>
              <Button size="sm" className="h-8 text-xs gap-1.5" style={{ backgroundColor: PRIMARY }} onClick={handleOpenSession} disabled={opening || !selectedWarehouseId}>
                <Lock className="w-3.5 h-3.5" /> {opening ? 'Đang mở...' : 'Mở phiên kiểm kê'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-amber-50/50">
              <div>
                <p className="text-sm font-bold text-gray-900">Phiên đang mở — {activeSession.warehouseName}</p>
                <p className="text-[11px] text-gray-500">Mở lúc {formatDate(activeSession.openedAt)} bởi {activeSession.openedByName}. Số lý thuyết đã khoá, không đổi cho tới khi đóng phiên.</p>
              </div>
              <Button size="sm" className="h-8 text-xs gap-1.5" style={{ backgroundColor: SUCCESS }} onClick={handleCloseSession} disabled={closing}>
                <CheckCircle className="w-3.5 h-3.5" /> {closing ? 'Đang đóng...' : 'Đóng phiên (Post)'}
              </Button>
            </div>

            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-2.5 text-gray-700 font-semibold w-28">Mã hàng</th>
                  <th className="text-left px-4 py-2.5 text-gray-700 font-semibold">Tên hàng</th>
                  <th className="text-right px-4 py-2.5 text-gray-700 font-semibold w-28">Tồn hệ thống (khoá)</th>
                  <th className="text-right px-4 py-2.5 text-gray-700 font-semibold w-32">Đếm thực tế</th>
                  <th className="text-right px-4 py-2.5 text-gray-700 font-semibold w-24">Chênh lệch</th>
                  <th className="text-left px-4 py-2.5 text-gray-700 font-semibold">Ghi chú</th>
                  <th className="text-center px-4 py-2.5 text-gray-700 font-semibold w-16">Lưu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeSession.items.map((item, i) => {
                  const draft = drafts[item.id] || { physicalQuantity: '', note: '', saving: false, saved: false };
                  const diff = draft.physicalQuantity !== '' ? Math.floor(Number(draft.physicalQuantity)) - item.systemQuantity : null;
                  return (
                    <tr key={item.id} className="hover:bg-[#F9FAFB]" style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                      <td className="px-4 py-2 font-medium text-gray-500">{item.itemSku || '-'}</td>
                      <td className="px-4 py-2 font-medium text-gray-800">{item.itemName}</td>
                      <td className="px-4 py-2 text-right font-semibold text-gray-800 tabular-nums">
                        <Lock className="w-3 h-3 inline mr-1 text-gray-400" />{item.systemQuantity.toLocaleString('vi-VN')}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <Input
                          type="number" min={0} step={1}
                          className="h-7 text-xs text-right w-24 ml-auto"
                          placeholder="Nhập..."
                          value={draft.physicalQuantity}
                          onChange={e => updateDraft(item.id, { physicalQuantity: e.target.value })}
                        />
                      </td>
                      <td className="px-4 py-2 text-right font-bold tabular-nums">
                        {diff === null ? <span className="text-gray-300">—</span> :
                         diff === 0 ? <span style={{ color: SUCCESS }}>0</span> :
                         <span style={{ color: diff > 0 ? SUCCESS : ERROR }}>{diff > 0 ? '+' : ''}{diff}</span>}
                      </td>
                      <td className="px-4 py-2">
                        <Input className="h-7 text-xs w-full" placeholder="Ghi chú..." maxLength={500}
                          value={draft.note} onChange={e => updateDraft(item.id, { note: e.target.value })} />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button
                          className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 disabled:opacity-40"
                          disabled={draft.physicalQuantity === '' || draft.saving}
                          title="Lưu số đếm dòng này"
                          onClick={() => handleSaveItem(item.id)}
                        >
                          {draft.saved ? <CheckCircle className="w-3.5 h-3.5" style={{ color: SUCCESS }} /> : <Save className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {uncountedCount > 0 && (
              <div className="px-4 py-2 bg-orange-50 border-t border-orange-100 text-[11px] text-orange-700 font-medium">
                Còn {uncountedCount} dòng chưa nhập/lưu số đếm — bấm nút lưu ở từng dòng trước khi đóng phiên.
              </div>
            )}
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50">
            <h3 className="text-sm font-bold text-gray-900">Lịch sử phiên kiểm kê</h3>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={loadSessions} disabled={loadingSessions}>
              <RefreshCw className="w-3 h-3" /> {loadingSessions ? 'Đang tải...' : 'Làm mới'}
            </Button>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Kho</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Trạng thái</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Mở lúc</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Đóng lúc</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Số dòng</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!loadingSessions && sessions.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">Chưa có phiên kiểm kê nào.</td></tr>
              )}
              {sessions.map((s, i) => (
                <tr key={s.id} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-3 py-2.5 text-gray-800 font-medium">{s.warehouseName}</td>
                  <td className="px-3 py-2.5 text-center"><StatusBadge status={s.status} /></td>
                  <td className="px-3 py-2.5 text-gray-500">{formatDate(s.openedAt)}</td>
                  <td className="px-3 py-2.5 text-gray-500">{formatDate(s.closedAt)}</td>
                  <td className="px-3 py-2.5 text-center font-semibold">{s.items.length}</td>
                  <td className="px-3 py-2.5 text-center">
                    <button className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" onClick={() => setDetail(s)}><Eye className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Chi tiết phiên kiểm kê — {detail?.warehouseName}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-xs">
              <div className="bg-gray-50 rounded p-3 grid grid-cols-2 gap-2">
                <div><span className="text-gray-500">Trạng thái: </span><StatusBadge status={detail.status} /></div>
                <div><span className="text-gray-500">Mở bởi: </span><span className="font-medium">{detail.openedByName}</span></div>
                <div><span className="text-gray-500">Mở lúc: </span><span className="font-medium">{formatDate(detail.openedAt)}</span></div>
                {detail.status === 'Closed' && (
                  <>
                    <div><span className="text-gray-500">Đóng bởi: </span><span className="font-medium">{detail.closedByName}</span></div>
                    <div><span className="text-gray-500">Đóng lúc: </span><span className="font-medium">{formatDate(detail.closedAt)}</span></div>
                  </>
                )}
              </div>
              <div className="max-h-80 overflow-auto border border-gray-100 rounded">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr className="border-b border-gray-200">
                      <th className="text-left px-3 py-2 text-gray-700 font-semibold">Sản phẩm / Vật tư</th>
                      <th className="text-center px-3 py-2 text-gray-700 font-semibold">Hệ thống</th>
                      <th className="text-center px-3 py-2 text-gray-700 font-semibold">Thực tế</th>
                      <th className="text-center px-3 py-2 text-gray-700 font-semibold">Chênh lệch</th>
                      <th className="text-center px-3 py-2 text-gray-700 font-semibold">Xử lý</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {detail.items.map(item => (
                      <tr key={item.id}>
                        <td className="px-3 py-2"><p className="font-mono text-gray-500">{item.itemSku || '-'}</p><p className="text-gray-800 font-medium">{item.itemName}</p></td>
                        <td className="px-3 py-2 text-center font-semibold">{item.systemQuantity}</td>
                        <td className="px-3 py-2 text-center font-semibold">{item.physicalQuantity ?? '-'}</td>
                        <td className="px-3 py-2 text-center font-mono font-semibold" style={{ color: (item.variance ?? 0) < 0 ? ERROR : (item.variance ?? 0) > 0 ? SUCCESS : NEUTRAL }}>
                          {item.variance == null ? '-' : `${item.variance > 0 ? '+' : ''}${item.variance}`}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {item.autoApplied ? (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: SUCCESS, color: 'white' }}>Đã áp dụng</span>
                          ) : item.stockAdjustmentId ? (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: WARNING, color: 'white' }}>Chờ CEO duyệt</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end pt-2 border-t border-gray-100">
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setDetail(null)}>Đóng</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
