import { useState } from 'react';
import { Button } from '../../components/sales-ui/button';
import { CheckCheck, Bell } from 'lucide-react';

const PRIMARY = '#1F3B64';
const INFO    = '#2563EB';
const SUCCESS = '#16A34A';
const WARNING = '#F97316';
const ERROR   = '#DC2626';
const NEUTRAL = '#64748B';

type NotifType = 'new_order' | 'low_stock' | 'low_material' | 'admin_reply' | 'audit_request';

const TYPE_CFG: Record<NotifType, { label: string; bg: string }> = {
  new_order:     { label: 'Đơn mới từ Sales',    bg: INFO    },
  low_stock:     { label: 'Thiếu hàng',           bg: ERROR   },
  low_material:  { label: 'Nguyên liệu gần hết',  bg: WARNING },
  admin_reply:   { label: 'Admin phản hồi',        bg: SUCCESS },
  audit_request: { label: 'Yêu cầu kiểm kê',      bg: PRIMARY },
};

const NOTIFS = [
  { id: 'N-001', type: 'new_order' as NotifType,     title: 'Đơn hàng mới ĐH-2406-092',            body: 'Sales vừa tạo đơn hàng mới 120 sơ mi nam cần đóng gói và xuất kho trước 08/06.',              time: '06/06 09:30', read: false },
  { id: 'N-002', type: 'low_material' as NotifType,  title: 'Keo dán nhãn gần hết tồn',            body: 'Tồn kho keo dán nhãn còn 12 lít (ngưỡng cảnh báo: 30 lít). Cần đặt mua thêm.',              time: '06/06 08:00', read: false },
  { id: 'N-003', type: 'new_order' as NotifType,     title: 'Đơn hàng mới ĐH-2406-091',            body: 'Sales vừa tạo đơn hàng 50 đồng phục VP nữ, giao hàng 10/06.',                                time: '06/06 07:45', read: false },
  { id: 'N-004', type: 'admin_reply' as NotifType,   title: 'Admin xác nhận yêu cầu nhập kho',      body: 'Yêu cầu nhập Keo dán nhãn (CB-001) đã được Admin xác nhận. Đơn đặt hàng đang xử lý.',       time: '05/06 16:10', read: true  },
  { id: 'N-005', type: 'low_stock' as NotifType,     title: 'Thiếu hàng đơn ĐH-2406-087',          body: 'Đơn hàng ĐH-2406-087 báo thiếu Vải linen nhập khẩu 50m. Cần kiểm tra tồn kho.',             time: '05/06 14:30', read: true  },
  { id: 'N-006', type: 'audit_request' as NotifType, title: 'Yêu cầu kiểm kê đột xuất',            body: 'Ban quản lý yêu cầu kiểm kê toàn bộ kho nguyên liệu vào ngày 07/06/2026 (thứ Bảy).',        time: '05/06 11:00', read: true  },
  { id: 'N-007', type: 'new_order' as NotifType,     title: 'Đơn hàng mới ĐH-2406-089',            body: 'Sales tạo đơn 80 quần tây nam slim fit + 40 sơ mi, xuất trước 07/06.',                       time: '05/06 09:20', read: true  },
  { id: 'N-008', type: 'admin_reply' as NotifType,   title: 'Phản hồi báo cáo tồn kho',            body: 'Admin đã xem xét báo cáo tồn kho tuần 22. Ghi chú: Cần theo dõi sát hàng chậm luân chuyển.',time: '04/06 17:00', read: true  },
  { id: 'N-009', type: 'low_material' as NotifType,  title: 'Lõi giấy sắp dưới ngưỡng tối thiểu', body: 'Tồn kho lõi giấy: 180 cuộn (ngưỡng: 200). Dự kiến hết sau 3 ngày sản xuất.',                 time: '04/06 08:30', read: true  },
  { id: 'N-010', type: 'audit_request' as NotifType, title: 'Kết quả kiểm kê Ca chiều 04/06',       body: 'Kiểm kê Ca chiều 04/06 hoàn tất. Phát hiện lệch 5 cuộn Jumbo tại vị trí A3. Đã lập biên bản.', time: '03/06 17:30', read: true },
];

const FILTER_TABS = [
  { id: 'all',           label: 'Tất cả' },
  { id: 'new_order',     label: 'Đơn mới' },
  { id: 'low_stock',     label: 'Thiếu hàng' },
  { id: 'low_material',  label: 'Nguyên liệu' },
  { id: 'admin_reply',   label: 'Admin phản hồi' },
  { id: 'audit_request', label: 'Kiểm kê' },
];

export default function WarehouseNotifications() {
  const [filter, setFilter] = useState('all');
  const [readState, setReadState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(NOTIFS.map(n => [n.id, n.read]))
  );

  const markAllRead = () => setReadState(Object.fromEntries(NOTIFS.map(n => [n.id, true])));
  const markRead = (id: string) => setReadState(prev => ({ ...prev, [id]: true }));

  const filtered = NOTIFS.filter(n => filter === 'all' || n.type === filter);
  const unreadCount = Object.values(readState).filter(v => !v).length;

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Thông báo</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {unreadCount > 0 ? `${unreadCount} chưa đọc` : 'Đã đọc tất cả'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={markAllRead}>
              <CheckCheck className="w-3.5 h-3.5" /> Đánh dấu tất cả đã đọc
            </Button>
          )}
        </div>
        <div className="flex gap-1">
          {FILTER_TABS.map(t => (
            <button
              key={t.id}
              className="px-3 py-1.5 text-xs rounded-md transition-colors"
              style={filter === t.id
                ? { backgroundColor: PRIMARY, color: '#fff' }
                : { backgroundColor: '#F3F4F6', color: '#6B7280' }}
              onClick={() => setFilter(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        <div className="space-y-2">
          {filtered.map(n => {
            const isRead = readState[n.id];
            const cfg = TYPE_CFG[n.type];
            return (
              <div
                key={n.id}
                className="bg-white rounded-lg border px-4 py-3 flex gap-3 cursor-pointer hover:shadow-sm transition-shadow"
                style={{ borderColor: isRead ? '#E5E7EB' : '#DBEAFE', backgroundColor: isRead ? '#fff' : '#F0F7FF' }}
                onClick={() => markRead(n.id)}
              >
                <div className="mt-0.5 flex-shrink-0">
                  <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: cfg.bg }}>
                    <Bell className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      {!isRead && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: INFO }} />}
                      <span className="text-xs font-semibold text-gray-900">{n.title}</span>
                    </div>
                    <span className="text-[11px] text-gray-400 flex-shrink-0">{n.time}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">{n.body}</p>
                  <div className="mt-1.5">
                    <span className="text-[10px] font-medium text-white px-2 py-0.5 whitespace-nowrap" style={{ backgroundColor: cfg.bg, borderRadius: 4 }}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-12 text-center">
              <Bell className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Không có thông báo</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
