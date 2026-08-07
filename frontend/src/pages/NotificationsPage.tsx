import React, { useEffect, useState } from 'react';
import { getNotifications, markAsRead, markAllAsRead } from '../services/notificationService';
import { Check, MailOpen, Bell } from 'lucide-react';
import * as signalR from '@microsoft/signalr';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchNotifications = async (pageNumber: number, append = false) => {
    setLoading(true);
    try {
      const data = await getNotifications(pageNumber, 20);
      const items = data.items || data.Items || [];
      if (items.length < 20) setHasMore(false);
      
      if (append) {
        setNotifications((prev) => [...prev, ...items]);
      } else {
        setNotifications(items);
      }
    } catch (err) {
      console.error('Error fetching notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications(1);

    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/notifications', { accessTokenFactory: () => accessToken })
      .withAutomaticReconnect()
      .build();

    connection.on('ReceiveNotification', (notification: any) => {
      setNotifications((prev) => [notification, ...prev]);
    });

    connection.start().catch((err) => console.error('NotificationHub connection error:', err));

    return () => {
      connection.stop();
    };
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Error marking as read', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Error marking all as read', err);
    }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage, true);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Bell className="w-6 h-6 text-[#1f3b64]" />
          Danh sách thông báo
        </h1>
        <button
          onClick={handleMarkAllAsRead}
          className="flex items-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 px-3 py-2 rounded-md hover:bg-blue-100 transition-colors"
        >
          <Check className="w-4 h-4" />
          Đánh dấu tất cả đã đọc
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        {notifications.length === 0 && !loading ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p>Bạn chưa có thông báo nào.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notif) => (
              <div 
                key={notif.id} 
                className={`p-4 flex gap-4 transition-colors ${notif.isRead ? 'bg-white' : 'bg-blue-50/40'}`}
              >
                <div className="flex-shrink-0 mt-1">
                  {notif.isRead ? (
                    <MailOpen className="w-5 h-5 text-gray-400" />
                  ) : (
                    <div className="relative">
                      <Bell className="w-5 h-5 text-blue-500" />
                      <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start gap-4">
                    <h3 className={`text-sm ${notif.isRead ? 'text-gray-700 font-medium' : 'text-gray-900 font-semibold'}`}>
                      {notif.title}
                    </h3>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(notif.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                    {notif.body}
                  </p>
                  
                  {!notif.isRead && (
                    <button 
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      Đánh dấu đã đọc
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {hasMore && notifications.length > 0 && (
        <div className="mt-6 text-center">
          <button 
            onClick={loadMore}
            disabled={loading}
            className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? 'Đang tải...' : 'Tải thêm thông báo'}
          </button>
        </div>
      )}
    </div>
  );
}
