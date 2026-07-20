import { useState, useEffect } from 'react';
import { getPurchaseOrders as fetchPOs } from '../../services/purchaseOrderService.js';

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

export default function CEODashboard({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const [period, setPeriod] = useState('month');
  const [poStats, setPoStats] = useState({ total: 0, reviewNeeded: 0, pendingWarehouse: 0 });

  useEffect(() => {
    fetchPOs('').then((pos: any[]) => {
      if (Array.isArray(pos)) {
        setPoStats({
          total: pos.length,
          reviewNeeded: pos.filter(p => p.status === 'DiscrepancyReview').length,
          pendingWarehouse: pos.filter(p => p.status === 'SentToWarehouse' || p.status === 'PartiallyReceived').length
        });
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-[20px] p-[24px]">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-[20px] text-[#1f3b64]">Tổng quan CEO (Điều hành & Cung ứng)</h1>
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
        <StatCard label="Doanh thu dự kiến (Đã duyệt)" value="3.850.000.000₫" trend={{ value: '18.2% vs tháng trước', positive: true }} />
        <StatCard label="Báo giá đàm phán chờ duyệt" value="2 đơn" />
        <StatCard label="Đơn mua hàng PO (Tổng)" value={`${poStats.total} đơn`} />
        <StatCard label="PO sai lệch chờ CEO duyệt" value={`${poStats.reviewNeeded} đơn`} trend={{ value: 'Cần xử lý gấp', positive: false }} />
      </div>

      <div className="grid grid-cols-2 gap-[16px]">
        <div className="bg-white border border-[#e5e7eb] rounded-[8px] p-[20px]">
          <h3 className="font-semibold text-[14px] text-[#1f3b64] mb-[16px]">Luồng công việc đàm phán giá (≥ 100 Triệu)</h3>
          <div className="flex flex-col gap-[12px] text-[12px]">
            <div className="flex justify-between items-center py-[8px] border-b border-[#f5f7fa]">
              <span className="text-[#1f3b64] font-medium">1. Khách hàng gửi yêu cầu báo giá</span>
              <span className="text-gray-500">Đơn ≥ 100M</span>
            </div>
            <div className="flex justify-between items-center py-[8px] border-b border-[#f5f7fa]">
              <span className="text-[#1f3b64] font-medium">2. Sales Staff & Sales Manager thẩm định</span>
              <span className="text-gray-500">Sales đề xuất giá</span>
            </div>
            <div className="flex justify-between items-center py-[8px]">
              <span className="text-[#1f3b64] font-bold text-amber-600">3. CEO phê duyệt giá cuối cùng</span>
              <button onClick={() => setActiveTab('price-negotiation')} className="text-blue-600 font-semibold hover:underline">Vào duyệt ngay →</button>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#e5e7eb] rounded-[8px] p-[20px]">
          <h3 className="font-semibold text-[14px] text-[#1f3b64] mb-[16px]">Đặt hàng & Quản lý Nhà cung cấp (PO)</h3>
          <div className="flex flex-col gap-[12px] text-[12px]">
            <div className="flex justify-between items-center py-[8px] border-b border-[#f5f7fa]">
              <span className="text-[#1f3b64] font-medium">Phát hành Purchase Order mới</span>
              <button onClick={() => setActiveTab('purchase-orders')} className="text-blue-600 font-semibold hover:underline">Tạo PO mới →</button>
            </div>
            <div className="flex justify-between items-center py-[8px] border-b border-[#f5f7fa]">
              <span className="text-[#1f3b64] font-medium">Tiến độ nhận hàng tại Kho</span>
              <span className="text-blue-700 font-bold">{poStats.pendingWarehouse} PO đang nhận</span>
            </div>
            <div className="flex justify-between items-center py-[8px]">
              <span className="text-[#1f3b64] font-medium">Danh mục Nhà cung cấp</span>
              <button onClick={() => setActiveTab('suppliers')} className="text-blue-600 font-semibold hover:underline">Xem NCC →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
