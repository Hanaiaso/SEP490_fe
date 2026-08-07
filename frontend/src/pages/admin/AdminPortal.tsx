import type { ReactNode } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';
import AdminUsersPage from './AdminUsersPage';
import AdminSystemConfigPage from './AdminSystemConfigPage';
import AdminAuditLogPage from './AdminAuditLogPage';
import AdminSystemHealthPage from './AdminSystemHealthPage';
import AdminVehiclesPage from './AdminVehiclesPage';
import AdminDiscountTiersPage from './AdminDiscountTiersPage';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, FileText, CheckSquare,
  Package, XCircle, AlertTriangle, Users, ShieldCheck,
  LogOut, BarChart2, Sparkles, History, Settings,
  CreditCard, Wallet, ScrollText, Activity, Truck, Percent
} from 'lucide-react';
import NotificationBell from '../../components/NotificationBell';
import NotificationsPage from '../NotificationsPage';

// ─── Sidebar primitives ───────────────────────────────────────────────────────
function SidebarHeader() {
  return (
    <div className="h-[48px] flex items-center px-[16px] gap-[10px] flex-shrink-0"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="bg-white rounded-[4px] w-[24px] h-[24px] flex items-center justify-center flex-shrink-0">
        <span className="text-[#1f3b64] font-black text-[10px]">VT</span>
      </div>
      <div className="flex flex-col">
        <span className="font-semibold text-[13px] text-white leading-tight">Việt Tiến ERP</span>
        <span className="text-[10px] leading-tight" style={{ color: 'rgba(255,255,255,0.4)' }}>Quản trị viên</span>
      </div>
    </div>
  );
}

interface AdminNavItem {
  id: string;
  label: string;
  icon: ReactNode;
  path: string;
  badge?: number;
}
interface AdminNavGroup {
  title?: string;
  items: AdminNavItem[];
}

// Đường dẫn là nguồn sự thật duy nhất (thay cho activeTab state cũ) — F5/Back/Forward/URL trực tiếp đều hoạt động đúng.
const NAV_GROUPS: AdminNavGroup[] = [
  { items: [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, path: '/admin/dashboard' },
  ] },
  { title: 'Quản lý & Duyệt giá', items: [
    { id: 'bulk-price', label: 'Cập nhật giá hàng loạt', icon: <FileText className="w-4 h-4" />, path: '/admin/bulk-price' },
    { id: 'approve-price', label: 'Duyệt giá đề xuất', icon: <CheckSquare className="w-4 h-4" />, path: '/admin/approve-price', badge: 2 },
  ] },
  { title: 'Quản lý Sản phẩm', items: [
    { id: 'products', label: 'Danh mục sản phẩm', icon: <Package className="w-4 h-4" />, path: '/admin/products' },
    { id: 'discontinue', label: 'Duyệt ngừng kinh doanh', icon: <XCircle className="w-4 h-4" />, path: '/admin/discontinue', badge: 1 },
    { id: 'material-alert', label: 'Cảnh báo nguyên liệu', icon: <AlertTriangle className="w-4 h-4" />, path: '/admin/material-alert', badge: 4 },
  ] },
  { title: 'Quản lý Nhân sự', items: [
    { id: 'users', label: 'Danh sách người dùng', icon: <Users className="w-4 h-4" />, path: '/admin/users' },
    { id: 'permissions', label: 'Phân quyền', icon: <ShieldCheck className="w-4 h-4" />, path: '/admin/permissions' },
    { id: 'payroll', label: 'Duyệt bảng lương', icon: <Wallet className="w-4 h-4" />, path: '/admin/payroll', badge: 1 },
  ] },
  { title: 'Thống kê tổng hợp', items: [
    { id: 'report-customer', label: 'Báo cáo Khách hàng', icon: <BarChart2 className="w-4 h-4" />, path: '/admin/report-customer' },
    { id: 'report-staff', label: 'Báo cáo Nhân viên', icon: <BarChart2 className="w-4 h-4" />, path: '/admin/report-staff' },
    { id: 'report-product', label: 'Báo cáo Sản phẩm', icon: <BarChart2 className="w-4 h-4" />, path: '/admin/report-product' },
    { id: 'report-revenue', label: 'Báo cáo Doanh thu', icon: <BarChart2 className="w-4 h-4" />, path: '/admin/report-revenue' },
  ] },
  { title: 'Trợ lý AI Marketing', items: [
    { id: 'ai-marketing', label: 'Tạo nội dung Facebook', icon: <Sparkles className="w-4 h-4" />, path: '/admin/ai-marketing' },
    { id: 'marketing-history', label: 'Lịch sử Marketing', icon: <History className="w-4 h-4" />, path: '/admin/marketing-history' },
  ] },
  { title: 'Cấu hình hệ thống', items: [
    { id: 'settings', label: 'Thiết lập SePay & Ngưỡng giá', icon: <Settings className="w-4 h-4" />, path: '/admin/settings' },
    { id: 'audit-log', label: 'Nhật ký kiểm toán', icon: <ScrollText className="w-4 h-4" />, path: '/admin/audit-log' },
    { id: 'system-health', label: 'Giám sát hệ thống', icon: <Activity className="w-4 h-4" />, path: '/admin/system-health' },
    { id: 'payment-confirm', label: 'Xác nhận thanh toán', icon: <CreditCard className="w-4 h-4" />, path: '/admin/payment-confirm', badge: 2 },
  ] },
  { title: 'Dữ liệu chủ', items: [
    { id: 'vehicles', label: 'Xe giao hàng', icon: <Truck className="w-4 h-4" />, path: '/admin/vehicles' },
    { id: 'discount-tiers', label: 'Khung chiết khấu', icon: <Percent className="w-4 h-4" />, path: '/admin/discount-tiers' },
  ] },
];

