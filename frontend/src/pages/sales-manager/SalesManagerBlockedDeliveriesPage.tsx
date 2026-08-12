import { getErrorMessage } from '../../lib/errors';
/**
 * SalesManagerBlockedDeliveriesPage.tsx
 * P2-6 (UC-35) — Sales Manager xử lý đơn giao hàng bị khóa & công nợ COD.
 * Chỉ Sales Manager mới thấy menu và thực hiện được thao tác.
 */
import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle,
  Lock,
  RefreshCw,
  Search,
  Unlock,
  Wallet,
  X,
  XCircle,
} from 'lucide-react';
import {
  getBlockedOrders,
  unblockOrder,
  getDebts,
  settleDebt,
} from '../../services/deliveryDebtService';

// ─── Constants ────────────────────────────────────────────────────────────────
const PRIMARY = '#1F3B64';

const DEBT_STATUS_META: Record<string, { label: string; bg: string }> = {
  InDebt: { label: 'Đang nợ', bg: '#DC2626' },
  Settled: { label: 'Đã tất toán', bg: '#16A34A' },
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface BlockedOrder {
  orderId: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  failedDeliveryCount: number;
  deliveryRejectionReasonCode?: string;
  assignedSalesStaffName?: string;
  finalPayment: number;
}

interface DebtItem {
  id: string;
  customerProfileId: string;
  customerName: string;
  orderId: string;
  orderCode: string;
  debtAmount: number;
  status: string;
  overdueDays: number;
  createdAt: string;
  settledAt?: string;
  settledByName?: string;
  settlementNote?: string;
}

// ─── Small UI components ──────────────────────────────────────────────────────
function Badge({ label, bg }: { label: string; bg: string }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded px-2 py-0.5 text-[10px] font-semibold text-white whitespace-nowrap"
      style={{ backgroundColor: bg }}
    >
      {label}
    </span>
  );
}

function formatPrice(n: number) {
  return new Intl.NumberFormat('vi-VN').format(n) + ' đ';
}

