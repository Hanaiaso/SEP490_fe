export const paymentStatusMeta = {
  paid: {
    label: 'Đã thanh toán',
    badgeClass: 'bg-green-100 text-green-700',
  },
  pending: {
    label: 'Chờ thanh toán',
    badgeClass: 'bg-yellow-100 text-yellow-700',
  },
  failed: {
    label: 'Thất bại',
    badgeClass: 'bg-red-100 text-red-700',
  },
}

export const shippingStatusMeta = {
  delivered: {
    label: 'Đã giao',
    badgeClass: 'bg-blue-100 text-blue-700',
  },
  shipping: {
    label: 'Đang giao',
    badgeClass: 'bg-orange-100 text-orange-700',
  },
  pending: {
    label: 'Chờ xử lý',
    badgeClass: 'bg-gray-100 text-gray-600',
  },
}

export const orders = [
  {
    id: 'VT-2024-10042',
    date: '2024-05-28',
    product: 'Băng Keo Trong Cao Cấp x2, Dập Ghim x1',
    total: 215000,
    subtotal: 195000,
    shippingFee: 20000,
    daysAgo: 5,
    payStatus: 'paid',
    shipStatus: 'delivered',
    hasVat: false,
    paymentMethod: 'Chuyển khoản Sepay',
    note: 'Giao trong giờ hành chính, liên hệ trước 15 phút.',
    customer: {
      name: 'Nguyễn Văn A',
      phone: '0901 234 567',
      email: 'nguyen.van.a@company.com',
    },
    shippingAddress: '456 Lê Lợi, Phường 2, Quận Gò Vấp, TP.HCM',
    items: [
      { id: '1', name: 'Băng Keo Trong Cao Cấp', sku: 'BKT-001', quantity: 2, price: 45000 },
      { id: '2', name: 'Dập Ghim Chuyên Nghiệp', sku: 'DGH-002', quantity: 1, price: 125000 },
    ],
    timeline: [
      { title: 'Đơn hàng đã tạo', time: '2024-05-28 08:30', done: true },
      { title: 'Đã xác nhận thanh toán', time: '2024-05-28 08:42', done: true },
      { title: 'Đã giao thành công', time: '2024-05-29 10:15', done: true },
    ],
    trackingStatus: 'delivered',
    vehicle: {
      code: '51B-123.45',
      driver: 'Trần Văn B',
      shift: 'Ca sáng (7:00 - 12:00)',
      eta: 'Đã giao ngày 2024-05-29, 10:15',
    },
  },
  {
    id: 'VT-2024-10039',
    date: '2024-05-20',
    product: 'Bộ Văn Phòng Phẩm Tối Giản x1',
    total: 280000,
    subtotal: 280000,
    shippingFee: 0,
    daysAgo: 13,
    payStatus: 'paid',
    shipStatus: 'delivered',
    hasVat: true,
    paymentMethod: 'COD',
    note: 'Xuất hóa đơn VAT cho phòng kế toán.',
    customer: {
      name: 'Nguyễn Văn A',
      phone: '0901 234 567',
      email: 'nguyen.van.a@company.com',
    },
    shippingAddress: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
    items: [{ id: '3', name: 'Bộ Văn Phòng Phẩm Tối Giản', sku: 'VPP-003', quantity: 1, price: 280000 }],
    timeline: [
      { title: 'Đơn hàng đã tạo', time: '2024-05-20 09:10', done: true },
      { title: 'Đã đóng gói và bàn giao', time: '2024-05-20 13:25', done: true },
      { title: 'Đã giao thành công', time: '2024-05-21 15:00', done: true },
    ],
    trackingStatus: 'delivered',
    vehicle: {
      code: '50H-456.78',
      driver: 'Phạm Văn C',
      shift: 'Ca chiều (13:00 - 18:00)',
      eta: 'Đã giao ngày 2024-05-21, 15:00',
    },
  },
  {
    id: 'VT-2024-10031',
    date: '2024-05-10',
    product: 'Kẹp Giấy Cao Cấp x3, Băng Keo Hai Mặt x2',
    total: 235000,
    subtotal: 235000,
    shippingFee: 0,
    daysAgo: 23,
    payStatus: 'paid',
    shipStatus: 'pending',
    hasVat: false,
    paymentMethod: 'Chuyển khoản ngân hàng',
    note: 'Đơn đang chờ kho xác nhận lô hàng bổ sung.',
    customer: {
      name: 'Nguyễn Văn A',
      phone: '0901 234 567',
      email: 'nguyen.van.a@company.com',
    },
    shippingAddress: '456 Lê Lợi, Phường 2, Quận Gò Vấp, TP.HCM',
    items: [
      { id: '5', name: 'Kẹp Giấy Cao Cấp', sku: 'KGC-005', quantity: 3, price: 35000 },
      { id: '8', name: 'Băng Keo Hai Mặt', sku: 'BKH-008', quantity: 2, price: 65000 },
    ],
    timeline: [
      { title: 'Đơn hàng đã tạo', time: '2024-05-10 10:05', done: true },
      { title: 'Đã xác nhận thanh toán', time: '2024-05-10 10:20', done: true },
      { title: 'Đang chờ xử lý kho', time: '2024-05-10 14:00', done: false },
    ],
    trackingStatus: 'received',
    vehicle: {
      code: 'Đang cập nhật',
      driver: 'Kho đang xử lý',
      shift: 'Chưa phân ca',
      eta: 'Dự kiến xác nhận trong 24 giờ',
    },
  },
  {
    id: 'VT-2024-10018',
    date: '2024-04-22',
    product: 'Cuộn Màng Xốp Hơi x5',
    total: 600000,
    subtotal: 570000,
    shippingFee: 30000,
    daysAgo: 41,
    payStatus: 'paid',
    shipStatus: 'shipping',
    hasVat: true,
    paymentMethod: 'Chuyển khoản Sepay',
    note: 'Đơn giao theo xe tải sáng.',
    customer: {
      name: 'Kho Hàng A',
      phone: '0901 234 568',
      email: 'khohanga@company.com',
    },
    shippingAddress: '789 Quốc Lộ 1A, Bình Chánh, TP.HCM',
    items: [{ id: '9', name: 'Cuộn Màng Xốp Hơi', sku: 'MXH-009', quantity: 5, price: 114000 }],
    timeline: [
      { title: 'Đơn hàng đã tạo', time: '2024-04-22 07:45', done: true },
      { title: 'Đã xác nhận thanh toán', time: '2024-04-22 08:02', done: true },
      { title: 'Đang vận chuyển', time: '2024-04-22 11:35', done: true },
    ],
    trackingStatus: 'shipping',
    vehicle: {
      code: '51C-789.10',
      driver: 'Lê Văn D',
      shift: 'Ca sáng (7:00 - 12:00)',
      eta: 'Hôm nay, 09:30 - 11:00',
    },
  },
  {
    id: 'VT-2024-10005',
    date: '2024-04-08',
    product: 'Bộ Bàn Làm Việc Thiết Kế x1',
    total: 450000,
    subtotal: 450000,
    shippingFee: 0,
    daysAgo: 55,
    payStatus: 'pending',
    shipStatus: 'shipping',
    hasVat: false,
    paymentMethod: 'COD',
    note: 'Khách sẽ thanh toán khi nhận hàng.',
    customer: {
      name: 'Nguyễn Văn A',
      phone: '0901 234 567',
      email: 'nguyen.van.a@company.com',
    },
    shippingAddress: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
    items: [{ id: '6', name: 'Bộ Bàn Làm Việc Thiết Kế', sku: 'BLV-006', quantity: 1, price: 450000 }],
    timeline: [
      { title: 'Đơn hàng đã tạo', time: '2024-04-08 16:20', done: true },
      { title: 'Đã bàn giao vận chuyển', time: '2024-04-09 08:00', done: true },
      { title: 'Đang giao hàng', time: '2024-04-09 11:15', done: true },
    ],
    trackingStatus: 'shipping',
    vehicle: {
      code: '52D-246.80',
      driver: 'Nguyễn Văn E',
      shift: 'Ca chiều (13:00 - 18:00)',
      eta: 'Hôm nay, 15:00 - 17:30',
    },
  },
]

export function getOrderById(orderId) {
  return orders.find((order) => order.id === orderId)
}

export function isVatExpired(order) {
  return order.daysAgo > 7 && !order.hasVat
}

export function getTrackingSteps(order) {
  return [
    {
      key: 'received',
      label: 'ĐÃ NHẬN ĐƠN',
      desc: 'Kho xác nhận tồn kho, đóng gói và bàn giao cho nhân viên phụ trách.',
    },
    {
      key: 'shipping',
      label: 'ĐANG VẬN CHUYỂN',
      desc: 'Đơn hàng đang được giao và có đầy đủ thông tin xe, tài xế, ca vận chuyển.',
    },
    {
      key: 'delivered',
      label: 'ĐÃ GIAO HÀNG',
      desc: 'Đơn đã được giao thành công, khách đã ký nhận hoặc xác nhận hoàn tất.',
    },
  ].map((step) => ({
    ...step,
    done:
      step.key === 'received'
        ? true
        : step.key === 'shipping'
          ? order.trackingStatus === 'shipping' || order.trackingStatus === 'delivered'
          : order.trackingStatus === 'delivered',
  }))
}
