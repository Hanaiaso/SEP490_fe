import { useEffect, useState } from 'react';
import { getAdminDashboard } from '../../services/dashboardService.js';

type Period = 'day' | 'week' | 'month' | 'quarter';

interface AdminLowStockItem {
  name: string;
  availableQuantity: number;
  unit: string;
  urgent: boolean;
}

interface AdminTopProduct {
  name: string;
  orderCount: number;
}

interface AdminTopCustomer {
  name: string;
  totalSpent: number;
}

interface AdminDashboardData {
  revenue: number;
  previousPeriodRevenue: number;
  receivedOrderCount: number;
  shippingOrderCount: number;
  deliveredOrderCount: number;
  cancelledOrderCount: number;
  previousPeriodCancelledOrderCount: number;
  pendingQuotationApprovalCount: number;
  staleOrderCount: number;
  lowStockAlertCount: number;
  lowStockItems: AdminLowStockItem[];
  topProducts: AdminTopProduct[];
  topCustomers: AdminTopCustomer[];
}

const PERIOD_DAYS: Record<Period, number> = { day: 1, week: 7, month: 30, quarter: 90 };
const PERIOD_LABEL: Record<Period, string> = { day: 'ngày trước', week: 'tuần trước', month: 'tháng trước', quarter: 'quý trước' };

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString('vi-VN')}₫`;
}

function trendFromPeriods(current: number, previous: number) {
  if (previous === 0) return null;
  const changePercent = ((current - previous) / previous) * 100;
  return { value: `${Math.abs(changePercent).toFixed(1)}%`, positive: changePercent >= 0 };
}

function StatCard({ label, value, trend }: {
  label: string; value: string;
  trend?: { value: string; positive: boolean } | null;
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
  const [period, setPeriod] = useState<Period>('week');
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const to = new Date();
    const from = new Date(to.getTime() - PERIOD_DAYS[period] * 24 * 60 * 60 * 1000);
    getAdminDashboard({ from: from.toISOString(), to: to.toISOString() })
      .then((result) => { if (!cancelled) setData(result); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [period]);

  const revenueTrend = data ? trendFromPeriods(data.revenue, data.previousPeriodRevenue) : null;
  const cancelledTrend = data ? trendFromPeriods(data.cancelledOrderCount, data.previousPeriodCancelledOrderCount) : null;
  const cancelledTrendInverted = cancelledTrend ? { ...cancelledTrend, positive: !cancelledTrend.positive } : null;

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

      {loading && !data ? (
        <div className="bg-white border border-[#e5e7eb] rounded-[8px] p-[32px] text-center text-[12px] text-[#64748b]">
          Đang tải dữ liệu...
        </div>
      ) : !data ? (
        <div className="bg-white border border-[#e5e7eb] rounded-[8px] p-[32px] text-center text-[12px] text-[#dc2626]">
          Không thể tải dữ liệu tổng quan. Vui lòng thử lại.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-[16px]">
            <StatCard
              label="Doanh thu thực tế"
              value={formatCurrency(data.revenue)}
              trend={revenueTrend ? { ...revenueTrend, value: `${revenueTrend.value} vs ${PERIOD_LABEL[period]}` } : null}
            />
            <StatCard label="Đơn hàng - Đã nhận đơn" value={String(data.receivedOrderCount)} />
            <StatCard label="Đơn hàng - Đang vận chuyển" value={String(data.shippingOrderCount)} />
            <StatCard label="Đơn hàng - Đã giao hàng" value={String(data.deliveredOrderCount)} />
          </div>

          <div className="grid grid-cols-4 gap-[16px]">
            <StatCard
              label="Đơn hàng - Đã hủy"
              value={String(data.cancelledOrderCount)}
              trend={cancelledTrendInverted ? { ...cancelledTrendInverted, value: `${cancelledTrend!.value} vs ${PERIOD_LABEL[period]}` } : null}
            />
            <StatCard label="Yêu cầu duyệt báo giá" value={String(data.pendingQuotationApprovalCount)} />
            <StatCard label="Đơn chờ xử lý quá lâu" value={String(data.staleOrderCount)} />
            <StatCard label="Cảnh báo tồn kho" value={String(data.lowStockAlertCount)} />
          </div>

          <div className="grid grid-cols-2 gap-[16px]">
            <div className="bg-white border border-[#e5e7eb] rounded-[8px] p-[20px]">
              <h3 className="font-semibold text-[14px] text-[#1f3b64] mb-[16px]">Cảnh báo tồn kho thấp & Nguyên liệu gần hết</h3>
              <div className="flex flex-col gap-[12px]">
                {data.lowStockItems.length === 0 ? (
                  <p className="text-[12px] text-[#94a3b8] py-[8px]">Không có cảnh báo tồn kho.</p>
                ) : (
                  data.lowStockItems.map((item, i) => (
                    <div key={i} className={`flex justify-between items-center py-[8px] ${i < data.lowStockItems.length - 1 ? 'border-b border-[#f5f7fa]' : ''}`}>
                      <div className="flex items-center gap-[8px]">
                        <span className={`w-[6px] h-[6px] rounded-full ${item.urgent ? 'bg-[#dc2626]' : 'bg-[#f97316]'}`} />
                        <span className="text-[12px] text-[#1f3b64]">{item.name}</span>
                      </div>
                      <span className={`text-[12px] font-medium ${item.urgent ? 'text-[#dc2626]' : 'text-[#f97316]'}`}>
                        {item.availableQuantity} {item.unit} còn lại
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white border border-[#e5e7eb] rounded-[8px] p-[20px]">
              <h3 className="font-semibold text-[14px] text-[#1f3b64] mb-[16px]">Top sản phẩm bán chạy & Khách hàng chi tiêu cao</h3>
              <div className="flex flex-col gap-[12px]">
                {data.topProducts.length === 0 && data.topCustomers.length === 0 ? (
                  <p className="text-[12px] text-[#94a3b8] py-[8px]">Chưa có dữ liệu trong kỳ này.</p>
                ) : (
                  <>
                    {data.topProducts.map((item, i) => (
                      <div key={`p-${i}`} className="flex justify-between items-center py-[8px] border-b border-[#f5f7fa]">
                        <span className="text-[12px] text-[#1f3b64]">{item.name}</span>
                        <span className="text-[12px] font-medium text-[#16a34a]">{item.orderCount} đơn</span>
                      </div>
                    ))}
                    {data.topCustomers.map((item, i) => (
                      <div key={`c-${i}`} className={`flex justify-between items-center py-[8px] ${i < data.topCustomers.length - 1 ? 'border-b border-[#f5f7fa]' : ''}`}>
                        <span className="text-[12px] text-[#1f3b64]">{item.name}</span>
                        <span className="text-[12px] font-medium text-[#2563eb]">{formatCurrency(item.totalSpent)}</span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
