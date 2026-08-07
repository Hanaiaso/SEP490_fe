import React, { useEffect, useState, useRef } from 'react';
import {
  Bell, Check, X, Clock, ShoppingCart, AlertTriangle, CreditCard, Package,
  Truck, Users, FileText, ArrowRight, CheckCircle, MailOpen, DollarSign
} from 'lucide-react';
import * as signalR from '@microsoft/signalr';
import { useNavigate } from 'react-router-dom';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead } from '../services/notificationService';

const PRIMARY = '#1f3b64';

// Map notification type to icon and color
function getNotifStyle(type?: string) {
  if (!type) return { icon: Bell, bg: 'bg-slate-100', color: 'text-slate-500' };
  if (type.includes('NewOrder') || type.includes('Order'))
    return { icon: ShoppingCart, bg: 'bg-blue-50', color: 'text-blue-600' };
  if (type.includes('Cod') || type.includes('COD'))
    return { icon: AlertTriangle, bg: 'bg-amber-50', color: 'text-amber-600' };
  if (type.includes('SePay') || type.includes('Payment'))
    return { icon: CreditCard, bg: 'bg-emerald-50', color: 'text-emerald-600' };
  if (type.includes('Warehouse') || type.includes('Stock') || type.includes('GoodsReceipt'))
    return { icon: Package, bg: 'bg-violet-50', color: 'text-violet-600' };
  if (type.includes('Delivery'))
    return { icon: Truck, bg: 'bg-cyan-50', color: 'text-cyan-600' };
  if (type.includes('Customer') || type.includes('Sales'))
    return { icon: Users, bg: 'bg-indigo-50', color: 'text-indigo-600' };
  if (type.includes('Quotation') || type.includes('PO'))
    return { icon: FileText, bg: 'bg-orange-50', color: 'text-orange-600' };
  if (type.includes('Cancel') || type.includes('Error'))
    return { icon: X, bg: 'bg-red-50', color: 'text-red-500' };
  return { icon: Bell, bg: 'bg-slate-100', color: 'text-slate-500' };
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ngày trước`;
  return new Date(dateStr).toLocaleDateString('vi-VN');
}

export default function NotificationBell({ role, onViewAll }: { role: string; onViewAll?: () => void }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const data = await getUnreadCount();
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error('Error fetching unread count', err);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const isRead = activeTab === 'unread' ? false : null;
      const data = await getNotifications(1, 15, isRead);
      setNotifications(data.items || data.Items || []);
    } catch (err) {
      console.error('Error fetching notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    fetchUnreadCount();

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/notifications', { accessTokenFactory: () => accessToken })
      .withAutomaticReconnect()
      .build();

    connection.on('ReceiveNotification', (notification: any) => {
      setUnreadCount((prev) => prev + 1);
      setNotifications((prev) => [notification, ...prev]);
    });

    connection.start().catch((err) => console.error('NotificationHub connection error:', err));

    return () => {
      connection.stop();
    };
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, activeTab]);

  const handleMarkAsRead = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking as read', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read', err);
    }
  };

  const displayNotifications = notifications;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white animate-pulse"
            style={{ backgroundColor: '#ef4444' }}
          >
            {unreadCount > 99 ? '99' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-[380px] rounded-2xl border border-slate-200 bg-white shadow-2xl z-50 overflow-hidden flex flex-col"
          style={{ maxHeight: 'calc(100vh - 100px)' }}
        >
          {/* Header */}
          <div className="px-5 pt-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Thông báo</h3>
                {unreadCount > 0 && (
                  <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-xs font-medium transition-colors rounded-lg px-2 py-1 hover:bg-slate-100"
                style={{ color: PRIMARY }}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Đọc tất cả
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all ${
                  activeTab === 'all'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setActiveTab('unread')}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-all ${
                  activeTab === 'unread'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Chưa đọc
                {unreadCount > 0 && (
                  <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: '400px' }}>
            {loading && displayNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
                <span className="text-xs text-slate-400">Đang tải...</span>
              </div>
            ) : displayNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-slate-300" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-slate-500">
                    {activeTab === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Thông báo mới sẽ xuất hiện ở đây</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col">
                {displayNotifications.map((notif, idx) => {
                  const style = getNotifStyle(notif.type);
                  const Icon = style.icon;
                  return (
                    <div
                      key={notif.id}
                      className={`group flex gap-3 px-5 py-3 cursor-pointer transition-all border-l-2 ${
                        notif.isRead
                          ? 'border-l-transparent hover:bg-slate-50'
                          : 'border-l-blue-500 bg-blue-50/30 hover:bg-blue-50/50'
                      }`}
                      onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                    >
                      {/* Icon */}
                      <div className={`flex-shrink-0 w-9 h-9 rounded-xl ${style.bg} flex items-center justify-center mt-0.5`}>
                        <Icon className={`w-4 h-4 ${style.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] leading-snug ${notif.isRead ? 'text-slate-600' : 'text-slate-900 font-semibold'}`}>
                          {notif.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                          {notif.body}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Clock className="w-3 h-3 text-slate-300" />
                          <span className="text-[10px] text-slate-400">
                            {timeAgo(notif.createdAt)}
                          </span>
                        </div>
                      </div>

                      {/* Unread dot / Mark read */}
                      <div className="flex-shrink-0 flex items-start pt-1">
                        {!notif.isRead ? (
                          <button
                            onClick={(e) => handleMarkAsRead(notif.id, e)}
                            className="w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-blue-100 transition-all"
                            title="Đánh dấu đã đọc"
                          >
                            <Check className="w-3.5 h-3.5 text-blue-500" />
                          </button>
                        ) : (
                          <MailOpen className="w-3.5 h-3.5 text-slate-300 mt-0.5" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 px-5 py-2.5">
            <button
              onClick={() => {
                setIsOpen(false);
                if (onViewAll) onViewAll();
                else navigate('notifications');
              }}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 rounded-lg transition-all hover:bg-slate-50"
              style={{ color: PRIMARY }}
            >
              Xem tất cả thông báo
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
