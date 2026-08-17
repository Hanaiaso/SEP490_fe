import { useEffect, useState } from 'react';
import { Search, X, Plus, Ban } from 'lucide-react';
import { getProductsForManagement, formatPrice } from '../../services/productService';
import { proposeOrder, getOrders, cancelOrder } from '../../services/productPriceUpdateService';
import { getErrorMessage } from '../../lib/errors';
import type { ProductManagementItem } from '../../types/catalog';

interface PriceUpdateOrderItem {
  id: string;
  productId: string;
  productName: string;
  productImageUrl?: string | null;
  oldPrice: number;
  newPrice: number;
}

interface PriceUpdateOrder {
  id: string;
  status: string;
  complianceStatus: string;
  proposedByName: string;
  proposedAt: string;
  proposalNote?: string | null;
  scheduledEffectiveDate: string;
  assignedByManagerName?: string | null;
  assignedSalesStaffName?: string | null;
  notifiedAt?: string | null;
  executedByName?: string | null;
  executedAt?: string | null;
  cancelledAt?: string | null;
  cancelReason?: string | null;
  items: PriceUpdateOrderItem[];
}

const COMPLIANCE_META: Record<string, { label: string; className: string }> = {
  AwaitingAssignment: { label: 'Chờ Manager phân công', className: 'bg-gray-100 text-gray-600' },
  PendingExecution: { label: 'Chờ đến hạn', className: 'bg-blue-100 text-blue-700' },
  Overdue: { label: 'Quá hạn chưa thực hiện', className: 'bg-red-100 text-red-700' },
  OnTime: { label: 'Đã thực hiện đúng hạn', className: 'bg-green-100 text-green-700' },
  Late: { label: 'Đã thực hiện trễ hạn', className: 'bg-orange-100 text-orange-700' },
  Cancelled: { label: 'Đã huỷ', className: 'bg-gray-100 text-gray-500' },
};

interface DraftItem {
  productId: string;
  productName: string;
  currentPrice: number;
  newPrice: string;
}

