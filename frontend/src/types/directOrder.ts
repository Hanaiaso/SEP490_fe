// Kiểu dữ liệu khớp với VietTien.API/DTOs/Order/PlaceDirectOrderRequestDto.cs,
// DirectOrderResponseDto.cs, SePayQrResponseDto.cs, PaymentStatusResponseDto.cs.

export interface DirectOrderItem {
  productId: string;
  quantity: number;
  price: number;
}

export interface PlaceDirectOrderRequest {
  customerName: string;
  phoneNumber?: string;
  address?: string;
  totalAmount: number;
  discountAmount: number;
  vatAmount: number;
  finalPayment: number;
  paymentMethod: 'COD' | 'SePay' | 'Cash';
  invoicePdfBase64?: string;
  orderCode?: string;
  items: DirectOrderItem[];
}

// Response KHÔNG có paymentMethod — frontend tự gắn thêm từ state đã biết trước.
export interface DirectOrderResponse {
  orderId: string;
  orderCode: string;
  finalPayment: number;
  invoicePdfUrl?: string;
}

export interface SePayQrResponse {
  qrImageUrl: string;
  transferContent: string;
}

export interface PaymentStatusResponse {
  status: string;
}
