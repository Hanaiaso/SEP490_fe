import { useCallback, useEffect, useState } from 'react';
import { Users, RefreshCw, Search, Eye, X, Save, StickyNote } from 'lucide-react';
import {
  getMyCustomers,
  getMyCustomerDetail,
  updateCustomerNote,
} from '../../services/salesCustomerService';

const PRIMARY = '#1F3B64';
const INFO = '#2563EB';
const SUCCESS = '#16A34A';
const WARNING = '#F97316';
const NEUTRAL = '#64748B';

const SOURCE_LABELS: Record<string, { label: string; bg: string }> = {
  ROUND_ROBIN: { label: 'Round-robin', bg: INFO },
  REFERRAL: { label: 'Giới thiệu', bg: SUCCESS },
  RETURNING_CUSTOMER: { label: 'Khách cũ', bg: WARNING },
  MANUAL_REASSIGNMENT: { label: 'Gán tay', bg: '#8B5CF6' },
};

type MyCustomer = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  companyName?: string | null;
  representative?: string | null;
  taxCode?: string | null;
  availableCredit: number;
  assignmentSource?: string | null;
  assignedAt?: string | null;
  salesNote?: string | null;
  orderCount: number;
  lastOrderDate?: string | null;
};

type CustomerDetail = MyCustomer & {
  companyAddress?: string | null;
  invoiceEmail?: string | null;
  addresses: { id: string; receiverName: string; receiverPhone: string; fullAddress: string; isDefault: boolean }[];
  recentOrders: { id: string; orderCode: string; createdAt: string; finalPayment: number; orderStatus: string; paymentStatus: string }[];
  assignmentHistory: { id: string; salesStaffName: string; assignedByName?: string | null; source: string; assignedAt: string }[];
};

function SourceBadge({ source }: { source?: string | null }) {
  const info = (source && SOURCE_LABELS[source]) || { label: 'Chưa rõ', bg: NEUTRAL };
  return (
    <span
      className="inline-flex min-w-[80px] items-center justify-center px-2 text-white text-[11px] font-medium"
      style={{ backgroundColor: info.bg, borderRadius: 4, lineHeight: '22px', height: 22, whiteSpace: 'nowrap' }}
    >
      {info.label}
    </span>
  );
}

const formatPrice = (price: number) => new Intl.NumberFormat('vi-VN').format(price);

const parseDate = (dateStr: string) => {
  const hasTimezone = /([+-]\d{2}(:?\d{2})?|Z)$/.test(dateStr);
  return new Date(hasTimezone ? dateStr : `${dateStr}Z`);
};

