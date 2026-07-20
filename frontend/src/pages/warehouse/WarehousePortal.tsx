import { useState, type ReactNode } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Avatar, AvatarFallback } from '../../components/sales-ui/avatar';
import { useAuth } from '../../context/AuthContext';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '../../components/sales-ui/dropdown-menu';
import {
  LayoutDashboard, Package, ClipboardList, Layers, ArrowDownToLine, ArrowUpFromLine,
  History, ShoppingBag, BarChart3, AlertCircle, TrendingDown, FileBarChart,
  Bell, LogOut, ChevronDown, Search, Settings, Truck, GitMerge,
  PackageCheck, ArrowRightLeft, FlaskConical, ClipboardCheck, ShieldCheck,
  Factory, SlidersHorizontal, Building
} from 'lucide-react';

import NotificationBell from '../../components/NotificationBell';

import WarehouseDashboard from './WarehouseDashboard';
import WarehouseShiftInventory from './WarehouseShiftInventory';
import WarehouseMaterials from './WarehouseMaterials';
import WarehouseMaterialReceiving from './WarehouseMaterialReceiving';
import WarehouseMaterialIssue from './WarehouseMaterialIssue';
import WarehouseMaterialHistory from './WarehouseMaterialHistory';
import WarehouseGoods from './WarehouseGoods';
import WarehouseGoodsReceive from './WarehouseGoodsReceive';
import WarehouseGoodsHistory from './WarehouseGoodsHistory';
import WarehouseLowStock from './WarehouseLowStock';
import WarehouseSlowMoving from './WarehouseSlowMoving';
import WarehouseReport from './WarehouseReport';
import WarehouseAuditLog from './WarehouseAuditLog';
import NotificationsPage from '../NotificationsPage';
import WarehouseFulfillmentOrders from './WarehouseFulfillmentOrders';
import WarehousePickPacking from './WarehousePickPacking';
import WarehouseConsolidation from './WarehouseConsolidation';
import WarehouseHandover from './WarehouseHandover';
import WarehousePurchaseOrders from './WarehousePurchaseOrders';
import WarehouseGoodsReceipt from './WarehouseGoodsReceipt';
import WarehouseReceivingComparison from './WarehouseReceivingComparison';
import WarehouseQualityInspection from './WarehouseQualityInspection';
import WarehouseStockTransfer from './WarehouseStockTransfer';
import WarehouseQuarantine from './WarehouseQuarantine';
import WarehouseInventoryCount from './WarehouseInventoryCount';
import WarehouseStockAdjustment from './WarehouseStockAdjustment';
import WarehouseProductionIssue from './WarehouseProductionIssue';
import WarehouseGoodsIssue from './WarehouseGoodsIssue';
import WarehouseManagement from './WarehouseManagement';

interface NavItem {
  id: string; label: string; icon: ReactNode; path: string;
  badge?: number; children?: NavItem[];
}

