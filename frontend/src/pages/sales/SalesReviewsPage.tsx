import { useCallback, useEffect, useState } from 'react';
import { MessageSquareText, RefreshCw, Send, Star } from 'lucide-react';
import { getReviewsForSales, replyToReview } from '../../services/reviewService.js';

const PRIMARY = '#1F3B64';

type Review = {
  id: string;
  productId: string;
  productName?: string | null;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
  replyText?: string | null;
  repliedByName?: string | null;
  repliedAt?: string | null;
};

const parseDate = (dateStr: string) => {
  const hasTimezone = /([+-]\d{2}(:?\d{2})?|Z)$/.test(dateStr);
  return new Date(hasTimezone ? dateStr : `${dateStr}Z`);
};

const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return '--';
  return parseDate(dateStr).toLocaleString('vi-VN', {
    hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

function StarsDisplay({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`h-3.5 w-3.5 ${s <= value ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
      ))}
    </span>
  );
}

function ReplyForm({ reviewId, onReplied }: { reviewId: string; onReplied: () => void }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!text.trim()) return;
    try {
      setSaving(true);
      await replyToReview(reviewId, text.trim());
      onReplied();
    } catch (err: any) {
      alert(err.message || 'Không gửi được phản hồi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        maxLength={2000}
        placeholder="Viết phản hồi công khai cho khách hàng..."
        className="w-full rounded border border-gray-300 px-3 py-2 text-[13px] focus:border-[#1F3B64] focus:outline-none"
      />
      <button
        onClick={handleSubmit}
        disabled={saving || !text.trim()}
        className="mt-1.5 inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60"
        style={{ backgroundColor: PRIMARY }}
      >
        {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
        Gửi phản hồi
      </button>
    </div>
  );
}

export default function SalesReviewsPage() {
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getReviewsForSales();
      setItems(data || []);
    } catch (err: any) {
      setError(err.message || 'Không tải được danh sách đánh giá.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const pendingCount = items.filter((r) => !r.replyText).length;

  return (
    <div className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-[18px] font-bold text-[#374151]">
            <MessageSquareText className="h-5 w-5" style={{ color: PRIMARY }} />
            Đánh giá của khách hàng
          </h1>
          <p className="mt-0.5 text-[12px] text-gray-500">
            {items.length} đánh giá · {pendingCount} chưa phản hồi
          </p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-white py-16 text-[13px] text-gray-500">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Đang tải...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-gray-200 bg-white px-5 py-10 text-center text-[13px] text-red-600">{error}</div>
      ) : items.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white px-5 py-16 text-center text-[13px] text-gray-400">
          Chưa có đánh giá nào từ khách hàng của bạn.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div key={r.id} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[#374151]">{r.customerName}</span>
                  <StarsDisplay value={r.rating} />
                </div>
                <span className="text-[11px] text-gray-400">{formatDateTime(r.createdAt)}</span>
              </div>
              {r.productName && <p className="mb-1.5 text-[12px] text-gray-500">Sản phẩm: {r.productName}</p>}
              <p className="text-[13px] leading-relaxed text-gray-600">{r.comment}</p>

              {r.replyText ? (
                <div className="mt-3 ml-4 rounded-lg bg-gray-50 p-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    Đã phản hồi{r.repliedByName ? ` · ${r.repliedByName}` : ''} · {formatDateTime(r.repliedAt)}
                  </p>
                  <p className="text-[13px] leading-relaxed text-gray-600">{r.replyText}</p>
                </div>
              ) : (
                <ReplyForm reviewId={r.id} onReplied={fetchData} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
