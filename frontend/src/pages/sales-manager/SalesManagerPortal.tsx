import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Avatar, AvatarFallback } from '../../components/sales-ui/avatar';
import {
  Bell,
  CheckSquare,
  LayoutDashboard,
  LogOut,
  Settings,
  Shuffle,
  AlertTriangle,
  UserCog,
} from 'lucide-react';
import SalesDashboardPage from '../sales/SalesDashboardPage';
import SalesManagerRoundRobinPage from './SalesManagerRoundRobinPage';
import SalesManagerSePayExceptionPage from './SalesManagerSePayExceptionPage';
import SalesManagerPriceNegotiation from './SalesManagerPriceNegotiation';
import SalesManagerPriceNegotiationDetail from './SalesManagerPriceNegotiationDetail';
import SalesManagerOrdersPage from './SalesManagerOrdersPage';
import SalesManagerOrderDetailPage from './SalesManagerOrderDetailPage';
import SalesManagerChangeRequestsPage from './SalesManagerChangeRequestsPage';
import SalesManagerChangeRequestDetailPage from './SalesManagerChangeRequestDetailPage';
import DirectPurchasePage from '../sales/DirectPurchasePage';
import { useAuth } from '../../context/AuthContext';
import { getQuotations } from '../../services/quotationService.js';
import { FileText } from 'lucide-react';
import NotificationBell from '../../components/NotificationBell';
import NotificationsPage from '../NotificationsPage';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />,
    path: '/sales-manager/dashboard',
  },
  {
    id: 'round-robin',
    label: 'Quản lý Round-robin',
    icon: <Shuffle className="w-4 h-4" />,
    path: '/sales-manager/round-robin',
  },
  {
    id: 'manager-negotiation',
    label: 'Duyệt Báo giá (Quản lý)',
    icon: <CheckSquare className="w-4 h-4" />,
    path: '/sales-manager/manager-negotiation',
  },
  {
    id: 'orders',
    label: 'Quản lý đơn hàng',
    icon: <FileText className="w-4 h-4" />,
    path: '/sales-manager/orders',
  },
  {
    id: 'sepay-exceptions',
    label: 'Ngoại lệ SePay',
    icon: <AlertTriangle className="w-4 h-4" />,
    path: '/sales-manager/sepay-exceptions',
  },
  {
    id: 'change-requests',
    label: 'Duyệt yêu cầu đổi Sale',
    icon: <UserCog className="w-4 h-4" />,
    path: '/sales-manager/change-requests',
  }
];

function NavItemRow({
  item,
  onNavigate,
}: {
  item: NavItem;
  onNavigate: (path: string) => void;
}) {
  const location = useLocation();
  const isActive = location.pathname.startsWith(item.path);

  return (
    <button
      onClick={() => onNavigate(item.path)}
      className={`group flex w-full items-center justify-between rounded px-2 py-1.5 text-[12px] font-medium transition-colors ${
        isActive
          ? 'bg-[rgba(255,255,255,0.15)] text-white'
          : 'text-white/60 hover:bg-[rgba(255,255,255,0.08)] hover:text-white'
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={isActive ? 'text-white' : 'text-white/40 group-hover:text-white/80'}>
          {item.icon}
        </span>
        <span>{item.label}</span>
      </div>
      {item.badge !== undefined && item.badge > 0 && (
        <span
          className="flex h-4 min-w-[16px] items-center justify-center rounded px-1 text-[9px] font-bold bg-red-500 text-white"
        >
          {item.badge}
        </span>
      )}
    </button>
  );
}

export default function SalesManagerPortal() {
  const [pendingCount, setPendingCount] = useState(0);
  const { user, logout } = useAuth() as any;
  const navigate = useNavigate();
  const role: string = user?.role || '';

  useEffect(() => {
    getQuotations()
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        const count = list.filter((q: any) => q.status === 'PendingManager').length;
        setPendingCount(count);
      })
      .catch(console.error);
  }, []);

  const userName = user?.fullName || 'Manager User';
  const initials = userName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = NAV_ITEMS.map((item) => {
    if (item.id === 'manager-negotiation') {
      return { ...item, badge: pendingCount };
    }
    return item;
  });

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] overflow-hidden">
      <aside className="w-[228px] min-w-[228px] flex flex-col h-full" style={{ backgroundColor: '#1F3B64' }}>
        <div className="h-12 flex items-center px-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-white rounded flex items-center justify-center flex-shrink-0">
              <span className="text-[#1F3B64] font-black text-[10px]">VT</span>
            </div>
            <div>
              <p className="text-white font-semibold text-[13px] leading-tight">Việt Tiến ERP</p>
              <p className="text-white/40 text-[10px] leading-tight">Sales Manager</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-1.5 py-2 space-y-px">
          {menuItems.map((item) => (
            <NavItemRow key={item.id} item={item} onNavigate={navigate} />
          ))}
        </nav>

        <div className="p-2.5 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2 px-1">
            <Avatar className="w-7 h-7 flex-shrink-0">
              <AvatarFallback className="text-[10px] font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white' }}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-white truncate">{userName}</p>
              <p className="text-[10px] text-white/45 truncate">Sales Manager</p>
            </div>
            <button onClick={handleLogout} className="text-white/30 hover:text-red-400 transition-colors flex-shrink-0" title="Đăng xuất">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="h-11 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0">
          <div className="flex-1" />
          <div className="flex items-center gap-0.5">
            <NotificationBell role={role} onViewAll={() => navigate('/sales-manager/notifications')} />
            <button className="p-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="dashboard" element={<SalesDashboardPage />} />
            <Route path="round-robin" element={<SalesManagerRoundRobinPage />} />
            <Route path="manager-negotiation" element={<SalesManagerPriceNegotiation />} />
            <Route path="manager-negotiation/:id" element={<SalesManagerPriceNegotiationDetail />} />
            <Route path="orders" element={<SalesManagerOrdersPage />} />
            <Route path="orders/:id" element={<SalesManagerOrderDetailPage />} />
            <Route path="direct-purchase" element={<DirectPurchasePage />} />
            <Route path="sepay-exceptions" element={<SalesManagerSePayExceptionPage />} />
            <Route path="change-requests" element={<SalesManagerChangeRequestsPage />} />
            <Route path="change-requests/:id" element={<SalesManagerChangeRequestDetailPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="*" element={<SalesDashboardPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
