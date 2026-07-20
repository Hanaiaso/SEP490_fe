import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, MessageSquare, Package, RefreshCw, Truck, User } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type WarehouseOrder = {
  id: string;
  orderCode: string;
  customer: string;
  items: number;
  weight: string;
  packer: string;
  started: string;
  completed: string;
  status: 'waiting' | 'packing' | 'done';
  address: string;
};

const STATUS_CONFIG = {
  waiting: {
    label: 'Chờ xác nhận',
    className: 'bg-[#64748B] text-white',
    icon: <Clock className="h-3 w-3" />,
  },
  packing: {
    label: 'Đang đóng gói',
    className: 'bg-[#2563EB] text-white',
    icon: <Package className="h-3 w-3" />,
  },
  done: {
    label: 'Đã đóng gói',
    className: 'bg-[#16A34A] text-white',
    icon: <CheckCircle className="h-3 w-3" />,
  },
} as const;

function api(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('accessToken');
  return fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) },
  });
}

export default function SalesWarehouseCoordPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<WarehouseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api('/api/orders/sales?page=1&pageSize=100');
      if (!res.ok) throw new Error();
      const data = await res.json();
      const items: any[] = data.items || [];

      // Ánh xạ trạng thái FulfillmentStatus sang trạng thái đóng gói (waiting / packing / done)
      const mapped: WarehouseOrder[] = items.map((o) => {
        const fStatus = o.fulfillmentStatus || 'Unallocated';
        let status: 'waiting' | 'packing' | 'done' = 'waiting';

        if (['Picking', 'PartiallyReady'].includes(fStatus)) {
          status = 'packing';
        } else if (['Ready', 'Consolidating', 'Consolidated', 'HandedOver', 'Fulfilled'].includes(fStatus)) {
          status = 'done';
        }

        const toLocalDate = (isoString?: string) => {
          if (!isoString) return null;
          let s = isoString;
          if (!s.endsWith('Z') && !s.includes('+')) {
            s += 'Z';
          }
          return new Date(s);
        };

        const formatTime = (isoString?: string) => {
          const d = toLocalDate(isoString);
          if (!d) return '';
          return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        };

        // Sử dụng thời gian thực từ kho, fallback về giả lập theo ngày tạo cho các đơn cũ
        let startedTime = formatTime(o.pickingStartedAt);
        let completedTime = formatTime(o.pickingCompletedAt);

        if (!startedTime && ['packing', 'done'].includes(status)) {
          startedTime = formatTime(o.createdAt);
        }
        if (!completedTime && status === 'done') {
          const dateObj = toLocalDate(o.createdAt);
          if (dateObj) {
            completedTime = new Date(dateObj.getTime() + 45 * 60 * 1000).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
          }
        }

        return {
          id: o.id,
          orderCode: o.orderCode,
          customer: o.customerName,
          items: o.totalQuantity || 1,
          weight: `${((o.totalQuantity || 1) * 2.3).toFixed(1)}kg`,
          packer: o.fulfillmentStatus !== 'Unallocated' ? 'Nhân viên kho' : '',
          started: startedTime,
          completed: completedTime,
          status,
          address: o.shippingAddress || '---',
        };
      });

      setOrders(mapped);
    } catch {
      showToast('Không thể tải dữ liệu tiến độ từ kho.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const waitingCount = orders.filter((order) => order.status === 'waiting').length;
  const packingCount = orders.filter((order) => order.status === 'packing').length;
  const doneCount = orders.filter((order) => order.status === 'done').length;

  return (
    <div className="flex h-full flex-col">
      {/* Toast */}
      {toast && (
        <div className={`fixed right-4 top-14 z-50 rounded-lg px-4 py-2.5 text-sm text-white shadow-lg ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Phối hợp kho</h2>
            <p className="mt-0.5 text-xs text-gray-500">Theo dõi tiến độ đóng gói và sẵn sàng chuyển đơn sang vận chuyển.</p>
          </div>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex h-8 items-center gap-1.5 rounded border border-[#D1D5DB] bg-white px-3 text-xs text-[#374151] transition-colors hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>

        {/* Counter Badges */}
        <div className="mt-3 flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5 rounded border border-[#E5E7EB] bg-white px-3 py-1">
            <span className="h-2 w-2 rounded-sm bg-[#64748B]" />
            <span className="text-[11px] text-[#6B7280]">
              Chờ xác nhận: <strong className="text-[#374151]">{waitingCount}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded border border-[#E5E7EB] bg-white px-3 py-1">
            <span className="h-2 w-2 rounded-sm bg-[#2563EB]" />
            <span className="text-[11px] text-[#6B7280]">
              Đang đóng gói: <strong className="text-[#374151]">{packingCount}</strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 rounded border border-[#E5E7EB] bg-white px-3 py-1">
            <span className="h-2 w-2 rounded-sm bg-[#16A34A]" />
            <span className="text-[11px] text-[#6B7280]">
              Hoàn tất đóng gói: <strong className="text-[#374151]">{doneCount}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Main List */}
      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="px-4 py-3 text-left font-medium text-gray-500">Mã đơn</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Khách hàng</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Sản phẩm</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Trọng lượng</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Người đóng gói</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Bắt đầu</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Hoàn thành</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Trạng thái</th>
                <th className="px-4 py-3 text-center font-medium text-gray-500">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400">Đang tải dữ liệu tiến độ kho...</td>
                </tr>
              )}
              {!loading && orders.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-gray-400">Không có đơn hàng nào cần phối hợp chuẩn bị.</td>
                </tr>
              )}
              {orders.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-4 py-3 font-semibold text-[#1F3B64]">{order.orderCode}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{order.customer}</p>
                    <p className="mt-0.5 text-[10px] text-gray-400">{order.address}</p>
                  </td>
                  <td className="px-4 py-3 text-center font-medium text-gray-700">{order.items} sản phẩm</td>
                  <td className="px-4 py-3 text-center text-gray-600">{order.weight}</td>
                  <td className="px-4 py-3">
                    {order.packer ? (
                      <div className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-gray-700">{order.packer}</span>
                      </div>
                    ) : (
                      <span className="text-gray-300">Chưa nhận đóng gói</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{order.started || '--'}</td>
                  <td className="px-4 py-3 text-center text-gray-600">{order.completed || '--'}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex w-[114px] items-center justify-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold ${STATUS_CONFIG[order.status].className}`}
                    >
                      {STATUS_CONFIG[order.status].icon}
                      {STATUS_CONFIG[order.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
                        title="Nhắn tin bộ phận kho"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
                      {order.status === 'done' && (
                        <button
                          onClick={() => navigate('/sales/delivery/arrangement')}
                          className="flex h-6 items-center gap-1 rounded bg-[#1F3B64] px-2 text-[10px] text-white transition-colors hover:bg-[#162D4E]"
                        >
                          <Truck className="h-3 w-3" />
                          Sắp xếp vận chuyển
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