const formatDate = (dateStr?: string | null) => {
  if (!dateStr) return '--';
  return parseDate(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return '--';
  return parseDate(dateStr).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

function CustomerDetailModal({
  customerId,
  onClose,
  onNoteSaved,
}: {
  customerId: string;
  onClose: () => void;
  onNoteSaved: () => void;
}) {
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const data = await getMyCustomerDetail(customerId);
        if (!cancelled) {
          setDetail(data);
          setNote(data.salesNote || '');
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Không tải được chi tiết khách hàng.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const handleSaveNote = async () => {
    try {
      setSavingNote(true);
      await updateCustomerNote(customerId, note.trim() || null);
      onNoteSaved();
    } catch (err: any) {
      alert(err.message || 'Không lưu được ghi chú.');
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3">
          <h2 className="text-[15px] font-bold text-[#374151]">Chi tiết khách hàng</h2>
          <button onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-[13px] text-gray-500">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Đang tải...
          </div>
        ) : error ? (
          <div className="px-5 py-10 text-center text-[13px] text-red-600">{error}</div>
        ) : detail ? (
          <div className="space-y-5 px-5 py-4">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[13px]">
              <div>
                <p className="text-[11px] font-semibold uppercase text-gray-400">Khách hàng</p>
                <p className="font-semibold text-[#374151]">{detail.fullName}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-gray-400">Công ty</p>
                <p className="text-[#374151]">{detail.companyName || '--'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-gray-400">Email</p>
                <p className="text-[#374151]">{detail.email}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-gray-400">Số điện thoại</p>
                <p className="text-[#374151]">{detail.phoneNumber || '--'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-gray-400">Mã số thuế</p>
                <p className="text-[#374151]">{detail.taxCode || '--'}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase text-gray-400">Nguồn phân bổ</p>
                <SourceBadge source={detail.assignmentSource} />
              </div>
            </div>

            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-[#374151]">
                <StickyNote className="h-3.5 w-3.5" style={{ color: PRIMARY }} /> Ghi chú của tôi
              </p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Ghi chú về khách hàng này..."
                className="w-full rounded border border-gray-300 px-3 py-2 text-[13px] focus:border-[#1F3B64] focus:outline-none"
              />
              <button
                onClick={handleSaveNote}
                disabled={savingNote}
                className="mt-1.5 inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: PRIMARY }}
              >
                {savingNote ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Lưu ghi chú
              </button>
            </div>

            <div>
              <p className="mb-1.5 text-[12px] font-bold text-[#374151]">Sổ địa chỉ</p>
              {detail.addresses.length === 0 ? (
                <p className="text-[12px] text-gray-400">Chưa có địa chỉ.</p>
              ) : (
                <ul className="space-y-1.5">
                  {detail.addresses.map((a) => (
                    <li key={a.id} className="rounded border border-gray-200 px-3 py-2 text-[12px] text-[#374151]">
                      <span className="font-semibold">{a.receiverName}</span> · {a.receiverPhone}
                      {a.isDefault && (
                        <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-600">
                          Mặc định
                        </span>
                      )}
                      <p className="mt-0.5 text-gray-500">{a.fullAddress}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <p className="mb-1.5 text-[12px] font-bold text-[#374151]">Đơn hàng gần đây</p>
              {detail.recentOrders.length === 0 ? (
                <p className="text-[12px] text-gray-400">Chưa có đơn hàng.</p>
              ) : (
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-[11px] uppercase text-gray-400">
                      <th className="py-1.5">Mã đơn</th>
                      <th className="py-1.5">Ngày tạo</th>
                      <th className="py-1.5 text-right">Thành tiền</th>
                      <th className="py-1.5 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.recentOrders.map((o) => (
                      <tr key={o.id} className="border-b border-gray-100">
                        <td className="py-1.5 font-semibold text-[#1F3B64]">{o.orderCode}</td>
                        <td className="py-1.5 text-gray-500">{formatDateTime(o.createdAt)}</td>
                        <td className="py-1.5 text-right font-semibold">{formatPrice(o.finalPayment)}₫</td>
                        <td className="py-1.5 text-center text-gray-600">{o.orderStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div>
              <p className="mb-1.5 text-[12px] font-bold text-[#374151]">Lịch sử phân bổ</p>
              {detail.assignmentHistory.length === 0 ? (
                <p className="text-[12px] text-gray-400">Chưa có lịch sử phân bổ.</p>
              ) : (
                <ul className="space-y-1">
                  {detail.assignmentHistory.map((h) => (
                    <li key={h.id} className="flex items-center gap-2 text-[12px] text-[#374151]">
                      <SourceBadge source={h.source} />
                      <span>
                        Gán cho <span className="font-semibold">{h.salesStaffName}</span>
                        {h.assignedByName ? ` bởi ${h.assignedByName}` : ' (tự động)'}
                      </span>
                      <span className="ml-auto text-gray-400">{formatDateTime(h.assignedAt)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function SalesMyCustomersPage() {
  const [items, setItems] = useState<MyCustomer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const pageSize = 20;

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getMyCustomers({ page, pageSize, search: search || undefined });
      setItems(data.items || []);
      setTotalCount(data.totalCount || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      setError(err.message || 'Không tải được danh sách khách hàng.');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  return (
    <div className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-[18px] font-bold text-[#374151]">
            <Users className="h-5 w-5" style={{ color: PRIMARY }} />
            Khách hàng của tôi
          </h1>
          <p className="mt-0.5 text-[12px] text-gray-500">
            {totalCount} khách hàng đang được bạn phụ trách
          </p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
        </button>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Tìm theo tên, email, SĐT, công ty, MST..."
            className="h-8 w-full rounded border border-gray-300 bg-white pl-8 pr-3 text-[12px] focus:border-[#1F3B64] focus:outline-none"
          />
        </div>
        <button
          onClick={handleSearch}
          className="h-8 rounded px-4 text-[12px] font-semibold text-white"
          style={{ backgroundColor: PRIMARY }}
        >
          Tìm kiếm
        </button>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-2.5">Khách hàng</th>
              <th className="px-4 py-2.5">Liên hệ</th>
              <th className="px-4 py-2.5">Công ty</th>
              <th className="px-4 py-2.5 text-center">Nguồn phân bổ</th>
              <th className="px-4 py-2.5">Ngày gán</th>
              <th className="px-4 py-2.5 text-right">Số đơn</th>
              <th className="px-4 py-2.5 text-right">Credit</th>
              <th className="px-4 py-2.5 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-500">
                  <RefreshCw className="mr-2 inline h-4 w-4 animate-spin" /> Đang tải...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-red-600">{error}</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-gray-400">
                  Chưa có khách hàng nào được phân bổ cho bạn.
                </td>
              </tr>
            ) : (
              items.map((c, idx) => (
                <tr key={c.id} className={idx % 2 === 1 ? 'bg-gray-50/50' : ''}>
                  <td className="px-4 py-2.5">
                    <p className="font-semibold text-[#374151]">{c.fullName}</p>
                    {c.salesNote && (
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-amber-600">
                        <StickyNote className="h-3 w-3" /> {c.salesNote}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">
                    <p>{c.email}</p>
                    <p className="text-[12px] text-gray-400">{c.phoneNumber || '--'}</p>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{c.companyName || '--'}</td>
                  <td className="px-4 py-2.5 text-center">
                    <SourceBadge source={c.assignmentSource} />
                  </td>
                  <td className="px-4 py-2.5 text-gray-600">{formatDate(c.assignedAt)}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-[#374151]">{c.orderCount}</td>
                  <td className="px-4 py-2.5 text-right text-gray-600">{formatPrice(c.availableCredit)}₫</td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      onClick={() => setDetailId(c.id)}
                      className="inline-flex items-center gap-1 rounded border border-gray-300 px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
                    >
                      <Eye className="h-3 w-3" /> Chi tiết
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2.5 text-[12px] text-gray-500">
            <span>
              Trang {page}/{totalPages} · {totalCount} khách hàng
            </span>
            <div className="flex gap-1.5">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded border border-gray-300 px-3 py-1 font-semibold disabled:opacity-40"
              >
                Trước
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded border border-gray-300 px-3 py-1 font-semibold disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {detailId && (
        <CustomerDetailModal
          customerId={detailId}
          onClose={() => setDetailId(null)}
          onNoteSaved={() => {
            setDetailId(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
