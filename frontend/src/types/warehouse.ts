// Kiểu dữ liệu khớp với các DTO backend trong VietTien.API/DTOs/Warehouse,
// DTOs/PurchaseOrder và DTOs/Delivery (Quarantine) — xem báo cáo đối chiếu DTO khi tạo file này.

export interface PaginatedList<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface Location {
  id: string;
  name: string;
  type: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  locations: Location[];
}

export interface StaffUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  role: string;
}

export interface InventoryItem {
  id: string;
  productId?: string;
  materialId?: string;
  itemName: string;
  itemSku: string;
  itemType: string;
  unit: string;
  productName: string;
  productSku: string;
  onHandQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lastUpdatedByUserId?: string;
  lastUpdatedByUserName?: string;
  lastUpdatedAt?: string;
}

export interface LowStockAlert {
  itemType: 'Product' | 'Material';
  itemId: string;
  itemName: string;
  itemSku?: string;
  warehouseId?: string;
  warehouseName?: string;
  availableQuantity: number;
  threshold: number;
  unit?: string;
  suggestedAction: string;
}

export interface ExcessStockAlert {
  itemType: 'Product' | 'Material';
  itemId: string;
  itemName: string;
  itemSku?: string;
  availableQuantity: number;
  threshold: number;
  unit?: string;
  suggestedAction: string;
}

export interface CategoryStock {
  categoryName: string;
  itemCount: number;
  totalOnHand: number;
  totalValue: number;
}

export interface StockMovementPoint {
  date: string;
  totalIn: number;
  totalOut: number;
}

export interface InventoryReport {
  totalSkus: number;
  totalInventoryValue: number;
  totalWarehouses: number;
  lowStockCount: number;
  categoryBreakdown: CategoryStock[];
  stockMovement: StockMovementPoint[];
  topLowStockItems: InventoryItem[];
}

export interface SlowMovingItem {
  id: string;
  productId?: string;
  materialId?: string;
  itemType: string;
  sku: string;
  itemName: string;
  unit: string;
  onHandQuantity: number;
  lastOutboundAt?: string;
  daysSinceLastOutbound: number | null;
  suggestion: string;
}

export interface WarehouseShift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  description?: string;
}

export type StockTransferStatus =
  | 'Draft'
  | 'TransportRequested'
  | 'TransportArranged'
  | 'Dispatched'
  | 'Received'
  | 'Cancelled';

export interface StockTransferItem {
  id: string;
  stockTransferId: string;
  productId?: string;
  materialId?: string;
  itemName: string;
  itemType: string;
  quantity: number;
  receivedQuantity?: number;
}

export interface StockTransfer {
  id: string;
  code: string;
  sourceWarehouseId: string;
  sourceWarehouseName: string;
  destinationWarehouseId: string;
  destinationWarehouseName: string;
  createdByUserId: string;
  createdByUserName: string;
  status: StockTransferStatus;
  createdAt: string;
  expectedDispatchDate?: string;
  expectedReceiveDate?: string;
  dispatchedAt?: string;
  receivedAt?: string;
  note?: string;
  receiveNote?: string;
  proofImageUrl?: string;
  notificationEmail?: string;
  deliveryVehicleId?: number;
  deliveryShift?: string;
  scheduledDeliveryDate?: string;
  items: StockTransferItem[];
  // Chỉ có giá trị ngay tại thời điểm vừa Dispatch xong (không nạp lại ở các lần GET sau).
  goodsIssueId?: string;
  goodsIssueCode?: string;
}

export interface GoodsIssueItem {
  id: string;
  productId?: string;
  materialId?: string;
  itemName: string;
  itemSku: string;
  itemType: string;
  unit: string;
  quantity: number;
  note?: string;
}

export interface GoodsIssue {
  id: string;
  code: string;
  type: string;
  referenceId?: string;
  warehouseId: string;
  warehouseName: string;
  issuedByUserId: string;
  issuedByName: string;
  status: string;
  createdAt: string;
  issueDate?: string;
  imageProofUrl?: string;
  externalRecipientName?: string;
  department?: string;
  receivedAt?: string;
  paperDocumentNumber?: string;
  usagePurpose?: string;
  reversalForIssueId?: string;
  reversalReason?: string;
  isReversal: boolean;
  note?: string;
  items: GoodsIssueItem[];
}

export interface WarehouseStockBreakdown {
  warehouseId: string;
  warehouseName: string;
  onHandQuantity: number;
}

export interface WarehouseOrderItem {
  productId: string;
  productName: string;
  sku: string;
  requestedQuantity: number;
  // Tổng CỘNG DỒN across mọi kho — ở cấp PickTask.items thì đây là tồn TẠI ĐÚNG KHO của task đó (xem stockByWarehouse chỉ có ở cấp đơn hàng).
  physicalStock: number;
  stockByWarehouse?: WarehouseStockBreakdown[];
  isStockSufficient: boolean;
  packedQuantity: number;
  remainingQuantity: number;
  evidenceImageUrl?: string;
  requiredTransferQuantity: number;
}

export interface PickTask {
  pickTaskId: string;
  orderId?: string;
  orderCode: string;
  finalPayment: number;
  warehouseName: string;
  warehouseCode: string;
  status: string;
  createdAt: string;
  items: WarehouseOrderItem[];
}

