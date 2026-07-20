import { useEffect, useState } from 'react';
import { getQuotations, ceoReview } from '../../services/quotationService.js';
import { Eye } from 'lucide-react';
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

export default function CEOPriceNegotiation({ setActiveTab, setSelectNegotiationId }: any) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchQuotations();
  }, []);

  useEffect(() => {
    fetchQuotations();
  }, []);

  const handleViewDetail = (id: string) => {
    setSelectNegotiationId(id);
    setActiveTab('price-negotiation-detail');
  };

  return (
    <div className="flex flex-col gap-[20px] p-[24px]">
      <h1 className="font-semibold text-[20px] text-[#1f3b64]">Phê duyệt Báo giá đặc biệt</h1>
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
                <td colSpan={7} className="text-center py-4 text-sm text-gray-500">Đang tải dữ liệu...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-4 text-sm text-gray-500">Không có báo giá nào chờ duyệt</td>
              </tr>
            ) : (
              rows.map((row) => {
                const latestVersion = row.versions?.[row.versions.length - 1] || row.versions?.[0]; // Lấy version mới nhất

                return (
                  <tr key={row.id} className="border-b border-[#f5f7fa] hover:bg-[#f5f7fa] transition-colors">
                    <td className="px-[16px] py-[12px] text-[12px] font-medium text-[#1f3b64] font-mono">
                      {row.id?.split('-')[0].toUpperCase()}
                    </td>
                    <td className="px-[16px] py-[12px] text-[12px] text-[#1f3b64]">{row.customerName}</td>
                    <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">{row.salesStaffName || 'Chưa có'}</td>
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
                      <button 
                        onClick={() => handleViewDetail(row.id)}
                        className="inline-flex items-center gap-1.5 bg-[#f8fafc] border border-gray-200 text-gray-700 px-[12px] py-[6px] rounded-[4px] text-[12px] font-medium hover:bg-gray-100 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
