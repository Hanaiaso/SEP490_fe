import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowLeft,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronRight,
  FileText,
} from "lucide-react";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import { Button } from "../components/ui/Button.jsx";
import { formatPrice } from "../services/productService.js";
import { getQuotations } from "../services/quotationService.js";

const STATUS_CONFIG = {
  pending: {
    label: "Chờ Sales phản hồi",
    icon: Clock,
    className: "bg-yellow-100 text-yellow-700",
    dotClass: "bg-yellow-500",
  },
  salesresponded: {
    label: "Sales đã gửi bảng giá",
    icon: MessageSquare,
    className: "bg-blue-100 text-blue-700",
    dotClass: "bg-blue-500",
  },
  negotiating: {
    label: "Đang trao đổi",
    icon: MessageSquare,
    className: "bg-purple-100 text-purple-700",
    dotClass: "bg-purple-500",
  },
  waitingforadminapproval: {
    label: "Chờ Admin duyệt",
    icon: Clock,
    className: "bg-orange-100 text-orange-700",
    dotClass: "bg-orange-500",
  },
  accepted: {
    label: "Đã chấp nhận",
    icon: CheckCircle2,
    className: "bg-green-100 text-green-700",
    dotClass: "bg-green-500",
  },
  rejected: {
    label: "Đã hủy",
    icon: XCircle,
    className: "bg-red-100 text-red-700",
    dotClass: "bg-red-500",
  },
};

function getStatusKey(status) {
  return (status || "").toLowerCase().replace(/_/g, "");
}

export default function NegotiationList() {
  const [quotations, setQuotations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getQuotations()
      .then((data) => {
        // API returns array directly for Customer role
        const list = Array.isArray(data) ? data : [];
        setQuotations(list);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="pt-20">
        {/* Breadcrumb */}
        <div className="border-b border-gray-100 bg-white">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 py-6">
            <div className="flex items-center gap-2 text-sm">
              <Link to="/" className="text-gray-600 hover:text-gray-900">Trang Chủ</Link>
              <span className="text-gray-400">/</span>
              <Link to="/cart" className="text-gray-600 hover:text-gray-900">Giỏ hàng</Link>
              <span className="text-gray-400">/</span>
              <span className="text-gray-900 font-medium">Yêu cầu đàm phán giá</span>
            </div>
          </div>
        </div>

        {/* Page Header */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-4xl mx-auto px-6 lg:px-8 py-8">
            <Link
              to="/cart"
              className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Quay lại giỏ hàng
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gray-900 flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Yêu cầu đàm phán giá</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Theo dõi trạng thái các yêu cầu báo giá của bạn
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto px-6 lg:px-8 py-8">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-10 h-10 border-2 border-gray-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Đang tải dữ liệu...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 rounded-2xl border border-red-200 p-8 text-center">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <p className="text-red-700 font-medium">{error}</p>
              <Button
                onClick={() => window.location.reload()}
                className="mt-4 rounded-full bg-red-600 text-white hover:bg-red-700"
              >
                Thử lại
              </Button>
            </div>
          ) : quotations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-gray-100 p-16 text-center"
            >
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageSquare className="w-10 h-10 text-gray-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Chưa có yêu cầu đàm phán nào
              </h2>
              <p className="text-gray-500 mb-8 max-w-sm mx-auto">
                Hãy thêm sản phẩm vào giỏ hàng và gửi yêu cầu báo giá để Sales
                tư vấn mức giá tốt nhất cho bạn.
              </p>
              <Link to="/cart">
                <Button className="rounded-full bg-gray-900 text-white hover:bg-gray-800 px-8">
                  Về giỏ hàng
                </Button>
              </Link>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {quotations.map((q, index) => {
                const statusKey = getStatusKey(q.status);
                const config = STATUS_CONFIG[statusKey] || {
                  label: q.status,
                  icon: Clock,
                  className: "bg-gray-100 text-gray-700",
                  dotClass: "bg-gray-400",
                };
                const Icon = config.icon;
                const items = q.items || q.products || [];
                const hasSalesPrice = !!q.salesProposedTotal;
                const savings = hasSalesPrice
                  ? q.originalTotal - q.salesProposedTotal
                  : 0;

                return (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Link to={`/negotiation/${q.id}`}>
                      <div className="bg-white rounded-2xl border border-gray-100 p-6 hover:border-gray-300 hover:shadow-sm transition-all group cursor-pointer">
                        <div className="flex items-start justify-between gap-4">
                          {/* Left info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.className}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass}`} />
                                {config.label}
                              </span>
                              <span className="text-xs text-gray-400">
                                {new Date(q.requestDate).toLocaleDateString("vi-VN")}
                              </span>
                            </div>

                            <p className="text-sm text-gray-500 truncate mb-3">
                              Mã: <span className="font-mono text-gray-700">{q.id}</span>
                            </p>

                            {/* Products preview */}
                            <div className="flex flex-wrap gap-1.5 mb-3">
                              {items.slice(0, 3).map((item, i) => (
                                <span
                                  key={i}
                                  className="text-xs bg-gray-100 text-gray-600 rounded-full px-2.5 py-1"
                                >
                                  {item.productName} × {item.quantity}
                                </span>
                              ))}
                              {items.length > 3 && (
                                <span className="text-xs text-gray-400 rounded-full px-2.5 py-1">
                                  +{items.length - 3} sản phẩm khác
                                </span>
                              )}
                            </div>

                            {/* Pricing */}
                            <div className="flex items-center gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Tổng gốc: </span>
                                <span className={`font-semibold ${hasSalesPrice ? "text-gray-400 line-through" : "text-gray-900"}`}>
                                  {formatPrice(q.originalTotal)}
                                </span>
                              </div>
                              {hasSalesPrice && (
                                <>
                                  <div>
                                    <span className="text-gray-500">Giá Sales đề xuất: </span>
                                    <span className="font-bold text-green-600">
                                      {formatPrice(q.salesProposedTotal)}
                                    </span>
                                  </div>
                                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                    Tiết kiệm {formatPrice(savings)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Right arrow */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {(statusKey === "salesresponded" || statusKey === "negotiating") && (
                              <span className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                Cần phản hồi
                              </span>
                            )}
                            <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-600 transition-colors" />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
