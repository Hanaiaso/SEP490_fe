import { useState } from 'react';

function StatCard({ label, value, trend }: {
  label: string; value: string;
  trend?: { value: string; positive: boolean };
}) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[8px] p-[16px] flex flex-col gap-[8px]">
      <p className="text-[12px] text-[#64748b]">{label}</p>
      <p className="font-semibold text-[24px] text-[#1f3b64]">{value}</p>
      {trend && (
        <p className={`text-[11px] ${trend.positive ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
          {trend.positive ? '↑' : '↓'} {trend.value}
        </p>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [period, setPeriod] = useState('day');

  return (
    <div className="flex flex-col gap-[20px] p-[24px]">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-[20px] text-[#1f3b64]">Tổng quan hệ thống</h1>
        <div className="flex gap-[8px]">
          {(['day', 'week', 'month', 'quarter'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-[12px] py-[6px] rounded-[4px] text-[12px] font-medium transition-colors ${
                period === p ? 'bg-[#1f3b64] text-white' : 'bg-white border border-[#e5e7eb] text-[#64748b] hover:bg-gray-50'
              }`}
            >
              {p === 'day' ? 'Ngày' : p === 'week' ? 'Tuần' : p === 'month' ? 'Tháng' : 'Quý'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-[16px]">
        <StatCard label="Doanh thu thực tế" value="2.450.000.000₫" trend={{ value: '12.5% vs tuần trước', positive: true }} />
        <StatCard label="Đơn hàng - Đã nhận đơn" value="156" />
        <StatCard label="Đơn hàng - Đang vận chuyển" value="89" />
        <StatCard label="Đơn hàng - Đã giao hàng" value="234" />
      </div>

      <div className="grid grid-cols-4 gap-[16px]">
        <StatCard label="Đơn hàng - Đã hủy" value="12" trend={{ value: '3 đơn hôm nay', positive: false }} />
        <StatCard label="Yêu cầu duyệt báo giá" value="3" />
        <StatCard label="Đơn chờ xử lý quá lâu" value="7" />
        <StatCard label="Cảnh báo tồn kho" value="4" />
      </div>

      <div className="grid grid-cols-2 gap-[16px]">
        <div className="bg-white border border-[#e5e7eb] rounded-[8px] p-[20px]">
          <h3 className="font-semibold text-[14px] text-[#1f3b64] mb-[16px]">Cảnh báo tồn kho thấp & Nguyên liệu gần hết</h3>
          <div className="flex flex-col gap-[12px]">
            {[
              { name: 'Jumbo 200kg/cây', qty: '15 cây còn lại', urgent: true },
              { name: 'Lõi giấy 0.14kg/cái', qty: '230 cái còn lại', urgent: true },
              { name: 'Màng co PE', qty: '45 cuộn còn lại', urgent: false },
              { name: 'Thùng carton 5 lớp', qty: '120 thùng còn lại', urgent: false },
            ].map((item, i) => (
              <div key={i} className={`flex justify-between items-center py-[8px] ${i < 3 ? 'border-b border-[#f5f7fa]' : ''}`}>
                <div className="flex items-center gap-[8px]">
                  <span className={`w-[6px] h-[6px] rounded-full ${item.urgent ? 'bg-[#dc2626]' : 'bg-[#f97316]'}`} />
                  <span className="text-[12px] text-[#1f3b64]">{item.name}</span>
                </div>
                <span className={`text-[12px] font-medium ${item.urgent ? 'text-[#dc2626]' : 'text-[#f97316]'}`}>{item.qty}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#e5e7eb] rounded-[8px] p-[20px]">
          <h3 className="font-semibold text-[14px] text-[#1f3b64] mb-[16px]">Top sản phẩm bán chạy & Khách hàng chi tiêu cao</h3>
          <div className="flex flex-col gap-[12px]">
            {[
              { name: 'Giấy vệ sinh Việt Tiến 10 cuộn', value: '1.234 đơn', color: 'text-[#16a34a]' },
              { name: 'Khăn giấy ăn Việt Tiến 450g', value: '987 đơn', color: 'text-[#16a34a]' },
              { name: 'Siêu thị Vinmart+', value: '450.000.000₫', color: 'text-[#2563eb]' },
              { name: 'Chuỗi cửa hàng Bách Hóa Xanh', value: '380.000.000₫', color: 'text-[#2563eb]' },
            ].map((item, i) => (
              <div key={i} className={`flex justify-between items-center py-[8px] ${i < 3 ? 'border-b border-[#f5f7fa]' : ''}`}>
                <span className="text-[12px] text-[#1f3b64]">{item.name}</span>
                <span className={`text-[12px] font-medium ${item.color}`}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
