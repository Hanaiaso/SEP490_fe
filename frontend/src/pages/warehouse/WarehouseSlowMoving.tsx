import { getErrorMessage } from '../../lib/errors';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Search, Download } from 'lucide-react';
import { getWarehouses, getSlowMovingItems } from '../../services/warehouseService';
import type { SlowMovingItem, Warehouse } from '../../types/warehouse';

const PRIMARY = '#1F3B64';
const WARNING = '#F97316';
const ERROR   = '#DC2626';
const INFO    = '#2563EB';
const NEUTRAL = '#64748B';

const TABS: { id: number; label: string }[] = [
  { id: 7,  label: '1 tuần'  },
  { id: 14, label: '2 tuần'  },
  { id: 21, label: '3 tuần'  },
  { id: 30, label: '1 tháng' },
  { id: 60, label: '2 tháng' },
];

const SUGGESTION_COLOR: Record<string, string> = {
  'Giảm giá khuyến mãi':                  WARNING,
  'Kiểm tra nhu cầu sản xuất':             NEUTRAL,
  'Theo dõi thêm':                          NEUTRAL,
  'Xuất sử dụng nội bộ':                   INFO,
  'Báo Marketing xây dựng chiến dịch':     PRIMARY,
  'Chuyển dùng cho đơn hàng khác':         INFO,
  'Cân nhắc thanh lý hoặc tái chế':        ERROR,
};

export default function WarehouseSlowMoving() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [days, setDays] = useState(14);
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<SlowMovingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getWarehouses().then((res: Warehouse[]) => {
      setWarehouses(res || []);
      if (res && res.length > 0) setWarehouseId(res[0].id);
    }).catch(() => setWarehouses([]));
  }, []);

  const fetchItems = useCallback(async () => {
    if (!warehouseId) return;
    try {
      setLoading(true);
      setError('');
      const res: SlowMovingItem[] = await getSlowMovingItems({ warehouseId, days });
      setItems(res || []);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Không thể tải danh sách hàng chậm luân chuyển.'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [warehouseId, days]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const rows = items.filter(r => {
    const q = search.toLowerCase();
    return !q || r.itemName.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q);
  });

  const handleExportCsv = () => {
    if (rows.length === 0) return;
    const lines = ['Loai,SKU,Ten hang,Ton kho,Lan xuat cuoi,So ngay khong xuat,De xuat xu ly'];
    rows.forEach(r => {
      const lastOut = r.lastOutboundAt ? new Date(r.lastOutboundAt).toLocaleDateString('vi-VN') : 'Chua tung xuat';
      const daysText = r.daysSinceLastOutbound ?? 'N/A';
      lines.push(`${r.itemType === 'Material' ? 'Nguyen lieu' : 'Hang TM'},${r.sku},${r.itemName},${r.onHandQuantity} ${r.unit},${lastOut},${daysText},${r.suggestion}`);
    });
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hang-cham-luan-chuyen-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Hàng chậm luân chuyển</h2>
            <p className="text-xs text-gray-500 mt-0.5">{loading ? 'Đang tải...' : `${rows.length} mặt hàng không có giao dịch xuất trong kỳ`}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="h-8 text-xs font-semibold border border-blue-200 rounded-lg px-2.5 bg-blue-50 text-blue-900 outline-none"
              value={warehouseId}
              onChange={e => setWarehouseId(e.target.value)}
            >
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleExportCsv} disabled={rows.length === 0}>
              <Download className="w-3.5 h-3.5" /> Xuất CSV
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex border border-gray-200 rounded-md overflow-hidden">
            {TABS.map(t => (
              <button
                key={t.id}
                className="px-3 py-1.5 text-xs transition-colors"
                style={days === t.id
                  ? { backgroundColor: PRIMARY, color: '#fff' }
                  : { backgroundColor: '#fff', color: '#6B7280' }}
                onClick={() => setDays(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="relative max-w-xs flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input className="pl-8 h-8 text-xs bg-gray-50" placeholder="Tìm SKU, tên hàng..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-4 py-3 mb-4">{error}</div>
        )}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">Loại</th>
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">SKU</th>
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">Tên hàng</th>
                <th className="text-right px-4 py-3 text-gray-700 font-semibold">Tồn kho</th>
                <th className="text-center px-4 py-3 text-gray-700 font-semibold">Lần xuất cuối</th>
                <th className="text-right px-4 py-3 text-gray-700 font-semibold">Số ngày không xuất</th>
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">Đề xuất xử lý</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Đang tải dữ liệu...</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Không có mặt hàng nào chậm luân chuyển trong kỳ đã chọn.</td></tr>
              ) : rows.map((r, i) => {
                const neverOut = r.daysSinceLastOutbound == null;
                const urgency = neverOut || r.daysSinceLastOutbound! >= 30 ? ERROR : r.daysSinceLastOutbound! >= 14 ? WARNING : NEUTRAL;
                const suggColor = SUGGESTION_COLOR[r.suggestion] || NEUTRAL;
                return (
                  <tr key={r.id} className="hover:bg-[#F9FAFB]" style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-medium text-white px-2 py-0.5 whitespace-nowrap" style={{ backgroundColor: r.itemType === 'Material' ? WARNING : INFO, borderRadius: 4 }}>
                        {r.itemType === 'Material' ? 'Nguyên liệu' : 'Hàng TM'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-500 text-[11px]">{r.sku || '-'}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{r.itemName}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-gray-700">{r.onHandQuantity.toLocaleString('vi-VN')} {r.unit}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{r.lastOutboundAt ? new Date(r.lastOutboundAt).toLocaleDateString('vi-VN') : 'Chưa từng xuất'}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums" style={{ color: urgency }}>{neverOut ? '—' : `${r.daysSinceLastOutbound} ngày`}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-medium text-white px-2 py-0.5 whitespace-nowrap" style={{ backgroundColor: suggColor, borderRadius: 4 }}>
                        {r.suggestion}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
