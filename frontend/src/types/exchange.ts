// Kiểu dữ liệu khớp với VietTien.API/DTOs/Order/ReturnExchangeRequestDtos.cs
// Backend KHÔNG có khái niệm "isDifferentSku" — đó là state UI cục bộ của
// ExchangeRequestModal, không được đưa vào payload gửi lên API.

export interface ReturnExchangeItem {
  productId: string;
  quantity: number;
}

// POST /api/orders/{id}/exchange-request
export interface CreateReturnExchangeRequest {
  reason: string;
  evidenceUrls?: string;
  returnItems: ReturnExchangeItem[];
  exchangeItems: ReturnExchangeItem[];
}

// POST /api/orders/exchange-request/{requestId}/process
export interface ProcessReturnExchangeRequest {
  isApproved: boolean;
  managerNote?: string;
}
