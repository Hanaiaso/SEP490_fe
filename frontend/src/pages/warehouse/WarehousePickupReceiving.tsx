import { useEffect, useState } from 'react';
import { Archive, CheckCircle, Package, RefreshCw, Truck, User, AlertCircle } from 'lucide-react';
import { Button } from '../../components/sales-ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/sales-ui/dialog';

// ─── Types ───────────────────────────────────────────────────────────────────

type PickupItem = {
  productId: string;
  productName: string;
  quantity: number;
  reason: string;
};

type PickupRequest = {
  id: string;
  requestCode: string;
  orderId: string;
  orderCode: string;
  customer: string;
  customerPhone: string;
  address: string;
  pickupStatus: string;
  scheduledPickupDate?: string;
  pickupShift?: string;
  vehicleId?: number;
  items: PickupItem[];
};

function api(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('accessToken');
  return fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) },
  });
}

export default function WarehousePickupReceiving() {
  const [pickups, setPickups] = useState<PickupRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [confirmReq, setConfirmReq] = useState<PickupRequest | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchPickups = async () => {
    setLoading(true);
    try {
      const res = await api('/api/delivery/pickups');
      if (!res.ok) throw new Error();
      const data: any[] = await res.json();

      // Chỉ hiển thị các yêu cầu đã lên lịch điều xe (Scheduled) để kho tiếp nhận
      const scheduledPickups = data
        .filter((o: any) => o.pickupStatus === 'Scheduled')
        .map((o: any) => ({
          id: o.requestId,
          requestCode: o.requestCode,
          orderId: o.orderId,
          orderCode: o.orderCode,
          customer: o.customerName,
          customerPhone: o.customerPhone,
          address: o.shippingAddress,
          pickupStatus: o.pickupStatus,
          scheduledPickupDate: o.scheduledPickupDate,
          pickupShift: o.pickupShift,
          vehicleId: o.pickupVehicleId,
          items: o.items || [],
        }));

      setPickups(scheduledPickups);
    } catch {
      showToast('Không thể tải danh sách thu hồi xe về kho.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPickups();
  }, []);

  const handleReceiveQuarantine = async (req: PickupRequest) => {
    setProcessingId(req.id);
    setConfirmReq(null);
    try {
      // 1. Lặp qua các sản phẩm trong yêu cầu và nhập kho cách ly
      const receivePromises = req.items.map(item => 
        api('/api/warehouse-management/quarantine/receive', {
          method: 'POST',
          body: JSON.stringify({
            orderId: req.orderId,
            productId: item.productId,
            quantity: item.quantity,
            reason: item.reason || 'Khách hoàn trả do lỗi'
          })
        }).then(async res => {
            if(!res.ok) {
                const err = await res.json();
                throw new Error(err.message || 'Lỗi khi nhập kho cách ly');
            }
        })
      );
      
      await Promise.all(receivePromises);

      // 2. Xác nhận xe đã hoàn tất quá trình thu hồi (Confirm Pickup)
      const confirmRes = await api(`/api/delivery/pickups/${req.id}/confirm`, {
        method: 'POST'
      });
      if (!confirmRes.ok) {
        const err = await confirmRes.json();
        throw new Error(err.message || 'Lỗi khi xác nhận hoàn tất thu hồi');
      }

      showToast(`Đã hạch toán nhập kho cách ly thành công cho ${req.requestCode}!`);
      await fetchPickups();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {toast && (
        <div className={`fixed right-4 top-14 z-50 rounded-lg px-4 py-2.5 text-sm text-white shadow-lg transition-all ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          {toast.msg}
        </div>
      )}

      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Tiếp nhận xe hoàn hàng (Quarantine Intake)</h1>
          <p className="text-sm text-gray-500 mt-1">
            Xác nhận xe đã về kho và hạch toán hàng trả lại vào bãi cách ly. Hàng tại đây sẽ bị chặn bán thương mại.
          </p>
        </div>
        <Button onClick={fetchPickups} disabled={loading} variant="outline" className="flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Tải lại
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pickups.length === 0 && !loading && (
            <div className="col-span-full py-12 flex flex-col items-center justify-center bg-white border border-gray-200 rounded-xl border-dashed">
              <CheckCircle className="w-12 h-12 text-green-500 mb-3 opacity-30" />
              <p className="text-gray-500 font-medium">Hiện không có xe thu hồi nào đang trên đường về kho.</p>
            </div>
          )}

          {pickups.map(req => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-[#1F3B64] text-lg">{req.requestCode}</span>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-medium border border-blue-200">
                      Đang điều xe
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono">Đơn gốc: {req.orderCode}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end text-sm font-semibold text-gray-700">
                    <Truck className="w-4 h-4 text-gray-400" />
                    Xe {req.vehicleId}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{req.pickupShift} - {req.scheduledPickupDate?.split('T')[0]}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-100 text-sm">
                <div className="flex items-center gap-2 text-gray-700 mb-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{req.customer}</span>
                  <span className="text-gray-300">|</span>
                  <span>{req.customerPhone}</span>
                </div>
                <div className="flex items-start gap-2 text-gray-600">
                  <Archive className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{req.address}</span>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Package className="w-4 h-4" /> Sản phẩm cần thu hồi
                </h4>
                <div className="space-y-2">
                  {req.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium text-gray-800">{item.productName}</p>
                        <p className="text-xs text-red-500 italic mt-0.5">Lý do: {item.reason}</p>
                      </div>
                      <span className="font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                        x{item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Button 
                onClick={() => setConfirmReq(req)}
                disabled={processingId === req.id}
                className="w-full bg-[#16A34A] hover:bg-[#15803d] text-white flex items-center justify-center gap-2 h-10"
              >
                {processingId === req.id ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {processingId === req.id ? 'Đang hạch toán...' : 'Xác nhận xe về - Nhập kho cách ly'}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={!!confirmReq} onOpenChange={(open) => !open && setConfirmReq(null)}>
        <DialogContent className="max-w-md p-0 overflow-hidden rounded-xl border-0 shadow-2xl">
          <div className="bg-amber-50 p-6 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Xác nhận nhập kho cách ly</h3>
            <p className="text-sm text-gray-500">
              Bạn sắp tiếp nhận yêu cầu hoàn hàng <span className="font-bold text-gray-900">{confirmReq?.requestCode}</span>.
              Hàng hóa sẽ được hạch toán vào khu vực cách ly và không thể tự do mở bán. Bạn có chắc chắn muốn tiếp tục?
            </p>
          </div>
          <div className="p-4 bg-white border-t border-gray-100 flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmReq(null)}>
              Hủy bỏ
            </Button>
            <Button 
              className="bg-[#16A34A] hover:bg-[#15803d] text-white" 
              onClick={() => confirmReq && handleReceiveQuarantine(confirmReq)}
            >
              Đồng ý hạch toán
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
