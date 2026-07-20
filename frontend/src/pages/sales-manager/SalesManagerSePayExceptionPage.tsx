/**
 * SalesSePayExceptionPage.tsx
 * MGR-05 — Xử lý ngoại lệ thanh toán SePay
 * Chỉ Sales Manager mới thấy menu và thực hiện được thao tác.
 */
import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import {
  getSePayExceptions,
  manualConfirmPayment,
  retryAllocation,
} from '../../services/sePayExceptionService';

// ─── Constants ────────────────────────────────────────────────────────────────
const PRIMARY = '#1F3B64';

const REASON_LABELS: Record<string, string> = {
  RESERVATION_EXPIRED: 'Hết thời gian giữ tồn',
  INSUFFICIENT_AVAILABLE_STOCK: 'Không đủ tồn khả dụng',
  WEBHOOK_NOT_RECEIVED: 'Webhook chưa nhận được',
  WEBHOOK_AMOUNT_MISMATCH: 'Số tiền webhook sai',
};

const PAYMENT_STATUS_META: Record<string, { label: string; bg: string }> = {
  Pending: { label: 'Chờ thanh toán', bg: '#F97316' },
  Paid:    { label: 'Đã nhận tiền',   bg: '#16A34A' },
  Failed:  { label: 'Thất bại',       bg: '#DC2626' },
};

