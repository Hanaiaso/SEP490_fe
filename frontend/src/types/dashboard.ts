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
}
