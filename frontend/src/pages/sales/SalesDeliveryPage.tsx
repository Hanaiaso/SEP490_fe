import { ChevronRight, DollarSign, Package, Truck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DELIVERY_SECTIONS = [
  {
    id: 'warehouse',
    title: 'Phối hợp kho',
    description: 'Theo doi tien do dong goi, xac nhan kho va chuan bi hang truoc khi giao.',
    metric: '6 don dang xu ly',
    path: '/sales/delivery/warehouse',
    icon: Package,
    accent: '#2563EB',
  },
  {
    id: 'arrangement',
    title: 'Sắp xếp vận chuyển',
    description: 'Phân xe, gom đơn theo ca giao và cân bằng tải trọng cho từng chuyến.',
    metric: '5 xe sẵn sàng',
    path: '/sales/delivery/arrangement',
    icon: Truck,
    accent: '#F97316',
  },
  {
    id: 'collection',
    title: 'Giao hàng và thu tiền',
    description: 'Cập nhật thu COD, đơn còn nợ và đối soát nhanh trạng thái thanh toán.',
    metric: '3 đơn COD cần xử lý',
    path: '/sales/delivery/collection',
    icon: DollarSign,
    accent: '#16A34A',
  },
];

export default function SalesDeliveryPage() {
  const navigate = useNavigate();

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
          {DELIVERY_SECTIONS.map((section) => {
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
                    {section.metric}
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
