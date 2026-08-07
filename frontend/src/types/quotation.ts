// Kiểu dữ liệu khớp với DTO backend trong VietTien.API/DTOs/Quotation.

export type QuotationStatus =
  | 'Draft' | 'Negotiating' | 'PendingManager' | 'PendingCeo' | 'Approved'
  | 'CustomerAccepted' | 'CustomerRejected' | 'Expired' | 'Cancelled';

export type QuotationVersionStatus =
  | 'Draft' | 'PendingManager' | 'ManagerApproved' | 'ManagerRejected'
  | 'PendingCeo' | 'CeoApproved' | 'CeoRejected' | 'CustomerAccepted'
  | 'CustomerRejected' | 'Expired';

export interface QuotationItem {
  id: string;
  productId: string;
  productName: string;
  productImageUrl?: string;
  quantity: number;
  originalUnitPrice: number;
}

export interface QuotationVersionItem {
  id: string;
  productId: string;
  productName: string;
  productImageUrl?: string;
  quantity: number;
  originalUnitPrice: number;
  proposedUnitPrice: number;
}

export interface QuotationVersion {
  id: string;
  versionNumber: number;
  proposedTotal: number;
  salesNote?: string;
  managerNote?: string;
  ceoNote?: string;
  status: QuotationVersionStatus;
  createdAt: string;
  managerReviewedAt?: string;
  ceoReviewedAt?: string;
  validUntil?: string;
  items: QuotationVersionItem[];
}

export interface Quotation {
  id: string;
  customerProfileId: string;
  salesStaffId?: string;
  cartId?: string;
  acceptedVersionId?: string;
  customerName: string;
  salesStaffName?: string;
  status: QuotationStatus;
  originalTotal: number;
  requestDate: string;
  validUntil?: string;
  generalNote?: string;
  items: QuotationItem[];
  versions: QuotationVersion[];
}

// GET /api/Quotation cho SalesStaff trả về { myQuotations, pendingQuotations } thay vì mảng phẳng.
export interface SalesStaffQuotationList {
  myQuotations: Quotation[];
  pendingQuotations: Quotation[];
}

// GET /api/Quotation/{id}/messages — chỉ có messageText/sentAt, KHÔNG có content/createdAt.
export interface ChatMessage {
  id: string;
  quotationId: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  messageText: string;
  fileUrl?: string;
  sentAt: string;
  isRead: boolean;
}
