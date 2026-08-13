import { useEffect, useState } from 'react';
import { ChevronRight, DollarSign, Package, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authFetch } from '../../services/httpClient';
import type { DeliveryOrderListItem, PendingPickup } from '../../types/delivery';
import type { SalesOrderListItem } from '../../types/order';

function api(path: string, opts?: RequestInit) {
  return authFetch(path.startsWith('/api') ? path.slice(4) : path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts?.headers ?? {}) },
  });
}

const DONE_FULFILLMENT_STATUSES = ['Ready', 'Consolidating', 'Consolidated', 'HandedOver', 'Fulfilled'];
const UNSCHEDULED_STATUSES = ['NotScheduled', 'Rescheduled'];
const PENDING_COLLECTION_STATUSES = ['Scheduled', 'InDelivery', 'Rescheduled', 'Failed'];

interface DeliveryMetrics {
  warehousePending: number;
  arrangementPending: number;
  collectionPending: number;
}

const SECTION_META = [
  {
    id: 'warehouse',
    title: 'Phối hợp kho',
    description: 'Theo doi tien do dong goi, xac nhan kho va chuan bi hang truoc khi giao.',
    path: '/sales/delivery/warehouse',
    icon: Package,
    accent: '#2563EB',
    metricLabel: (n: number) => `${n} đơn đang xử lý`,
  },
  {
    id: 'arrangement',
    title: 'Sắp xếp vận chuyển',
    description: 'Phân xe, gom đơn theo ca giao và cân bằng tải trọng cho từng chuyến.',
    path: '/sales/delivery/arrangement',
    icon: Truck,
    accent: '#F97316',
    metricLabel: (n: number) => `${n} đơn chờ xếp xe`,
  },
  {
    id: 'collection',
    title: 'Giao hàng và thu tiền',
    description: 'Cập nhật thu COD, đơn còn nợ và đối soát nhanh trạng thái thanh toán.',
    path: '/sales/delivery/collection',
    icon: DollarSign,
    accent: '#16A34A',
    metricLabel: (n: number) => `${n} đơn COD cần xử lý`,
  },
] as const;

export default function SalesDeliveryPage() {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DeliveryMetrics | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [resSalesOrders, resDeliveryOrders, resPickups] = await Promise.all([
          api('/api/orders/sales?page=1&pageSize=100'),
          api('/api/delivery/orders'),
          api('/api/delivery/pickups'),
        ]);

        let warehousePending = 0;
        if (resSalesOrders.ok) {
          const data = await resSalesOrders.json();
          const items: SalesOrderListItem[] = data.items || [];
          warehousePending = items.filter(
            (o) => !DONE_FULFILLMENT_STATUSES.includes(o.fulfillmentStatus || 'Unallocated')
          ).length;
        }

        let arrangementPending = 0;
        let collectionPending = 0;
        if (resDeliveryOrders.ok) {
          const orders: DeliveryOrderListItem[] = await resDeliveryOrders.json();
          arrangementPending += orders.filter((o) => UNSCHEDULED_STATUSES.includes(o.deliveryStatus)).length;
          collectionPending = orders.filter(
            (o) => o.paymentMethod !== 'Transfer' && PENDING_COLLECTION_STATUSES.includes(o.deliveryStatus)
          ).length;
        }
        if (resPickups.ok) {
          const pickups: PendingPickup[] = await resPickups.json();
          arrangementPending += pickups.filter((p) => p.pickupStatus === 'NotScheduled').length;
        }

        if (!cancelled) setMetrics({ warehousePending, arrangementPending, collectionPending });
      } catch {
        if (!cancelled) setMetrics({ warehousePending: 0, arrangementPending: 0, collectionPending: 0 });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const metricValue: Record<string, number> = {
    warehouse: metrics?.warehousePending ?? 0,
    arrangement: metrics?.arrangementPending ?? 0,
    collection: metrics?.collectionPending ?? 0,
  };

  return (
    <div className="flex h-full flex-col bg-[#F5F7FA]">
      <div className="border-b border-[#E5E7EB] bg-white px-5 py-3">
        <h2 className="text-base font-bold text-gray-900">Giao hàng</h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Chọn đúng màn hình để phối hợp kho, sắp xếp giao vận và theo dõi thu tiền.
        </p>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="grid gap-4 lg:grid-cols-3">
          {SECTION_META.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => navigate(section.path)}
                className="rounded-xl border border-[#E5E7EB] bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${section.accent}18`, color: section.accent }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                    style={{ backgroundColor: `${section.accent}12`, color: section.accent }}
                  >
                    {metrics === null ? '...' : section.metricLabel(metricValue[section.id])}
                  </span>
                </div>

                <h3 className="mt-4 text-sm font-bold text-gray-900">{section.title}</h3>
                <p className="mt-2 text-xs leading-5 text-gray-500">{section.description}</p>

                <div className="mt-5 flex items-center gap-1 text-xs font-semibold" style={{ color: section.accent }}>
                  Mo chi tiet
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-xl border border-[#E5E7EB] bg-white p-5 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">Checklist nhanh</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold text-gray-800">1. Kiểm tra kho</p>
              <p className="mt-1 text-xs text-gray-500">Xác nhận đơn nào đã đóng gói xong để sẵn sàng phân xe.</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold text-gray-800">2. Phân xe theo ca</p>
              <p className="mt-1 text-xs text-gray-500">Gom đơn theo khu vực, ưu tiên đơn gấp và cân đối tải trọng.</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs font-semibold text-gray-800">3. Đối soát thu tiền</p>
              <p className="mt-1 text-xs text-gray-500">Cập nhật COD đã thu và tách ngày các đơn chuyển thành công nợ.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
