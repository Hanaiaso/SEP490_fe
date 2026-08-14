import { getErrorMessage } from '../../lib/errors';
/**
 * SalesManagerTargetsPage.tsx
 * Sales Manager đặt mục tiêu doanh thu tháng cho từng Sales Staff.
 */
import { useEffect, useRef, useState } from 'react';
import { CheckCircle, RefreshCw, Save, Target, XCircle } from 'lucide-react';
import { getSalesTeamTargets, setSalesTarget } from '../../services/dashboardService.js';
import type { SalesStaffTarget } from '../../types/dashboard';

const PRIMARY = '#1F3B64';

const MONTH_NAMES = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4', 'Tháng 5', 'Tháng 6',
  'Tháng 7', 'Tháng 8', 'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

function formatPrice(n: number) {
  return new Intl.NumberFormat('vi-VN').format(n) + ' đ';
}

function formatDate(s?: string | null) {
  if (!s) return '—';
  const hasZ = /([+-]\d{2}|Z)$/.test(s);
  return new Date(hasZ ? s : s + 'Z').toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function AchievementBar({ rate }: { rate?: number | null }) {
  if (rate == null) {
    return <span className="text-[11px] text-gray-400">Chưa có mục tiêu</span>;
  }
  const pct = Math.min(rate * 100, 100);
  const color = rate >= 1 ? '#16A34A' : rate >= 0.7 ? '#F97316' : '#DC2626';
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] font-semibold" style={{ color }}>
        {Math.round(rate * 100)}%
      </span>
    </div>
  );
}

export default function SalesManagerTargetsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [items, setItems] = useState<SalesStaffTarget[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setSuccessMsg(''), 4000);
  };

  const fetchTargets = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getSalesTeamTargets({ year, month });
      const list: SalesStaffTarget[] = Array.isArray(data) ? data : [];
      setItems(list);
      setDrafts(Object.fromEntries(list.map((i) => [i.salesStaffId, String(i.targetAmount || '')])));
    } catch (err: unknown) {
      setError(getErrorMessage(err) ?? 'Không thể tải danh sách mục tiêu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month]);

  const handleSave = async (item: SalesStaffTarget) => {
    const raw = drafts[item.salesStaffId] ?? '';
    const amount = parseFloat(raw);
    if (isNaN(amount) || amount < 0) {
      alert('Mục tiêu doanh thu không hợp lệ.');
      return;
    }
    setSavingId(item.salesStaffId);
    try {
      await setSalesTarget({ salesStaffId: item.salesStaffId, year, month, targetAmount: amount });
      showSuccess(`Đã đặt mục tiêu ${formatPrice(amount)} cho ${item.salesStaffName}.`);
      fetchTargets();
    } catch (err: unknown) {
      alert(getErrorMessage(err) ?? 'Lỗi khi đặt mục tiêu.');
    } finally {
      setSavingId(null);
    }
  };

  const years = [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1];

  return (
    <div className="flex h-full flex-col bg-[#F5F7FA]">
      <div className="flex h-11 flex-shrink-0 items-center justify-between border-b border-[#E5E7EB] bg-white px-5">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-[#1F3B64]" />
          <span className="text-[13px] font-bold text-[#374151]">Mục tiêu doanh thu Sales Staff</span>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="h-7 rounded border border-[#D1D5DB] bg-white px-2 text-[12px] text-gray-700 outline-none focus:border-[#1F3B64]"
          >
            {MONTH_NAMES.map((label, idx) => (
              <option key={idx} value={idx + 1}>{label}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="h-7 rounded border border-[#D1D5DB] bg-white px-2 text-[12px] text-gray-700 outline-none focus:border-[#1F3B64]"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={fetchTargets}
            disabled={loading}
            className="flex h-7 items-center gap-1.5 rounded border border-[#D1D5DB] bg-white px-3 text-[12px] text-[#374151] hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 text-gray-400 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 shadow-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0 text-green-600" />
          <p className="flex-1 text-[12px] font-semibold text-green-800">{successMsg}</p>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4">
        <div className="rounded-lg border border-[#E5E7EB] bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex h-52 items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <RefreshCw className="h-7 w-7 animate-spin text-[#1F3B64]" />
                <span className="text-xs text-gray-500">Đang tải mục tiêu doanh thu...</span>
              </div>
            </div>
          ) : error ? (
            <div className="flex h-52 flex-col items-center justify-center gap-3 px-4 text-center">
              <XCircle className="h-8 w-8 text-red-400" />
              <p className="text-sm font-semibold text-red-600">{error}</p>
              <button onClick={fetchTargets} className="rounded px-3 py-1.5 text-xs font-semibold text-white" style={{ backgroundColor: PRIMARY }}>
                Thử lại
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-sm text-gray-400">
              Chưa có Sales Staff nào đang hoạt động.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ fontSize: 12 }}>
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                    {['Sales Staff', 'Mục tiêu tháng (đ)', 'Doanh thu thực tế', 'Tiến độ', 'Cập nhật lần cuối', ''].map((h) => (
                      <th key={h} className="px-3 py-3 text-[10px] font-bold uppercase tracking-wider text-[#6B7280] whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr
                      key={item.salesStaffId}
                      style={{ borderBottom: '1px solid #F3F4F6', background: idx % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}
                    >
                      <td className="px-3 py-3 font-semibold text-gray-800 whitespace-nowrap">{item.salesStaffName}</td>
                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min={0}
                          value={drafts[item.salesStaffId] ?? ''}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [item.salesStaffId]: e.target.value }))}
                          placeholder="Nhập mục tiêu..."
                          className="h-8 w-40 rounded border border-gray-300 px-2 text-[12px] outline-none focus:border-[#1F3B64]"
                        />
                      </td>
                      <td className="px-3 py-3 font-bold whitespace-nowrap text-gray-800">
                        {formatPrice(item.actualRevenue)}
                      </td>
                      <td className="px-3 py-3">
                        <AchievementBar rate={item.achievementRate} />
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-gray-500">
                        {item.setAt ? (
                          <span title={item.setByName ?? ''}>{formatDate(item.setAt)}</span>
                        ) : (
                          <span className="text-gray-400">Chưa đặt</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => handleSave(item)}
                          disabled={savingId === item.salesStaffId}
                          className="inline-flex items-center gap-1 rounded bg-[#1F3B64] px-2.5 py-1.5 text-[10px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {savingId === item.salesStaffId ? (
                            <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                          ) : (
                            <Save className="h-2.5 w-2.5" />
                          )}
                          Lưu
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
