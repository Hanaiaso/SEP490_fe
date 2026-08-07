import { getErrorMessage } from '../../lib/errors';
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileBarChart, Download, AlertTriangle, Boxes, Warehouse as WarehouseIcon, Wallet } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { Button } from '../../components/ui/Button';
import { getWarehouses, getInventoryReport } from '../../services/warehouseService';
import type { InventoryReport, Warehouse } from '../../types/warehouse';

const PRIMARY = '#3b82f6';
const SUCCESS = '#16A34A';
const ERROR = '#DC2626';
const NEUTRAL = '#64748B';

const PERIOD_OPTIONS = [
  { key: '7', label: '7 ngày qua', days: 7 },
  { key: '30', label: '30 ngày qua', days: 30 },
  { key: '90', label: '90 ngày qua', days: 90 },
];

const formatCurrency = (n: number) => `${new Intl.NumberFormat('vi-VN').format(n || 0)} đ`;
const formatDateShort = (iso: string) => new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
const toDateInputValue = (d: Date) => d.toISOString().slice(0, 10);

function KpiCard({ label, value, sub, icon, color, onClick }: { label: string; value: string; sub: string; icon: React.ReactNode; color: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between ${onClick ? 'cursor-pointer hover:border-blue-300 hover:shadow-md transition-all' : ''}`}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <span className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18`, color }}>{icon}</span>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 mt-2">{value}</h3>
      <div className="mt-4 pt-4 border-t border-gray-100 text-xs" style={{ color }}>{sub}</div>
    </div>
  );
}

