import { useState } from 'react';
import CEODashboard from './CEODashboard';
import CEOPriceNegotiation from './CEOPriceNegotiation';
import CEOPriceNegotiationDetail from './CEOPriceNegotiationDetail';
import CEOPurchaseOrderPage from './CEOPurchaseOrderPage';
import CEOSupplierManagementPage from './CEOSupplierManagementPage';
import CEOPurchaseOrderDetailPage from './CEOPurchaseOrderDetailPage';
import CEOMaterialManagementPage from './CEOMaterialManagementPage';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, DollarSign,
  Package, Users, LogOut, Bell, Building, Layers
} from 'lucide-react';
import WarehouseManagement from '../warehouse/WarehouseManagement';
import NotificationBell from '../../components/NotificationBell';
import NotificationsPage from '../NotificationsPage';
import { Routes, Route } from 'react-router-dom';

// ─── Sidebar primitives (Same as Admin) ───────────────────────────────────────
function SidebarHeader() {
  return (
    <div className="h-[48px] flex items-center px-[16px] gap-[10px] flex-shrink-0"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="bg-white rounded-[4px] w-[24px] h-[24px] flex items-center justify-center flex-shrink-0">
        <span className="text-[#1f3b64] font-black text-[10px]">VT</span>
      </div>
      <div className="flex flex-col">
        <span className="font-semibold text-[13px] text-white leading-tight">Việt Tiến ERP</span>
        <span className="text-[10px] leading-tight" style={{ color: 'rgba(255,255,255,0.4)' }}>Giám đốc (CEO)</span>
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

function CEOSidebar({ activeTab, setActiveTab }: { activeTab: string; setActiveTab: (tab: string) => void }) {
  return (
    <div className="flex flex-col h-full overflow-y-auto flex-shrink-0" style={{ backgroundColor: '#1f3b64', width: 213 }}>
      <SidebarHeader />
      <div className="flex flex-col gap-[8px] px-[10px] py-[12px] flex-1">
        <NavItem icon={<LayoutDashboard className="w-4 h-4" />} label="Dashboard"
          active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />

        <NavGroup title="Phê duyệt Báo Giá (≥100M)">
          <NavItem icon={<DollarSign className="w-4 h-4" />} label="Báo giá đàm phán"
            active={activeTab === 'price-negotiation'} onClick={() => setActiveTab('price-negotiation')} badge={2} />
        </NavGroup>

        <NavGroup title="Mua hàng & Nhà cung cấp">
          <NavItem icon={<Package className="w-4 h-4" />} label="Đặt hàng nhà cung cấp"
            active={activeTab === 'purchase-orders' || activeTab === 'po-detail'} onClick={() => setActiveTab('purchase-orders')} />
          <NavItem icon={<Users className="w-4 h-4" />} label="Quản lý nhà cung cấp"
            active={activeTab === 'suppliers'} onClick={() => setActiveTab('suppliers')} />
        </NavGroup>

        <NavGroup title="Cấu hình hệ thống">
          <NavItem icon={<Building className="w-4 h-4" />} label="Quản lý Kho"
            active={activeTab === 'warehouses'} onClick={() => setActiveTab('warehouses')} />
          <NavItem icon={<Layers className="w-4 h-4" />} label="Quản lý Nguyên liệu"
            active={activeTab === 'materials'} onClick={() => setActiveTab('materials')} />
        </NavGroup>
      </div>
    </div>
  );
}

// ─── CEO Portal ───────────────────────────────────────────────────────────────
export default function CEOPortal() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectPOId, setSelectPOId] = useState<string | null>(null);
  const [selectNegotiationId, setSelectNegotiationId] = useState<string | null>(null);
  const { user, logout } = useAuth() as any;
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const userName = (user as any)?.fullName || (user as any)?.email || 'CEO';
  const initials = userName.split(' ').slice(-2).map((n: string) => n[0]).join('').toUpperCase() || 'CEO';

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': 
        return <CEODashboard setActiveTab={setActiveTab} />;
      case 'price-negotiation': 
        return <CEOPriceNegotiation setActiveTab={setActiveTab} setSelectNegotiationId={setSelectNegotiationId} />;
      case 'price-negotiation-detail': 
        return <CEOPriceNegotiationDetail negotiationId={selectNegotiationId} onBack={() => setActiveTab('price-negotiation')} />;
      case 'purchase-orders': 
        return <CEOPurchaseOrderPage setActiveTab={setActiveTab} setSelectPOId={setSelectPOId} />;
      case 'po-detail': 
        return <CEOPurchaseOrderDetailPage poId={selectPOId} onBack={() => setActiveTab('purchase-orders')} />;
      case 'suppliers': 
        return <CEOSupplierManagementPage />;
      case 'materials':
        return <CEOMaterialManagementPage />;
      case 'warehouses':
        return <WarehouseManagement />;
      case 'notifications':
        return <NotificationsPage />;
      default: 
        return <CEODashboard setActiveTab={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#f5f7fa] overflow-hidden">
      <CEOSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

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
