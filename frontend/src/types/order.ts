// Kiểu dữ liệu khớp với DTO backend trong VietTien.API/DTOs/Order.

export type PaymentMethod = 'COD' | 'SePay' | 'Cash';
export type PaymentStatus = 'Unpaid' | 'Pending' | 'Paid' | 'PartiallyPaid' | 'Failed' | 'Refunded';
export type OrderStatus =
  | 'Draft' | 'PendingPayment' | 'PendingConfirmation' | 'Confirmed' | 'Processing'
  | 'Completed' | 'CancelRequested' | 'CancelledReallocated' | 'Cancelled'
  | 'PaidReviewRequired' | 'Returned';
export type FulfillmentStatus =
  | 'Unallocated' | 'Reserved' | 'Allocated' | 'Picking' | 'PartiallyReady'
  | 'Ready' | 'Consolidating' | 'Consolidated' | 'HandedOver' | 'Fulfilled';
export type DeliveryStatus =
  | 'NotScheduled' | 'Scheduled' | 'InDelivery' | 'Delivered' | 'Failed'
  | 'PartiallyDelivered' | 'Rescheduled' | 'Cancelled';

export interface SalesOrderItem {
  productId: string;
  productName: string;
  productSku: string;
  productImageUrl?: string;
  quantity: number;
  priceSnapshot: number;
  lineTotal: number;
}

export interface ReturnExchangeRequestSnapshot {
  id: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  reason: string;
  managerNote?: string;
  createdAt: string;
  requestedBy: string;
  evidenceUrls?: string;
  replacementOrderId?: string;
  replacementOrderCode?: string;
  returnItems: SalesOrderItem[];
  exchangeItems: SalesOrderItem[];
}

// GET /api/orders/sales (list item)
export interface SalesOrderListItem {
  id: string;
  orderCode: string;
  customerName: string;
  createdAt: string;
  finalPayment: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  fulfillmentStatus: FulfillmentStatus;
  shippingAddress: string;
  totalQuantity: number;
  pickingStartedAt?: string;
  pickingCompletedAt?: string;
  invoicePdfUrl?: string;
  hasReturnRequest: boolean;
  returnRequestStatus?: string;
}

// GET /api/orders/sales/{id} — SalesOrderListItem + các field chi tiết.
// KHÔNG có `creditApplied` — backend chưa từng trả field này, đừng coi là required.
export interface SalesOrderDetail extends SalesOrderListItem {
  customerPhone: string;
  totalAmount: number;
  discountAmount: number;
  vatAmount: number;
  deliveryStatus: DeliveryStatus;
  deliveryVehicleId?: number;
  deliveryShift?: string;
  scheduledDeliveryDate?: string;
  deliveredAt?: string;
  customerSignatureUrl?: string;
  deliveryPhotoUrl?: string;
  failedDeliveryCount: number;
  amountPaid: number;
  customerEmail?: string;
  orderNote?: string;
  returnExchangeRequests: ReturnExchangeRequestSnapshot[];
  companyName?: string;
  items: SalesOrderItem[];
}

// POST /api/orders/sales-dashboard
export interface DashboardKpi {
  newOrdersCount: number;
  processingOrdersCount: number;
  shippingOrdersCount: number;
  deliveredTodayCount: number;
  revenueToday: number;
  pendingDebt: number;
}

export interface DashboardOrder {
  id: string;
  orderCode: string;
  customerName: string;
  createdAt: string;
  finalPayment: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  invoicePdfUrl?: string;
}

export interface DashboardUrgentOrder {
  id: string;
  customer: string;
  amount: number;
  deadline: string;
  level: 'critical' | 'high' | 'normal';
}

export interface DashboardWarehouseQueueItem {
  id: string;
  customer: string;
  itemsCount: number;
  status: string;
}

export interface DashboardQuoteRequest {
  id: string;
  customerName: string;
  value: number;
  requestDate: string;
}

export interface DashboardTopProduct {
  name: string;
  revenue: number;
}

export interface DashboardRevenueDay {
  day: string;
  revenue: number;
  target: number;
}

export interface SalesDashboardStats {
  kpi: DashboardKpi;
  recentOrders: DashboardOrder[];
  urgentOrders: DashboardUrgentOrder[];
  warehouseQueue: DashboardWarehouseQueueItem[];
  quoteRequests: DashboardQuoteRequest[];
  topProducts: DashboardTopProduct[];
  last7DaysRevenue: DashboardRevenueDay[];
}
