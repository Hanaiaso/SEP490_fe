import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';
import { Avatar, AvatarFallback } from '../../components/sales-ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/sales-ui/dropdown-menu';
import {
  Archive,
  Bell,
  ChevronDown,
  DollarSign,
  FileText,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Truck,
  UserPlus,
  Users,
  X,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import SalesDashboardPage from './SalesDashboardPage';
import SalesNegotiationPage from './SalesNegotiationPage';
import DirectPurchasePage from './DirectPurchasePage';
import SalesOrdersPage from './SalesOrdersPage';
import SalesOrderDetailPage from './SalesOrderDetailPage';
import SalesDeliveryPage from './SalesDeliveryPage';
import SalesWarehouseCoordPage from './SalesWarehouseCoordPage';
import SalesWarehouseHandoverPage from './SalesWarehouseHandoverPage';
import SalesDeliveryArrangementPage from './SalesDeliveryArrangementPage';
import SalesPickupArrangementPage from './SalesPickupArrangementPage';
import SalesDeliveryCollectionPage from './SalesDeliveryCollectionPage';
import SalesMyCustomersPage from './SalesMyCustomersPage';
import SalesChangeRequestExplainPage from './SalesChangeRequestExplainPage';
import SalesAiContentStudio from './SalesAiContentStudio';
import { useAuth } from '../../context/AuthContext';
import NotificationBell from '../../components/NotificationBell';
import NotificationsPage from '../NotificationsPage';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
  children?: NavItem[];
  roles?: string[]; // Không khai báo = hiện cho mọi role vào được portal
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />,
    path: '/sales/dashboard',
  },
  {
    id: 'ai-content-studio',
    label: 'AI Content Studio',
    icon: <Sparkles className="w-4 h-4" />,
    path: '/sales/ai-content-studio',
    roles: ['SalesStaff', 'Admin'],
  },
  {
    id: 'my-customers',
    label: 'Khách hàng của tôi',
    icon: <Users className="w-4 h-4" />,
    path: '/sales/my-customers',
    roles: ['SalesStaff', 'Admin'],
  },
  {
    id: 'orders',
    label: 'Quản lý đơn hàng',
    icon: <FileText className="w-4 h-4" />,
    path: '/sales/orders',
    roles: ['SalesStaff', 'Admin'],
  },
  {
    id: 'change-requests',
    label: 'Yêu cầu đổi Sale',
    icon: <UserPlus className="w-4 h-4" />,
    path: '/sales/change-requests',
    roles: ['SalesStaff', 'Admin'],
  },
  {
    id: 'negotiation',
    label: 'Báo giá & Đàm phán giá',
    icon: <MessageSquare className="w-4 h-4" />,
    path: '/sales/negotiation',
    badge: 3,
    roles: ['SalesStaff', 'Admin'],
  },
  {
    id: 'direct-purchase',
    label: 'Mua hàng trực tiếp',
    icon: <ShoppingCart className="w-4 h-4" />,
    path: '/sales/direct-purchase',
    roles: ['SalesStaff', 'Admin'],
  },
  {
    id: 'delivery',
    label: 'Giao hàng',
    icon: <Truck className="w-4 h-4" />,
    path: '/sales/delivery',
    roles: ['SalesStaff', 'Admin'],
    children: [
      {
        id: 'delivery-handover',
        label: 'Bàn giao từ Kho',
        icon: <ShieldCheck className="w-3.5 h-3.5" />,
        path: '/sales/delivery/handover',
      },
      {
        id: 'delivery-warehouse',
        label: 'Phối hợp kho',
        icon: <Package className="w-3.5 h-3.5" />,
        path: '/sales/delivery/warehouse',
      },
      {
        id: 'delivery-arrangement',
        label: 'Sắp xếp vận chuyển',
        icon: <Truck className="w-3.5 h-3.5" />,
        path: '/sales/delivery/arrangement',
      },
      {
        id: 'pickup-arrangement',
        label: 'Điều xe Thu hồi',
        icon: <Archive className="w-3.5 h-3.5" />,
        path: '/sales/pickup-arrangement',
      },
      {
        id: 'delivery-collection',
        label: 'Giao hàng và thu tiền',
        icon: <DollarSign className="w-3.5 h-3.5" />,
        path: '/sales/delivery/collection',
      },
    ],
  },
];