const ORDER_STATUS_META: Record<string, { label: string; bg: string }> = {
  PaidReviewRequired: { label: 'Cần xem lại', bg: '#8B5CF6' },
  Pending:            { label: 'Chờ xử lý',   bg: '#F97316' },
  Confirmed:          { label: 'Đã xác nhận', bg: '#16A34A' },
  Cancelled:          { label: 'Đã hủy',      bg: '#DC2626' },
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface ExceptionItem {
  orderId: string;
  orderCode: string;
  customerName: string;
  assignedSalesStaffName?: string;
  finalPayment: number;
  paymentStatus: string;
  orderStatus: string;
  exceptionReason: string;
  retryCount: number;
  createdAt: string;
  lastRetryAt?: string;
  externalTransactionId?: string;
  evidenceUrl?: string;
}

interface ConfirmForm {
  externalTransactionId: string;
  actualAmount: string;
  evidenceUrl: string;
  transferContent: string;
  note: string;
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

// ─── ManualConfirmModal ───────────────────────────────────────────────────────
function ManualConfirmModal({
  item,
  onClose,
  onSuccess,
}: {
  item: ExceptionItem;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}) {
  const [form, setForm] = useState<ConfirmForm>({
    externalTransactionId: item.externalTransactionId ?? '',
    actualAmount: String(item.finalPayment),
    evidenceUrl: item.evidenceUrl ?? '',
    transferContent: item.orderCode,
    note: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof ConfirmForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.externalTransactionId.trim()) return setError('Vui lòng nhập mã giao dịch ngân hàng.');
    if (!form.evidenceUrl.trim()) return setError('Vui lòng nhập URL bằng chứng đối soát.');
    const amount = parseFloat(form.actualAmount);
    if (isNaN(amount) || amount <= 0) return setError('Số tiền thực nhận không hợp lệ.');

    setSubmitting(true);
    try {
      const result = await manualConfirmPayment(item.orderId, {
        externalTransactionId: form.externalTransactionId.trim(),
        actualAmount: amount,
        evidenceUrl: form.evidenceUrl.trim(),
        transferContent: form.transferContent.trim() || undefined,
        note: form.note.trim() || undefined,
      });
      onSuccess(result?.message ?? 'Xác nhận thanh toán thủ công thành công.');
      onClose();
    } catch (err: any) {
      setError(err.message ?? 'Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="relative w-full max-w-lg rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between rounded-t-xl px-5 py-4"
          style={{ backgroundColor: PRIMARY }}
        >
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="h-4 w-4 text-white/80" />
            <span className="text-[13px] font-bold text-white">Xác nhận thanh toán thủ công</span>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Order Info */}
        <div className="border-b border-gray-100 bg-blue-50/60 px-5 py-3">
          <div className="grid grid-cols-2 gap-y-1 text-[11px]">
            <span className="text-gray-500">Mã đơn</span>
            <span className="font-bold text-[#1F3B64]">{item.orderCode}</span>
            <span className="text-gray-500">Khách hàng</span>
            <span className="text-gray-700">{item.customerName}</span>
            <span className="text-gray-500">Số tiền cần thanh toán</span>
            <span className="font-bold text-emerald-700">{formatPrice(item.finalPayment)}</span>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          {/* External Transaction ID */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-gray-700">
              Mã giao dịch ngân hàng <span className="text-red-500">*</span>
            </label>
            <input
              value={form.externalTransactionId}
              onChange={set('externalTransactionId')}
              placeholder="Ví dụ: SEPAY-20260707-000128"
              className="h-8 w-full rounded border border-gray-300 px-3 text-[12px] text-gray-800 outline-none focus:border-[#1F3B64]"
            />
          </div>

          {/* Actual Amount */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-gray-700">
              Số tiền thực nhận (đ) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.actualAmount}
              onChange={set('actualAmount')}
              placeholder="Nhập số tiền..."
              className="h-8 w-full rounded border border-gray-300 px-3 text-[12px] text-gray-800 outline-none focus:border-[#1F3B64]"
            />
            <p className="mt-0.5 text-[10px] text-amber-600">
              ⚠ Phải khớp đúng với số tiền đơn hàng: {formatPrice(item.finalPayment)}
            </p>
          </div>

          {/* Evidence URL */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-gray-700">
              URL bằng chứng đối soát <span className="text-red-500">*</span>
            </label>
            <input
              value={form.evidenceUrl}
              onChange={set('evidenceUrl')}
              placeholder="https://... (ảnh sao kê, screenshot ngân hàng)"
              className="h-8 w-full rounded border border-gray-300 px-3 text-[12px] text-gray-800 outline-none focus:border-[#1F3B64]"
            />
            <p className="mt-0.5 text-[10px] text-gray-400">
              Upload ảnh lên Cloudinary/Imgur rồi dán URL vào đây.
            </p>
          </div>

          {/* Transfer Content */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-gray-700">Nội dung chuyển khoản</label>
            <input
              value={form.transferContent}
              onChange={set('transferContent')}
              placeholder="Nội dung CK thực tế trên tài khoản ngân hàng"
              className="h-8 w-full rounded border border-gray-300 px-3 text-[12px] text-gray-800 outline-none focus:border-[#1F3B64]"
            />
          </div>

          {/* Note */}
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-gray-700">Ghi chú đối soát</label>
            <textarea
              value={form.note}
              onChange={set('note')}
              rows={2}
              placeholder="Ghi chú thêm (tùy chọn)"
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
              {submitting ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SalesSePayExceptionPage() {
  const [items, setItems] = useState<ExceptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [confirmingItem, setConfirmingItem] = useState<ExceptionItem | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setSuccessMsg(''), 5000);
  };

  const fetchExceptions = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSePayExceptions();
      setItems(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message ?? 'Không thể tải danh sách ngoại lệ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExceptions();
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleRetry = async (item: ExceptionItem) => {
    if (!window.confirm(`Thử phân bổ lại tồn kho cho đơn ${item.orderCode}?`)) return;
    setRetryingId(item.orderId);
    try {
      const result = await retryAllocation(item.orderId, 'Retry thủ công từ màn hình MGR-05');
      showSuccess(result?.message ?? 'Đã thử phân bổ lại.');
      fetchExceptions();
    } catch (err: any) {
      alert(err.message ?? 'Lỗi khi retry allocation.');
    } finally {
      setRetryingId(null);
    }
  };

  const filtered = items.filter(
    (i) =>
      i.orderCode.toLowerCase().includes(search.toLowerCase()) ||
      i.customerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col bg-[#F5F7FA]">
      {/* Header bar */}
      <div className="flex h-11 flex-shrink-0 items-center justify-between border-b border-[#E5E7EB] bg-white px-5">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span className="text-[13px] font-bold text-[#374151]">Ngoại lệ thanh toán SePay</span>
          {!loading && (
            <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
              {filtered.length} cần xử lý
            </span>
          )}
        </div>
        <button
          onClick={fetchExceptions}
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

        {/* Info card */}
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-[11px] font-semibold text-amber-800">
            📋 Trang này hiển thị các đơn SePay cần xử lý thủ công:
          </p>
          <ul className="mt-1.5 list-disc pl-4 text-[11px] text-amber-700 space-y-0.5">
            <li><strong>Chờ thanh toán quá 30 phút</strong> — Khách đã chuyển nhưng webhook chưa về</li>
            <li><strong>Đã nhận tiền — Cần xem lại</strong> — Tiền đã vào nhưng không đủ tồn để phân bổ</li>
          </ul>
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
                <span className="text-xs text-gray-500">Đang tải danh sách ngoại lệ...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-52 flex-col items-center justify-center gap-3 px-4 text-center">
              <XCircle className="h-8 w-8 text-red-400" />
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button
                onClick={fetchExceptions}
                className="rounded px-3 py-1.5 text-xs font-semibold text-white"
                style={{ backgroundColor: PRIMARY }}
              >
                Thử lại
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex h-52 flex-col items-center justify-center gap-3 px-4 text-center">
              <div className="rounded-full bg-green-50 p-4 text-green-400">
                <CheckCircle className="h-7 w-7" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700">Không có ngoại lệ cần xử lý</p>
                <p className="mt-1 text-xs text-gray-400">Tất cả giao dịch SePay đang hoạt động bình thường.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ fontSize: 12 }}>
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                    {[
                      'Mã đơn',
                      'Khách hàng',
                      'Sale phụ trách',
                      'Số tiền',
                      'Trạng thái TT',
                      'Trạng thái đơn',
                      'Lý do ngoại lệ',
                      'Số lần retry',
                      'Thời gian đặt',
                      'Thao tác',
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[#6B7280] whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, idx) => (
                    <tr
                      key={item.orderId}
                      className="transition-colors hover:bg-amber-50/30"
                      style={{
                        borderBottom: '1px solid #F3F4F6',
                        background: idx % 2 === 1 ? '#FAFAFA' : '#FFFFFF',
                      }}
                    >
                      {/* Order Code */}
                      <td className="px-3 py-3 font-bold whitespace-nowrap" style={{ color: PRIMARY }}>
                        {item.orderCode}
                      </td>

                      {/* Customer */}
                      <td className="max-w-[160px] truncate px-3 py-3 text-gray-700">
                        {item.customerName}
                      </td>

                      {/* Sales Staff */}
                      <td className="px-3 py-3 text-gray-500 whitespace-nowrap">
                        {item.assignedSalesStaffName ?? '—'}
                      </td>

                      {/* Amount */}
                      <td className="px-3 py-3 font-bold whitespace-nowrap text-right text-gray-800">
                        {formatPrice(item.finalPayment)}
                      </td>

                      {/* Payment Status */}
                      <td className="px-3 py-3">
                        <Badge
                          label={PAYMENT_STATUS_META[item.paymentStatus]?.label ?? item.paymentStatus}
                          bg={PAYMENT_STATUS_META[item.paymentStatus]?.bg ?? '#6B7280'}
                        />
                      </td>

                      {/* Order Status */}
                      <td className="px-3 py-3">
                        <Badge
                          label={ORDER_STATUS_META[item.orderStatus]?.label ?? item.orderStatus}
                          bg={ORDER_STATUS_META[item.orderStatus]?.bg ?? '#6B7280'}
                        />
                      </td>

                      {/* Exception Reason */}
                      <td className="px-3 py-3 max-w-[180px]">
                        <span className="inline-flex items-center gap-1 text-[11px] text-amber-700">
                          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">
                            {REASON_LABELS[item.exceptionReason] ?? item.exceptionReason}
                          </span>
                        </span>
                      </td>

                      {/* Retry Count */}
                      <td className="px-3 py-3 text-center">
                        {item.retryCount > 0 ? (
                          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-[10px] font-bold text-red-600">
                            {item.retryCount}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>

                      {/* Created At */}
                      <td className="px-3 py-3 whitespace-nowrap tabular-nums text-gray-500">
                        {formatDate(item.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          {/* Nếu Pending → Manual Confirm */}
                          {item.paymentStatus === 'Pending' && (
                            <button
                              onClick={() => setConfirmingItem(item)}
                              className="inline-flex items-center gap-1 rounded bg-[#1F3B64] px-2 py-1 text-[10px] font-semibold text-white hover:opacity-90"
                              title="Xác nhận thanh toán thủ công"
                            >
                              <Upload className="h-2.5 w-2.5" />
                              Xác nhận TT
                            </button>
                          )}

                          {/* Nếu Paid + PaidReviewRequired → Retry */}
                          {item.paymentStatus === 'Paid' && item.orderStatus === 'PaidReviewRequired' && (
                            <>
                              <button
                                onClick={() => handleRetry(item)}
                                disabled={retryingId === item.orderId}
                                className="inline-flex items-center gap-1 rounded bg-violet-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                                title="Thử phân bổ lại tồn kho"
                              >
                                {retryingId === item.orderId ? (
                                  <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-2.5 w-2.5" />
                                )}
                                Retry
                              </button>
                              <button
                                onClick={() => setConfirmingItem(item)}
                                className="inline-flex items-center gap-1 rounded border border-[#1F3B64] px-2 py-1 text-[10px] font-semibold text-[#1F3B64] hover:bg-blue-50"
                                title="Cập nhật thông tin đối soát"
                              >
                                <Upload className="h-2.5 w-2.5" />
                                Cập nhật
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer note */}
        {!loading && filtered.length > 0 && (
          <p className="mt-2 text-[10px] text-gray-400 text-right">
            Hiển thị {filtered.length}/{items.length} ngoại lệ
          </p>
        )}
      </div>

      {/* Manual Confirm Modal */}
      {confirmingItem && (
        <ManualConfirmModal
          item={confirmingItem}
          onClose={() => setConfirmingItem(null)}
          onSuccess={(msg) => {
            showSuccess(msg);
            fetchExceptions();
          }}
        />
      )}
    </div>
  );
}