// Các nav id đã có trang thật — phần còn lại vẫn hiển thị ComingSoon như trước (chưa có API backend).
const WIRED_IDS = new Set(['dashboard', 'users', 'settings', 'audit-log', 'system-health', 'vehicles', 'discount-tiers']);

function NavItemButton({ item, onNavigate }: { item: AdminNavItem; onNavigate: (path: string) => void }) {
  const location = useLocation();
  const active = location.pathname.startsWith(item.path);
  return (
    <div
      className={`rounded-[4px] w-full cursor-pointer transition-colors ${active ? 'bg-[rgba(255,255,255,0.15)]' : 'hover:bg-[rgba(255,255,255,0.08)]'}`}
      onClick={() => onNavigate(item.path)}
    >
      <div className="flex gap-[8px] items-center px-[10px] py-[6px]">
        <span style={{ color: active ? 'white' : 'rgba(255,255,255,0.45)' }}>{item.icon}</span>
        <span className={`flex-1 text-[12px] font-medium whitespace-nowrap ${active ? 'text-white' : ''}`}
          style={!active ? { color: 'rgba(255,255,255,0.55)' } : {}}>
          {item.label}
        </span>
        {!!item.badge && (
          <span className="bg-[#fb2c36] min-w-[17px] h-[16px] rounded-[4px] text-[9px] font-semibold text-white text-center leading-[16px] px-1">
            {item.badge}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Full Sidebar ─────────────────────────────────────────────────────────────
function AdminSidebar({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <div className="flex flex-col h-full overflow-y-auto flex-shrink-0" style={{ backgroundColor: '#1f3b64', width: 213 }}>
      <SidebarHeader />
      <div className="flex flex-col gap-[8px] px-[10px] py-[12px] flex-1">
        {NAV_GROUPS.map((group, gi) => group.title ? (
          <div className="flex flex-col pt-[4px]" key={gi}>
            <div className="px-[10px] py-[4px]">
              <p className="text-[10px] font-semibold tracking-[0.25px] uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {group.title}
              </p>
            </div>
            <div className="flex flex-col gap-[2px]">
              {group.items.map(item => <NavItemButton key={item.id} item={item} onNavigate={onNavigate} />)}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-[2px]" key={gi}>
            {group.items.map(item => <NavItemButton key={item.id} item={item} onNavigate={onNavigate} />)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Coming Soon placeholder ──────────────────────────────────────────────────
function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
      <Settings className="w-10 h-10 opacity-25" />
      <p className="text-sm">{label} — Đang phát triển</p>
    </div>
  );
}

// ─── Admin Portal ─────────────────────────────────────────────────────────────
export default function AdminPortal() {
  const { user, logout } = useAuth() as any;
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userName = (user as any)?.fullName || (user as any)?.email || 'Admin';
  const initials = userName.split(' ').slice(-2).map((n: string) => n[0]).join('').toUpperCase() || 'AD';

  const stubItems = NAV_GROUPS.flatMap(g => g.items).filter(item => !WIRED_IDS.has(item.id));

  return (
    <div className="flex h-screen bg-[#f5f7fa] overflow-hidden">
      <AdminSidebar onNavigate={navigate} />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-11 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0">
          <div className="flex-1" />
          <NotificationBell role={user?.role || ''} onViewAll={() => navigate('/admin/notifications')} />
          <div className="w-px h-5 bg-gray-200" />
          <div className="flex items-center gap-2 px-2">
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-semibold text-white flex-shrink-0"
              style={{ backgroundColor: '#1f3b64' }}>
              {initials}
            </div>
            <span className="text-[12px] font-medium text-gray-700">{userName.split(' ').pop()}</span>
          </div>
          <button onClick={handleLogout} className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Đăng xuất">
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="settings" element={<AdminSystemConfigPage />} />
            <Route path="audit-log" element={<AdminAuditLogPage />} />
            <Route path="system-health" element={<AdminSystemHealthPage />} />
            <Route path="vehicles" element={<AdminVehiclesPage />} />
            <Route path="discount-tiers" element={<AdminDiscountTiersPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            {stubItems.map(item => (
              <Route key={item.id} path={item.id} element={<ComingSoon label={item.label} />} />
            ))}
            <Route path="*" element={<AdminDashboard />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