function NavItemRow({
  item,
  onNavigate,
  level = 0,
}: {
  item: NavItem;
  onNavigate: (path: string) => void;
  level?: number;
}) {
  const location = useLocation();
  const inSection =
    location.pathname === item.path ||
    location.pathname.startsWith(item.path + '/') ||
    item.children?.some((child) => location.pathname === child.path) ||
    false;
  const [expanded, setExpanded] = useState(Boolean(item.children && inSection));
  const isActive = location.pathname === item.path;

  const handleClick = () => {
    if (!item.children) {
      onNavigate(item.path);
      return;
    }

    if (inSection) {
      setExpanded((prev) => !prev);
      if (!isActive) {
        onNavigate(item.path);
      }
      return;
    }

    setExpanded(true);
    onNavigate(item.path);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={[
          'w-full rounded px-2.5 py-1.5 text-left text-[12px] transition-colors group',
          level > 0 ? 'ml-3 w-[calc(100%-0.75rem)] font-normal' : 'font-medium',
          isActive
            ? 'bg-white/15 text-white'
            : inSection
            ? 'text-white/90'
            : 'text-white/55 hover:bg-white/8 hover:text-white/80',
        ].join(' ')}
      >
        <span className="flex items-center gap-2">
          <span
            className={`flex-shrink-0 ${
              isActive ? 'text-white' : 'text-white/45 group-hover:text-white/70'
            }`}
          >
            {item.icon}
          </span>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && item.badge > 0 && (
            <span className="flex-shrink-0 rounded bg-red-500 px-1.5 py-0.5 text-[9px] font-semibold text-white">
              {item.badge}
            </span>
          )}
          {item.children && (
            <ChevronDown
              className={`h-3 w-3 flex-shrink-0 text-white/35 transition-transform ${
                expanded ? 'rotate-180' : ''
              }`}
            />
          )}
        </span>
      </button>

      {item.children && expanded && (
        <div className="mt-0.5 space-y-0.5">
          {item.children.map((child) => (
            <NavItemRow key={child.id} item={child} onNavigate={onNavigate} level={level + 1} />
          ))}
        </div>
      )}
    </>
  );
}

type AssignmentToast = {
  id: number;
  customerName: string;
  source: string;
  assignedAt: string;
  message?: string; // toast dạng thông báo tự do (LUỒNG 7)
};

const TOAST_SOURCE_LABELS: Record<string, string> = {
  ROUND_ROBIN: 'Round-robin',
  REFERRAL: 'Giới thiệu',
  RETURNING_CUSTOMER: 'Khách cũ quay lại',
  MANUAL_REASSIGNMENT: 'Quản lý gán',
};

