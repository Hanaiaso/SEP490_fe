import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, XCircle, AlertCircle, Clock,
  Calendar as CalendarIcon, Globe, ThumbsUp, MessageSquare, Share2,
  Send, Eye, User, Package, RefreshCw, ChevronDown
} from 'lucide-react';
import api from '../../services/api';

interface MarketingPost {
  id: string;
  code: string;
  productId: string;
  productName: string;
  productSku: string;
  productPrice: number;
  productUnit: string;
  createdByUserId: string;
  createdByName: string;
  approvedByUserId?: string;
  approvedByName?: string;
  promptUsed: string;
  templateName?: string;
  tone?: string;
  selectedImageUrl: string;
  editedCaption: string;
  hashtags?: string;
  ctaText?: string;
  status: string;
  rejectionReason?: string;
  scheduledTime?: string;
  externalPostId?: string;
  publishErrorMessage?: string;
  createdAt: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  Submitted:      { label: 'Chờ duyệt',     bg: 'bg-blue-50',     text: 'text-blue-700',    icon: <Clock className="w-3 h-3" /> },
  Approved:       { label: 'Đã duyệt',      bg: 'bg-indigo-50',   text: 'text-indigo-700',  icon: <CheckCircle2 className="w-3 h-3" /> },
  Scheduled:      { label: 'Đã lên lịch',   bg: 'bg-indigo-50',   text: 'text-indigo-700',  icon: <CalendarIcon className="w-3 h-3" /> },
  Posting:        { label: 'Đang đăng',     bg: 'bg-emerald-50',  text: 'text-emerald-700', icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
  Success:        { label: 'Đã đăng FB',    bg: 'bg-emerald-100', text: 'text-emerald-800', icon: <CheckCircle2 className="w-3 h-3" /> },
  ReworkRequired: { label: 'Cần sửa lại',   bg: 'bg-amber-50',    text: 'text-amber-700',   icon: <AlertCircle className="w-3 h-3" /> },
  Rejected:       { label: 'Từ chối',       bg: 'bg-rose-50',     text: 'text-rose-700',    icon: <XCircle className="w-3 h-3" /> },
  PublishFailed:  { label: 'Lỗi đăng bài',  bg: 'bg-rose-100',    text: 'text-rose-800',    icon: <XCircle className="w-3 h-3" /> },
  Draft:          { label: 'Bản nháp',      bg: 'bg-gray-100',    text: 'text-gray-600',    icon: <Clock className="w-3 h-3" /> },
};

export default function SalesManagerMarketingApproval() {
  const [posts, setPosts] = useState<MarketingPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'SCHEDULED' | 'HISTORY'>('PENDING');

  const [selectedPost, setSelectedPost] = useState<MarketingPost | null>(null);
  const [decisionAction, setDecisionAction] = useState<'ApproveNow' | 'Approve' | 'Rework' | 'Reject'>('ApproveNow');
  const [scheduledDateTime, setScheduledDateTime] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/marketing-posts');
      setPosts(Array.isArray(res.data) ? res.data : []);
    } catch (err) { console.error('Failed to fetch marketing posts:', err); }
    finally { setLoading(false); }
  };

  const openDecisionModal = (post: MarketingPost, action: 'ApproveNow' | 'Approve' | 'Rework' | 'Reject' = 'ApproveNow') => {
    setSelectedPost(post);
    setDecisionAction(action);
    setRejectionReason('');
    const nextHour = new Date(Date.now() + 3600 * 1000);
    setScheduledDateTime(new Date(nextHour.getTime() - nextHour.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
  };

  const handleDecisionSubmit = async () => {
    if (!selectedPost) return;
    if ((decisionAction === 'Rework' || decisionAction === 'Reject') && !rejectionReason.trim()) {
      return alert('Vui lòng nhập lý do.');
    }
    setSubmittingDecision(true);
    try {
      await api.post(`/marketing-posts/${selectedPost.id}/decision`, {
        action: decisionAction,
        rejectionReason,
        scheduledTime: decisionAction === 'Approve' ? (scheduledDateTime ? new Date(scheduledDateTime).toISOString() : null) : null
      });
      alert(
        decisionAction === 'ApproveNow' ? 'Đã duyệt và kích hoạt đăng bài ngay lập tức!'
        : decisionAction === 'Approve' ? 'Đã phê duyệt và hẹn giờ đăng!'
        : decisionAction === 'Rework' ? 'Đã gửi yêu cầu sửa lại cho Sales Staff!'
        : 'Đã từ chối bài viết!'
      );
      setSelectedPost(null);
      fetchPosts();
    } catch (err: any) {
      alert('Lỗi: ' + (err.response?.data?.message || err.message));
    } finally { setSubmittingDecision(false); }
  };

  const pendingPosts = posts.filter(p => p.status === 'Submitted');
  const scheduledPosts = posts.filter(p => p.status === 'Scheduled' || p.status === 'Approved');
  const historyPosts = posts.filter(p => !['Submitted', 'Scheduled', 'Approved'].includes(p.status));

  const tabCounts = { PENDING: pendingPosts.length, SCHEDULED: scheduledPosts.length, HISTORY: historyPosts.length };
  const currentList = activeTab === 'PENDING' ? pendingPosts : activeTab === 'SCHEDULED' ? scheduledPosts : historyPosts;

  return (
    <div className="flex flex-col h-full">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-5 py-4 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] mb-0.5">
          <span className="text-gray-400">Quản lý bán hàng</span>
          <span className="text-gray-300">/</span>
          <span className="text-gray-800 font-semibold">Duyệt bài Marketing AI</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Duyệt & Lên Lịch Đăng Bài Marketing</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Kiểm duyệt nội dung từ Sales Staff, phê duyệt hoặc lên lịch đăng tự động qua Make.com
            </p>
          </div>
          <button
            onClick={fetchPosts}
            className="h-8 px-3 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 px-5 flex-shrink-0">
        <div className="flex items-center gap-0">
          {([
            { key: 'PENDING', label: 'Chờ phê duyệt', icon: <Clock className="w-3.5 h-3.5" /> },
            { key: 'SCHEDULED', label: 'Đã lên lịch', icon: <CalendarIcon className="w-3.5 h-3.5" /> },
            { key: 'HISTORY', label: 'Lịch sử', icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
          ] as const).map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon} {tab.label}
              <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                activeTab === tab.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
              }`}>{tabCounts[tab.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gray-50 p-5">
        {loading ? (
          <div className="py-16 text-center text-xs text-gray-500">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Đang tải danh sách bài viết...
          </div>
        ) : currentList.length === 0 ? (
          <div className="py-16 text-center text-xs text-gray-400">
            {activeTab === 'PENDING' ? 'Không có bài viết nào đang chờ duyệt.' : activeTab === 'SCHEDULED' ? 'Chưa có bài viết nào được lên lịch.' : 'Chưa có lịch sử kiểm duyệt.'}
          </div>
        ) : activeTab === 'PENDING' ? (
          /* PENDING: Table layout */
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200 text-gray-600">
                  <th className="text-left px-4 py-2.5 font-semibold">Mã bài</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Sản phẩm</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Người tạo</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Nội dung tóm tắt</th>
                  <th className="text-center px-4 py-2.5 font-semibold">Ngày gửi</th>
                  <th className="text-center px-4 py-2.5 font-semibold whitespace-nowrap w-64">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingPosts.map((post, i) => (
                  <tr key={post.id} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                    <td className="px-4 py-3 font-mono font-bold text-gray-600">{post.code}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{post.productName}</div>
                      <div className="text-[10px] text-gray-500">SKU: {post.productSku} · {post.productPrice?.toLocaleString()}đ/{post.productUnit}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{post.createdByName || 'Sales Staff'}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs">
                      <p className="line-clamp-2 leading-relaxed">{post.editedCaption}</p>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-500 whitespace-nowrap">{new Date(post.createdAt).toLocaleDateString('vi-VN')}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button onClick={() => openDecisionModal(post, 'ApproveNow')} className="h-7 px-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md flex items-center gap-1 transition-colors whitespace-nowrap shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Đăng ngay
                        </button>
                        <button onClick={() => openDecisionModal(post, 'Approve')} className="h-7 px-2.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md flex items-center gap-1 transition-colors whitespace-nowrap">
                          <CalendarIcon className="w-3.5 h-3.5" /> Lên lịch
                        </button>
                        <button onClick={() => openDecisionModal(post, 'Rework')} className="h-7 px-2.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-md transition-colors whitespace-nowrap" title="Yêu cầu sửa lại">
                          Sửa lại
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : activeTab === 'SCHEDULED' ? (
          /* SCHEDULED: Table layout */
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200 text-gray-600">
                  <th className="text-left px-4 py-2.5 font-semibold">Mã bài</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Sản phẩm</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Nội dung</th>
                  <th className="text-center px-4 py-2.5 font-semibold">Trạng thái</th>
                  <th className="text-center px-4 py-2.5 font-semibold">Thời gian hẹn đăng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {scheduledPosts.map((post, i) => {
                  const sc = STATUS_MAP[post.status] || STATUS_MAP.Scheduled;
                  return (
                    <tr key={post.id} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                      <td className="px-4 py-3 font-mono font-bold text-gray-600">{post.code}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{post.productName}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-sm truncate">{post.editedCaption}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${sc.bg} ${sc.text}`}>
                          {sc.icon} {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono text-gray-700">
                        {post.scheduledTime ? new Date(post.scheduledTime).toLocaleString('vi-VN') : 'Ngay lập tức'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* HISTORY: Table layout */
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200 text-gray-600">
                  <th className="text-left px-4 py-2.5 font-semibold">Mã bài</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Sản phẩm</th>
                  <th className="text-left px-4 py-2.5 font-semibold">Người tạo</th>
                  <th className="text-center px-4 py-2.5 font-semibold">Trạng thái</th>
                  <th className="text-left px-4 py-2.5 font-semibold">External ID</th>
                  <th className="text-center px-4 py-2.5 font-semibold">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {historyPosts.map((post, i) => {
                  const sc = STATUS_MAP[post.status] || STATUS_MAP.Draft;
                  return (
                    <tr key={post.id} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                      <td className="px-4 py-3 font-mono font-bold text-gray-600">{post.code}</td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{post.productName}</td>
                      <td className="px-4 py-3 text-gray-600">{post.createdByName}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${sc.bg} ${sc.text}`}>
                          {sc.icon} {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-500">{post.externalPostId || '—'}</td>
                      <td className="px-4 py-3 text-center text-gray-500">{new Date(post.createdAt).toLocaleDateString('vi-VN')}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Decision Modal */}
      {selectedPost && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-xl border border-gray-200 flex flex-col">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-gray-200 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  Kiểm duyệt bài đăng — {selectedPost.code}
                </h3>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Tạo bởi: {selectedPost.createdByName} · {selectedPost.productName}
                </p>
              </div>
              <button onClick={() => setSelectedPost(null)} className="w-7 h-7 rounded bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-sm transition-colors">✕</button>
            </div>

            {/* Modal Body */}
            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5 flex-1">
              {/* Left: Product Verification + Decision */}
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 space-y-2">
                  <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-gray-500" /> Thông tin sản phẩm
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                    <div><span className="text-gray-500">Tên:</span> {selectedPost.productName}</div>
                    <div><span className="text-gray-500">SKU:</span> <span className="font-mono">{selectedPost.productSku}</span></div>
                    <div><span className="text-gray-500">Giá:</span> <span className="font-bold text-gray-900">{selectedPost.productPrice?.toLocaleString()} đ</span></div>
                    <div><span className="text-gray-500">ĐVT:</span> {selectedPost.productUnit}</div>
                  </div>
                </div>

                {/* Decision Controls */}
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-gray-800">Quyết định:</label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { key: 'ApproveNow', label: 'Đăng ngay',  activeBg: 'bg-emerald-600', activeText: 'text-white', normalBg: 'bg-emerald-50', normalText: 'text-emerald-700', border: 'border-emerald-200' },
                      { key: 'Approve',    label: 'Lên lịch',   activeBg: 'bg-blue-600',    activeText: 'text-white', normalBg: 'bg-blue-50',    normalText: 'text-blue-700',    border: 'border-blue-200' },
                      { key: 'Rework',     label: 'Sửa lại',    activeBg: 'bg-amber-600',   activeText: 'text-white', normalBg: 'bg-amber-50',   normalText: 'text-amber-700',   border: 'border-amber-200' },
                      { key: 'Reject',     label: 'Từ chối',    activeBg: 'bg-rose-600',    activeText: 'text-white', normalBg: 'bg-rose-50',    normalText: 'text-rose-700',    border: 'border-rose-200' },
                    ] as const).map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setDecisionAction(opt.key)}
                        className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center ${
                          decisionAction === opt.key
                            ? `${opt.activeBg} ${opt.activeText} shadow-sm`
                            : `${opt.normalBg} ${opt.normalText} border ${opt.border} hover:opacity-80`
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {decisionAction === 'ApproveNow' && (
                    <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                      Bài viết sẽ được kích hoạt Webhook Make.com để đăng lên Facebook Page ngay lập tức.
                    </div>
                  )}

                  {decisionAction === 'Approve' && (
                    <div className="space-y-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <label className="block text-xs font-semibold text-blue-900">Thời gian hẹn đăng:</label>
                      <input
                        type="datetime-local"
                        value={scheduledDateTime}
                        onChange={e => setScheduledDateTime(e.target.value)}
                        className="w-full text-xs border border-blue-200 rounded-md py-2 px-3 font-mono focus:ring-1 focus:ring-blue-500"
                      />
                      <p className="text-[11px] text-blue-700">Hệ thống sẽ kích hoạt Webhook gửi bài sang Make.com tự động.</p>
                    </div>
                  )}

                  {(decisionAction === 'Rework' || decisionAction === 'Reject') && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-gray-800">
                        Lý do {decisionAction === 'Rework' ? 'yêu cầu sửa lại' : 'từ chối'} <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={rejectionReason}
                        onChange={e => setRejectionReason(e.target.value)}
                        rows={3}
                        placeholder="Nhập ghi chú phản hồi cho Sales Staff..."
                        className="w-full text-xs border border-gray-300 rounded-md p-2.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Facebook Post Preview */}
              <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
                <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-[11px] text-gray-500 font-medium">
                  <span className="flex items-center gap-1 text-blue-700 font-semibold">
                    <Globe className="w-3 h-3" /> Facebook Preview
                  </span>
                  <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-semibold">PREVIEW</span>
                </div>
                <div className="p-3 space-y-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-blue-900 text-white font-bold text-[10px] flex items-center justify-center">VT</div>
                    <div>
                      <h4 className="text-[11px] font-bold text-gray-900">Công Ty Bao Bì Việt Tiến</h4>
                      <p className="text-[10px] text-gray-400">Được đề xuất · Công khai</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-800 whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto">
                    {selectedPost.editedCaption}
                  </div>
                  {selectedPost.hashtags && <div className="text-xs font-semibold text-blue-600">{selectedPost.hashtags}</div>}
                  {selectedPost.ctaText && <div className="p-2 rounded-md bg-blue-50 border border-blue-100 text-xs font-semibold text-blue-800 text-center">{selectedPost.ctaText}</div>}
                  {selectedPost.selectedImageUrl && (
                    <div className="rounded-md overflow-hidden border border-gray-100 bg-gray-100 max-h-40 flex items-center justify-center">
                      <img src={selectedPost.selectedImageUrl} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-around text-gray-400 text-[11px] font-medium">
                    <span className="flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> Thích</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Bình luận</span>
                    <span className="flex items-center gap-1"><Share2 className="w-3 h-3" /> Chia sẻ</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2">
              <button onClick={() => setSelectedPost(null)} className="py-2 px-4 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-200 transition-colors">
                Hủy bỏ
              </button>
              <button
                onClick={handleDecisionSubmit}
                disabled={submittingDecision}
                className="py-2 px-5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1.5 disabled:opacity-50 transition-colors"
              >
                {submittingDecision
                  ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang xử lý...</>
                  : <><Send className="w-3.5 h-3.5" /> Xác nhận</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