const buildNavItems = (): NavItem[] => [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, path: '/warehouse/dashboard' },
  {
    id: 'fulfillment', label: 'Xuất kho (Fulfillment)', icon: <Package className="w-4 h-4" />, path: '/warehouse/fulfillment',
    badge: 3,
    children: [
      { id: 'fulfillment-orders', label: 'Lệnh xuất kho',    icon: <ClipboardList className="w-3.5 h-3.5" />, path: '/warehouse/fulfillment/orders', badge: 3 },
      { id: 'pick-packing',       label: 'Pick & Packing',   icon: <Package className="w-3.5 h-3.5" />, path: '/warehouse/fulfillment/pick-packing' },
      { id: 'consolidation',      label: 'Khu tập kết hàng', icon: <PackageCheck className="w-3.5 h-3.5" />, path: '/warehouse/fulfillment/consolidation' },
      { id: 'handover',           label: 'Bàn giao Sales',   icon: <Truck className="w-3.5 h-3.5" />, path: '/warehouse/fulfillment/handover' },
      { id: 'goods-issue',        label: 'Phiếu xuất kho',   icon: <ArrowUpFromLine className="w-3.5 h-3.5" />, path: '/warehouse/fulfillment/goods-issue' },
    ],
  },
  {
    id: 'purchase', label: 'Nhập hàng (PO & GR)', icon: <ArrowDownToLine className="w-4 h-4" />, path: '/warehouse/purchase',
    children: [
      { id: 'purchase-orders',   label: 'PO chờ nhập kho',     icon: <ClipboardList className="w-3.5 h-3.5" />, path: '/warehouse/purchase/orders' },
      { id: 'goods-receipt',     label: 'Phiếu nhập hàng',     icon: <ArrowDownToLine className="w-3.5 h-3.5" />, path: '/warehouse/purchase/goods-receipt' },
      { id: 'receiving-compare', label: 'Đối chiếu nhập hàng', icon: <GitMerge className="w-3.5 h-3.5" />, path: '/warehouse/purchase/receiving-comparison' },
      { id: 'quality-inspect',   label: 'Kiểm tra CL',         icon: <FlaskConical className="w-3.5 h-3.5" />, path: '/warehouse/purchase/quality-inspection' },
    ],
  },
  {
    id: 'transfer', label: 'Chuyển kho nội bộ', icon: <ArrowRightLeft className="w-4 h-4" />, path: '/warehouse/transfer',
    children: [
      { id: 'stock-transfer', label: 'Lệnh chuyển kho', icon: <ArrowRightLeft className="w-3.5 h-3.5" />, path: '/warehouse/transfer/stock-transfer' },
    ],
  },
  {
    id: 'inv-management', label: 'Quản lý tồn kho', icon: <SlidersHorizontal className="w-4 h-4" />, path: '/warehouse/inv-management',
    children: [
      { id: 'quarantine',       label: 'Cách ly & Kiểm định', icon: <ShieldCheck className="w-3.5 h-3.5" />, path: '/warehouse/inv-management/quarantine' },
      { id: 'inventory-count',  label: 'Kiểm kê tồn kho',     icon: <ClipboardCheck className="w-3.5 h-3.5" />, path: '/warehouse/inv-management/inventory-count' },
      { id: 'stock-adjustment', label: 'Duyệt điều chỉnh TK', icon: <SlidersHorizontal className="w-3.5 h-3.5" />, path: '/warehouse/inv-management/stock-adjustment' },
    ],
  },
  {
    id: 'management', label: 'Cấu hình Hệ thống', icon: <Settings className="w-4 h-4" />, path: '/warehouse/management',
    children: [
      { id: 'warehouse-list', label: 'Quản lý Kho (CEO)', icon: <Building className="w-3.5 h-3.5" />, path: '/warehouse/management/warehouses' },
    ]
  },
  {
    id: 'production', label: 'Sản xuất', icon: <Factory className="w-4 h-4" />, path: '/warehouse/production',
    children: [
      { id: 'production-issue', label: 'Xuất NVL sản xuất', icon: <ArrowUpFromLine className="w-3.5 h-3.5" />, path: '/warehouse/production/issue' },
    ],
  },
  { id: 'shift-inventory', label: 'Tồn kho theo ca', icon: <ClipboardList className="w-4 h-4" />, path: '/warehouse/shift-inventory' },
  {
    id: 'materials', label: 'Nguyên vật liệu SX', icon: <Layers className="w-4 h-4" />, path: '/warehouse/materials',
    children: [
      { id: 'mat-list',    label: 'Danh sách NVL',    icon: <Layers className="w-3.5 h-3.5" />, path: '/warehouse/materials' },
      { id: 'mat-receive', label: 'Nhập nguyên liệu', icon: <ArrowDownToLine className="w-3.5 h-3.5" />, path: '/warehouse/materials/receive' },
      { id: 'mat-issue',   label: 'Xuất nguyên liệu', icon: <ArrowUpFromLine className="w-3.5 h-3.5" />, path: '/warehouse/materials/issue' },
      { id: 'mat-history', label: 'Lịch sử nhập xuất',icon: <History className="w-3.5 h-3.5" />, path: '/warehouse/materials/history' },
    ],
  },
  {
    id: 'goods', label: 'Hàng thương mại', icon: <ShoppingBag className="w-4 h-4" />, path: '/warehouse/goods',
    children: [
      { id: 'goods-list',    label: 'Danh sách hàng hóa',   icon: <ShoppingBag className="w-3.5 h-3.5" />, path: '/warehouse/goods' },
      { id: 'goods-receive', label: 'Nhập hàng thương mại', icon: <ArrowDownToLine className="w-3.5 h-3.5" />, path: '/warehouse/goods/receive' },
      { id: 'goods-history', label: 'Lịch sử nhập xuất',    icon: <History className="w-3.5 h-3.5" />, path: '/warehouse/goods/history' },
    ],
  },
  {
    id: 'inventory', label: 'Theo dõi tồn kho', icon: <BarChart3 className="w-4 h-4" />, path: '/warehouse/inventory',
    children: [
      { id: 'low-stock',   label: 'Cảnh báo gần hết hàng', icon: <AlertCircle className="w-3.5 h-3.5" />, path: '/warehouse/inventory/low-stock', badge: 5 },
      { id: 'slow-moving', label: 'Hàng chậm luân chuyển', icon: <TrendingDown className="w-3.5 h-3.5" />, path: '/warehouse/inventory/slow-moving' },
      { id: 'inv-report',  label: 'Báo cáo tồn kho',       icon: <FileBarChart className="w-3.5 h-3.5" />, path: '/warehouse/inventory/report' },
    ],
  },
  { id: 'audit-log',     label: 'Nhật ký thao tác', icon: <History className="w-4 h-4" />, path: '/warehouse/audit-log' },
  { id: 'notifications', label: 'Thông báo',         icon: <Bell className="w-4 h-4" />, path: '/warehouse/notifications', badge: 4 },
];

