import { useState, useRef, useEffect } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import {
  Send, Check,
  DollarSign, User, Loader2, MessageSquare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useChat } from '../../hooks/useChat.js';
import { getQuotations, getQuotationById, getMessages, pickUpQuotation, createVersion } from '../../services/quotationService.js';

const STATUS_CONFIG: Record<string, { label: string; bg: string }> = {
  Draft:                    { label: 'Chờ xử lý',       bg: '#64748B' },
  Negotiating:              { label: 'Đang đàm phán',    bg: '#7C3AED' },
  PendingManager:           { label: 'Chờ Manager duyệt', bg: '#F97316' },
  PendingCeo:               { label: 'Chờ CEO duyệt',     bg: '#F97316' },
  Approved:                 { label: 'Chờ Khách chốt',    bg: '#2563EB' },
  CustomerAccepted:         { label: 'Đã chấp nhận',    bg: '#16A34A' },
  CustomerRejected:         { label: 'Từ chối',          bg: '#DC2626' },
  Expired:                  { label: 'Hết hạn',          bg: '#9CA3AF' },
  Cancelled:                { label: 'Đã hủy',           bg: '#6B7280' },
};

export default function SalesNegotiationPage() {
  const { user } = useAuth() as any;
  const [quotationsList, setQuotationsList] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [input, setInput] = useState('');
  const [proposePrice, setProposePrice] = useState(false);
  const [newPrices, setNewPrices] = useState<Record<string, string>>({});
  const [salesNote, setSalesNote] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const { messages, setMessages, sendMessage, isConnecting } = useChat(active?.id || null);

  // Load lịch sử chat khi chọn quotation
  useEffect(() => {
    if (active?.id) {
      getMessages(active.id).then(setMessages).catch(console.error);
    }
  }, [active?.id]);

  const loadData = () => {
    getQuotations().then(data => {
      const myQ = data.myQuotations || data.MyQuotations || [];
      const pendingQ = data.pendingQuotations || data.PendingQuotations || [];
      const all = [...myQ, ...pendingQ];
      setQuotationsList(all);
      // Tự động chọn item đầu tiên nếu chưa có active
      if (!active && all.length > 0) {
        handleSelectQuotation(all[0]);
      }
    }).catch(console.error);
  };

  const handleSelectQuotation = (q: any) => {
    setLoadingDetail(true);
    setProposePrice(false);
    setNewPrices({});
    setSalesNote('');
    getQuotationById(q.id)
      .then(fullData => setActive(fullData))
      .catch(() => setActive(q)) // fallback nếu lỗi
      .finally(() => setLoadingDetail(false));
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMsg = () => {
    if (!input.trim() || isConnecting) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handlePickUp = async () => {
    if (!active) return;
    try {
      await pickUpQuotation(active.id);
      alert('Đã nhận xử lý báo giá!');
      // Reload full detail sau khi pickup
      handleSelectQuotation(active);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Có lỗi xảy ra');
    }
  };

  const handleProposePriceSubmit = async () => {
    if (!active) return;
    const items = active.items || [];
    if (items.length === 0) {
      alert('Không có sản phẩm nào để đề xuất giá.');
      return;
    }
    try {
      const itemsPayload = items.map((it: any) => ({
        productId: it.productId,
        proposedUnitPrice: newPrices[it.productId] ? Number(newPrices[it.productId]) : it.originalUnitPrice
      }));

      const newTotal = itemsPayload.reduce((sum: number, it: any) => {
        const qty = items.find((x: any) => x.productId === it.productId)?.quantity || 0;
        return sum + it.proposedUnitPrice * qty;
      }, 0);

      await createVersion(active.id, {
        proposedTotal: newTotal,
        salesNote: salesNote || 'Sales đã gửi phiên bản báo giá đề xuất',
        items: itemsPayload
      });
      setProposePrice(false);
      alert('Đã tạo phiên bản báo giá gửi Manager duyệt!');
      handleSelectQuotation(active);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Có lỗi xảy ra');
    }
  };

  const latestVersion = active?.versions?.[0];
  const items = latestVersion ? latestVersion.items : (active?.items || []);
  const totalOriginal = active?.originalTotal || 0;
  const totalProposed = latestVersion ? latestVersion.proposedTotal : totalOriginal;
  const discount = totalOriginal - totalProposed;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Col 1: Danh sách báo giá ── */}
      <div className="w-64 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
        <div className="px-3 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-gray-900">Báo giá & Đàm phán</h3>
            <span className="text-[10px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
              {quotationsList.length}
            </span>
          </div>
          <Input className="h-7 text-xs bg-gray-50" placeholder="Tìm kiếm..." />
        </div>
        <div className="flex-1 overflow-y-auto">
          {quotationsList.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-xs text-gray-400">
              Không có báo giá nào
            </div>
          ) : (
            quotationsList.map(q => {
              const cfg = STATUS_CONFIG[q.status];
              const isActive = active?.id === q.id;
              return (
                <button
                  key={q.id}
                  onClick={() => handleSelectQuotation(q)}
                  className={`w-full text-left px-3 py-2.5 border-b border-[#F3F4F6] transition-colors ${isActive ? 'bg-[#EEF2F8]' : 'hover:bg-gray-50'}`}
                  style={isActive ? { borderLeft: '3px solid #1F3B64' } : { borderLeft: '3px solid transparent' }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-gray-900 truncate">{q.customerName}</p>
                      <p className="text-[10px] text-gray-400 truncate font-mono">{String(q.id).slice(0, 8)}...</p>
                      <p className="text-[10px] font-semibold text-[#374151] mt-0.5 tabular-nums">
                        {(q.originalTotal / 1e6).toFixed(1)}tr ₫
                      </p>
                    </div>
                    <span className="text-[9px] text-gray-400 flex-shrink-0">
                      {new Date(q.requestDate).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  {cfg && (
                    <span
                      className="inline-block mt-1 px-1.5 text-[10px] font-medium text-white"
                      style={{ backgroundColor: cfg.bg, borderRadius: 3, lineHeight: '18px', height: 18 }}
                    >
                      {cfg.label}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Col 2: Chi tiết báo giá ── */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200 bg-gray-50">
        {!active && !loadingDetail ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Chọn một báo giá để xem chi tiết
          </div>
        ) : loadingDetail ? (
          <div className="flex-1 flex items-center justify-center gap-2 text-gray-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Đang tải...
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 font-mono">
                    {active.id?.split('-')[0].toUpperCase()}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {items.length} sản phẩm · {active.customerName}
                    {active.salesStaffName && (
                      <span className="ml-2 text-blue-600">· Sales: {active.salesStaffName}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {active.status === 'Draft' ? (
                    <Button size="sm" className="h-7 text-xs gap-1" style={{ backgroundColor: '#16A34A' }} onClick={handlePickUp}>
                      <Check className="w-3.5 h-3.5" /> Nhận xử lý
                    </Button>
                  ) : active.status === 'Negotiating' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className={`h-7 text-xs gap-1 border-[#D1D5DB] hover:bg-gray-50 ${proposePrice ? 'bg-blue-50 border-blue-300 text-blue-700' : 'text-[#374151]'}`}
                      onClick={() => setProposePrice(!proposePrice)}
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      {proposePrice ? 'Đang đề xuất...' : 'Tạo Version Đề xuất giá'}
                    </Button>
                  ) : null}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-7 text-xs" 
                    onClick={() => setIsChatOpen(!isChatOpen)}
                  >
                    <MessageSquare className="w-3.5 h-3.5 mr-1" />
                    {isChatOpen ? 'Ẩn Chat' : 'Hiện Chat'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Propose Price Panel */}
            {proposePrice && (
              <div className="border-b border-[#E5E7EB] px-4 py-3 bg-blue-50">
                <p className="text-[11px] font-semibold text-blue-800 mb-2">
                  Nhập giá đề xuất cho từng sản phẩm (bỏ trống = giữ nguyên giá gốc)
                </p>
                <div className="mb-2">
                  <Input
                    className="h-7 text-xs bg-white"
                    placeholder="Ghi chú gửi cho Manager và Khách hàng (bắt buộc)..."
                    value={salesNote}
                    onChange={e => setSalesNote(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" className="h-7 text-xs" style={{ backgroundColor: '#1F3B64' }} onClick={handleProposePriceSubmit}>
                    Tạo phiên bản gửi duyệt
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs border-[#D1D5DB] text-[#374151]" onClick={() => { setProposePrice(false); setNewPrices({}); }}>
                    Hủy
                  </Button>
                </div>
              </div>
            )}

            {/* Items Table */}
            <div className="flex-1 overflow-y-auto p-3">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-3">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-2 text-gray-500 font-medium">Sản phẩm</th>
                      <th className="text-center px-3 py-2 text-gray-500 font-medium w-16">SL</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-medium w-28">Giá gốc</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-medium w-32">Giá mới nhất</th>
                      <th className="text-right px-3 py-2 text-gray-500 font-medium w-28">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-6 text-center text-gray-400">
                          Không có sản phẩm
                        </td>
                      </tr>
                    ) : (
                      items.map((item: any) => {
                        const originalPrice = item.originalUnitPrice;
                        const proposedPrice = item.proposedUnitPrice;
                        const currentPrice = proposedPrice || originalPrice;
                        return (
                          <tr key={item.productId} className="hover:bg-gray-50/50">
                            <td className="px-3 py-2.5">
                              <p className="font-medium text-gray-800 truncate max-w-[200px]">{item.productName}</p>
                            </td>
                            <td className="px-3 py-2.5 text-center font-semibold text-gray-700">{item.quantity}</td>
                            <td className="px-3 py-2.5 text-right text-gray-400">
                              {proposedPrice ? (
                                <span className="line-through">{originalPrice.toLocaleString('vi-VN')}₫</span>
                              ) : (
                                <span>{originalPrice.toLocaleString('vi-VN')}₫</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              {proposePrice ? (
                                <Input
                                  className="h-6 text-xs text-right w-full"
                                  placeholder={currentPrice.toLocaleString('vi-VN')}
                                  value={newPrices[item.productId] || ''}
                                  onChange={e => setNewPrices({ ...newPrices, [item.productId]: e.target.value })}
                                />
                              ) : (
                                <span className={`font-semibold ${proposedPrice ? 'text-green-600' : 'text-gray-700'}`}>
                                  {currentPrice.toLocaleString('vi-VN')}₫
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold text-gray-900">
                              {(currentPrice * item.quantity).toLocaleString('vi-VN')}₫
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="bg-white rounded-lg border border-gray-200 p-3 grid grid-cols-3 gap-3 text-center text-xs">
                <div>
                  <p className="text-gray-500">Tổng giá gốc</p>
                  <p className="font-bold text-gray-900 text-sm mt-0.5">{(totalOriginal / 1e6).toFixed(2)}tr</p>
                </div>
                <div className="border-x border-gray-100">
                  <p className="text-gray-500">Tổng đề xuất</p>
                  <p className="font-bold text-[#1F3B64] text-sm mt-0.5 tabular-nums">{(totalProposed / 1e6).toFixed(2)}tr</p>
                </div>
                <div>
                  <p className="text-gray-500">Giảm giá cho khách</p>
                  <p className={`font-bold text-sm mt-0.5 ${discount > 0 ? 'text-green-600' : 'text-gray-500'}`}>
                    {discount > 0 ? '-' : ''}{(discount / 1e6).toFixed(2)}tr
                  </p>
                </div>
              </div>

              {/* Note from customer */}
              {active.generalNote && (
                <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                  <p className="text-[11px] font-semibold text-yellow-800 mb-0.5">Ghi chú từ khách hàng:</p>
                  <p className="text-xs text-yellow-700">{active.generalNote}</p>
                </div>
              )}

              {/* Lịch sử phiên bản */}
              {active.versions && active.versions.length > 0 && (
                <div className="mt-3 bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-[11px] font-semibold text-gray-900 mb-2">Lịch sử Phiên bản Báo giá</p>
                  <div className="space-y-2">
                    {active.versions.map((v: any) => (
                      <div key={v.id} className="text-xs border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-[#1F3B64]">Version {v.versionNumber}</span>
                          <span className="text-gray-500">{new Date(v.createdAt).toLocaleString('vi-VN')}</span>
                        </div>
                        <div className="flex gap-4 mb-1">
                          <span className="text-gray-600">Tổng: <strong>{(v.proposedTotal / 1e6).toFixed(2)}tr</strong></span>
                          <span className="text-gray-600">Trạng thái: <strong>{v.status}</strong></span>
                        </div>
                        {v.salesNote && <p className="text-gray-500 italic">Sales: {v.salesNote}</p>}
                        {v.managerNote && <p className="text-orange-600 italic">Manager: {v.managerNote}</p>}
                        {v.ceoNote && <p className="text-purple-600 italic">CEO: {v.ceoNote}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Col 3: Chat ── */}
      {isChatOpen && (
        <div className="w-80 flex-shrink-0 bg-white flex flex-col border-l border-gray-200">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Chọn một báo giá để trò chuyện
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: '#1F3B64' }}>
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-900">{active.customerName}</p>
                  <p className="text-[10px] text-gray-400">
                    {STATUS_CONFIG[active.status]?.label || active.status}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 bg-gray-50">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-xs text-gray-400">
                  Chưa có tin nhắn nào
                </div>
              ) : (
                messages.map(msg => {
                  const isMine = ((msg as any).senderId || (msg as any).SenderId) === user?.id;
                  const msgText = (msg as any).messageText ?? (msg as any).content ?? '';
                  const msgTime = (msg as any).sentAt ?? (msg as any).SentAt ?? (msg as any).createdAt;
                  return (
                    <div key={(msg as any).id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${isMine ? 'text-white' : 'bg-white text-[#374151] border border-[#E5E7EB]'}`}
                        style={isMine ? { backgroundColor: '#1F3B64' } : {}}
                      >
                        {msgText}
                        <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
                          <span className={`text-[9px] ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>
                            {msgTime ? new Date(msgTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={endRef} />
            </div>

            {/* Chat Input */}
            <div className="border-t border-gray-200 p-3">
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 focus-within:border-[#1F3B64] transition-colors">
                <input
                  className="flex-1 text-xs bg-transparent outline-none text-gray-800 placeholder:text-gray-400 disabled:opacity-50"
                  placeholder="Nhập tin nhắn..."
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMsg()}
                  disabled={isConnecting}
                />
                <button
                  onClick={sendMsg}
                  disabled={!input.trim() || isConnecting}
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors bg-[#1F3B64] hover:bg-[#162D4E] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
      )}
    </div>
  );
}