export default function SalesPortal() {
  const navigate = useNavigate();
  const { user, logout } = useAuth() as any;
  const role: string = user?.role || '';
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.roles || item.roles.includes(role));
  const [toasts, setToasts] = useState<AssignmentToast[]>([]);

  // WF-01 bước 6: nhận thông báo realtime khi được hệ thống gán khách hàng mới
  useEffect(() => {
    if (role !== 'SalesStaff') return;
    const accessToken = localStorage.getItem('accessToken');
    if (!accessToken) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/sales', { accessTokenFactory: () => accessToken })
      .withAutomaticReconnect()
      .build();

    connection.on('CustomerAssigned', (payload: { customerName: string; source: string; assignedAt: string }) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, ...payload }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 8000);
    });

    // LUỒNG 7: thông báo liên quan yêu cầu đổi Sale của khách
    const pushMessageToast = (payload: { customerName?: string; message?: string }) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [
        ...prev,
        { id, customerName: payload.customerName || '', source: '', assignedAt: '', message: payload.message },
      ]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 8000);
    };
    // Gate bảo vệ khách: Sale chỉ được báo khi Manager bấm "Yêu cầu giải trình" (không báo lúc khách tạo)
    connection.on('SalesChangeRequestExplanationRequested', pushMessageToast);
    connection.on('SalesChangeRequestApproved', pushMessageToast);
    connection.on('SalesChangeRequestRejected', pushMessageToast);

    let stopped = false;
    connection.start().catch((err) => {
      // StrictMode mount kép sẽ stop connection đầu tiên — không phải lỗi thật
      if (!stopped) console.error('SalesHub connection error:', err);
    });

    return () => {
      stopped = true;
      connection.stop();
    };
  }, [role]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userName = user?.fullName || user?.email || 'Nhan vien Sales';
  const initials =
    userName
      .split(' ')
      .slice(-2)
      .map((part: string) => part[0])
      .join('')
      .toUpperCase() || 'NV';

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F7FA]">
      <aside className="flex h-full w-[220px] min-w-[220px] flex-col" style={{ backgroundColor: '#1F3B64' }}>
        <div
          className="flex h-12 flex-shrink-0 items-center border-b px-4"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-white">
              <span className="text-[10px] font-black text-[#1F3B64]">VT</span>
            </div>
            <div>
              <p className="text-[13px] font-semibold leading-tight text-white">Viet Tien ERP</p>
              <p className="text-[10px] leading-tight text-white/40">Nhân viên bán hàng</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-px overflow-y-auto px-1.5 py-2">
          {visibleNavItems.map((item) => (
            <NavItemRow key={item.id} item={item} onNavigate={navigate} />
          ))}
        </nav>

        <div className="p-2.5 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2 px-1">
            <Avatar className="h-7 w-7 flex-shrink-0">
              <AvatarFallback
                className="text-[10px] font-semibold"
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-semibold text-white">{userName}</p>
              <p className="truncate text-[10px] text-white/45">Nhân viên bán hàng</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex-shrink-0 text-white/30 transition-colors hover:text-red-400"
              title="Đăng xuất"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-11 flex-shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4">
          <div className="max-w-xs flex-1">
            <button className="flex h-7 w-full items-center gap-2 rounded border border-gray-300 bg-gray-50 px-2.5 text-left text-[12px] text-gray-400 transition-colors hover:bg-white">
              <Search className="h-3 w-3 flex-shrink-0" />
              <span className="flex-1 truncate">Tim kiem...</span>
            </button>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-0.5">
            <NotificationBell role={role} onViewAll={() => navigate('/sales/notifications')} />
            <button className="rounded p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700">
              <Settings className="h-4 w-4" />
            </button>

            <div className="mx-1 h-5 w-px bg-gray-200" />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 rounded px-2 py-1 transition-colors hover:bg-gray-100">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback
                      className="text-[9px] font-semibold"
                      style={{ backgroundColor: '#1F3B64', color: 'white' }}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[12px] font-medium text-gray-700">{userName.split(' ').pop()}</span>
                  <ChevronDown className="h-3 w-3 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="cursor-pointer text-sm text-red-600" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="dashboard" element={<SalesDashboardPage />} />
            <Route path="my-customers" element={<SalesMyCustomersPage />} />
            <Route path="ai-content-studio" element={<SalesAiContentStudio />} />
            <Route path="change-requests" element={<SalesChangeRequestExplainPage />} />
            <Route path="orders" element={<SalesOrdersPage />} />
            <Route path="orders/:id" element={<SalesOrderDetailPage />} />
            <Route path="negotiation" element={<SalesNegotiationPage />} />
            <Route path="direct-purchase" element={<DirectPurchasePage />} />
            <Route path="delivery" element={<SalesDeliveryPage />} />
            <Route path="delivery/handover" element={<SalesWarehouseHandoverPage />} />
            <Route path="delivery/warehouse" element={<SalesWarehouseCoordPage />} />
            <Route path="delivery/arrangement" element={<SalesDeliveryArrangementPage />} />
            <Route path="pickup-arrangement" element={<SalesPickupArrangementPage />} />
            <Route path="delivery/collection" element={<SalesDeliveryCollectionPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="*" element={<SalesDashboardPage />} />
          </Routes>
        </main>
      </div>

      {/* Toast thông báo được gán khách hàng mới (SignalR) */}
      {toasts.length > 0 && (
        <div className="fixed right-4 top-14 z-[100] flex w-80 flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="flex items-start gap-2.5 rounded-lg border border-blue-200 bg-white p-3 shadow-lg"
            >
              <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-50">
                <UserPlus className="h-4 w-4 text-blue-600" />
              </span>
              <div className="min-w-0 flex-1">
                {t.message ? (
                  <>
                    <p className="text-[13px] font-bold text-[#374151]">Yêu cầu đổi Sale</p>
                    <p className="mt-0.5 text-[12px] text-gray-600">{t.message}</p>
                  </>
                ) : (
                  <>
                    <p className="text-[13px] font-bold text-[#374151]">Bạn được gán khách hàng mới</p>
                    <p className="mt-0.5 truncate text-[12px] text-gray-600">
                      <span className="font-semibold">{t.customerName}</span>
                      {' · '}
                      {TOAST_SOURCE_LABELS[t.source] || t.source}
                    </p>
                  </>
                )}
              </div>
              <button
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="flex-shrink-0 text-gray-300 hover:text-gray-500"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