export default function WarehouseReport() {
  const navigate = useNavigate();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [periodKey, setPeriodKey] = useState('30');
  const [data, setData] = useState<InventoryReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getWarehouses().then((res: Warehouse[]) => setWarehouses(res || [])).catch(() => setWarehouses([]));
  }, []);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const days = PERIOD_OPTIONS.find(p => p.key === periodKey)?.days || 30;
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - days);

      const params: Record<string, string> = {
        fromDate: toDateInputValue(from),
        toDate: toDateInputValue(to),
      };
      if (warehouseId) params.warehouseId = warehouseId;

      const res: InventoryReport = await getInventoryReport(params);
      setData(res);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Không thể tải báo cáo tồn kho.'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [warehouseId, periodKey]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCsv = () => {
    if (!data) return;
    const lines: string[] = [];
    lines.push('BAO CAO TON KHO');
    lines.push(`Kho,${warehouses.find(w => w.id === warehouseId)?.name || 'Tat ca kho'}`);
    lines.push(`Tong gia tri ton kho,${data.totalInventoryValue}`);
    lines.push(`Tong ma hang dang ton,${data.totalSkus}`);
    lines.push(`Tong kho hoat dong,${data.totalWarehouses}`);
    lines.push(`Canh bao ton thap,${data.lowStockCount}`);
    lines.push('');
    lines.push('Ton kho theo danh muc');
    lines.push('Danh muc,So ma hang,Ton vat ly,Gia tri');
    data.categoryBreakdown.forEach(c => {
      lines.push(`${c.categoryName},${c.itemCount},${c.totalOnHand},${c.totalValue}`);
    });
    lines.push('');
    lines.push('Xuat nhap kho theo ngay');
    lines.push('Ngay,Nhap,Xuat');
    data.stockMovement.forEach(p => {
      lines.push(`${formatDateShort(p.date)},${p.totalIn},${p.totalOut}`);
    });

    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bao-cao-ton-kho-${toDateInputValue(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const chartData = (data?.stockMovement || []).map(p => ({
    day: formatDateShort(p.date),
    nhap: p.totalIn,
    xuat: p.totalOut,
  }));

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-indigo-600" />
            Báo Cáo Tồn Kho
          </h1>
          <p className="text-xs text-gray-500 mt-1">Thống kê giá trị tồn kho, xuất nhập tồn trong kỳ</p>
        </div>
        <div className="flex gap-3">
          <Button style={{ backgroundColor: PRIMARY }} className="text-xs gap-2" onClick={handleExportCsv} disabled={!data}>
            <Download className="w-4 h-4" /> Xuất CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-end flex-wrap">
        <div className="w-full md:w-56 space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Kho hàng</label>
          <select
            className="h-9 text-xs border border-gray-200 rounded-md px-2.5 bg-white w-full"
            value={warehouseId}
            onChange={e => setWarehouseId(e.target.value)}
          >
            <option value="">Tất cả kho</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600">Khoảng thời gian</label>
          <div className="flex gap-2">
            {PERIOD_OPTIONS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriodKey(p.key)}
                className={`h-9 px-3 text-xs rounded-md border transition-colors ${periodKey === p.key ? 'text-white border-transparent' : 'text-gray-600 border-gray-200 bg-white hover:bg-gray-50'}`}
                style={periodKey === p.key ? { backgroundColor: PRIMARY } : {}}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-4 py-3">{error}</div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="Tổng Giá Trị Tồn Kho"
          value={loading ? '...' : formatCurrency(data?.totalInventoryValue || 0)}
          sub="Tính theo giá niêm yết sản phẩm"
          icon={<Wallet className="w-4 h-4" />}
          color={SUCCESS}
        />
        <KpiCard
          label="Tổng Mã Hàng Đang Tồn"
          value={loading ? '...' : (data?.totalSkus || 0).toLocaleString()}
          sub="Số mã sản phẩm & vật liệu"
          icon={<Boxes className="w-4 h-4" />}
          color={PRIMARY}
        />
        <KpiCard
          label="Tổng Kho Hoạt Động"
          value={loading ? '...' : `${data?.totalWarehouses || 0} Kho`}
          sub="Đang hoạt động trên hệ thống"
          icon={<WarehouseIcon className="w-4 h-4" />}
          color={NEUTRAL}
        />
        <KpiCard
          label="Cảnh Báo Tồn Thấp"
          value={loading ? '...' : (data?.lowStockCount || 0).toLocaleString()}
          sub="Xem danh sách chi tiết →"
          icon={<AlertTriangle className="w-4 h-4" />}
          color={ERROR}
          onClick={() => navigate('/warehouse/inventory/low-stock')}
        />
      </div>

      {/* Movement chart + category breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Xuất Nhập Kho Theo Ngày</h3>
          {loading ? (
            <div className="flex items-center justify-center h-64 text-gray-400 text-xs">Đang tải dữ liệu...</div>
          ) : chartData.length === 0 ? (
            <div className="flex items-center justify-center h-64 bg-slate-50 border border-dashed border-gray-200 rounded-lg text-gray-400 text-xs">
              Không có biến động tồn kho trong khoảng thời gian này.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid #E5E7EB' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="nhap" name="Nhập kho" fill={PRIMARY} radius={[2, 2, 0, 0]} />
                <Bar dataKey="xuat" name="Xuất kho" fill="#D1D5DB" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900 text-sm">Top Mặt Hàng Sắp Hết</h3>
          </div>
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="p-4 text-xs text-gray-400">Đang tải...</div>
            ) : (data?.topLowStockItems?.length || 0) === 0 ? (
              <div className="p-4 text-xs text-gray-400">Không có mặt hàng nào dưới ngưỡng an toàn.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {data!.topLowStockItems.map(item => (
                  <li key={item.id} className="px-4 py-2.5 flex items-center justify-between text-xs">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-800 truncate">{item.itemName}</p>
                      <p className="text-gray-400">{item.itemSku || (item.itemType === 'Material' ? 'Nguyên vật liệu' : '')}</p>
                    </div>
                    <span className="font-bold text-red-600 flex-shrink-0 ml-2">{item.availableQuantity}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            onClick={() => navigate('/warehouse/inventory/low-stock')}
            className="px-4 py-2.5 text-xs text-blue-600 hover:underline border-t border-gray-100 text-left"
          >
            Xem tất cả cảnh báo tồn thấp →
          </button>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 text-sm">Tồn Kho Theo Danh Mục</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Danh mục</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-700">Số mã hàng</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-700">Tồn vật lý</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-700">Giá trị</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-xs text-gray-400">Đang tải dữ liệu...</td></tr>
              ) : (data?.categoryBreakdown?.length || 0) === 0 ? (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-xs text-gray-400">Chưa có dữ liệu tồn kho.</td></tr>
              ) : (
                data!.categoryBreakdown.map(c => (
                  <tr key={c.categoryName}>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{c.categoryName}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{c.itemCount.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">{c.totalOnHand.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-gray-800">{formatCurrency(c.totalValue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