function NavItemRow({ item, level = 0, onNavigate }: { item: NavItem; level?: number; onNavigate: (path: string) => void }) {
  const location = useLocation();
  const [expanded, setExpanded] = useState(() => {
    if (item.children) return item.children.some(c => location.pathname.startsWith(c.path));
    return false;
  });
  const isExactActive = location.pathname === item.path;
  const isActive = isExactActive || (item.children && item.children.some(c => location.pathname === c.path));

  const handleClick = () => {
    if (item.children) setExpanded(e => !e);
    else onNavigate(item.path);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className={[
          'w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left transition-colors text-[11px] group',
          level === 0 ? 'font-medium' : 'font-normal',
          isExactActive ? 'bg-white/15 text-white' :
          isActive && item.children ? 'text-white/90' :
          'text-white/55 hover:bg-white/8 hover:text-white/80',
          level > 0 ? 'ml-3 w-[calc(100%-0.75rem)]' : '',
        ].join(' ')}
      >
        <span className={`flex-shrink-0 ${isExactActive ? 'text-white' : 'text-white/45 group-hover:text-white/70'}`}>
          {item.icon}
        </span>
        <span className="flex-1 truncate">{item.label}</span>
        {item.badge && item.badge > 0 && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500 text-white font-semibold flex-shrink-0">{item.badge}</span>
        )}
        {item.children && (
          <ChevronDown className={`w-3 h-3 transition-transform flex-shrink-0 text-white/30 ${expanded ? 'rotate-180' : ''}`} />
        )}
      </button>
      {item.children && expanded && (
        <div className="mt-0.5 space-y-0.5">
          {item.children.map(child => (
            <NavItemRow key={child.id} item={child} level={level + 1} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </>
  );
}

export default function WarehousePortal() {
  const navigate = useNavigate();
  const { user, logout } = useAuth() as any;
  const navItems = buildNavItems();
  const totalBadge = 4;
  const userName = user?.fullName || user?.email || 'Nhan vien kho';
  const initials =
    userName
      .split(' ')
      .slice(-2)
      .map((part: string) => part[0])
      .join('')
      .toUpperCase() || 'WK';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#F5F7FA] overflow-hidden">
      <aside className="w-[228px] min-w-[228px] flex flex-col h-full" style={{ backgroundColor: '#1F3B64' }}>
        <div className="h-12 flex items-center px-4 border-b flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 bg-white rounded flex items-center justify-center flex-shrink-0">
              <span className="text-[#1F3B64] font-black text-[10px]">VT</span>
            </div>
            <div>
              <p className="text-white font-semibold text-[13px] leading-tight">Việt Tiến ERP</p>
              <p className="text-white/40 text-[10px] leading-tight">Nhân viên kho</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-1.5 py-2 space-y-px">
          {navItems.map(item => (
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
              <p className="text-[10px] text-white/45 truncate">NV Kho</p>
            </div>
            <button onClick={handleLogout} className="text-white/30 hover:text-red-400 transition-colors flex-shrink-0" title="Đăng xuất">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-11 bg-white border-b border-gray-200 flex items-center px-4 gap-3 flex-shrink-0">
          <div className="flex-1 max-w-xs">
            <div className="w-full flex items-center gap-2 px-2.5 h-7 rounded border border-gray-300 bg-gray-50 text-[12px] text-gray-400">
              <Search className="w-3 h-3 flex-shrink-0" />
              <span className="flex-1 truncate">Tìm kiếm...</span>
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-0.5">
            <NotificationBell role={user?.role || ''} onViewAll={() => navigate('/warehouse/notifications')} />
            <button className="p-1.5 rounded text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
              <Settings className="w-4 h-4" />
            </button>
            <div className="w-px h-5 bg-gray-200 mx-1" />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 transition-colors">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback className="text-[9px] font-semibold" style={{ backgroundColor: '#1F3B64', color: 'white' }}>
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-[12px] font-medium text-gray-700">{userName.split(' ').pop()}</span>
                  <ChevronDown className="w-3 h-3 text-gray-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem className="text-sm text-red-600" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" /> Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="dashboard"                              element={<WarehouseDashboard />} />
            <Route path="fulfillment/orders"                     element={<WarehouseFulfillmentOrders />} />
            <Route path="fulfillment/pick-packing"               element={<WarehousePickPacking />} />
            <Route path="fulfillment/consolidation"              element={<WarehouseConsolidation />} />
            <Route path="fulfillment/handover"                   element={<WarehouseHandover />} />
            <Route path="fulfillment/goods-issue"                element={<WarehouseGoodsIssue />} />
            <Route path="purchase/orders"                        element={<WarehousePurchaseOrders />} />
            <Route path="purchase/goods-receipt"                 element={<WarehouseGoodsReceipt />} />
            <Route path="purchase/receiving-comparison"          element={<WarehouseReceivingComparison />} />
            <Route path="purchase/quality-inspection"            element={<WarehouseQualityInspection />} />
            <Route path="transfer/stock-transfer"                element={<WarehouseStockTransfer />} />
            <Route path="inv-management/quarantine"              element={<WarehouseQuarantine />} />
            <Route path="inv-management/inventory-count"         element={<WarehouseInventoryCount />} />
            <Route path="inv-management/stock-adjustment"        element={<WarehouseStockAdjustment />} />
            <Route path="management/warehouses"                  element={<WarehouseManagement />} />
            <Route path="production/issue"                       element={<WarehouseProductionIssue />} />
            <Route path="shift-inventory"                        element={<WarehouseShiftInventory />} />
            <Route path="materials"                              element={<WarehouseMaterials />} />
            <Route path="materials/receive"                      element={<WarehouseMaterialReceiving />} />
            <Route path="materials/issue"                        element={<WarehouseMaterialIssue />} />
            <Route path="materials/history"                      element={<WarehouseMaterialHistory />} />
            <Route path="goods"                                  element={<WarehouseGoods />} />
            <Route path="goods/receive"                          element={<WarehouseGoodsReceive />} />
            <Route path="goods/history"                          element={<WarehouseGoodsHistory />} />
            <Route path="inventory/low-stock"                    element={<WarehouseLowStock />} />
            <Route path="inventory/slow-moving"                  element={<WarehouseSlowMoving />} />
            <Route path="inventory/report"                       element={<WarehouseReport />} />
            <Route path="audit-log"                              element={<WarehouseAuditLog />} />
            <Route path="notifications"                          element={<NotificationsPage />} />
            <Route path="*"                                      element={<WarehouseDashboard />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
