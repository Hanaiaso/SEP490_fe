import { fetchWithToken } from './authService';

export async function getNotifications(pageNumber = 1, pageSize = 20, isRead = null) {
  let url = `/notifications?pageNumber=${pageNumber}&pageSize=${pageSize}`;
  if (isRead !== null) {
    url += `&isRead=${isRead}`;
  }
  return await fetchWithToken('GET', url);
}

export async function getUnreadCount() {
  return await fetchWithToken('GET', '/notifications/unread-count');
}

export async function markAsRead(notificationId) {
  return await fetchWithToken('PUT', `/notifications/${notificationId}/read`);
}

export async function markAllAsRead() {
  return await fetchWithToken('PUT', '/notifications/read-all');
}
