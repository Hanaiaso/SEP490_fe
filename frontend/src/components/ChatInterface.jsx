import { useState, useEffect } from "react";
import { X, Send, Paperclip, User, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/Button.jsx";
import { Input } from "./ui/Input.jsx";
import { formatPrice } from "../services/productService.js";
import { getMessages } from "../services/quotationService.js";
import { useChat } from "../hooks/useChat.js";
import { useAuth } from "../context/AuthContext.jsx";
import Header from "./Header.jsx";
import Footer from "./Footer.jsx";

export default function ChatInterface({
  quotation,
  onClose,
  onAccept,
}) {
  const { user } = useAuth();
  const [inputMessage, setInputMessage] = useState("");
  const { messages, setMessages, sendMessage, isConnecting } = useChat(quotation.id);

  useEffect(() => {
    if (quotation?.id) {
      getMessages(quotation.id)
        .then(setMessages)
        .catch(console.error);
    }
  }, [quotation?.id, setMessages]);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    sendMessage(inputMessage);
    setInputMessage("");
  };

  const quickReplies = [
    "Tôi muốn giảm thêm sản phẩm này",
    "Tôi đồng ý với mức giá này",
    "Vui lòng gửi bảng giá chốt",
    "Giá này vẫn cao so với ngân sách",
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="pt-20 pb-8">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Header */}
          <div className="bg-white rounded-t-2xl border border-gray-100 border-b-0 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">
                  Trao đổi với Sales - {quotation.id}
                </h1>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">
                    {quotation.salesStaffName} đang online
                  </span>
                </div>
              </div>
              <Button
                onClick={onClose}
                variant="outline"
                className="rounded-full gap-2"
              >
                <X className="w-4 h-4" />
                Đóng
              </Button>
            </div>

            {/* Accept Quote Button */}
            {quotation.salesProposedTotal && (
              <div className="bg-green-50 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-green-900 mb-1">
                    Bảng giá đã sẵn sàng
                  </p>
                  <p className="text-sm text-green-700">
                    Tổng giá đề xuất: {formatPrice(quotation.salesProposedTotal)}
                  </p>
                </div>
                <Button
                  onClick={onAccept}
                  className="bg-green-600 hover:bg-green-700 rounded-full gap-2 text-white"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Chấp nhận bảng giá
                </Button>
              </div>
            )}
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 lg:gap-6">
            {/* Product Panel */}
            <div className="lg:col-span-1 bg-white border border-gray-100 border-t-0 lg:border-t lg:rounded-2xl p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Sản phẩm đang đàm phán
              </h3>
              <div className="space-y-4">
                {(quotation.items || quotation.products || []).map((product, index) => {
                  const originalPrice = product.originalUnitPrice ?? product.originalPrice;
                  const salesProposedPrice = product.salesProposedUnitPrice ?? product.salesProposedPrice;
                  const finalPrice = salesProposedPrice || originalPrice;
                  const savings = salesProposedPrice
                    ? (originalPrice - salesProposedPrice) * product.quantity
                    : 0;

                  return (
                    <div
                      key={index}
                      className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors"
                    >
                      <p className="font-semibold text-gray-900 text-sm mb-2">
                        {product.productName}
                      </p>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Số lượng:</span>
                          <span className="font-medium text-gray-900">
                            {product.quantity.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Giá gốc:</span>
                          <span className={`${salesProposedPrice ? 'text-gray-500 line-through' : 'text-gray-900 font-medium'}`}>
                            {formatPrice(originalPrice)}
                          </span>
                        </div>
                        {salesProposedPrice && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Giá mới:</span>
                            <span className="font-semibold text-green-600">
                              {formatPrice(salesProposedPrice)}
                            </span>
                          </div>
                        )}
                        {savings > 0 && (
                          <div className="flex justify-between pt-1 border-t">
                            <span className="text-green-600">Tiết kiệm:</span>
                            <span className="font-semibold text-green-600">
                              {formatPrice(savings)}
                            </span>
                          </div>
                        )}
                      </div>
                      <button className="mt-2 text-xs text-blue-600 hover:underline">
                        Yêu cầu giá tốt hơn
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Price Summary */}
              <div className="mt-6 pt-6 border-t border-gray-100 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tổng gốc:</span>
                  <span className={`font-medium ${quotation.salesProposedTotal ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {formatPrice(quotation.originalTotal)}
                  </span>
                </div>
                {quotation.salesProposedTotal && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tổng mới:</span>
                      <span className="font-bold text-green-600">
                        {formatPrice(quotation.salesProposedTotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span className="text-green-600">Tiết kiệm:</span>
                      <span className="font-bold text-green-600">
                        - {formatPrice(quotation.originalTotal - quotation.salesProposedTotal)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Chat Panel */}
            <div className="lg:col-span-2 bg-white border border-gray-100 border-t-0 lg:border-t lg:rounded-2xl flex flex-col">
              {/* Messages */}
              <div className="flex-1 p-6 overflow-y-auto max-h-[600px]">
                <div className="space-y-4">
              {messages.map((message) => {
                    const isMine = (message.senderId || message.SenderId) === user?.id;
                    const msgText = message.messageText ?? message.content ?? '';
                    const msgTime = message.sentAt ?? message.SentAt ?? message.createdAt;
                    return (
                      <div
                        key={message.id}
                        className={`flex ${
                          isMine
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`flex gap-3 max-w-[70%] ${
                            isMine
                              ? "flex-row-reverse"
                              : "flex-row"
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              isMine
                                ? "bg-gray-900 text-white"
                                : "bg-blue-100 text-blue-600"
                            }`}
                          >
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <div
                              className={`rounded-2xl px-4 py-3 ${
                                isMine
                                  ? "bg-gray-900 text-white"
                                  : "bg-gray-100 text-gray-900"
                              }`}
                            >
                              <p className="text-sm">{msgText}</p>
                            </div>
                            <p
                              className={`text-xs text-gray-400 mt-1 ${
                                isMine
                                  ? "text-right"
                                  : "text-left"
                              }`}
                            >
                              {msgTime
                                ? new Date(msgTime).toLocaleTimeString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Replies */}
              <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-500 mb-2">Trả lời nhanh:</p>
                <div className="flex gap-2 flex-wrap">
                  {quickReplies.map((reply, index) => (
                    <button
                      key={index}
                      onClick={() => setInputMessage(reply)}
                      className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1.5 hover:bg-gray-100 transition-colors"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <div className="p-6 border-t border-gray-100">
                <div className="flex gap-3">
                  <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                    <Paperclip className="w-5 h-5" />
                  </button>
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter" && !isConnecting) {
                        handleSendMessage();
                      }
                    }}
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 rounded-full"
                    disabled={isConnecting}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={isConnecting}
                    className="bg-gray-900 hover:bg-gray-800 rounded-full gap-2 text-white"
                  >
                    <Send className="w-4 h-4" />
                    Gửi
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
