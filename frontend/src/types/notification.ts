// Kiểu dữ liệu khớp với response của VietTien.API/Controllers/NotificationsController.cs
// (GET /api/notifications trả về { total, page, limit, items } — items là entity Notification thô,
// không qua DTO riêng).

export interface Notification {
  id: string;
  recipientUserId: string;
  type: string;
  title: string;
  body: string;
  referenceId?: string;
  referenceType?: string;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationListResponse {
  total: number;
  page: number;
  limit: number;
  items: Notification[];
}
