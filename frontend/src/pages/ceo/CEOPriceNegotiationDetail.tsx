import { useEffect, useState } from 'react';
import { getQuotationById, ceoReview } from '../../services/quotationService.js';
import { Input } from '../../components/sales-ui/input';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

interface Props {
  negotiationId: string | null;
  onBack: () => void;
}

export default function CEOPriceNegotiationDetail({ negotiationId, onBack }: Props) {
  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [ceoNote, setCeoNote] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);

  useEffect(() => {
    if (!negotiationId) return;
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const data = await getQuotationById(negotiationId);
        setQuotation(data);
      } catch (error) {
        console.error(error);
        alert('Không thể tải dữ liệu báo giá');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [negotiationId]);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>;
  }

  if (!quotation) {
    return <div className="p-8 text-center text-red-500">Không tìm thấy báo giá.</div>;
  }

  const latestVersion = quotation.versions?.[quotation.versions.length - 1] || quotation.versions?.[0];
  if (!latestVersion) {
    return (
      <div className="p-8 text-center text-red-500">
        Báo giá này chưa có phiên bản nào.
        <br />
        <button onClick={onBack} className="mt-4 text-blue-500 underline">Quay lại</button>
      </div>
    );
  }

  const isPending = quotation.status === 'PendingCeo';

  const handleReview = async () => {
    if (!actionType) return;
    const isApprove = actionType === 'approve';
    try {
      await ceoReview(quotation.id, { isApproved: isApprove, ceoNote });
      alert(isApprove ? 'Đã duyệt báo giá thành công!' : 'Đã từ chối báo giá!');
      onBack();
    } catch (error: any) {
      alert(error.message || 'Lỗi khi xử lý');
    }
  };

  return (
    <div className="flex flex-col gap-[20px] p-[24px]">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="font-semibold text-[20px] text-[#1f3b64]">Chi tiết Báo giá chờ duyệt (CEO)</h1>
      </div>

      <div className="bg-white border border-[#e5e7eb] rounded-[8px] p-6 flex flex-col gap-6">
        {/* Info Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-[12px] text-gray-500 mb-1">Mã Báo Giá</p>
            <p className="font-medium text-[#1f3b64] font-mono">{quotation.id?.split('-')[0].toUpperCase()}</p>
          </div>
          <div>
            <p className="text-[12px] text-gray-500 mb-1">Khách Hàng</p>
            <p className="font-medium text-[#1f3b64]">{quotation.customerName}</p>
          </div>
          <div>
            <p className="text-[12px] text-gray-500 mb-1">Nhân viên Sales</p>
            <p className="font-medium text-[#1f3b64]">{quotation.salesStaffName || 'Chưa có'}</p>
          </div>
          <div>
            <p className="text-[12px] text-gray-500 mb-1">Phiên bản hiện tại</p>
            <p className="font-medium text-[#1f3b64]">v{latestVersion.versionNumber}</p>
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="flex flex-col gap-4 bg-[#f8fafc] p-4 rounded-[6px] border border-gray-100">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-[12px] text-gray-500 mb-1">Tổng giá trị gốc</p>
              <p className="text-[16px] font-semibold text-gray-800">{quotation.originalTotal?.toLocaleString('vi-VN')}₫</p>
            </div>
            <div>
              <p className="text-[12px] text-gray-500 mb-1">Tổng giá đề xuất</p>
              <p className="text-[18px] font-bold text-[#f97316]">{latestVersion.proposedTotal?.toLocaleString('vi-VN')}₫</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {latestVersion.salesNote && (
              <div className="border-l-4 border-blue-400 bg-white p-3 rounded shadow-sm">
                <p className="text-[11px] font-semibold text-blue-600 uppercase mb-1">Ghi chú từ Sales</p>
                <p className="text-[13px] text-gray-700 italic">"{latestVersion.salesNote}"</p>
              </div>
            )}
            {latestVersion.managerNote && (
              <div className="border-l-4 border-purple-400 bg-white p-3 rounded shadow-sm">
                <p className="text-[11px] font-semibold text-purple-600 uppercase mb-1">Nhận xét của Sales Manager</p>
                <p className="text-[13px] text-gray-700 italic">"{latestVersion.managerNote}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Items Table */}
        <div>
          <h3 className="font-semibold text-[14px] text-[#1f3b64] mb-3">Danh sách sản phẩm</h3>
          <div className="border border-[#e5e7eb] rounded-[6px] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f5f7fa] border-b border-[#e5e7eb]">
                  <th className="text-left px-[16px] py-[10px] text-[11px] font-medium text-[#64748b] uppercase">Sản phẩm</th>
                  <th className="text-right px-[16px] py-[10px] text-[11px] font-medium text-[#64748b] uppercase">Số lượng</th>
                  <th className="text-right px-[16px] py-[10px] text-[11px] font-medium text-[#64748b] uppercase">Đơn giá gốc</th>
                  <th className="text-right px-[16px] py-[10px] text-[11px] font-medium text-[#64748b] uppercase">Đơn giá đề xuất</th>
                </tr>
              </thead>
              <tbody>
                {latestVersion.items?.map((item: any) => (
                  <tr key={item.id} className="border-b border-[#f5f7fa] last:border-0 hover:bg-[#f8fafc]">
                    <td className="px-[16px] py-[10px] text-[12px] text-gray-800">{item.productName}</td>
                    <td className="px-[16px] py-[10px] text-[12px] text-gray-800 text-right">{item.quantity}</td>
                    <td className="px-[16px] py-[10px] text-[12px] text-gray-600 text-right line-through">
                      {item.originalUnitPrice?.toLocaleString('vi-VN')}₫
                    </td>
                    <td className="px-[16px] py-[10px] text-[12px] font-medium text-red-600 text-right">
                      {item.proposedUnitPrice?.toLocaleString('vi-VN')}₫
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {isPending && (
          <div className="mt-4 pt-6 border-t border-gray-100">
            <h3 className="font-semibold text-[14px] text-[#1f3b64] mb-3">Quyết định của CEO</h3>
            <p className="text-[12px] text-gray-500 mb-2">Nhập ghi chú cho quyết định (nếu có):</p>
            <Input 
              value={ceoNote}
              onChange={(e) => setCeoNote(e.target.value)}
              placeholder="Nhập lý do duyệt/từ chối..."
              className="mb-4 w-full md:w-1/2"
            />

            <div className="flex items-center gap-3 mt-4">
              <button 
                onClick={() => setActionType('approve')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-[6px] text-sm font-medium transition-colors ${
                  actionType === 'approve' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-green-50 hover:text-green-700 border border-transparent hover:border-green-200'
                }`}
              >
                <CheckCircle className="w-4 h-4" />
                Đồng ý Duyệt
              </button>
              <button 
                onClick={() => setActionType('reject')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-[6px] text-sm font-medium transition-colors ${
                  actionType === 'reject' ? 'bg-red-600 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-200'
                }`}
              >
                <XCircle className="w-4 h-4" />
                Từ chối Báo giá
              </button>

              {actionType && (
                <button
                  onClick={handleReview}
                  className="ml-4 px-6 py-2.5 bg-[#1f3b64] hover:bg-[#162a47] text-white rounded-[6px] text-sm font-medium transition-colors shadow-sm"
                >
                  Xác nhận
                </button>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
