import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getQuotationById, managerReview, getMessages } from '../../services/quotationService.js';
import { Input } from '../../components/sales-ui/input';
import { ArrowLeft, CheckCircle, XCircle, MessageSquare, User } from 'lucide-react';

export default function SalesManagerPriceNegotiationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [managerNote, setManagerNote] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      try {
        setLoading(true);
        const data = await getQuotationById(id);
        setQuotation(data);
        try {
          const msgs = await getMessages(id);
          setMessages(msgs);
        } catch (e) {
          console.error('Failed to load chat history', e);
        }
      } catch (error) {
        console.error(error);
        alert('Không thể tải dữ liệu báo giá');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

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
        <button onClick={() => navigate(-1)} className="mt-4 text-blue-500 underline">Quay lại</button>
      </div>
    );
  }

  const isPending = quotation.status === 'PendingManager';

  const handleReview = async () => {
    if (!actionType) return;
    const isApprove = actionType === 'approve';
    try {
      await managerReview(quotation.id, { isApproved: isApprove, managerNote });
      alert(isApprove ? 'Đã duyệt báo giá thành công!' : 'Đã từ chối báo giá!');
      navigate('/sales-manager/manager-negotiation');
    } catch (error: any) {
      alert(error.message || 'Lỗi khi xử lý');
    }
  };

  return (
    <div className="flex flex-col gap-[20px] p-[24px]">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <h1 className="font-semibold text-[20px] text-[#1f3b64]">Chi tiết Báo giá chờ duyệt</h1>
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
        <div className="flex items-center gap-8 bg-[#f8fafc] p-4 rounded-[6px] border border-gray-100">
          <div>
            <p className="text-[12px] text-gray-500 mb-1">Tổng giá trị gốc</p>
            <p className="text-[16px] font-semibold text-gray-800">{quotation.originalTotal?.toLocaleString('vi-VN')}₫</p>
          </div>
          <div>
            <p className="text-[12px] text-gray-500 mb-1">Tổng giá đề xuất</p>
            <p className="text-[18px] font-bold text-[#f97316]">{latestVersion.proposedTotal?.toLocaleString('vi-VN')}₫</p>
          </div>
          {latestVersion.salesNote && (
            <div className="flex-1 ml-4 border-l border-gray-200 pl-4">
              <p className="text-[12px] text-gray-500 mb-1">Ghi chú từ Sales</p>
              <p className="text-[13px] text-gray-700 italic">"{latestVersion.salesNote}"</p>
            </div>
          )}
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

        {/* Lịch sử Chat */}
        <div>
          <h3 className="font-semibold text-[14px] text-[#1f3b64] mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Lịch sử trao đổi với khách hàng
          </h3>
          <div className="border border-[#e5e7eb] rounded-[6px] bg-gray-50 h-[300px] overflow-y-auto p-4 flex flex-col gap-3">
            {messages.length === 0 ? (
              <p className="text-center text-sm text-gray-500 my-auto">Chưa có tin nhắn nào</p>
            ) : (
              messages.map((msg, index) => {
                const isSystem = msg.senderRole === 'System';
                const isCustomer = msg.senderRole === 'Customer' || msg.senderRole === 'User';
                const content = msg.messageText || msg.content || '';
                const time = msg.sentAt || msg.createdAt;
                
                if (isSystem) {
                  return (
                    <div key={index} className="flex justify-center my-2">
                      <span className="text-[11px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                        {content}
                      </span>
                    </div>
                  );
                }
                return (
                  <div key={index} className={`flex flex-col max-w-[80%] ${isCustomer ? 'self-start' : 'self-end'}`}>
                    <span className="text-[10px] text-gray-500 mb-1 ml-1">
                      {isCustomer ? 'Khách hàng' : 'Nhân viên Sales'} • {time ? new Date(time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                    <div className={`p-2.5 rounded-xl text-[13px] ${
                      isCustomer 
                        ? 'bg-white border border-gray-200 text-gray-800 rounded-tl-none' 
                        : 'bg-blue-600 text-white rounded-tr-none'
                    }`}>
                      {content}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {isPending && (
          <div className="mt-4 pt-6 border-t border-gray-100">
            <h3 className="font-semibold text-[14px] text-[#1f3b64] mb-3">Quyết định của Quản lý</h3>
            <p className="text-[12px] text-gray-500 mb-2">Nhập ghi chú cho quyết định (nếu có):</p>
            <Input 
              value={managerNote}
              onChange={(e) => setManagerNote(e.target.value)}
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
