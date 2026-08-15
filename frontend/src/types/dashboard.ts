// Kiểu dữ liệu khớp với DTO backend trong VietTien.API/DTOs/Admin/DashboardDtos.cs
// (GET /api/dashboards/sales-staff, /api/dashboards/sales-manager).
// Khác với DashboardKpi trong types/order.ts (GET /api/orders/sales-dashboard) — 2 endpoint
// riêng biệt, KHÔNG gộp chung 1 type kẻo tái tạo bug đã gặp trước đây.

export interface KpiSnapshot {
  salesStaffId?: string;
  periodFrom: string;
  periodTo: string;
  revenue: number;
  completedOrderCount: number;
  deliverySuccessRate: number;
  deliveryAttemptedOrderCount: number;
  processingSpeedAvgHours?: number;
  returningCustomerRate: number;
  customersInScopeCount: number;
  /** Mục tiêu doanh thu THÁNG HIỆN TẠI do Sales Manager đặt (0 = chưa đặt) — cố định theo tháng dương lịch, không phụ thuộc periodFrom/periodTo. */
  monthlyTarget: number;
  /** Doanh thu thực thu (AmountPaid) từ đầu tháng hiện tại tới nay. */
  monthlyRevenue: number;
  /** monthlyRevenue / monthlyTarget, null nếu chưa có mục tiêu. */
  monthlyTargetAchievementRate?: number | null;
}

export interface SalesStaffDashboard {
  kpi: KpiSnapshot;
}

export interface SalesStaffKpi {
  salesStaffId: string;
  salesStaffName: string;
  kpi: KpiSnapshot;
}

export interface PaymentException {
  id: string;
  orderId: string;
  orderCode: string;
  reasonCode: string;
  description?: string;
  status: string;
  retryCount: number;
  createdAt: string;
}

export interface CustomerDebt {
  id: string;
  customerProfileId: string;
  customerName: string;
  orderId: string;
  orderCode: string;
  debtAmount: number;
  overdueDays: number;
}

export interface SalesManagerDashboard {
  teamKpi: KpiSnapshot;
  staffBreakdown: SalesStaffKpi[];
  openExceptions: PaymentException[];
  overdueDebts: CustomerDebt[];
  codSlaBreachCountToday: number;
  pendingQuotationApprovalCount: number;
  pendingSalesChangeRequestCount: number;
  pendingDeliveryConflictCount: number;
  pendingMarketingApprovalCount: number;
}

// GET /api/dashboards/ceo
export interface InventorySummary {
  totalSkus: number;
  lowStockCount: number;
  estimatedInventoryValue: number;
}

export interface PurchaseOrderSummaryItem {
  id: string;
  code: string;
  status: string;
  supplierName: string;
  createdAt: string;
  expectedDeliveryDate?: string;
}

export interface PurchaseOrderDashboardSummary {
  countsByStatus: Record<string, number>;
  recentOpenPurchaseOrders: PurchaseOrderSummaryItem[];
}

export interface DiscrepancySummary {
  periodFrom: string;
  periodTo: string;
  goodsReceiptCount: number;
  totalShortQuantity: number;
  totalExcessQuantity: number;
  totalDamagedQuantity: number;
  totalWrongItemQuantity: number;
}

export interface CeoDashboard {
  orgKpi: KpiSnapshot;
  inventory: InventorySummary;
  purchaseOrders: PurchaseOrderDashboardSummary;
  discrepancy: DiscrepancySummary;
  pendingCeoQuotationCount: number;
}

// GET/POST /api/sales-targets (Sales Manager đặt mục tiêu doanh thu tháng cho từng Sales Staff)
export interface SalesStaffTarget {
  salesStaffId: string;
  salesStaffName: string;
  year: number;
  month: number;
  /** 0 = chưa đặt mục tiêu cho tháng này. */
  targetAmount: number;
  actualRevenue: number;
  achievementRate?: number | null;
  setAt?: string | null;
  setByName?: string | null;
}
