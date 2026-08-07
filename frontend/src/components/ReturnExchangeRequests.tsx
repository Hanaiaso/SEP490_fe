import type { ReactNode } from 'react';
import { CalendarClock, FileText, Image as ImageIcon, Package, X } from 'lucide-react';

type ReturnExchangeItem = {
  productName?: string;
  productSku?: string;
  quantity?: number;
  priceSnapshot?: number;
  price?: number;
  standardListedPrice?: number;
  unitPrice?: number;
  name?: string;
};

type ReturnExchangeRequest = {
  id?: string;
  reason?: string;
  status?: string;
  createdAt?: string;
  reviewedAt?: string;
  managerNote?: string;
  evidenceUrls?: string[] | string;
  returnItems?: ReturnExchangeItem[];
  exchangeItems?: ReturnExchangeItem[];
  replacementOrderId?: string | null;
};

type RequestSectionProps = {
  requests?: ReturnExchangeRequest[];
  description: string;
  onSelect: (request: ReturnExchangeRequest) => void;
};

type RequestModalProps = {
  request: ReturnExchangeRequest;
  onClose: () => void;
  footerActions?: ReactNode;
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  Pending: { label: 'Chờ xử lý', className: 'bg-amber-100 text-amber-700' },
  Approved: { label: 'Đã duyệt', className: 'bg-green-100 text-green-700' },
  Rejected: { label: 'Đã từ chối', className: 'bg-red-100 text-red-700' },
};

function formatPrice(value?: number) {
  return `${new Intl.NumberFormat('vi-VN').format(Number(value || 0))} đ`;
}

function formatDateTime(value?: string) {
  if (!value) return 'Chưa có thời gian';
  const hasTimezone = /([+-]\d{2}(:?\d{2})?|Z)$/.test(value);
  const date = new Date(hasTimezone ? value : `${value}Z`);
  if (Number.isNaN(date.getTime())) return 'Chưa có thời gian';
  return date.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getStatusMeta(status?: string) {
  return STATUS_META[status || ''] ?? { label: status || 'Không rõ', className: 'bg-slate-100 text-slate-700' };
}

function getEvidenceUrls(evidenceUrls?: string[] | string) {
  if (!evidenceUrls) return [];
  if (Array.isArray(evidenceUrls)) return evidenceUrls.filter(Boolean);

  const value = evidenceUrls.trim();
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [value];
  } catch {
    return [value];
  }
}

function itemPrice(item: ReturnExchangeItem) {
  return item.priceSnapshot ?? item.price ?? item.standardListedPrice ?? item.unitPrice ?? 0;
}

function itemQty(item: ReturnExchangeItem) {
  return Number(item.quantity || 0);
}

function itemTotal(items?: ReturnExchangeItem[]) {
  return (items || []).reduce((sum, item) => sum + itemQty(item) * Number(itemPrice(item) || 0), 0);
}

function itemCount(items?: ReturnExchangeItem[]) {
  return (items || []).reduce((sum, item) => sum + itemQty(item), 0);
}

function requestType(request: ReturnExchangeRequest) {
  const hasReturn = itemCount(request.returnItems) > 0;
  const hasExchange = itemCount(request.exchangeItems) > 0;
  if (hasReturn && hasExchange) return 'Đổi hàng';
  if (hasReturn) return 'Trả hàng';
  if (hasExchange) return 'Xuất đổi';
  return 'Đổi/Trả';
}

function requestSummary(request: ReturnExchangeRequest) {
  const returnQty = itemCount(request.returnItems);
  const exchangeQty = itemCount(request.exchangeItems);
  const evidenceCount = getEvidenceUrls(request.evidenceUrls).length;
  return { returnQty, exchangeQty, evidenceCount };
}

function productName(item: ReturnExchangeItem) {
  return item.productName || item.name || 'Sản phẩm';
}

function productSku(item: ReturnExchangeItem) {
  return item.productSku || 'Không có SKU';
}

