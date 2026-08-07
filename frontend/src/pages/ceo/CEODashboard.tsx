import { useState, useEffect } from 'react';
import { RefreshCw, Package, AlertTriangle, Boxes } from 'lucide-react';
import { getCeoDashboard } from '../../services/dashboardService.js';

type Period = 'day' | 'week' | 'month' | 'quarter';

const PERIOD_DAYS: Record<Period, number> = { day: 1, week: 7, month: 30, quarter: 90 };

function rangeForPeriod(period: Period) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - PERIOD_DAYS[period]);
  return { from: from.toISOString(), to: to.toISOString() };
}

const formatPrice = (n: number) => new Intl.NumberFormat('vi-VN').format(n || 0);

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

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-[11px] text-[#64748b]">{label}</p>
      <p className="font-semibold text-[16px] text-[#1f3b64]">{value}</p>
    </div>
  );
}

export default function CEODashboard({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const [period, setPeriod] = useState<Period>('month');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (p: Period) => {
    setLoading(true);
    setError('');
    try {
      setData(await getCeoDashboard(rangeForPeriod(p)));
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(period); }, [period]);

  const orgKpi = data?.orgKpi || {};
  const inventory = data?.inventory || {};
  const purchaseOrders = data?.purchaseOrders || { countsByStatus: {}, recentOpenPurchaseOrders: [] };
  const discrepancy = data?.discrepancy || {};
  const totalPOs = Object.values(purchaseOrders.countsByStatus || {}).reduce((a: number, b: any) => a + (b as number), 0);
  const discrepancyReviewCount = purchaseOrders.countsByStatus?.DiscrepancyReview ?? 0;

  return (
    <div className="flex flex-col gap-[20px] p-[24px]">
      <div className="flex items-center justify-between">
        <h1 className="font-semibold text-[20px] text-[#1f3b64]">Tổng quan CEO (Điều hành & Cung ứng)</h1>
        <div className="flex items-center gap-[8px]">
          {loading && <RefreshCw className="w-4 h-4 animate-spin text-[#9ca3af]" />}
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

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-[8px] p-3 text-[12px] text-red-600 flex items-center justify-between">
          {error}
          <button onClick={() => load(period)} className="font-semibold hover:underline">Thử lại</button>
        </div>
      )}

      <div className="grid grid-cols-4 gap-[16px]">
        <StatCard label="Doanh thu (kỳ đã chọn)" value={formatPrice(orgKpi.revenue) + '₫'} trend={{ value: `${orgKpi.completedOrderCount ?? 0} đơn hoàn thành`, positive: true }} />
        <StatCard label="Tỷ lệ giao thành công" value={`${Math.round((orgKpi.deliverySuccessRate ?? 0) * 100)}%`} />
        <StatCard label="Đơn mua hàng PO (Tổng)" value={`${totalPOs} đơn`} />
        <StatCard label="PO sai lệch chờ CEO duyệt" value={`${discrepancyReviewCount} đơn`} trend={discrepancyReviewCount > 0 ? { value: 'Cần xử lý gấp', positive: false } : undefined} />
      </div>

      {/* Inventory + Discrepancy strips */}
      <div className="grid grid-cols-2 gap-[16px]">
        <div className="bg-white border border-[#e5e7eb] rounded-[8px] p-[16px]">
          <div className="flex items-center gap-2 mb-[12px]">
            <Boxes className="w-4 h-4 text-[#1f3b64]" />
            <h3 className="font-semibold text-[13px] text-[#1f3b64]">Tổng quan tồn kho</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MiniStat label="Tổng SKU" value={String(inventory.totalSkus ?? 0)} />
            <MiniStat label="Cảnh báo tồn thấp" value={String(inventory.lowStockCount ?? 0)} />
            <MiniStat label="Giá trị tồn kho ước tính" value={formatPrice(inventory.estimatedInventoryValue) + '₫'} />
          </div>
        </div>

        <div className="bg-white border border-[#e5e7eb] rounded-[8px] p-[16px]">
          <div className="flex items-center gap-2 mb-[12px]">
            <AlertTriangle className="w-4 h-4 text-[#1f3b64]" />
            <h3 className="font-semibold text-[13px] text-[#1f3b64]">Chênh lệch nhập kho (kỳ đã chọn, {discrepancy.goodsReceiptCount ?? 0} phiếu nhập)</h3>
          </div>
          <div className="grid grid-cols-4 gap-3">
            <MiniStat label="Thiếu" value={String(discrepancy.totalShortQuantity ?? 0)} />
            <MiniStat label="Thừa" value={String(discrepancy.totalExcessQuantity ?? 0)} />
            <MiniStat label="Hỏng" value={String(discrepancy.totalDamagedQuantity ?? 0)} />
            <MiniStat label="Sai hàng" value={String(discrepancy.totalWrongItemQuantity ?? 0)} />
          </div>
        </div>
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
              <span className="text-blue-700 font-bold">{(purchaseOrders.countsByStatus?.SentToWarehouse ?? 0) + (purchaseOrders.countsByStatus?.PartiallyReceived ?? 0)} PO đang nhận</span>
            </div>
            <div className="flex justify-between items-center py-[8px]">
              <span className="text-[#1f3b64] font-medium">Danh mục Nhà cung cấp</span>
              <button onClick={() => setActiveTab('suppliers')} className="text-blue-600 font-semibold hover:underline">Xem NCC →</button>
            </div>
          </div>
        </div>
      </div>

      {purchaseOrders.recentOpenPurchaseOrders?.length > 0 && (
        <div className="bg-white border border-[#e5e7eb] rounded-[8px] overflow-hidden">
          <div className="px-[16px] py-[12px] border-b border-[#e5e7eb] flex items-center gap-2">
            <Package className="w-4 h-4 text-[#1f3b64]" />
            <h3 className="font-semibold text-[13px] text-[#1f3b64]">PO đang mở gần đây</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-[#f5f7fa] border-b border-[#e5e7eb]">
                <th className="text-left px-[16px] py-[10px] text-[11px] font-medium text-[#64748b] uppercase">Mã PO</th>
                <th className="text-left px-[16px] py-[10px] text-[11px] font-medium text-[#64748b] uppercase">Nhà cung cấp</th>
                <th className="text-left px-[16px] py-[10px] text-[11px] font-medium text-[#64748b] uppercase">Trạng thái</th>
                <th className="text-left px-[16px] py-[10px] text-[11px] font-medium text-[#64748b] uppercase">Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {purchaseOrders.recentOpenPurchaseOrders.map((po: any) => (
                <tr key={po.id} className="border-b border-[#f5f7fa] hover:bg-[#f5f7fa] cursor-pointer" onClick={() => setActiveTab('purchase-orders')}>
                  <td className="px-[16px] py-[10px] text-[12px] font-medium text-[#1f3b64]">{po.code}</td>
                  <td className="px-[16px] py-[10px] text-[12px] text-[#64748b]">{po.supplierName}</td>
                  <td className="px-[16px] py-[10px] text-[12px] text-[#64748b]">{po.status}</td>
                  <td className="px-[16px] py-[10px] text-[12px] text-[#64748b]">{new Date(po.createdAt).toLocaleDateString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