export interface WarehouseOrderDetail {
  orderId: string;
  orderCode: string;
  status: string;
  createdAt: string;
  allocatedWarehouse: string;
  allocatedWarehouseCode: string;
  orderProgress: number;
  pickingStartedAt?: string;
  pickingCompletedAt?: string;
  finalPayment: number;
  items: WarehouseOrderItem[];
  pickTasks: PickTask[];
}

export interface WarehouseOrderListItem {
  orderId: string;
  orderCode: string;
  confirmedAt: string;
  totalQuantity: number;
  finalPayment: number;
  status: string;
  allocatedWarehouse: string;
  allocatedWarehouseCode: string;
  requiresTransfer: boolean;
  orderProgress: number;
  pickingStartedAt?: string;
  pickingCompletedAt?: string;
  warehouseConfirmed: boolean;
  salesConfirmed: boolean;
}

export interface PurchaseOrderItem {
  id: string;
  productId?: string;
  materialId?: string;
  itemName: string;
  itemSku: string;
  itemType: string;
  expectedQuantity: number;
  receivedQuantity: number;
  unitPrice: number;
  unit: string;
  note?: string;
}

export interface PurchaseOrder {
  id: string;
  code: string;
  status: string;
  createdAt: string;
  expectedDeliveryDate?: string;
  issuedAt?: string;
  note?: string;
  deliveryTerms?: string;
  createdById: string;
  createdByName: string;
  supplierId: string;
  supplierName: string;
  supplierCode: string;
  warehouseId: string;
  warehouseName: string;
  items: PurchaseOrderItem[];
}

export interface PurchaseOrderListItem {
  id: string;
  code: string;
  status: string;
  createdAt: string;
  issuedAt?: string;
  expectedDeliveryDate?: string;
  supplierName: string;
  warehouseName: string;
  totalItems: number;
  totalExpectedQuantity: number;
  totalReceivedQuantity: number;
}

export interface GoodsReceiptItem {
  id: string;
  purchaseOrderItemId: string;
  itemName: string;
  itemSku: string;
  itemType: string;
  acceptedQuantity: number;
  damagedQuantity: number;
  excessQuantity: number;
  shortQuantity: number;
  wrongItemQuantity: number;
  batchNumber?: string;
  expiryDate?: string;
  note?: string;
}

export interface GoodsReceipt {
  id: string;
  purchaseOrderId: string;
  purchaseOrderCode: string;
  receivedByUserId: string;
  receivedByUserName: string;
  code: string;
  status: string;
  receivedDate: string;
  note?: string;
  imageProofUrl?: string;
  items: GoodsReceiptItem[];
}

// POST /api/purchase-orders (CEO)
export interface CreatePurchaseOrderItemRequest {
  productId?: string;
  materialId?: string;
  expectedQuantity: number;
  unitPrice: number;
  unit: string;
  note?: string;
}

export interface CreatePurchaseOrderRequest {
  supplierId: string;
  warehouseId: string;
  expectedDeliveryDate?: string;
  note?: string;
  deliveryTerms?: string;
  items: CreatePurchaseOrderItemRequest[];
}

// POST /api/purchase-orders/{id}/resolve-discrepancy
export interface DiscrepancyResolutionRequest {
  resolutionType: 'AcceptExcess' | 'ReturnExcess' | 'RequestSupplemental' | 'CloseShort';
  reason: string;
}

// GET /api/purchase-orders/warehouses — anonymous projection, không phải Warehouse đầy đủ (không có locations).
export interface WarehouseOption {
  id: string;
  name: string;
  code: string;
}

// DEF-L4-003: khớp InventoryCountSessionDtos.cs (VietTien.API/DTOs/Warehouse)
export type InventoryCountSessionStatus = 'Open' | 'Closed';

export interface InventoryCountSessionItem {
  id: string;
  inventoryId: string;
  itemName: string;
  itemSku: string;
  systemQuantity: number;
  physicalQuantity: number | null;
  variance: number | null;
  note?: string | null;
  autoApplied: boolean;
  stockAdjustmentId?: string | null;
}

export interface InventoryCountSession {
  id: string;
  warehouseId: string;
  warehouseName: string;
  status: InventoryCountSessionStatus;
  note?: string | null;
  openedByUserId: string;
  openedByName: string;
  openedAt: string;
  closedByUserId?: string | null;
  closedByName?: string | null;
  closedAt?: string | null;
  items: InventoryCountSessionItem[];
}

export interface CloseInventoryCountSessionResult {
  session: InventoryCountSession;
  autoAppliedCount: number;
  pendingApprovalCount: number;
}

export interface QuarantineListItem {
  id: string;
  quarantineCode: string;
  orderId?: string;
  orderCode?: string;
  goodsReceiptItemId?: string;
  source: 'CustomerReturn' | 'GoodsReceiptQc' | string;
  productId?: string;
  materialId?: string;
  itemName: string;
  itemSku: string;
  itemType: string;
  quantity: number;
  reason: string;
  status: string;
  receivedByName: string;
  createdAt: string;
  dispatchedAction?: string;
  dispatchedByName?: string;
  dispatchedAt?: string;
}
