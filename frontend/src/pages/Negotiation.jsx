import { useState, useEffect } from "react";
import { Link, useParams, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowLeft,
  MessageSquare,
  Check,
  X,
  AlertCircle,
  TrendingDown,
  Calendar,
  User,
  ShoppingCart
} from "lucide-react";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import { Button } from "../components/ui/Button.jsx";
import { Badge } from "../components/ui/Badge.jsx";
import { formatPrice } from "../services/productService.js";
import ChatInterface from "../components/ChatInterface.jsx";
import { getQuotationById, customerDecision } from "../services/quotationService.js";
import ConfirmModal from "../components/ui/ConfirmModal.jsx";

export default function Negotiation() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [quotation, setQuotation] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);

  useEffect(() => {
    if (id) {
      fetchQuotation();
    }
  }, [id, searchParams]);

  const fetchQuotation = () => {
    getQuotationById(id)
      .then(data => {
        setQuotation(data);
        setIsLoading(false);
        const status = (data.status || "").toLowerCase();
        if (searchParams.get("chat") === "1" || status === "negotiating") {
          setShowChat(true);
        } else {
          setShowChat(false);
        }
      })
      .catch(err => {
        console.error(err);
        setIsLoading(false);
      });
  };

  const handleAcceptClick = () => setShowAcceptConfirm(true);
  const handleRejectClick = () => setShowRejectConfirm(true);

  const executeDecision = async (isAccepted) => {
    setShowAcceptConfirm(false);
    setShowRejectConfirm(false);
    if (!quotation) return;

    const latestVersion = quotation.versions?.[0];
    if (!latestVersion) return;

    try {
      await customerDecision(quotation.id, { isAccepted });
      alert(isAccepted ? "Bảng giá đã được chấp nhận!" : "Đã từ chối đàm phán.");
      fetchQuotation(); // Refresh data
    } catch (error) {
      alert("Có lỗi xảy ra: " + error.message);
    }
  };

  const handleNegotiate = () => {
    if (!quotation) return;
    setSearchParams({ chat: "1" });
    setShowChat(true);
  };

  const handleCloseChat = () => {
    setShowChat(false);
    setSearchParams({});
    fetchQuotation();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="pt-20 min-h-[60vh] flex items-center justify-center">
          <p>Đang tải dữ liệu...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="pt-20 min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-20 h-20 text-gray-300 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Không tìm thấy yêu cầu báo giá
            </h2>
            <Link to="/profile?tab=quotations">
              <Button className="bg-gray-900 hover:bg-gray-800 rounded-full text-white">
                Quay lại
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const normalizedStatus = (quotation.status || "").toLowerCase();
  
  const statusBadge = {
    draft: "bg-gray-100 text-gray-700",
    negotiating: "bg-purple-100 text-purple-700",
    pendingmanager: "bg-yellow-100 text-yellow-700",
    pendingceo: "bg-orange-100 text-orange-700",
    approved: "bg-blue-100 text-blue-700",
    customeraccepted: "bg-green-100 text-green-700",
    customerrejected: "bg-red-100 text-red-700",
    expired: "bg-red-100 text-red-700",
    cancelled: "bg-gray-200 text-gray-800",
  };

  const statusLabel = {
    draft: "Chờ Sales tiếp nhận",
    negotiating: "Đang đàm phán",
    pendingmanager: "Chờ Quản lý duyệt",
    pendingceo: "Chờ Giám đốc duyệt",
    approved: "Chờ bạn quyết định",
    customeraccepted: "Đã chấp nhận",
    customerrejected: "Đã từ chối",
    expired: "Đã hết hạn",
    cancelled: "Đã hủy",
  };

  const latestVersion = quotation.versions?.[0];
  const displayItems = latestVersion ? latestVersion.items : quotation.items;
  const proposedTotal = latestVersion ? latestVersion.proposedTotal : null;

  const totalSavings = proposedTotal ? quotation.originalTotal - proposedTotal : 0;
  const savingsPercent = proposedTotal ? ((totalSavings / quotation.originalTotal) * 100).toFixed(1) : 0;

  if (showChat) {
    return (
      <ChatInterface
        quotation={quotation}
        onClose={handleCloseChat}
        onAccept={handleAcceptClick}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="pt-20">
        <div className="border-b border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
            <div className="flex items-center gap-2 text-sm">
              <Link to="/" className="text-gray-600 hover:text-gray-900">
                Trang Chủ
              </Link>
              <span className="text-gray-400">/</span>
              <Link
                to="/profile?tab=quotations"
                className="text-gray-600 hover:text-gray-900"
              >
                Báo giá đặc biệt
              </Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-medium">{quotation.id}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
            <Link
              to="/profile?tab=quotations"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại danh sách báo giá
            </Link>

            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  Yêu cầu báo giá {quotation.id}
                </h1>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>Ngày gửi: {new Date(quotation.requestDate).toLocaleDateString("vi-VN")}</span>
                  </div>
                  {quotation.salesStaffName && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-4 h-4" />
                      <span>Sales: {quotation.salesStaffName}</span>
                    </div>
                  )}
                </div>
              </div>
              <Badge
                className={`${statusBadge[normalizedStatus] || "bg-gray-100 text-gray-700"} hover:opacity-90`}
              >
                {statusLabel[normalizedStatus] || quotation.status}
              </Badge>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-6"
            >
              <p className="text-sm text-gray-500 mb-2">Tổng giá ban đầu</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPrice(quotation.originalTotal)}
              </p>
            </motion.div>

            {proposedTotal > 0 && (
              <>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-2xl border border-gray-100 p-6"
                >
                  <p className="text-sm text-gray-500 mb-2">Tổng giá mới đề xuất</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatPrice(proposedTotal)}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-6"
                >
                  <p className="text-sm text-green-700 mb-2 flex items-center gap-1">
                    <TrendingDown className="w-4 h-4" />
                    Số tiền tiết kiệm
                  </p>
                  <p className="text-2xl font-bold text-green-700">
                    {formatPrice(totalSavings)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    Giảm {savingsPercent}%
                  </p>
                </motion.div>
              </>
            )}
          </div>

          {latestVersion?.salesNote && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-blue-50 rounded-2xl border border-blue-200 p-6"
            >
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Ghi chú từ Sales
              </h3>
              <p className="text-gray-700">{latestVersion.salesNote}</p>
              {latestVersion.validUntil && (
                <p className="text-sm text-gray-600 mt-2">
                  <strong>Hiệu lực đến:</strong> {new Date(latestVersion.validUntil).toLocaleString("vi-VN")}
                </p>
              )}
            </motion.div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                Chi tiết sản phẩm
              </h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {[
                      "Sản phẩm",
                      "Số lượng",
                      "Giá gốc (đơn vị)",
                      proposedTotal && "Giá mới (đơn vị)",
                      proposedTotal && "Tiết kiệm/sp",
                      "Tổng tiền",
                    ]
                      .filter(Boolean)
                      .map((header) => (
                        <th
                          key={header}
                          className="text-left text-xs font-semibold text-gray-500 uppercase px-6 py-4"
                        >
                          {header}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {displayItems.map((product, index) => {
                    const originalPrice = product.originalUnitPrice;
                    const salesProposedPrice = product.proposedUnitPrice;
                    const finalPrice = salesProposedPrice || originalPrice;
                    const totalPrice = finalPrice * product.quantity;
                    const savingsPerUnit = salesProposedPrice
                      ? originalPrice - salesProposedPrice
                      : 0;
                    const itemTotalSavings = savingsPerUnit * product.quantity;

                    return (
                      <tr
                        key={index}
                        className="hover:bg-gray-50/50 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {product.productName}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {product.quantity.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <p className={`text-sm font-medium ${salesProposedPrice ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                            {formatPrice(originalPrice)}
                          </p>
                        </td>
                        {proposedTotal > 0 && (
                          <>
                            <td className="px-6 py-4">
                              <p className="text-sm font-semibold text-green-600">
                                {salesProposedPrice
                                  ? formatPrice(salesProposedPrice)
                                  : formatPrice(originalPrice)}
                              </p>
                            </td>
                            <td className="px-6 py-4">
                              {savingsPerUnit > 0 && (
                                <p className="text-sm font-semibold text-green-600">
                                  - {formatPrice(savingsPerUnit)}
                                </p>
                              )}
                            </td>
                          </>
                        )}
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-bold text-gray-900">
                              {formatPrice(totalPrice)}
                            </p>
                            {itemTotalSavings > 0 && (
                              <p className="text-xs text-green-600">
                                Tiết kiệm {formatPrice(itemTotalSavings)}
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {quotation.generalNote && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-2">
                Ghi chú chung của bạn
              </h3>
              <p className="text-gray-700">{quotation.generalNote}</p>
            </div>
          )}

          {normalizedStatus === "approved" && (
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    Quyết định của bạn
                  </h3>
                  <p className="text-sm text-gray-600">
                    Chấp nhận bảng giá để áp dụng vào đơn hàng hoặc đàm phán lại
                  </p>
                </div>
                <div className="flex gap-3 flex-shrink-0">
                  <Button
                    onClick={handleNegotiate}
                    variant="outline"
                    className="rounded-xl gap-2 bg-white text-gray-900"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Thương lượng lại
                  </Button>
                  <Button
                    onClick={handleRejectClick}
                    variant="outline"
                    className="rounded-xl gap-2 text-red-600 border-red-200 hover:bg-red-50 bg-white"
                  >
                    <X className="w-4 h-4" />
                    Từ chối
                  </Button>
                  <Button
                    onClick={handleAcceptClick}
                    className="rounded-xl gap-2 bg-gray-900 text-white hover:bg-gray-800"
                  >
                    <Check className="w-4 h-4" />
                    Chấp nhận mức giá
                  </Button>
                </div>
              </div>
            </div>
          )}

          {normalizedStatus === "customeraccepted" && (
            <div className="bg-green-50 rounded-2xl border border-green-200 p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Check className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-900">
                      Đã chốt giá thành công
                    </p>
                    <p className="text-sm text-green-700">
                      Bạn có thể thanh toán đơn hàng này ngay bây giờ
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate(`/checkout`)}
                  className="rounded-xl gap-2 bg-green-600 text-white hover:bg-green-700"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Tiến hành Thanh toán
                </Button>
              </div>
            </div>
          )}

          {["pendingmanager", "pendingceo"].includes(normalizedStatus) && (
            <div className="bg-yellow-50 rounded-2xl border border-yellow-200 p-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
                <div>
                  <p className="font-semibold text-yellow-900">
                    Bảng giá đang được xét duyệt
                  </p>
                  <p className="text-sm text-yellow-700">
                    Bảng giá này đang chờ ban giám đốc công ty duyệt. Vui lòng quay lại sau.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {(normalizedStatus === "draft" || normalizedStatus === "negotiating") && (
            <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-6 h-6 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-900">
                      Đang trong quá trình trao đổi
                    </p>
                    <p className="text-sm text-blue-700">
                      Vui lòng thảo luận qua chat để Sales báo lại mức giá mới
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleNegotiate}
                  className="rounded-xl gap-2 bg-blue-600 text-white hover:bg-blue-700"
                >
                  <MessageSquare className="w-4 h-4" />
                  Mở khung Chat
                </Button>
              </div>
            </div>
          )}

          {normalizedStatus === "customerrejected" && (
            <div className="bg-red-50 rounded-2xl border border-red-200 p-6">
              <div className="flex items-center gap-3">
                <X className="w-6 h-6 text-red-600" />
                <div>
                  <p className="font-semibold text-red-900">Bạn đã từ chối bảng giá này</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />

      <ConfirmModal
        isOpen={showRejectConfirm}
        title="Từ chối báo giá"
        message="Bạn có chắc chắn muốn từ chối mức giá này? Báo giá sẽ được chuyển lại cho Sales để đàm phán thêm."
        onConfirm={() => executeDecision(false)}
        onCancel={() => setShowRejectConfirm(false)}
      />

      <ConfirmModal
        isOpen={showAcceptConfirm}
        title="Chấp nhận báo giá"
        message="Bạn đồng ý với mức giá này? Đơn hàng sẽ được áp dụng mức giá này và bạn có thể thanh toán."
        onConfirm={() => executeDecision(true)}
        onCancel={() => setShowAcceptConfirm(false)}
      />
    </div>
  );
}
