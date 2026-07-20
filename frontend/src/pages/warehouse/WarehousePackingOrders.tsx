import { useState } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Search, Eye, CheckCircle, AlertCircle, Play, Package, Filter, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/sales-ui/dialog';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#F97316';
const ERROR   = '#DC2626';
const INFO    = '#2563EB';
const NEUTRAL = '#64748B';

interface PackingOrder {
  id: string; customer: string; confirmedAt: string; items: number;
  status: 'pending' | 'packing' | 'done' | 'shortage';
  priority: 'urgent' | 'normal';
  products: { sku: string; name: string; qty: number; location: string; available: number }[];
}

const STATUS_CFG: Record<string, { label: string; bg: string }> = {
  pending:  { label: 'Chờ xử lý',    bg: NEUTRAL },
  packing:  { label: 'Đang đóng gói', bg: INFO    },
  done:     { label: 'Hoàn tất',      bg: SUCCESS  },
  shortage: { label: 'Thiếu hàng',    bg: ERROR    },
};

const ORDERS: PackingOrder[] = [
  { id: 'DH-2406-092', customer: 'Cty TT Minh Anh',      confirmedAt: '06/06 08:30', items: 4, status: 'pending',  priority: 'urgent',
    products: [
      { sku: 'VT-CT-001', name: 'Vải cotton khổ 1.5m',  qty: 200, location: 'A1-03', available: 850 },
      { sku: 'VT-SM-012', name: 'Sơ mi nam slim fit',    qty: 50,  location: 'B2-11', available: 240 },
      { sku: 'VT-QT-007', name: 'Quần tây nam slim fit', qty: 30,  location: 'B3-05', available: 185 },
      { sku: 'VT-LN-003', name: 'Vải linen nhập khẩu',   qty: 100, location: 'A2-08', available: 420 },
    ],
  },
  { id: 'DH-2406-091', customer: 'Shop Vải Lan Anh',      confirmedAt: '06/06 08:45', items: 2, status: 'packing',  priority: 'urgent',
    products: [
      { sku: 'VT-DP-021', name: 'Đồng phục VP nữ',       qty: 20,  location: 'C1-02', available: 92 },
      { sku: 'VT-DP-020', name: 'Đồng phục VP nam',       qty: 20,  location: 'C1-01', available: 78 },
    ],
  },
  { id: 'DH-2406-090', customer: 'May Mặc Tân Phú',       confirmedAt: '06/06 09:00', items: 6, status: 'pending',  priority: 'normal',
    products: [
      { sku: 'VT-AK-009', name: 'Áo khoác công sở nữ',   qty: 15,  location: 'C2-04', available: 45 },
      { sku: 'VT-DM-005', name: 'Vải denim cao cấp',      qty: 80,  location: 'A3-06', available: 310 },
    ],
  },
  { id: 'DH-2406-089', customer: 'Cửa hàng Đức Thịnh',   confirmedAt: '05/06 15:20', items: 3, status: 'shortage', priority: 'urgent',
    products: [
      { sku: 'VT-CT-001', name: 'Vải cotton khổ 1.5m',   qty: 500, location: 'A1-03', available: 850 },
      { sku: 'VT-SM-012', name: 'Sơ mi nam slim fit',     qty: 280, location: 'B2-11', available: 240 },
    ],
  },
  { id: 'DH-2406-088', customer: 'HTX Dệt Hà Đông',      confirmedAt: '05/06 14:00', items: 5, status: 'done',     priority: 'normal',
    products: [],
  },
  { id: 'DH-2406-087', customer: 'Cty TT Hà Nội',        confirmedAt: '05/06 13:30', items: 8, status: 'pending',  priority: 'normal',
    products: [],
  },
  { id: 'DH-2406-086', customer: 'Đại lý Vải Thắng Lợi', confirmedAt: '05/06 11:00', items: 3, status: 'done',     priority: 'normal',
    products: [],
  },
];

