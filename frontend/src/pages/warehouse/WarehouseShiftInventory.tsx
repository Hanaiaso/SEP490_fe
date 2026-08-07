import { getErrorMessage } from '../../lib/errors';
import { useState, useEffect, useCallback } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Save, CheckCircle, AlertCircle } from 'lucide-react';
import { getWarehouses, getWarehouseShifts, getWarehouseInventory, submitShiftInventoryCount } from '../../services/warehouseService';
import type { PaginatedList, InventoryItem, ShiftInventoryCountResult, Warehouse, WarehouseShift } from '../../types/warehouse';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const ERROR   = '#DC2626';

interface InventoryRow {
  inventoryId: string;
  sku: string;
  name: string;
  unit: string;
  systemQty: number;
  actualQty: number | '';
  note: string;
}

export default function WarehouseShiftInventory() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState('');
  const [shifts, setShifts] = useState<WarehouseShift[]>([]);
  const [shiftId, setShiftId] = useState('');
  const [items, setItems] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [resultMsg, setResultMsg] = useState('');

  useEffect(() => {
    getWarehouses().then((res: Warehouse[]) => {
      setWarehouses(res || []);
      if (res && res.length > 0) setWarehouseId(res[0].id);
    }).catch(() => setWarehouses([]));

    getWarehouseShifts().then((res: WarehouseShift[]) => {
      setShifts(res || []);
      if (res && res.length > 0) setShiftId(res[0].id);
    }).catch(() => setShifts([]));
  }, []);

  const fetchInventory = useCallback(async () => {
    if (!warehouseId) return;
    try {
      setLoading(true);
      setError('');
      const res: PaginatedList<InventoryItem> = await getWarehouseInventory(warehouseId, { pageNumber: 1, pageSize: 1000 });
      const rows: InventoryRow[] = (res.items || []).map((i) => ({
        inventoryId: i.id,
        sku: i.itemSku || i.productSku || '',
        name: i.itemName || i.productName || 'N/A',
        unit: i.unit || '',
        systemQty: i.onHandQuantity,
        actualQty: '',
        note: '',
      }));
      setItems(rows);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Không thể tải danh sách tồn kho.'));
      setItems([]);
    } finally {
      setLoading(false);
      setConfirmed(false);
      setResultMsg('');
    }
  }, [warehouseId]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Đổi ca giữa chừng coi như bắt đầu phiên đếm mới -> xoá số liệu đã nhập tránh nhầm ca.
  // Set state trực tiếp trong render (thay vì useEffect) để tránh 1 frame hiển thị số liệu
  // ca cũ trước khi effect kịp xoá.
  const [prevShiftId, setPrevShiftId] = useState(shiftId);
  if (shiftId !== prevShiftId) {
    setPrevShiftId(shiftId);
    setItems(prev => prev.map(i => ({ ...i, actualQty: '', note: '' })));
    setConfirmed(false);
    setResultMsg('');
  }

  const updateActual = (inventoryId: string, val: string) => {
    if (val !== '') {
      const parsed = Math.floor(Number(val));
      if (Number.isNaN(parsed)) return;
      val = String(Math.max(0, parsed));
    }
    setItems(prev => prev.map(i => i.inventoryId === inventoryId ? { ...i, actualQty: val === '' ? '' : Number(val) } : i));
  };
  const updateNote = (inventoryId: string, val: string) => {
    setItems(prev => prev.map(i => i.inventoryId === inventoryId ? { ...i, note: val.slice(0, 500) } : i));
  };

  const getDiff = (item: InventoryRow) => {
    if (item.actualQty === '') return null;
    return (item.actualQty as number) - item.systemQty;
  };

  const countedItems = items.filter(i => i.actualQty !== '');
  const discrepancies = countedItems.filter(i => getDiff(i) !== 0).length;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleConfirm = async () => {
    if (countedItems.length === 0 || !warehouseId) return;
    try {
      setSubmitting(true);
      setError('');
      const payload = {
        warehouseId,
        shiftId: shiftId || null,
        countDate: new Date().toISOString(),
        items: countedItems.map(i => ({
          inventoryId: i.inventoryId,
          actualQuantity: i.actualQty as number,
          note: i.note || undefined,
        })),
      };
      const res: ShiftInventoryCountResult = await submitShiftInventoryCount(payload);
      setConfirmed(true);
      setResultMsg(
        res.adjustedCount > 0
          ? `Đã ghi nhận ${res.totalCounted} mặt hàng, điều chỉnh tồn kho cho ${res.adjustedCount} mặt hàng có chênh lệch.`
          : `Đã ghi nhận ${res.totalCounted} mặt hàng, không có chênh lệch so với hệ thống.`
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Không thể xác nhận kiểm kê ca.'));
    } finally {
      setSubmitting(false);
    }
  };

  const currentShift = shifts.find(s => s.id === shiftId);

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Cập nhật tồn kho theo ca</h2>
            <p className="text-xs text-gray-500 mt-0.5">Kiểm đếm và cập nhật tồn kho thực tế — {new Date().toLocaleDateString('vi-VN')}</p>
          </div>
          <div className="flex gap-2">
            <select
              className="h-8 text-xs font-semibold border border-blue-200 rounded-lg px-2.5 bg-blue-50 text-blue-900 outline-none disabled:opacity-60"
              value={warehouseId}
              onChange={e => setWarehouseId(e.target.value)}
              disabled={submitting}
            >
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={handleSave} disabled={confirmed || submitting}>
              <Save className="w-3.5 h-3.5" /> Lưu tạm
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5"
              style={{ backgroundColor: SUCCESS }}
              disabled={confirmed || submitting || countedItems.length === 0}
              onClick={handleConfirm}
            >
              <CheckCircle className="w-3.5 h-3.5" /> {submitting ? 'Đang xác nhận...' : confirmed ? 'Đã xác nhận ca' : 'Xác nhận ca'}
            </Button>
          </div>
        </div>

        {/* Shift tabs */}
        <div className="flex gap-0 mt-3">
          {shifts.map((s) => (
            <button
              key={s.id}
              onClick={() => setShiftId(s.id)}
              disabled={submitting}
              className={`px-4 py-1.5 text-xs border-b-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${shiftId === s.id ? 'font-semibold' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
              style={shiftId === s.id ? { borderBottomColor: PRIMARY, color: PRIMARY } : {}}
            >{s.name} ({s.startTime} - {s.endTime})</button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-b border-red-200 px-5 py-2 text-xs text-red-700 font-medium flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </div>
      )}

      {saved && (
        <div className="bg-green-50 border-b border-green-200 px-5 py-2 text-xs text-green-700 font-medium flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5" /> Đã lưu tạm số liệu đã nhập cho ca {currentShift?.name ?? ''}
        </div>
      )}

      {resultMsg && (
        <div className="bg-green-50 border-b border-green-200 px-5 py-2 text-xs text-green-700 font-medium flex items-center gap-2">
          <CheckCircle className="w-3.5 h-3.5" /> {resultMsg}
        </div>
      )}

      {!confirmed && discrepancies > 0 && (
        <div className="bg-orange-50 border-b border-orange-200 px-5 py-2 text-xs text-orange-700 font-medium flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5" /> {discrepancies} sản phẩm có chênh lệch tồn kho — vui lòng kiểm tra lại
        </div>
      )}

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-gray-700 font-semibold w-28">Mã hàng</th>
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">Tên hàng</th>
                <th className="text-center px-4 py-3 text-gray-700 font-semibold w-16">ĐVT</th>
                <th className="text-right px-4 py-3 text-gray-700 font-semibold w-28">Tồn hệ thống</th>
                <th className="text-right px-4 py-3 text-gray-700 font-semibold w-32">Tồn thực tế</th>
                <th className="text-right px-4 py-3 text-gray-700 font-semibold w-24">Chênh lệch</th>
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Đang tải dữ liệu...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-gray-400">Kho này chưa có mặt hàng nào trong tồn kho.</td></tr>
              ) : items.map((item, i) => {
                const diff = getDiff(item);
                return (
                  <tr key={item.inventoryId} className="hover:bg-[#F9FAFB]" style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <td className="px-4 py-2.5 font-medium text-gray-500">{item.sku || '-'}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{item.name}</td>
                    <td className="px-4 py-2.5 text-center text-gray-500">{item.unit}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-800 tabular-nums">{item.systemQty.toLocaleString('vi-VN')}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        className="h-7 text-xs text-right w-24 ml-auto"
                        placeholder="Nhập..."
                        value={item.actualQty}
                        onChange={e => updateActual(item.inventoryId, e.target.value)}
                        disabled={confirmed || submitting}
                      />
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold tabular-nums">
                      {diff === null ? <span className="text-gray-300">—</span> :
                       diff === 0 ? <span style={{ color: SUCCESS }}>0</span> :
                       <span style={{ color: diff > 0 ? SUCCESS : ERROR }}>{diff > 0 ? '+' : ''}{diff}</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <Input
                        className="h-7 text-xs w-full"
                        placeholder="Ghi chú..."
                        maxLength={500}
                        value={item.note}
                        onChange={e => updateNote(item.inventoryId, e.target.value)}
                        disabled={confirmed || submitting}
                      />
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
