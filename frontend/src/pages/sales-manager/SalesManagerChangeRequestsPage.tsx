import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Eye, UserCog } from 'lucide-react';
import { getManagerList } from '../../services/salesChangeRequestService';

// LUỒNG 7 (MGR-06): danh sách yêu cầu đổi Sale phụ trách chờ Manager xử lý

type ListItem = {
  id: string;
  customerName: string;
  companyName?: string;
  currentSalesStaffName: string;
  desiredSalesStaffName?: string;
  reason: string;
  status: string;
  hasExplanation: boolean;
  createdAt: string;
  reviewedAt?: string;
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  Pending: { label: 'Chờ xử lý', className: 'bg-yellow-100 text-yellow-700' },
  MoreInfoRequested: { label: 'Chờ khách bổ sung', className: 'bg-orange-100 text-orange-700' },
  Approved: { label: 'Đã phê duyệt', className: 'bg-green-100 text-green-700' },
  Rejected: { label: 'Đã từ chối', className: 'bg-red-100 text-red-700' },
  Cancelled: { label: 'Khách đã hủy', className: 'bg-gray-100 text-gray-500' },
};

const FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'Pending', label: 'Chờ xử lý' },
  { value: 'MoreInfoRequested', label: 'Chờ bổ sung' },
  { value: 'Approved', label: 'Đã duyệt' },
  { value: 'Rejected', label: 'Đã từ chối' },
];

// BE trả DateTime UTC không kèm 'Z' — phải gắn thêm để JS không hiểu nhầm thành giờ local
function parseUtc(value: string) {
  return new Date(/Z|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`);
}

// Tuổi SLA tính từ lúc khách gửi yêu cầu (Bước 2)
function slaAge(createdAt: string) {
  const ms = Date.now() - parseUtc(createdAt).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return 'dưới 1 giờ';
  if (hours < 24) return `${hours} giờ`;
  return `${Math.floor(hours / 24)} ngày`;
}

function formatDate(value: string) {
  return parseUtc(value).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

export default function SalesManagerChangeRequestsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ListItem[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getManagerList({ status: statusFilter || undefined, pageSize: 50 })
      .then((data) => {
        if (!cancelled) setItems(data?.items ?? []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Không thể tải danh sách');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [statusFilter]);

  return (
    <div className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <UserCog className="h-5 w-5" />
            Yêu cầu đổi Sale phụ trách
          </h1>
          <p className="text-[13px] text-gray-500">Rà soát và phê duyệt yêu cầu đổi Sale của khách hàng</p>
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 rounded border border-gray-300 bg-white px-2 text-[12px] text-gray-700 outline-none focus:border-[#1F3B64]"
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {['Khách hàng', 'Sale hiện tại', 'Sale mong muốn', 'Lý do', 'Giải trình', 'Trạng thái', 'Gửi lúc', 'Tuổi SLA', ''].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-[#1F3B64]" />
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[13px] text-gray-400">
                    Không có yêu cầu nào
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const meta = STATUS_META[item.status] ?? { label: item.status, className: 'bg-gray-100 text-gray-700' };
                  const isOpen = item.status === 'Pending' || item.status === 'MoreInfoRequested';

                  return (
                    <tr key={item.id} className="transition-colors hover:bg-gray-50/60">
                      <td className="px-3 py-3">
                        <p className="text-[13px] font-semibold text-gray-900">{item.companyName || item.customerName}</p>
                        {item.companyName && <p className="text-[11px] text-gray-500">{item.customerName}</p>}
                      </td>
                      <td className="px-3 py-3 text-[13px] text-gray-700">{item.currentSalesStaffName}</td>
                      <td className="px-3 py-3 text-[13px] text-gray-700">{item.desiredSalesStaffName || '—'}</td>
                      <td className="max-w-[220px] px-3 py-3">
                        <p className="truncate text-[13px] text-gray-700" title={item.reason}>{item.reason}</p>
                      </td>
                      <td className="px-3 py-3">
                        {item.hasExplanation ? (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">Đã gửi</span>
                        ) : (
                          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">Chưa</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}>{meta.label}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-[12px] text-gray-500">{formatDate(item.createdAt)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-[12px]">
                        {isOpen ? (
                          <span className="font-semibold text-orange-600">{slaAge(item.createdAt)}</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => navigate(`/sales-manager/change-requests/${item.id}`)}
                          className="inline-flex items-center gap-1 text-[12px] font-medium text-[#1F3B64] hover:underline"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
