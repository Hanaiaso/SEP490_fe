// Kiểu dữ liệu khớp với DTO backend trong VietTien.API/DTOs/Delivery.

// GET /api/delivery/orders
export interface DeliveryOrderListItem {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  finalPayment: number;
  amountPaid: number;
  paymentMethod: string;
  orderStatus: string;
  deliveryStatus: string;
  vehicleId?: number;
  shift?: string;
  scheduledDeliveryDate?: string;
  failedDeliveryCount: number;
  isBlocked: boolean;
  itemCount: number;
}

export interface DeliveryResultResponse {
  orderId: string;
  orderCode: string;
  newDeliveryStatus: string;
  newOrderStatus: string;
  debtRecordCreated: boolean;
  remainingDebt?: number;
  isBlockedByFailures: boolean;
  message: string;
  signatureUploadFailed: boolean;
  photoUploadFailed: boolean;
}

export interface ReplacementOrderResponse {
  replacementOrderId: string;
  replacementOrderCode: string;
  newOrderValue: number;
  originalPaidAmount: number;
  creditAllocated: number;
  reallocatedAmount: number;
  customerCreditBalance: number;
  message: string;
}

// UC-34: GET /api/delivery/conflicts
export interface DeliveryScheduleConflict {
  id: string;
  vehicleId: number;
  shift: string;
  requestedDate: string;
  orderCodes: string[];
  status: string;
  raisedByUserId: string;
  raisedByUserName?: string;
  raisedAt: string;
  resolvedByUserId?: string;
  resolvedByUserName?: string;
  resolvedAt?: string;
  resolutionAction?: string;
  resolutionNote?: string;
}

export interface ResolveDeliveryConflictRequest {
  action: 'Reassign' | 'Override' | 'Reject';
  newVehicleId?: number;
  newShift?: string;
  newDate?: string;
  note: string;
}

// GET /api/delivery/pickups
export interface PendingPickupItem {
  productId: string;
  productName: string;
  quantity: number;
  reason: string;
}

export interface PendingPickup {
  requestId: string;
  requestCode: string;
  orderId: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  pickupStatus: string;
  pickupVehicleId?: number;
  pickupShift?: string;
  scheduledPickupDate?: string;
  returnProductNames: string[];
  items: PendingPickupItem[];
}