export default function CEOPriceUpdateOrdersPage() {
  const [orders, setOrders] = useState<PriceUpdateOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ProductManagementItem[]>([]);
  const [draftItems, setDraftItems] = useState<DraftItem[]>([]);
  const [scheduledDate, setScheduledDate] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await getOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    let cancelled = false;
    const t = setTimeout(() => {
      getProductsForManagement({ search, pageSize: 8, isDiscontinued: false })
        .then((res) => { if (!cancelled) setSearchResults(res?.items || []); })
        .catch(() => {});
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [search]);

  const addProduct = (p: ProductManagementItem) => {
    if (draftItems.some((d) => d.productId === p.id)) return;
    setDraftItems((prev) => [...prev, { productId: p.id, productName: p.name, currentPrice: p.standardListedPrice, newPrice: '' }]);
    setSearch('');
    setSearchResults([]);
  };

  const removeDraftItem = (productId: string) => {
    setDraftItems((prev) => prev.filter((d) => d.productId !== productId));
  };

  const updateDraftPrice = (productId: string, value: string) => {
    setDraftItems((prev) => prev.map((d) => (d.productId === productId ? { ...d, newPrice: value } : d)));
  };

  const resetForm = () => {
    setDraftItems([]);
    setScheduledDate('');
    setNote('');
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    if (draftItems.length === 0) { setError('Vui lòng chọn ít nhất 1 sản phẩm.'); return; }
    if (!scheduledDate) { setError('Vui lòng chọn ngày hiệu lực.'); return; }
    const items = [];
    for (const d of draftItems) {
      const price = Number(d.newPrice);
      if (!price || price <= 0) { setError(`Vui lòng nhập giá mới hợp lệ cho "${d.productName}".`); return; }
      items.push({ productId: d.productId, newPrice: price });
    }

    setSubmitting(true);
    try {
      await proposeOrder({ scheduledEffectiveDate: scheduledDate, proposalNote: note, items });
      resetForm();
      await fetchOrders();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Có lỗi khi đề xuất cập nhật giá'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (order: PriceUpdateOrder) => {
    const reason = window.prompt('Lý do huỷ đợt cập nhật giá (không bắt buộc):') || undefined;
    try {
      await cancelOrder(order.id, reason);
      await fetchOrders();
    } catch (err: unknown) {
      alert(getErrorMessage(err, 'Có lỗi khi huỷ đợt cập nhật giá'));
    }
  };

  return (
    <div className="flex flex-col gap-[20px] p-[24px]">
      <div>
        <h1 className="font-semibold text-[20px] text-[#1f3b64]">Cập nhật giá hàng hóa</h1>
        <p className="text-[12px] text-[#64748b] mt-1">
          Đề xuất đợt cập nhật giá cho một hoặc nhiều sản phẩm. Sales Manager sẽ phân công nhân viên phụ trách và thông báo cho khách hàng bị ảnh hưởng; Sales Staff thực hiện đúng ngày hiệu lực.
        </p>
      </div>

      {/* Form đề xuất */}
      <div className="bg-white border border-[#e5e7eb] rounded-[8px] p-[20px]">
        <h2 className="text-[14px] font-semibold text-[#1f3b64] mb-3">Đề xuất đợt mới</h2>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm sản phẩm theo tên/SKU để thêm vào đợt..."
            className="w-full h-9 pl-9 pr-3 rounded-[6px] border border-gray-300 text-[13px]"
          />
          {searchResults.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-[6px] shadow-lg max-h-64 overflow-y-auto">
              {searchResults.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => addProduct(p)}
                  className="w-full flex items-center justify-between px-3 py-2 text-left text-[13px] hover:bg-gray-50"
                >
                  <span className="text-[#1f3b64]">{p.name}</span>
                  <span className="text-[#64748b]">{formatPrice(p.standardListedPrice)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {draftItems.length > 0 && (
          <div className="border border-gray-200 rounded-[6px] overflow-hidden mb-3">
            <table className="w-full">
              <thead>
                <tr className="bg-[#f5f7fa]">
                  <th className="text-left px-3 py-2 text-[11px] font-medium text-[#64748b] uppercase">Sản phẩm</th>
                  <th className="text-right px-3 py-2 text-[11px] font-medium text-[#64748b] uppercase">Giá hiện tại</th>
                  <th className="text-right px-3 py-2 text-[11px] font-medium text-[#64748b] uppercase">Giá mới</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {draftItems.map((d) => (
                  <tr key={d.productId} className="border-t border-gray-100">
                    <td className="px-3 py-2 text-[13px] text-[#1f3b64]">{d.productName}</td>
                    <td className="px-3 py-2 text-[13px] text-right text-[#64748b]">{formatPrice(d.currentPrice)}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        value={d.newPrice}
                        onChange={(e) => updateDraftPrice(d.productId, e.target.value)}
                        placeholder="Nhập giá mới"
                        className="w-32 h-8 text-right rounded border border-gray-300 px-2 text-[13px]"
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => removeDraftItem(d.productId)} className="text-gray-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-[11px] font-medium text-[#64748b] uppercase mb-1">Ngày hiệu lực</label>
            <input
              type="date"
              value={scheduledDate}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full h-9 rounded-[6px] border border-gray-300 px-2 text-[13px]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-[#64748b] uppercase mb-1">Ghi chú (tuỳ chọn)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Lý do điều chỉnh giá..."
              className="w-full h-9 rounded-[6px] border border-gray-300 px-2 text-[13px]"
            />
          </div>
        </div>

        {error && <p className="text-[12px] text-red-600 mb-3">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex items-center gap-1.5 bg-[#1f3b64] text-white px-[14px] py-[8px] rounded-[6px] text-[13px] font-medium hover:bg-[#162d4e] disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          {submitting ? 'Đang gửi...' : 'Gửi đề xuất'}
        </button>
      </div>

      {/* Lịch sử */}
      <div className="bg-white border border-[#e5e7eb] rounded-[8px] overflow-hidden">
        <div className="px-[16px] py-[12px] border-b border-[#e5e7eb]">
          <h2 className="text-[14px] font-semibold text-[#1f3b64]">Lịch sử cập nhật giá</h2>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-[#f5f7fa] border-b border-[#e5e7eb]">
              {['Sản phẩm', 'Người đề xuất', 'Ngày hiệu lực', 'NV thực hiện', 'Tình trạng', 'Thao tác'].map((h) => (
                <th key={h} className="text-left px-[16px] py-[10px] text-[11px] font-medium text-[#64748b] uppercase whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-4 text-sm text-gray-500">Đang tải dữ liệu...</td></tr>
            ) : orders.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-4 text-sm text-gray-500">Chưa có đợt cập nhật giá nào</td></tr>
            ) : (
              orders.map((o) => {
                const meta = COMPLIANCE_META[o.complianceStatus] ?? { label: o.complianceStatus, className: 'bg-gray-100 text-gray-700' };
                const canCancel = o.status === 'Proposed' || o.status === 'Notified';
                return (
                  <tr key={o.id} className="border-b border-[#f5f7fa] hover:bg-[#f5f7fa]">
                    <td className="px-[16px] py-[10px] text-[12px] text-[#1f3b64]">
                      {o.items.map((i) => i.productName).join(', ')}
                    </td>
                    <td className="px-[16px] py-[10px] text-[12px] text-[#64748b]">{o.proposedByName}</td>
                    <td className="px-[16px] py-[10px] text-[12px] text-[#64748b]">{new Date(o.scheduledEffectiveDate).toLocaleDateString('vi-VN')}</td>
                    <td className="px-[16px] py-[10px] text-[12px] text-[#64748b]">{o.assignedSalesStaffName || '—'}</td>
                    <td className="px-[16px] py-[10px]">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${meta.className}`}>{meta.label}</span>
                    </td>
                    <td className="px-[16px] py-[10px]">
                      {canCancel && (
                        <button onClick={() => handleCancel(o)} className="inline-flex items-center gap-1 text-[12px] text-red-600 hover:text-red-800">
                          <Ban className="w-3.5 h-3.5" /> Huỷ
                        </button>
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
