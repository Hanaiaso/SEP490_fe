import { useState } from 'react';
import AdminDashboard from './AdminDashboard';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, CheckSquare,
  Package, XCircle, AlertTriangle, Users, ShieldCheck,
  LogOut, Bell, BarChart2, Sparkles, History, Settings,
  CreditCard, Wallet
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

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
  onClick?: () => void;
}

function NavItem({ icon, label, active, badge, onClick }: NavItemProps) {
  return (
    <div
      className={`rounded-[4px] w-full cursor-pointer transition-colors ${active ? 'bg-[rgba(255,255,255,0.15)]' : 'hover:bg-[rgba(255,255,255,0.08)]'}`}
      onClick={onClick}
    >
      <div className="flex gap-[8px] items-center px-[10px] py-[6px]">
        <span style={{ color: active ? 'white' : 'rgba(255,255,255,0.45)' }}>
          {icon}
        </span>
        <span className={`flex-1 text-[12px] font-medium whitespace-nowrap ${active ? 'text-white' : ''}`}
          style={!active ? { color: 'rgba(255,255,255,0.55)' } : {}}>
          {label}
        </span>
        {badge && (
          <span className="bg-[#fb2c36] min-w-[17px] h-[16px] rounded-[4px] text-[9px] font-semibold text-white text-center leading-[16px] px-1">
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}

function NavGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col pt-[4px]">
      <div className="px-[10px] py-[4px]">
        <p className="text-[10px] font-semibold tracking-[0.25px] uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {title}
        </p>
      </div>
      <div className="flex flex-col gap-[2px]">{children}</div>
    </div>
  );
}

// ─── Full Sidebar ─────────────────────────────────────────────────────────────
function AdminSidebar({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) {
  return (
    <div className="flex flex-col h-full overflow-y-auto flex-shrink-0" style={{ backgroundColor: '#1f3b64', width: 213 }}>
      <SidebarHeader />
      <div className="flex flex-col gap-[8px] px-[10px] py-[12px] flex-1">
        <NavItem icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard"
          active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />

        <NavGroup title="Quản lý & Duyệt giá">
          <NavItem icon={<FileText className="w-4 h-4" />} label="Cập nhật giá hàng loạt"
            active={activeTab === 'bulk-price'} onClick={() => setActiveTab('bulk-price')} />
          <NavItem icon={<CheckSquare className="w-4 h-4" />} label="Duyệt giá đề xuất"
            active={activeTab === 'approve-price'} onClick={() => setActiveTab('approve-price')} badge={2} />
        </NavGroup>

        <NavGroup title="Quản lý Sản phẩm">
          <NavItem icon={<Package className="w-4 h-4" />} label="Danh mục sản phẩm"
            active={activeTab === 'products'} onClick={() => setActiveTab('products')} />
          <NavItem icon={<XCircle className="w-4 h-4" />} label="Duyệt ngừng kinh doanh"
            active={activeTab === 'discontinue'} onClick={() => setActiveTab('discontinue')} badge={1} />
          <NavItem icon={<AlertTriangle className="w-4 h-4" />} label="Cảnh báo nguyên liệu"
            active={activeTab === 'material-alert'} onClick={() => setActiveTab('material-alert')} badge={4} />
        </NavGroup>

        <NavGroup title="Quản lý Nhân sự">
          <NavItem icon={<Users className="w-4 h-4" />} label="Danh sách người dùng"
            active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
          <NavItem icon={<ShieldCheck className="w-4 h-4" />} label="Phân quyền"
            active={activeTab === 'permissions'} onClick={() => setActiveTab('permissions')} />
          <NavItem icon={<Wallet className="w-4 h-4" />} label="Duyệt bảng lương"
            active={activeTab === 'payroll'} onClick={() => setActiveTab('payroll')} badge={1} />
        </NavGroup>

        <NavGroup title="Thống kê tổng hợp">
          <NavItem icon={<BarChart2 className="w-4 h-4" />} label="Báo cáo Khách hàng"
            active={activeTab === 'report-customer'} onClick={() => setActiveTab('report-customer')} />
          <NavItem icon={<BarChart2 className="w-4 h-4" />} label="Báo cáo Nhân viên"
            active={activeTab === 'report-staff'} onClick={() => setActiveTab('report-staff')} />
          <NavItem icon={<BarChart2 className="w-4 h-4" />} label="Báo cáo Sản phẩm"
            active={activeTab === 'report-product'} onClick={() => setActiveTab('report-product')} />
          <NavItem icon={<BarChart2 className="w-4 h-4" />} label="Báo cáo Doanh thu"
            active={activeTab === 'report-revenue'} onClick={() => setActiveTab('report-revenue')} />
        </NavGroup>

        <NavGroup title="Trợ lý AI Marketing">
          <NavItem icon={<Sparkles className="w-4 h-4" />} label="Tạo nội dung Facebook"
            active={activeTab === 'ai-marketing'} onClick={() => setActiveTab('ai-marketing')} />
          <NavItem icon={<History className="w-4 h-4" />} label="Lịch sử Marketing"
            active={activeTab === 'marketing-history'} onClick={() => setActiveTab('marketing-history')} />
        </NavGroup>

        <NavGroup title="Cấu hình hệ thống">
          <NavItem icon={<Settings className="w-4 h-4" />} label="Thiết lập SePay & Ngưỡng giá"
            active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
          <NavItem icon={<CreditCard className="w-4 h-4" />} label="Xác nhận thanh toán"
            active={activeTab === 'payment-confirm'} onClick={() => setActiveTab('payment-confirm')} badge={2} />
        </NavGroup>
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
  const [activeTab, setActiveTab] = useState('dashboard');
  const { user, logout } = useAuth() as any;
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userName = (user as any)?.fullName || (user as any)?.email || 'Admin';
  const initials = userName.split(' ').slice(-2).map((n: string) => n[0]).join('').toUpperCase() || 'AD';

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <AdminDashboard />;
      case 'notifications': return <NotificationsPage />;
      default: return <ComingSoon label={activeTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#f5f7fa] overflow-hidden">
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-11 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0">
          <div className="flex-1" />
          <NotificationBell role={user?.role || ''} onViewAll={() => setActiveTab('notifications')} />
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
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