function formatDate(s?: string) {
  if (!s) return '—';
  const hasZ = /([+-]\d{2}|Z)$/.test(s);
  return new Date(hasZ ? s : s + 'Z').toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── UnblockModal ───────────────────────────────────────────────────────────────
function UnblockModal({
  item,
  onClose,
  onSuccess,
}: {
  item: BlockedOrder;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!reason.trim()) return setError('Vui lòng nhập lý do mở khóa.');

    setSubmitting(true);
    try {
      const result = await unblockOrder(item.orderId, reason.trim());
      onSuccess(result?.message ?? 'Đã mở khóa đơn hàng.');
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err) ?? 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between rounded-t-xl px-5 py-4" style={{ backgroundColor: PRIMARY }}>
          <div className="flex items-center gap-2.5">
            <Unlock className="h-4 w-4 text-white/80" />
            <span className="text-[13px] font-bold text-white">Mở khóa giao lại</span>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-gray-100 bg-blue-50/60 px-5 py-3">
          <div className="grid grid-cols-2 gap-y-1 text-[11px]">
            <span className="text-gray-500">Mã đơn</span>
            <span className="font-bold text-[#1F3B64]">{item.orderCode}</span>
            <span className="text-gray-500">Khách hàng</span>
            <span className="text-gray-700">{item.customerName}</span>
            <span className="text-gray-500">Số lần giao thất bại</span>
            <span className="font-bold text-red-600">{item.failedDeliveryCount}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-gray-700">
              Lý do mở khóa <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Ví dụ: Khách đã xác nhận lịch giao lại qua điện thoại..."
              className="w-full rounded border border-gray-300 px-3 py-2 text-[12px] text-gray-800 outline-none focus:border-[#1F3B64] resize-none"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2">
              <XCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-500" />
              <p className="text-[11px] text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-gray-300 px-4 py-1.5 text-[12px] text-gray-600 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 rounded px-4 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: PRIMARY }}
            >
              {submitting ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Unlock className="h-3 w-3" />}
              {submitting ? 'Đang xử lý...' : 'Mở khóa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── SettleDebtModal ────────────────────────────────────────────────────────────
function SettleDebtModal({
  item,
  onClose,
  onSuccess,
}: {
  item: DebtItem;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const result = await settleDebt(item.id, note.trim() || undefined);
      onSuccess(result?.message ?? 'Đã đánh dấu công nợ là đã tất toán.');
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err) ?? 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between rounded-t-xl px-5 py-4" style={{ backgroundColor: PRIMARY }}>
          <div className="flex items-center gap-2.5">
            <Wallet className="h-4 w-4 text-white/80" />
            <span className="text-[13px] font-bold text-white">Tất toán công nợ</span>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-gray-100 bg-blue-50/60 px-5 py-3">
          <div className="grid grid-cols-2 gap-y-1 text-[11px]">
            <span className="text-gray-500">Mã đơn</span>
            <span className="font-bold text-[#1F3B64]">{item.orderCode}</span>
            <span className="text-gray-500">Khách hàng</span>
            <span className="text-gray-700">{item.customerName}</span>
            <span className="text-gray-500">Số tiền nợ</span>
            <span className="font-bold text-red-600">{formatPrice(item.debtAmount)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-gray-700">Ghi chú tất toán (tùy chọn)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Ví dụ: Khách chuyển khoản bổ sung ngày..."
              className="w-full rounded border border-gray-300 px-3 py-2 text-[12px] text-gray-800 outline-none focus:border-[#1F3B64] resize-none"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2">
              <XCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-500" />
              <p className="text-[11px] text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-gray-300 px-4 py-1.5 text-[12px] text-gray-600 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 rounded px-4 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: PRIMARY }}
            >
              {submitting ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
              {submitting ? 'Đang xử lý...' : 'Xác nhận tất toán'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SalesManagerBlockedDeliveriesPage() {
  const [tab, setTab] = useState<'blocked' | 'debts'>('blocked');
  const [blockedOrders, setBlockedOrders] = useState<BlockedOrder[]>([]);
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [unblockingItem, setUnblockingItem] = useState<BlockedOrder | null>(null);
  const [settlingItem, setSettlingItem] = useState<DebtItem | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setSuccessMsg(''), 5000);
  };

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [blockedData, debtsData] = await Promise.all([getBlockedOrders(), getDebts()]);
      setBlockedOrders(Array.isArray(blockedData) ? blockedData : []);
      setDebts(Array.isArray(debtsData) ? debtsData : []);
    } catch (err: unknown) {
      setError(getErrorMessage(err) ?? 'Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const filteredBlocked = blockedOrders.filter(
    (o) =>
      o.orderCode.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase())
  );
  const filteredDebts = debts.filter(
    (d) =>
      d.orderCode.toLowerCase().includes(search.toLowerCase()) ||
      d.customerName.toLowerCase().includes(search.toLowerCase())
  );

  const pendingDebtCount = debts.filter((d) => d.status === 'InDebt').length;

  return (
    <div className="flex h-full flex-col bg-[#F5F7FA]">
      {/* Header bar */}
      <div className="flex h-11 flex-shrink-0 items-center justify-between border-b border-[#E5E7EB] bg-white px-5">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-amber-500" />
          <span className="text-[13px] font-bold text-[#374151]">Giao thất bại &amp; Công nợ COD</span>
          {!loading && (
            <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              {blockedOrders.length} đơn bị khóa · {pendingDebtCount} công nợ chưa tất toán
            </span>
          )}
        </div>
        <button
          onClick={fetchAll}
          disabled={loading}
          className="flex h-7 items-center gap-1.5 rounded border border-[#D1D5DB] bg-white px-3 text-[12px] text-[#374151] hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </button>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 shadow-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
          <p className="flex-1 text-[12px] font-semibold text-green-800">{successMsg}</p>
          <button onClick={() => setSuccessMsg('')} className="text-green-500 hover:text-green-700">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Tabs */}
        <div className="mb-3 flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 w-fit">
          <button
            onClick={() => setTab('blocked')}
            className={`rounded px-3 py-1.5 text-[12px] font-medium ${tab === 'blocked' ? 'text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            style={tab === 'blocked' ? { backgroundColor: PRIMARY } : {}}
          >
            Đơn bị khóa ({blockedOrders.length})
          </button>
          <button
            onClick={() => setTab('debts')}
            className={`rounded px-3 py-1.5 text-[12px] font-medium ${tab === 'debts' ? 'text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            style={tab === 'debts' ? { backgroundColor: PRIMARY } : {}}
          >
            Công nợ quá hạn ({pendingDebtCount})
          </button>
        </div>

        {/* Search */}
        <div className="mb-3 flex items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã đơn hoặc tên khách hàng..."
              className="h-8 w-full rounded border border-[#D1D5DB] bg-white pl-9 pr-3 text-[12px] text-gray-700 outline-none focus:border-[#1F3B64]"
            />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex h-52 items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-7 w-7 animate-spin text-[#1F3B64]" />
                <span className="text-xs text-gray-500">Đang tải dữ liệu...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-52 flex-col items-center justify-center gap-3 px-4 text-center">
              <XCircle className="h-8 w-8 text-red-400" />
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button onClick={fetchAll} className="rounded px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: PRIMARY }}>
                Thử lại
              </button>
            </div>
          ) : tab === 'blocked' ? (
            filteredBlocked.length === 0 ? (
              <div className="flex h-52 flex-col items-center justify-center gap-3 px-4 text-center">
                <div className="rounded-full bg-green-50 p-4 text-green-400">
                  <CheckCircle className="h-7 w-7" />
                </div>
                <p className="text-sm font-semibold text-gray-700">Không có đơn nào bị khóa</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ fontSize: 12 }}>
                  <thead>
                    <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                      {['Mã đơn', 'Khách hàng', 'SĐT', 'Số lần thất bại', 'Sale phụ trách', 'Số tiền', 'Thao tác'].map((h) => (
                        <th key={h} className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[#6B7280] whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBlocked.map((item, idx) => (
                      <tr
                        key={item.orderId}
                        className="transition-colors hover:bg-amber-50/30"
                        style={{ borderBottom: '1px solid #F3F4F6', background: idx % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}
                      >
                        <td className="px-3 py-3 font-bold whitespace-nowrap" style={{ color: PRIMARY }}>{item.orderCode}</td>
                        <td className="max-w-[160px] truncate px-3 py-3 text-gray-700">{item.customerName}</td>
                        <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{item.customerPhone || '—'}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600">
                            {item.failedDeliveryCount}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-gray-500 whitespace-nowrap">{item.assignedSalesStaffName ?? '—'}</td>
                        <td className="px-3 py-3 font-bold whitespace-nowrap text-right text-gray-800">{formatPrice(item.finalPayment)}</td>
                        <td className="px-3 py-3">
                          <button
                            onClick={() => setUnblockingItem(item)}
                            className="inline-flex items-center gap-1 rounded bg-[#1F3B64] px-2 py-1 text-[10px] font-semibold text-white hover:opacity-90"
                          >
                            <Unlock className="h-2.5 w-2.5" />
                            Mở khóa giao lại
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : filteredDebts.length === 0 ? (
            <div className="flex h-52 flex-col items-center justify-center gap-3 px-4 text-center">
              <div className="rounded-full bg-green-50 p-4 text-green-400">
                <CheckCircle className="h-7 w-7" />
              </div>
              <p className="text-sm font-semibold text-gray-700">Không có công nợ nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ fontSize: 12 }}>
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                    {['Mã đơn', 'Khách hàng', 'Số tiền nợ', 'Số ngày quá hạn', 'Trạng thái', 'Ngày phát sinh', 'Thao tác'].map((h) => (
                      <th key={h} className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[#6B7280] whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredDebts.map((item, idx) => (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-amber-50/30"
                      style={{ borderBottom: '1px solid #F3F4F6', background: idx % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}
                    >
                      <td className="px-3 py-3 font-bold whitespace-nowrap" style={{ color: PRIMARY }}>{item.orderCode}</td>
                      <td className="max-w-[160px] truncate px-3 py-3 text-gray-700">{item.customerName}</td>
                      <td className="px-3 py-3 font-bold whitespace-nowrap text-right text-red-600">{formatPrice(item.debtAmount)}</td>
                      <td className="px-3 py-3 text-center text-gray-600">{item.status === 'InDebt' ? `${item.overdueDays} ngày` : '—'}</td>
                      <td className="px-3 py-3">
                        <Badge label={DEBT_STATUS_META[item.status]?.label ?? item.status} bg={DEBT_STATUS_META[item.status]?.bg ?? '#6B7280'} />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap tabular-nums text-gray-500">{formatDate(item.createdAt)}</td>
                      <td className="px-3 py-3">
                        {item.status === 'InDebt' ? (
                          <button
                            onClick={() => setSettlingItem(item)}
                            className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-emerald-700"
                          >
                            <Wallet className="h-2.5 w-2.5" />
                            Đánh dấu tất toán
                          </button>
                        ) : (
                          <span className="text-[10px] text-gray-400">{item.settledByName ? `Bởi ${item.settledByName}` : '—'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {unblockingItem && (
        <UnblockModal
          item={unblockingItem}
          onClose={() => setUnblockingItem(null)}
          onSuccess={(msg) => {
            showSuccess(msg);
            fetchAll();
          }}
        />
      )}
      {settlingItem && (
        <SettleDebtModal
          item={settlingItem}
          onClose={() => setSettlingItem(null)}
          onSuccess={(msg) => {
            showSuccess(msg);
            fetchAll();
          }}
        />
      )}
    </div>
  );
}
