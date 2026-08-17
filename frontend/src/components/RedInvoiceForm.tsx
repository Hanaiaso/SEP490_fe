import { useState } from 'react';
import { FileText, Upload, CheckCircle2 } from 'lucide-react';
import { submitRedInvoice } from '../services/orderService';
import { getErrorMessage } from '../lib/errors';
import { resolveApiFileUrl } from '../services/apiBase.js';
import type { SalesOrderDetail } from '../types/order';

// Form cho Sale/Manager nhập lại thông tin hóa đơn đỏ THẬT lấy từ bên thứ 3 (số hóa đơn, ngày xuất,
// ảnh/PDF đính kèm) cho đơn hàng khách đã yêu cầu xuất hóa đơn — hoàn thiện nốt luồng
// RequiresRedInvoice/RedInvoiceStatus vốn trước đây chỉ dừng ở "Pending" không ai xử lý tiếp.
export default function RedInvoiceForm({
  order,
  onSubmitted,
}: {
  order: SalesOrderDetail;
  onSubmitted: (updated: SalesOrderDetail) => void;
}) {
  const [number, setNumber] = useState(order.redInvoiceNumber || '');
  const [issuedAt, setIssuedAt] = useState(order.redInvoiceIssuedAt ? order.redInvoiceIssuedAt.slice(0, 10) : '');
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!order.requiresRedInvoice) return null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setFileBase64(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setError('');
    if (!number.trim()) { setError('Vui lòng nhập số hóa đơn.'); return; }
    if (!issuedAt) { setError('Vui lòng chọn ngày xuất hóa đơn.'); return; }

    setSubmitting(true);
    try {
      const updated = await submitRedInvoice(order.id, {
        redInvoiceNumber: number.trim(),
        redInvoiceIssuedAt: new Date(issuedAt).toISOString(),
        documentBase64: fileBase64 || undefined,
      });
      onSubmitted(updated);
      setFileBase64(null);
      setFileName('');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Có lỗi khi lưu hóa đơn đỏ'));
    } finally {
      setSubmitting(false);
    }
  };

  const isIssued = order.redInvoiceStatus === 'Issued' || order.redInvoiceStatus === 'SentToCustomer';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        <FileText className="h-4 w-4 text-slate-700" />
        <h3 className="text-sm font-semibold text-slate-900">Hóa đơn đỏ</h3>
        {isIssued && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">
            <CheckCircle2 className="h-3 w-3" /> Đã xuất
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase text-slate-500">Số hóa đơn</label>
          <input
            type="text"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="VD: 0001234"
            className="h-8 w-full rounded border border-slate-300 px-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase text-slate-500">Ngày xuất</label>
          <input
            type="date"
            value={issuedAt}
            onChange={(e) => setIssuedAt(e.target.value)}
            className="h-8 w-full rounded border border-slate-300 px-2 text-sm"
          />
        </div>
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-[11px] font-medium uppercase text-slate-500">Ảnh/PDF hóa đơn đính kèm</label>
        <label className="flex cursor-pointer items-center gap-2 rounded border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 hover:bg-slate-50">
          <Upload className="h-3.5 w-3.5" />
          {fileName || 'Chọn file...'}
          <input type="file" accept="image/*,application/pdf" onChange={handleFile} className="hidden" />
        </label>
        {order.redInvoiceDocumentUrl && !fileName && (
          <a
            href={resolveApiFileUrl(order.redInvoiceDocumentUrl) ?? undefined}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-xs text-blue-600 underline"
          >
            Xem file đã tải lên trước đó
          </a>
        )}
      </div>

      {error && <p className="mb-2 text-xs text-red-600">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {submitting ? 'Đang lưu...' : isIssued ? 'Cập nhật hóa đơn đỏ' : 'Lưu hóa đơn đỏ'}
      </button>
    </div>
  );
}
