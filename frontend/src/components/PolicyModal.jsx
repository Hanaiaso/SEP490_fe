import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, ShieldCheck, Scale, Eye, FileText, Lock, Bell, HelpCircle, BadgeCheck, FileCheck2, Truck, RefreshCw, ShieldAlert } from 'lucide-react'

export default function PolicyModal({ isOpen, type = 'privacy', onClose }) {
  if (!isOpen) return null

  const isPrivacy = type === 'privacy'

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col z-10 overflow-hidden text-gray-800 font-sans"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${isPrivacy ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
                {isPrivacy ? <ShieldCheck className="w-5 h-5" /> : <Scale className="w-5 h-5 text-indigo-700" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 leading-tight">
                  {isPrivacy ? 'Chính Sách Bảo Mật' : 'Điều Khoản Dịch Vụ'}
                </h3>
                <p className="text-[11px] text-gray-500">Áp dụng cho khách hàng & đối tác Bao Bì Việt Tiến</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-200 transition"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-6 text-xs md:text-sm text-gray-600 leading-relaxed space-y-6">
            {isPrivacy ? (
              <>
                {/* 1 */}
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4 text-blue-600 shrink-0" />
                    1. Mục đích và phạm vi thu thập thông tin
                  </h4>
                  <p>
                    Việt Tiến thu thập thông tin khi Quý khách đăng ký tài khoản, gửi yêu cầu báo giá hoặc đặt mua bao bì. Dữ liệu bao gồm: Họ tên, số điện thoại, email, địa chỉ giao hàng, mã số thuế doanh nghiệp (nếu có).
                  </p>
                </div>

                {/* 2 */}
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
                    2. Phạm vi sử dụng thông tin
                  </h4>
                  <p>
                    Thông tin chỉ dùng để: (i) Điều phối giao hàng và đối soát biên bản bàn giao; (ii) Cung cấp hóa đơn và bảo lãnh chiết khấu thương mại; (iii) Hỗ trợ xử lý chênh lệch hàng hóa và bảo hành; (iv) Xác thực bảo mật qua OTP.
                  </p>
                </div>

                {/* 3 */}
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    3. Cam kết bảo mật thông tin
                  </h4>
                  <p>
                    Mật khẩu khách hàng được mã hóa một chiều bằng BCrypt. Mọi giao dịch truyền tải qua giao thức SSL/HTTPS. Chúng tôi cam kết không tiết lộ, trao đổi dữ liệu khách hàng cho bên thứ ba vì mục đích vụ lợi.
                  </p>
                </div>

                {/* 4 */}
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    4. Đơn vị chủ quản và liên hệ hỗ trợ
                  </h4>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-gray-700 text-xs space-y-1">
                    <p className="font-semibold text-gray-900">CÔNG TY TNHH SẢN XUẤT & THƯƠNG MẠI BAO BÌ VIỆT TIẾN</p>
                    <p>📍 Địa chỉ: Số 5, Đường Lê Lợi, TP. Thái Bình</p>
                    <p>📞 Hotline: 0398 996 177 | ✉️ Email: lienhe@viettien.store</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* 1 */}
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <BadgeCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    1. Chấp thuận điều khoản dịch vụ
                  </h4>
                  <p>
                    Bằng việc tạo tài khoản hoặc đặt mua hàng tại website viettien.store, Quý khách đồng ý tuân thủ các quy định về mua bán, giao nhận và thanh toán của Việt Tiến.
                  </p>
                </div>

                {/* 2 */}
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-indigo-600 shrink-0" />
                    2. Quy trình đặt hàng & Báo giá thương mại
                  </h4>
                  <p>
                    Đối với các đơn hàng B2B số lượng lớn, khách hàng có thể gửi yêu cầu thương lượng giá trực tuyến. Báo giá sau khi được Giám đốc kinh doanh duyệt sẽ có hiệu lực giữ giá trong thời hạn 7-14 ngày.
                  </p>
                </div>

                {/* 3 */}
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                    3. Giao nhận và kiểm đếm hàng hóa
                  </h4>
                  <p>
                    Khách hàng kiểm tra số lượng và tình trạng bao bì khi nhận bàn giao từ tài xế. Mọi phát sinh (thừa, thiếu, hỏng vỡ) sẽ được ghi nhận vào Biên bản giao nhận hoặc qua xác nhận mã giao hàng.
                  </p>
                </div>

                {/* 4 */}
                <div className="space-y-2">
                  <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-amber-600 shrink-0" />
                    4. Chính sách đổi trả và bù trừ hàng lỗi
                  </h4>
                  <p>
                    Việt Tiến hỗ trợ đổi mới 1-1 cho toàn bộ sản phẩm bị lỗi do quy trình sản xuất hoặc rủi ro vận chuyển trong vòng 48 giờ kể từ khi tiếp nhận phản hồi từ khách hàng.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex justify-end flex-shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-xs font-semibold bg-gray-900 text-white hover:bg-gray-800 transition"
            >
              Đã hiểu & Đóng
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
