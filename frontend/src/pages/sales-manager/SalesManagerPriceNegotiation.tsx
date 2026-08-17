import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuotations, assignQuotation } from '../../services/quotationService.js';
import { getRoundRobinState } from '../../services/roundRobinService.js';
import { getErrorMessage } from '../../lib/errors';
import { Eye, UserPlus } from 'lucide-react';
import type { Quotation } from '../../types/quotation';

interface StaffOption {
  staffId: string;
  name: string;
  isActive: boolean;
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'Draft': return <span className="text-gray-500 font-medium">Bản nháp</span>;
    case 'Negotiating': return <span className="text-blue-500 font-medium">Thương lượng</span>;
    case 'PendingManager': return <span className="text-orange-500 font-medium">Chờ QL duyệt</span>;
    case 'PendingCeo': return <span className="text-orange-600 font-medium">Chờ CEO duyệt</span>;
    case 'Approved': return <span className="text-green-500 font-medium">Đã duyệt</span>;
    case 'CustomerAccepted': return <span className="text-green-600 font-medium">Khách đã chốt</span>;
    case 'CustomerRejected': return <span className="text-red-500 font-medium">Khách từ chối</span>;
    case 'Expired': return <span className="text-gray-400 font-medium">Hết hạn</span>;
    case 'Cancelled': return <span className="text-red-600 font-medium">Đã hủy</span>;
    default: return <span>{status}</span>;
  }
};

export default function ManagerPriceNegotiation() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);

  // Modal phân công thủ công (WF-mới: mọi báo giá ở đây đều ≥100tr, Sale không còn tự nhận được).
  const [assignTarget, setAssignTarget] = useState<Quotation | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchQuotations = async () => {
    try {
      setLoading(true);
      const data = await getQuotations();
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
    fetchQuotations();
    fetchStaffOptions();
  }, []);

  const handleViewDetail = (id: string) => {
    navigate(`/sales-manager/manager-negotiation/${id}`);
  };

  const openAssignModal = (row: Quotation) => {
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
      await assignQuotation(assignTarget.id, selectedStaffId);
      closeAssignModal();
      await fetchQuotations();
    } catch (error: unknown) {
      alert(getErrorMessage(error, 'Có lỗi khi phân công báo giá'));
    } finally {
      setAssigning(false);
    }
  };

  const activeStaffOptions = staffOptions.filter((s) => s.isActive);

  return (
    <div className="flex flex-col gap-[20px] p-[24px]">
      <div>
        <h1 className="font-semibold text-[20px] text-[#1f3b64]">Phê duyệt Báo giá (Cấp Quản lý)</h1>
        <p className="text-[12px] text-[#64748b] mt-1">
          Báo giá từ 100 triệu trở lên không còn cho phép Sale tự nhận xử lý — vui lòng phân công thủ công cho nhân viên có kinh nghiệm phù hợp ở cột &quot;Thao tác&quot;.
        </p>
      </div>
      <div className="bg-white border border-[#e5e7eb] rounded-[8px] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f5f7fa] border-b border-[#e5e7eb]">
              {['Mã báo giá', 'Khách hàng', 'NV Bán hàng', 'Version', 'Trạng thái', 'Giá niêm yết', 'Giá đề xuất', 'Thao tác'].map((h) => (
                <th key={h} className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="text-center py-4 text-sm text-gray-500">Đang tải dữ liệu...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-4 text-sm text-gray-500">Không có báo giá nào</td>
              </tr>
            ) : (
              rows.map((row) => {
                const latestVersion = row.versions?.[row.versions.length - 1] || row.versions?.[0];
                const needsAssignment = row.status === 'Draft' && !row.salesStaffName;

                return (
                  <tr key={row.id} className="border-b border-[#f5f7fa] hover:bg-[#f5f7fa] transition-colors">
                    <td className="px-[16px] py-[12px] text-[12px] font-medium text-[#1f3b64] font-mono">
                      {row.id?.split('-')[0].toUpperCase()}
                    </td>
                    <td className="px-[16px] py-[12px] text-[12px] text-[#1f3b64]">{row.customerName}</td>
                    <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">
                      {row.salesStaffName || (
                        <span className="text-amber-600 font-medium">Chưa phân công</span>
                      )}
                    </td>
                    <td className="px-[16px] py-[12px] text-[12px] text-[#1f3b64] text-center">
                      {latestVersion ? `v${latestVersion.versionNumber}` : '-'}
                    </td>
                    <td className="px-[16px] py-[12px] text-[12px] text-center whitespace-nowrap">
                      {getStatusLabel(row.status)}
                    </td>
                    <td className="px-[16px] py-[12px] text-[12px] font-medium text-[#1f3b64] text-right">
                      {row.originalTotal?.toLocaleString('vi-VN')}₫
                    </td>
                    <td className="px-[16px] py-[12px] text-[12px] font-medium text-[#f97316] text-right">
                      {latestVersion?.proposedTotal ? `${latestVersion.proposedTotal.toLocaleString('vi-VN')}₫` : '-'}
                    </td>
                    <td className="px-[16px] py-[12px] text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {needsAssignment && (
                          <button
                            onClick={() => openAssignModal(row)}
                            className="inline-flex items-center gap-1.5 bg-[#1f3b64] text-white px-[12px] py-[6px] rounded-[4px] text-[12px] font-medium hover:bg-[#162d4e] transition-colors"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                            Phân công
                          </button>
                        )}
                        <button
                          onClick={() => handleViewDetail(row.id)}
                          className="inline-flex items-center gap-1.5 bg-[#f8fafc] border border-gray-200 text-gray-700 px-[12px] py-[6px] rounded-[4px] text-[12px] font-medium hover:bg-gray-100 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Xem chi tiết
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {assignTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={closeAssignModal}
        >
          <div
            className="w-full max-w-md rounded-[8px] bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-[15px] font-semibold text-[#1f3b64] mb-1">Phân công nhân viên phụ trách</h3>
            <p className="text-[12px] text-[#64748b] mb-4">
              Báo giá <span className="font-mono font-medium">{assignTarget.id?.split('-')[0].toUpperCase()}</span> của khách hàng{' '}
              <span className="font-medium text-[#1f3b64]">{assignTarget.customerName}</span> — trị giá{' '}
              <span className="font-medium text-[#1f3b64]">{assignTarget.originalTotal?.toLocaleString('vi-VN')}₫</span>.
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
                {assigning ? 'Đang phân công...' : 'Xác nhận phân công'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
