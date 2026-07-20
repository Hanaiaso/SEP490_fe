import { useState, useEffect } from 'react';
import { getPurchaseOrders } from '../../services/purchaseOrderService.js';
import { Plus, Search, Eye } from 'lucide-react';
import CEOPurchaseOrderCreateModal from './CEOPurchaseOrderCreateModal';
import { useToast } from '../../context/ToastContext';

export default function CEOPurchaseOrderPage({ setActiveTab, setSelectPOId }: any) {
  const { toast } = useToast();
  const [pos, setPos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getPurchaseOrders(statusFilter);
      setPos(data || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const PO_STATUS_MAP: Record<string, { label: string; style: string }> = {
    'Draft': { label: 'Bản nháp', style: 'bg-gray-100 text-gray-700' },
    'Issued': { label: 'Đã phát hành', style: 'bg-blue-100 text-blue-700' },
    'SentToWarehouse': { label: 'Đã gửi kho', style: 'bg-purple-100 text-purple-700' },
    'PartiallyReceived': { label: 'Nhận một phần', style: 'bg-yellow-100 text-yellow-700' },
    'FullyReceived': { label: 'Đã nhận đủ', style: 'bg-green-100 text-green-700' },
    'DiscrepancyReview': { label: 'Có chênh lệch', style: 'bg-red-100 text-red-700' },
    'Closed': { label: 'Đã đóng PO', style: 'bg-emerald-100 text-emerald-800' },
    'Cancelled': { label: 'Đã hủy', style: 'bg-rose-100 text-rose-800' }
  };

  return (
    <div className="flex flex-col gap-[20px] p-[24px]">
      <div className="flex justify-between items-center">
        <h1 className="font-semibold text-[20px] text-[#1f3b64]">Purchase Orders - Đặt hàng Nhà cung cấp (CEO)</h1>
        <button 
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-[#1f3b64] text-white px-[16px] py-[8px] rounded-[4px] text-[12px] font-medium hover:bg-[#162a4a]"
        >
          <Plus className="w-4 h-4" /> Tạo PO Mới
        </button>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2 border rounded px-3 py-1.5 flex-1 max-w-[300px]">
          <Search className="w-4 h-4 text-gray-400" />
          <input className="outline-none text-sm w-full" placeholder="Tìm theo mã PO..." />
        </div>
        <select 
          className="border rounded px-3 py-1.5 text-sm outline-none"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="Draft">Draft</option>
          <option value="Issued">Issued</option>
          <option value="SentToWarehouse">SentToWarehouse</option>
          <option value="PartiallyReceived">PartiallyReceived</option>
          <option value="FullyReceived">FullyReceived</option>
          <option value="DiscrepancyReview">DiscrepancyReview</option>
          <option value="Closed">Closed</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      <div className="bg-white border border-[#e5e7eb] rounded-[8px] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f5f7fa] border-b border-[#e5e7eb]">
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Mã PO</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Nhà cung cấp</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Kho nhận</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Trạng thái</th>
              <th className="text-right px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Đặt / Nhận</th>
              <th className="text-center px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Ngày tạo</th>
              <th className="text-center px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-4 text-sm text-gray-500">Đang tải...</td></tr>
            ) : pos.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-4 text-sm text-gray-500">Không có dữ liệu</td></tr>
            ) : pos.map(p => (
              <tr key={p.id} className="border-b border-[#f5f7fa] hover:bg-[#f5f7fa]">
                <td className="px-[16px] py-[12px] text-[12px] font-medium text-[#1f3b64]">{p.code}</td>
                <td className="px-[16px] py-[12px] text-[12px] text-[#1f3b64]">{p.supplierName}</td>
                <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">{p.warehouseName}</td>
                <td className="px-[16px] py-[12px] text-[12px]">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${PO_STATUS_MAP[p.status]?.style || 'bg-gray-100 text-gray-700'}`}>
                    {PO_STATUS_MAP[p.status]?.label || p.status}
                  </span>
                </td>
                <td className="px-[16px] py-[12px] text-[12px] font-medium text-right text-gray-700">
                  {p.totalExpectedQuantity} / <span className="text-green-600">{p.totalReceivedQuantity}</span>
                </td>
                <td className="px-[16px] py-[12px] text-[12px] text-center text-gray-500">
                  {new Date(p.createdAt).toLocaleDateString('vi-VN')}
                </td>
                <td className="px-[16px] py-[12px] text-center">
                  <button 
                    onClick={() => {
                      setSelectPOId(p.id);
                      setActiveTab('po-detail');
                    }} 
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isCreateOpen && (
        <CEOPurchaseOrderCreateModal 
          onClose={() => setIsCreateOpen(false)} 
          onSuccess={() => {
            setIsCreateOpen(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
