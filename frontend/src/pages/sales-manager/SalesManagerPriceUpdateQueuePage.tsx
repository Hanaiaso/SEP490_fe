import { useEffect, useState } from 'react';
import { getOrders, assignAndNotify } from '../../services/productPriceUpdateService';
import { getRoundRobinState } from '../../services/roundRobinService.js';
import { getErrorMessage } from '../../lib/errors';
import { formatPrice } from '../../services/productService';
import { UserPlus } from 'lucide-react';

interface StaffOption {
  staffId: string;
  name: string;
  isActive: boolean;
}

interface PriceUpdateOrderItem {
  id: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
}

interface PriceUpdateOrder {
  id: string;
  status: string;
  proposedByName: string;
  proposedAt: string;
  proposalNote?: string | null;
  scheduledEffectiveDate: string;
  items: PriceUpdateOrderItem[];
}

export default function SalesManagerPriceUpdateQueuePage() {
  const [rows, setRows] = useState<PriceUpdateOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);

  const [assignTarget, setAssignTarget] = useState<PriceUpdateOrder | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await getOrders();
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffOptions = async () => {
    try {
      const state = await getRoundRobinState();
      const participants = state?.participants || [];
      setStaffOptions(
        participants.map((p: { staffId: string; name: string; isActive: boolean }) => ({
          staffId: p.staffId,
          name: p.name,
          isActive: p.isActive,
        })),
      );
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchStaffOptions();
  }, []);

  const openAssignModal = (row: PriceUpdateOrder) => {
    setAssignTarget(row);
    setSelectedStaffId('');
  };

  const closeAssignModal = () => {
    setAssignTarget(null);
    setSelectedStaffId('');
  };

  const handleConfirmAssign = async () => {
    if (!assignTarget || !selectedStaffId) return;
    setAssigning(true);
    try {
      await assignAndNotify(assignTarget.id, selectedStaffId);
      closeAssignModal();
      await fetchOrders();
    } catch (error: unknown) {
      alert(getErrorMessage(error, 'Có lỗi khi phân công đợt cập nhật giá'));
    } finally {
      setAssigning(false);
    }
  };

  const activeStaffOptions = staffOptions.filter((s) => s.isActive);
  const pendingRows = rows.filter((r) => r.status === 'Proposed');

  return (
    <div className="flex flex-col gap-[20px] p-[24px]">
      <div>
        <h1 className="font-semibold text-[20px] text-[#1f3b64]">Phân công cập nhật giá hàng hóa</h1>
        <p className="text-[12px] text-[#64748b] mt-1">
          CEO đã đề xuất các đợt cập nhật giá dưới đây — vui lòng phân công 1 nhân viên Sale phụ trách để đồng thời gửi thông báo lịch cập nhật cho khách hàng bị ảnh hưởng.
        </p>
      </div>

      <div className="bg-white border border-[#e5e7eb] rounded-[8px] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f5f7fa] border-b border-[#e5e7eb]">
              {['Sản phẩm', 'CEO đề xuất', 'Ngày hiệu lực', 'Ghi chú', 'Thao tác'].map((h) => (
                <th key={h} className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-4 text-sm text-gray-500">Đang tải dữ liệu...</td></tr>
            ) : pendingRows.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-4 text-sm text-gray-500">Không có đợt cập nhật giá nào cần phân công</td></tr>
            ) : (
              pendingRows.map((row) => (
                <tr key={row.id} className="border-b border-[#f5f7fa] hover:bg-[#f5f7fa]">
                  <td className="px-[16px] py-[12px] text-[12px] text-[#1f3b64]">
                    {row.items.map((i) => `${i.productName} (${formatPrice(i.oldPrice)} → ${formatPrice(i.newPrice)})`).join(', ')}
                  </td>
                  <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">{row.proposedByName}</td>
                  <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">{new Date(row.scheduledEffectiveDate).toLocaleDateString('vi-VN')}</td>
                  <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">{row.proposalNote || '—'}</td>
                  <td className="px-[16px] py-[12px]">
                    <button
                      onClick={() => openAssignModal(row)}
                      className="inline-flex items-center gap-1.5 bg-[#1f3b64] text-white px-[12px] py-[6px] rounded-[4px] text-[12px] font-medium hover:bg-[#162d4e] transition-colors"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Phân công & Thông báo
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {assignTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={closeAssignModal}>
          <div className="w-full max-w-md rounded-[8px] bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[15px] font-semibold text-[#1f3b64] mb-1">Phân công & Gửi thông báo</h3>
            <p className="text-[12px] text-[#64748b] mb-4">
              Đợt cập nhật giá cho{' '}
              <span className="font-medium text-[#1f3b64]">{assignTarget.items.map((i) => i.productName).join(', ')}</span>{' '}
              — hiệu lực từ <span className="font-medium text-[#1f3b64]">{new Date(assignTarget.scheduledEffectiveDate).toLocaleDateString('vi-VN')}</span>.
              Sau khi xác nhận, khách hàng đang có sản phẩm này trong giỏ hàng hoặc báo giá đã chốt sẽ được thông báo về lịch cập nhật.
            </p>

            <label className="block text-[11px] font-medium text-[#64748b] uppercase mb-1">Chọn nhân viên Sale</label>
            <select
              className="w-full h-9 rounded-[6px] border border-gray-300 px-2 text-[13px] text-[#1f3b64] mb-4"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
            >
              <option value="">-- Chọn nhân viên --</option>
              {activeStaffOptions.map((s) => (
                <option key={s.staffId} value={s.staffId}>{s.name}</option>
              ))}
            </select>
            {activeStaffOptions.length === 0 && (
              <p className="text-[11px] text-red-600 -mt-3 mb-4">Không có nhân viên Sale nào đang active.</p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={closeAssignModal}
                className="px-[14px] py-[7px] rounded-[6px] text-[12px] font-medium text-[#64748b] border border-gray-200 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmAssign}
                disabled={!selectedStaffId || assigning}
                className="px-[14px] py-[7px] rounded-[6px] text-[12px] font-medium text-white bg-[#1f3b64] hover:bg-[#162d4e] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {assigning ? 'Đang phân công...' : 'Xác nhận phân công & Gửi thông báo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
