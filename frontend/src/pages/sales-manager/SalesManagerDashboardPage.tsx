import { useEffect, useState } from 'react';
import { RefreshCw, TrendingUp, Truck, Clock, Users2, AlertTriangle } from 'lucide-react';
import { getSalesManagerDashboard } from '../../services/dashboardService.js';

const PRIMARY = '#1F3B64';

const formatPrice = (n: number) => new Intl.NumberFormat('vi-VN').format(n || 0);

function formatDate(iso: string | null | undefined) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('vi-VN');
}

function KpiCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-lg p-3.5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] text-[#6B7280] leading-none font-bold uppercase tracking-wider">{label}</span>
        <span className="text-[#9CA3AF]">{icon}</span>
      </div>
      <p className="text-[20px] font-extrabold text-[#374151] leading-none tabular-nums mt-1">{value}</p>
      {sub && <p className="text-[10px] text-[#9CA3AF] mt-2 font-medium">{sub}</p>}
    </div>
  );
}

function PanelHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-[#E5E7EB]">
      <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider">{title}</span>
    </div>
  );
}

export default function SalesManagerDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setData(await getSalesManagerDashboard());
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-2">
          <RefreshCw className="w-8 h-8 animate-spin text-[#1F3B64]" />
          <span className="text-xs text-slate-500 font-semibold">Đang tải dữ liệu dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 h-full">
        <span className="text-xs text-red-500 font-bold">{error}</span>
        <button onClick={load} className="px-3 py-1 bg-[#1F3B64] text-white rounded text-xs font-semibold">Thử lại</button>
      </div>
    );
  }

  const teamKpi = data?.teamKpi || {};
  const staffBreakdown = data?.staffBreakdown || [];
  const openExceptions = data?.openExceptions || [];
  const overdueDebts = data?.overdueDebts || [];
  const slaBreach = data?.codSlaBreachCountToday ?? 0;

  return (
    <div className="flex flex-col h-full" style={{ background: '#F5F7FA' }}>
      <div className="bg-white border-b border-[#E5E7EB] px-5 h-11 flex items-center justify-between flex-shrink-0">
        <span className="text-[13px] font-bold text-[#374151]">Dashboard Quản lý — Toàn đội (30 ngày)</span>
        <div className="flex items-center gap-3">
          {slaBreach > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-red-600 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" /> {slaBreach} đơn COD vi phạm SLA hôm nay
            </span>
          )}
          <button onClick={load} className="h-7 px-3 text-[12px] border border-[#D1D5DB] rounded text-[#374151] bg-white hover:bg-gray-50 flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3 text-[#9CA3AF]" /> Làm mới
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {/* Team KPI */}
        <div className="grid grid-cols-4 gap-2">
          <KpiCard label="Doanh thu toàn đội" value={formatPrice(teamKpi.revenue) + ' đ'} sub={`${teamKpi.completedOrderCount ?? 0} đơn hoàn thành`} icon={<TrendingUp className="w-4 h-4" />} />
          <KpiCard label="Tỷ lệ giao thành công" value={`${Math.round((teamKpi.deliverySuccessRate ?? 0) * 100)}%`} sub={`${teamKpi.deliveryAttemptedOrderCount ?? 0} lượt giao`} icon={<Truck className="w-4 h-4" />} />
          <KpiCard label="Tốc độ xử lý TB" value={teamKpi.processingSpeedAvgHours != null ? `${teamKpi.processingSpeedAvgHours.toFixed(1)}h` : '—'} sub="Từ lúc tạo đến xác nhận" icon={<Clock className="w-4 h-4" />} />
          <KpiCard label="Khách quay lại" value={`${Math.round((teamKpi.returningCustomerRate ?? 0) * 100)}%`} sub={`${teamKpi.customersInScopeCount ?? 0} khách trong kỳ`} icon={<Users2 className="w-4 h-4" />} />
        </div>

        {/* Staff breakdown */}
        <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm">
          <PanelHeader title="Hiệu suất theo nhân viên Sale" />
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                  {['Nhân viên', 'Doanh thu', 'Đơn hoàn thành', 'Tỷ lệ giao TC', 'Tốc độ xử lý', 'Khách quay lại'].map(h => (
                    <th key={h} className="px-3 py-2 text-[11px] font-bold text-[#6B7280] whitespace-nowrap uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffBreakdown.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-6 text-center text-xs text-slate-400">Chưa có nhân viên Sale nào.</td></tr>
                ) : staffBreakdown.map((s: any) => (
                  <tr key={s.salesStaffId} style={{ borderBottom: '1px solid #F3F4F6' }}>
                    <td className="px-3 py-2 font-bold" style={{ color: PRIMARY }}>{s.salesStaffName}</td>
                    <td className="px-3 py-2 tabular-nums">{formatPrice(s.kpi?.revenue)} đ</td>
                    <td className="px-3 py-2 tabular-nums">{s.kpi?.completedOrderCount ?? 0}</td>
                    <td className="px-3 py-2 tabular-nums">{Math.round((s.kpi?.deliverySuccessRate ?? 0) * 100)}%</td>
                    <td className="px-3 py-2 tabular-nums">{s.kpi?.processingSpeedAvgHours != null ? `${s.kpi.processingSpeedAvgHours.toFixed(1)}h` : '—'}</td>
                    <td className="px-3 py-2 tabular-nums">{Math.round((s.kpi?.returningCustomerRate ?? 0) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Exceptions + Debts */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm">
            <PanelHeader title={`Ngoại lệ thanh toán đang mở (${openExceptions.length})`} />
            <div className="divide-y divide-[#F3F4F6] max-h-64 overflow-y-auto">
              {openExceptions.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">Không có ngoại lệ nào đang mở.</div>
              ) : openExceptions.map((e: any) => (
                <div key={e.id} className="px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold" style={{ color: PRIMARY }}>{e.orderCode}</span>
                    <span className="text-[10px] text-[#9CA3AF]">{formatDate(e.createdAt)}</span>
                  </div>
                  <p className="text-[11px] text-[#6B7280] mt-0.5">{e.reasonCode}{e.description ? ` — ${e.description}` : ''}</p>
                  <p className="text-[10px] text-[#9CA3AF] mt-0.5">Đã thử lại: {e.retryCount} lần</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-[#E5E7EB] rounded-lg shadow-sm">
            <PanelHeader title={`Công nợ quá hạn (${overdueDebts.length})`} />
            <div className="divide-y divide-[#F3F4F6] max-h-64 overflow-y-auto">
              {overdueDebts.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">Không có công nợ quá hạn.</div>
              ) : overdueDebts.map((d: any) => (
                <div key={d.id} className="px-3 py-2 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold truncate" style={{ color: PRIMARY }}>{d.customerName}</p>
                    <p className="text-[10px] text-[#9CA3AF] truncate">{d.orderCode}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[11px] font-bold text-[#374151] tabular-nums">{formatPrice(d.debtAmount)} đ</p>
                    <p className="text-[10px] text-red-500 font-semibold">{d.overdueDays} ngày quá hạn</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