function EvidencePreview({ urls }: { urls: string[] }) {
  if (urls.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-400">
        Khách hàng chưa đính kèm bằng chứng.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {urls.map((url, index) => {
        const isVideo = /^data:video/i.test(url) || /\.(mp4|webm|mov)(\?|#|$)/i.test(url);
        return (
          <a
            key={`${url}-${index}`}
            href={url}
            target="_blank"
            rel="noreferrer"
            className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-100"
          >
            {isVideo ? (
              <video src={url} className="h-full w-full object-cover" />
            ) : (
              <img src={url} alt={`Bằng chứng ${index + 1}`} className="h-full w-full object-cover transition group-hover:scale-105" />
            )}
            <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-slate-600 shadow-sm">
              {isVideo ? 'Video' : 'Ảnh'}
            </span>
          </a>
        );
      })}
    </div>
  );
}

function ItemList({ title, tone, items }: { title: string; tone: 'return' | 'exchange'; items?: ReturnExchangeItem[] }) {
  const dotClass = tone === 'return' ? 'bg-red-400' : 'bg-emerald-400';
  const total = itemTotal(items);

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
          <span className={`h-2 w-2 rounded-full ${dotClass}`} />
          {title}
        </p>
        <span className="text-xs font-semibold text-slate-500">{itemCount(items)} sản phẩm</span>
      </div>
      {(items || []).length === 0 ? (
        <p className="px-4 py-5 text-sm text-slate-400">Không có sản phẩm.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {(items || []).map((item, index) => (
            <li key={`${productName(item)}-${index}`} className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{productName(item)}</p>
                <p className="mt-0.5 text-xs text-slate-500">{productSku(item)}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-slate-900">x{itemQty(item)}</p>
                <p className="text-xs text-slate-500">{formatPrice(itemPrice(item))}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3 text-sm">
        <span className="text-slate-500">Tạm tính</span>
        <span className="font-bold text-slate-900">{formatPrice(total)}</span>
      </div>
    </div>
  );
}

export function ReturnExchangeRequestsSection({ requests = [], description, onSelect }: RequestSectionProps) {
  if (requests.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-100">
            <Package className="h-4 w-4 text-orange-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Yêu cầu Đổi/Trả</h2>
            <p className="mt-0.5 text-[11px] text-slate-500">{description}</p>
          </div>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
          {requests.length} yêu cầu
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {requests.map((request, index) => {
          const meta = getStatusMeta(request.status);
          const summary = requestSummary(request);

          return (
            <button
              key={request.id || index}
              type="button"
              onClick={() => onSelect(request)}
              className="flex w-full flex-col gap-3 px-5 py-4 text-left transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100">
                  <FileText className="h-5 w-5 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-900">Yêu cầu #{index + 1}</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                      {requestType(request)}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.className}`}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-slate-500">Lý do: {request.reason || 'Chưa có lý do'}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {formatDateTime(request.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                  Trả {summary.returnQty}
                </span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                  Đổi {summary.exchangeQty}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-600">
                  <ImageIcon className="h-3.5 w-3.5" />
                  {summary.evidenceCount}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function ReturnExchangeRequestDetailModal({ request, onClose, footerActions }: RequestModalProps) {
  const meta = getStatusMeta(request.status);
  const evidenceUrls = getEvidenceUrls(request.evidenceUrls);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Chi tiết Yêu cầu Đổi/Trả</h3>
            <p className="mt-1 text-sm text-slate-500">
              {requestType(request)} - gửi lúc {formatDateTime(request.createdAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto p-6">
          <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Lý do đổi/trả</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{request.reason || 'Chưa có lý do'}</p>
            </div>
            <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${meta.className}`}>
              {meta.label}
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Hàng trả</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900">{itemCount(request.returnItems)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Hàng đổi</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900">{itemCount(request.exchangeItems)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Giá trị trả</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{formatPrice(itemTotal(request.returnItems))}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Giá trị đổi</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{formatPrice(itemTotal(request.exchangeItems))}</p>
            </div>
          </div>

          {request.managerNote && (
            <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4">
              <h4 className="mb-1 font-semibold text-yellow-800">Phản hồi của Manager</h4>
              <p className="text-sm text-yellow-700">{request.managerNote}</p>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <ItemList title="Hàng trả lại (Kho nhận)" tone="return" items={request.returnItems} />
            <ItemList title="Hàng xuất đổi (Kho xuất)" tone="exchange" items={request.exchangeItems} />
          </div>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-slate-400" />
              <h4 className="text-sm font-bold text-slate-900">Bằng chứng đính kèm</h4>
            </div>
            <EvidencePreview urls={evidenceUrls} />
          </section>
        </div>

        <div className="flex justify-end gap-3 rounded-b-2xl border-t border-slate-100 bg-slate-50 p-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Đóng
          </button>
          {footerActions}
        </div>
      </div>
    </div>
  );
}
