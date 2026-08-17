import { useEffect, useState } from 'react';
import { getOrders, executeOrder } from '../../services/productPriceUpdateService';
import { getErrorMessage } from '../../lib/errors';
import { formatPrice } from '../../services/productService';
import { CheckCircle2 } from 'lucide-react';

interface PriceUpdateOrderItem {
  id: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
}

interface PriceUpdateOrder {
  id: string;
  status: string;
  scheduledEffectiveDate: string;
  assignedByManagerName?: string | null;
  items: PriceUpdateOrderItem[];
}

function todayVn(): string {
  const now = new Date();
  const vn = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return vn.toISOString().slice(0, 10);
}

export default function SalesPriceUpdateExecutionPage() {
  const [rows, setRows] = useState<PriceUpdateOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [executingId, setExecutingId] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await getOrders();
      setRows(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleExecute = async (order: PriceUpdateOrder) => {
    if (!window.confirm('Xác nhận thực hiện cập nhật giá cho đợt này? Giá sản phẩm sẽ được áp dụng ngay.')) return;
    setExecutingId(order.id);
    try {
      await executeOrder(order.id);
      await fetchOrders();
    } catch (error: unknown) {
      alert(getErrorMessage(error, 'Có lỗi khi thực hiện cập nhật giá'));
    } finally {
      setExecutingId(null);
    }
  };

  const today = todayVn();

  return (
    <div className="flex flex-col gap-[20px] p-[24px]">
      <div>
        <h1 className="font-semibold text-[20px] text-[#1f3b64]">Thực hiện cập nhật giá hàng hóa</h1>
        <p className="text-[12px] text-[#64748b] mt-1">
          Các đợt cập nhật giá được Sales Manager phân công cho bạn. Chỉ có thể thực hiện đúng hoặc sau ngày hiệu lực đã thông báo cho khách hàng.
        </p>
      </div>

      <div className="bg-white border border-[#e5e7eb] rounded-[8px] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f5f7fa] border-b border-[#e5e7eb]">
              {['Sản phẩm', 'Ngày hiệu lực', 'Manager phân công', 'Thao tác'].map((h) => (
                <th key={h} className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-4 text-sm text-gray-500">Đang tải dữ liệu...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-4 text-sm text-gray-500">Không có đợt cập nhật giá nào cần thực hiện</td></tr>
            ) : (
              rows.map((row) => {
                const scheduledDate = row.scheduledEffectiveDate.slice(0, 10);
                const isEligible = scheduledDate <= today;
                return (
                  <tr key={row.id} className="border-b border-[#f5f7fa] hover:bg-[#f5f7fa]">
                    <td className="px-[16px] py-[12px] text-[12px] text-[#1f3b64]">
                      {row.items.map((i) => `${i.productName} (${formatPrice(i.oldPrice)} → ${formatPrice(i.newPrice)})`).join(', ')}
                    </td>
                    <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">{new Date(row.scheduledEffectiveDate).toLocaleDateString('vi-VN')}</td>
                    <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">{row.assignedByManagerName || '—'}</td>
                    <td className="px-[16px] py-[12px]">
                      {isEligible ? (
                        <button
                          onClick={() => handleExecute(row)}
                          disabled={executingId === row.id}
                          className="inline-flex items-center gap-1.5 bg-[#16A34A] text-white px-[12px] py-[6px] rounded-[4px] text-[12px] font-medium hover:bg-[#128a3e] disabled:opacity-50 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {executingId === row.id ? 'Đang thực hiện...' : 'Thực hiện cập nhật giá'}
                        </button>
                      ) : (
                        <span className="text-[11px] text-amber-600 font-medium">
                          Có hiệu lực từ {new Date(row.scheduledEffectiveDate).toLocaleDateString('vi-VN')}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