export default function WarehousePackingOrders() {
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [detail, setDetail]     = useState<PackingOrder | null>(null);
  const [orders, setOrders]     = useState(ORDERS);

  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const matchSearch = !q || o.id.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q);
    const matchStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const updateStatus = (id: string, status: PackingOrder['status']) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    setDetail(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Quản lý đơn đóng gói</h2>
            <p className="text-xs text-gray-500 mt-0.5">{orders.length} đơn · {orders.filter(o => o.status === 'pending').length} chờ xử lý · {orders.filter(o => o.status === 'packing').length} đang đóng gói</p>
          </div>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <Download className="w-3.5 h-3.5" /> Xuất Excel
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input className="pl-8 h-8 text-xs bg-gray-50" placeholder="Tìm mã đơn, khách hàng..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="h-8 text-xs border border-gray-200 rounded-md px-2 bg-white text-gray-600" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="pending">Chờ xử lý</option>
            <option value="packing">Đang đóng gói</option>
            <option value="done">Hoàn tất</option>
            <option value="shortage">Thiếu hàng</option>
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">Mã đơn</th>
                <th className="text-left px-4 py-3 text-gray-700 font-semibold">Khách hàng</th>
                <th className="text-center px-4 py-3 text-gray-700 font-semibold">Ngày xác nhận</th>
                <th className="text-center px-4 py-3 text-gray-700 font-semibold">Số SP</th>
                <th className="text-center px-4 py-3 text-gray-700 font-semibold">Ưu tiên</th>
                <th className="text-center px-4 py-3 text-gray-700 font-semibold">Trạng thái</th>
                <th className="text-center px-4 py-3 text-gray-700 font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((o, i) => (
                <tr key={o.id} className="hover:bg-[#F9FAFB] transition-colors" style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                  <td className="px-4 py-3 font-semibold" style={{ color: PRIMARY }}>{o.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{o.customer}</td>
                  <td className="px-4 py-3 text-center text-gray-500">{o.confirmedAt}</td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-700">{o.items}</td>
                  <td className="px-4 py-3 text-center">
                    {o.priority === 'urgent'
                      ? <span className="text-[10px] font-medium text-white px-1.5 py-0.5 whitespace-nowrap" style={{ backgroundColor: ERROR, borderRadius: 4 }}>Ưu tiên</span>
                      : <span className="text-[10px] text-gray-400">Thường</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-[10px] font-medium text-white px-2 py-0.5 whitespace-nowrap" style={{ backgroundColor: STATUS_CFG[o.status]?.bg, borderRadius: 4 }}>
                      {STATUS_CFG[o.status]?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition-colors" onClick={() => setDetail(o)} title="Xem đơn">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {o.status === 'pending' && (
                        <button className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors" onClick={() => updateStatus(o.id, 'packing')} title="Bắt đầu đóng gói">
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {o.status === 'packing' && (
                        <button className="p-1.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 transition-colors" onClick={() => updateStatus(o.id, 'done')} title="Hoàn tất">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {(o.status === 'pending' || o.status === 'packing') && (
                        <button className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" onClick={() => updateStatus(o.id, 'shortage')} title="Báo thiếu hàng">
                          <AlertCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-2xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Chi tiết đơn — {detail?.id}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 pt-1">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                  <p className="font-semibold text-gray-700 text-[11px] uppercase tracking-wide mb-2">Thông tin khách hàng</p>
                  <div className="flex justify-between"><span className="text-gray-500">Khách hàng:</span><span className="font-semibold text-gray-800">{detail.customer}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Ngày xác nhận:</span><span className="text-gray-700">{detail.confirmedAt}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Ưu tiên:</span>
                    <span className="font-medium" style={{ color: detail.priority === 'urgent' ? ERROR : NEUTRAL }}>
                      {detail.priority === 'urgent' ? 'Khẩn cấp' : 'Thường'}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                  <p className="font-semibold text-gray-700 text-[11px] uppercase tracking-wide mb-2">Trạng thái đơn</p>
                  <div className="flex justify-between"><span className="text-gray-500">Trạng thái:</span>
                    <span className="text-[10px] font-medium text-white px-2 py-0.5 whitespace-nowrap" style={{ backgroundColor: STATUS_CFG[detail.status]?.bg, borderRadius: 4 }}>
                      {STATUS_CFG[detail.status]?.label}
                    </span>
                  </div>
                  <div className="flex justify-between"><span className="text-gray-500">Số sản phẩm:</span><span className="font-semibold">{detail.items} loại</span></div>
                </div>
              </div>

              {detail.products.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide mb-2">Danh sách sản phẩm</p>
                  <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-3 py-2 text-gray-700 font-semibold">SKU</th>
                        <th className="text-left px-3 py-2 text-gray-700 font-semibold">Tên sản phẩm</th>
                        <th className="text-center px-3 py-2 text-gray-700 font-semibold">Cần</th>
                        <th className="text-center px-3 py-2 text-gray-700 font-semibold">Tồn kho</th>
                        <th className="text-center px-3 py-2 text-gray-700 font-semibold">Vị trí kho</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {detail.products.map(p => {
                        const ok = p.available >= p.qty;
                        return (
                          <tr key={p.sku} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-medium text-gray-500">{p.sku}</td>
                            <td className="px-3 py-2 text-gray-800">{p.name}</td>
                            <td className="px-3 py-2 text-center font-semibold text-gray-800">{p.qty}</td>
                            <td className="px-3 py-2 text-center font-semibold" style={{ color: ok ? SUCCESS : ERROR }}>{p.available}</td>
                            <td className="px-3 py-2 text-center font-mono text-gray-600">{p.location}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                {detail.status === 'pending' && (
                  <Button className="flex-1 h-8 text-xs gap-1.5" style={{ backgroundColor: PRIMARY }} onClick={() => updateStatus(detail.id, 'packing')}>
                    <Play className="w-3.5 h-3.5" /> Bắt đầu đóng gói
                  </Button>
                )}
                {detail.status === 'packing' && (
                  <Button className="flex-1 h-8 text-xs gap-1.5" style={{ backgroundColor: SUCCESS }} onClick={() => updateStatus(detail.id, 'done')}>
                    <CheckCircle className="w-3.5 h-3.5" /> Xác nhận hoàn tất
                  </Button>
                )}
                {(detail.status === 'pending' || detail.status === 'packing') && (
                  <Button variant="outline" className="flex-1 h-8 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50" onClick={() => updateStatus(detail.id, 'shortage')}>
                    <AlertCircle className="w-3.5 h-3.5" /> Báo thiếu hàng
                  </Button>
                )}
                <Button variant="outline" className="h-8 text-xs" onClick={() => setDetail(null)}>Đóng</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
