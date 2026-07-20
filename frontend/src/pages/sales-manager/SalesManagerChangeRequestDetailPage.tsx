import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Check, CircleHelp, FileText, MessageSquareWarning, Truck, X } from 'lucide-react';
import {
  approveRequest,
  getRequestDetail,
  getReviewContext,
  rejectRequest,
  requestExplanation,
  requestMoreInfo,
} from '../../services/salesChangeRequestService';

// LUỒNG 7 Bước 4+5+6 (MGR-06): Manager rà soát, yêu cầu bổ sung / từ chối / phê duyệt +
// quyết định giữ/chuyển từng đơn đang chạy. Đơn đang giao mặc định giữ Sale cũ, override phải có lý do.
// Gate bảo vệ khách: Sale hiện tại chỉ thấy khiếu nại sau khi Manager bấm "Yêu cầu giải trình".

type Detail = {
  id: string;
  customerName: string;
  companyName?: string;
  currentSalesStaffId: string;
  currentSalesStaffName: string;
  desiredSalesStaffId?: string;
  desiredSalesStaffName?: string;
  reason: string;
  problemDescription: string;
  evidenceUrls: string[];
  status: string;
  explanationRequestedAt?: string;
  saleExplanation?: string;
  saleExplanationFileUrls: string[];
  saleExplainedAt?: string;
  managerNote?: string;
  reviewedByName?: string;
  newSalesStaffName?: string;
  overrideReason?: string;
  customerAdditionalInfo?: string;
  createdAt: string;
  reviewedAt?: string;
  orderDecisions: { orderId: string; orderCode: string; transferToNewSale: boolean; note?: string }[];
};

type RunningOrder = {
  orderId: string;
  orderCode: string;
  orderStatus: string;
  deliveryStatus: string;
  finalPayment: number;
  createdAt: string;
  isInDelivery: boolean;
};

type Candidate = {
  id: string;
  fullName: string;
  email: string;
  customerCount: number;
  openOrderCount: number;
  isActive: boolean;
  isDesired: boolean;
  isCurrent: boolean;
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  Pending: { label: 'Chờ xử lý', className: 'bg-yellow-100 text-yellow-700' },
  MoreInfoRequested: { label: 'Chờ khách bổ sung', className: 'bg-orange-100 text-orange-700' },
  Approved: { label: 'Đã phê duyệt', className: 'bg-green-100 text-green-700' },
  Rejected: { label: 'Đã từ chối', className: 'bg-red-100 text-red-700' },
  Cancelled: { label: 'Khách đã hủy', className: 'bg-gray-100 text-gray-500' },
};

function formatDate(value?: string) {
  if (!value) return '-';
  // BE trả DateTime UTC không kèm 'Z' — gắn thêm để hiển thị đúng giờ local
  const normalized = /Z|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`;
  return new Date(normalized).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' });
}

function formatPrice(value: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

const IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i;

function fileNameFromUrl(url: string) {
  try {
    return decodeURIComponent(url.split('?')[0].split('/').pop() || 'file');
  } catch {
    return 'file';
  }
}

// Thumbnail ảnh hoặc chip link cho file tài liệu (PDF/Word) do Sale gửi kèm giải trình
function AttachmentLink({ url }: { url: string }) {
  if (IMAGE_EXT.test(url.split('?')[0])) {
    return (
      <a href={url} target="_blank" rel="noreferrer">
        <img src={url} alt="File giải trình" className="h-16 w-16 rounded border border-gray-200 object-cover" />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-[240px] items-center gap-1.5 rounded border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[12px] text-gray-700 hover:border-[#1F3B64] hover:text-[#1F3B64]"
    >
      <FileText className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="truncate">{fileNameFromUrl(url)}</span>
    </a>
  );
}

export default function SalesManagerChangeRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [detail, setDetail] = useState<Detail | null>(null);
  const [runningOrders, setRunningOrders] = useState<RunningOrder[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Quyết định giữ/chuyển từng đơn: orderId -> { transfer, note }
  const [decisions, setDecisions] = useState<Record<string, { transfer: boolean; note: string }>>({});
  const [newSaleId, setNewSaleId] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  const [modal, setModal] = useState<'request-info' | 'reject' | null>(null);
  const [modalNote, setModalNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isOpen = detail?.status === 'Pending' || detail?.status === 'MoreInfoRequested';

  const needOverrideReason = useMemo(() => {
    if (!detail?.desiredSalesStaffId || !newSaleId) return false;
    return newSaleId !== detail.desiredSalesStaffId;
  }, [detail, newSaleId]);

  async function loadData() {
    if (!id) return;
    try {
      setError('');
      const [d, ctx] = await Promise.all([getRequestDetail(id), getReviewContext(id)]);
      setDetail(d);
      setRunningOrders(ctx?.runningOrders ?? []);
      setCandidates(ctx?.salesCandidates ?? []);

      // Mặc định: đơn đang giao GIỮ Sale cũ, các đơn khác CHUYỂN Sale mới
      const initial: Record<string, { transfer: boolean; note: string }> = {};
      for (const order of ctx?.runningOrders ?? []) {
        initial[order.orderId] = { transfer: !order.isInDelivery, note: '' };
      }
      setDecisions(initial);

      // Gợi ý sẵn Sale khách mong muốn (nếu hợp lệ)
      if (d?.desiredSalesStaffId) setNewSaleId(d.desiredSalesStaffId);
    } catch (err: any) {
      setError(err.message || 'Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  function setDecision(orderId: string, transfer: boolean) {
    setDecisions((prev) => ({ ...prev, [orderId]: { ...prev[orderId], transfer } }));
  }

  function setDecisionNote(orderId: string, note: string) {
    setDecisions((prev) => ({ ...prev, [orderId]: { ...prev[orderId], note } }));
  }

  // Gate bảo vệ khách: mở giải trình thì Sale hiện tại mới thấy được khiếu nại
  async function handleRequestExplanation() {
    if (!id) return;
    if (!window.confirm('Yêu cầu Sale hiện tại giải trình? Sau bước này Sale sẽ xem được nội dung khiếu nại của khách.')) return;
    try {
      setSubmitting(true);
      await requestExplanation(id);
      alert('Đã yêu cầu Sale giải trình.');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Thao tác thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleModalSubmit() {
    if (!id || !modalNote.trim()) return;
    try {
      setSubmitting(true);
      if (modal === 'request-info') {
        await requestMoreInfo(id, modalNote.trim());
        alert('Đã yêu cầu khách bổ sung thông tin.');
      } else {
        await rejectRequest(id, modalNote.trim());
        alert('Đã từ chối yêu cầu.');
      }
      navigate('/sales-manager/change-requests');
    } catch (err: any) {
      alert(err.message || 'Thao tác thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    if (!id || !detail) return;
    if (!newSaleId) {
      alert('Vui lòng chọn Sale mới.');
      return;
    }
    if (needOverrideReason && !overrideReason.trim()) {
      alert('Chọn Sale khác với Sale khách mong muốn bắt buộc phải ghi lý do.');
      return;
    }
    for (const order of runningOrders) {
      const decision = decisions[order.orderId];
      if (decision?.transfer && order.isInDelivery && !decision.note.trim()) {
        alert(`Đơn ${order.orderCode} đang giao — chuyển cho Sale mới bắt buộc phải ghi lý do.`);
        return;
      }
    }
    if (!window.confirm('Xác nhận phê duyệt và chuyển Sale phụ trách cho khách hàng này?')) return;

    try {
      setSubmitting(true);
      await approveRequest(id, {
        newSalesStaffId: newSaleId,
        overrideReason: needOverrideReason ? overrideReason.trim() : undefined,
        orderDecisions: runningOrders.map((order) => ({
          orderId: order.orderId,
          transferToNewSale: decisions[order.orderId]?.transfer ?? false,
          note: decisions[order.orderId]?.note?.trim() || undefined,
        })),
      });
      alert('Đã phê duyệt yêu cầu và chuyển Sale phụ trách.');
      navigate('/sales-manager/change-requests');
    } catch (err: any) {
      alert(err.message || 'Phê duyệt thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#1F3B64]" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-[13px] text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error || 'Không tìm thấy yêu cầu'}
        </div>
      </div>
    );
  }

  const meta = STATUS_META[detail.status] ?? { label: detail.status, className: 'bg-gray-100 text-gray-700' };

  return (
    <div className="p-4">
      <button
        onClick={() => navigate('/sales-manager/change-requests')}
        className="mb-3 inline-flex items-center gap-1 text-[12px] font-medium text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Quay lại danh sách
      </button>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            Yêu cầu đổi Sale — {detail.companyName || detail.customerName}
          </h1>
          <p className="text-[13px] text-gray-500">
            Gửi lúc {formatDate(detail.createdAt)} · Sale hiện tại: <span className="font-semibold">{detail.currentSalesStaffName}</span>
            {detail.desiredSalesStaffName && (
              <> · Sale mong muốn: <span className="font-semibold">{detail.desiredSalesStaffName}</span></>
            )}
          </p>
        </div>
        <span className={`rounded px-2.5 py-1 text-[11px] font-semibold ${meta.className}`}>{meta.label}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Cột trái: nội dung yêu cầu + giải trình */}
        <div className="space-y-4">
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-[13px] font-bold text-gray-900">Nội dung yêu cầu của khách</h3>
            <p className="text-[13px]"><span className="font-semibold text-gray-700">Lý do:</span> {detail.reason}</p>
            <p className="mt-1.5 text-[13px] text-gray-700">{detail.problemDescription}</p>
            {detail.customerAdditionalInfo && (
              <div className="mt-2 rounded bg-blue-50 px-3 py-2 text-[13px] text-blue-800">
                <span className="font-semibold">Khách bổ sung:</span> {detail.customerAdditionalInfo}
              </div>
            )}
            {detail.evidenceUrls?.length > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Bằng chứng</p>
                <div className="flex flex-wrap gap-2">
                  {detail.evidenceUrls.map((url) => (
                    <a key={url} href={url} target="_blank" rel="noreferrer">
                      <img src={url} alt="Bằng chứng" className="h-20 w-20 rounded border border-gray-200 object-cover" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-[13px] font-bold text-gray-900">
              Giải trình của Sale hiện tại
              {detail.saleExplainedAt && (
                <span className="ml-2 text-[11px] font-normal text-gray-400">({formatDate(detail.saleExplainedAt)})</span>
              )}
            </h3>

            {/* Gate bảo vệ khách: Sale chưa thấy khiếu nại cho tới khi Manager mở giải trình */}
            {!detail.explanationRequestedAt ? (
              <div className="space-y-2">
                <p className="text-[13px] text-gray-500">
                  Sale hiện tại <span className="font-semibold">chưa được thông báo</span> về khiếu nại này
                  (bảo vệ khách hàng). Bấm nút dưới nếu bạn cần Sale giải trình.
                </p>
                {isOpen && (
                  <button
                    onClick={handleRequestExplanation}
                    disabled={submitting}
                    className="inline-flex items-center gap-1.5 rounded border border-[#1F3B64] bg-white px-3 py-2 text-[12px] font-semibold text-[#1F3B64] transition hover:bg-[#1F3B64]/5 disabled:opacity-50"
                  >
                    <MessageSquareWarning className="h-3.5 w-3.5" />
                    Yêu cầu Sale giải trình
                  </button>
                )}
              </div>
            ) : detail.saleExplanation ? (
              <>
                <p className="text-[13px] text-gray-700">{detail.saleExplanation}</p>
                {detail.saleExplanationFileUrls?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {detail.saleExplanationFileUrls.map((url) => (
                      <AttachmentLink key={url} url={url} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-[13px] text-gray-400">
                Đã yêu cầu giải trình lúc {formatDate(detail.explanationRequestedAt)} — Sale chưa phản hồi.
              </p>
            )}
          </section>

          {/* Kết quả xử lý (nếu đã đóng) */}
          {!isOpen && (
            <section className="rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="mb-2 text-[13px] font-bold text-gray-900">Kết quả xử lý</h3>
              <div className="space-y-1 text-[13px] text-gray-700">
                <p>Người xử lý: <span className="font-semibold">{detail.reviewedByName || '-'}</span> · {formatDate(detail.reviewedAt)}</p>
                {detail.newSalesStaffName && <p>Sale mới: <span className="font-semibold text-green-700">{detail.newSalesStaffName}</span></p>}
                {detail.overrideReason && <p>Lý do chọn Sale khác mong muốn: {detail.overrideReason}</p>}
                {detail.managerNote && <p>Ghi chú: {detail.managerNote}</p>}
                {detail.orderDecisions?.length > 0 && (
                  <div className="mt-2">
                    <p className="font-semibold">Quyết định với đơn đang chạy:</p>
                    <ul className="ml-4 list-disc">
                      {detail.orderDecisions.map((d) => (
                        <li key={d.orderId}>
                          {d.orderCode}: {d.transferToNewSale ? 'Chuyển Sale mới' : 'Sale cũ hoàn tất'}
                          {d.note && <span className="text-gray-500"> — {d.note}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Cột phải: rà soát + quyết định */}
        <div className="space-y-4">
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-2 text-[13px] font-bold text-gray-900">Khối lượng công việc các Sale</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {[isOpen ? 'Chọn' : '', 'Sale', 'Khách', 'Đơn mở', 'Trạng thái'].map((h, i) => (
                      <th key={i} className="px-2 py-1.5 text-left text-[11px] font-semibold uppercase text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {candidates.map((c) => (
                    <tr key={c.id} className={c.isDesired ? 'bg-blue-50/50' : ''}>
                      <td className="px-2 py-2">
                        {isOpen && !c.isCurrent && (
                          <input
                            type="radio"
                            name="newSale"
                            checked={newSaleId === c.id}
                            onChange={() => setNewSaleId(c.id)}
                            className="accent-[#1F3B64]"
                          />
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <p className="text-[13px] font-medium text-gray-900">
                          {c.fullName}
                          {c.isDesired && <span className="ml-1.5 rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-semibold text-blue-700">Khách mong muốn</span>}
                          {c.isCurrent && <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-semibold text-gray-500">Sale hiện tại</span>}
                        </p>
                        <p className="text-[11px] text-gray-400">{c.email}</p>
                      </td>
                      <td className="px-2 py-2 text-[13px] text-gray-700">{c.customerCount}</td>
                      <td className="px-2 py-2 text-[13px] text-gray-700">{c.openOrderCount}</td>
                      <td className="px-2 py-2">
                        {c.isActive ? (
                          <span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">Active</span>
                        ) : (
                          <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">Inactive</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {isOpen && needOverrideReason && (
              <div className="mt-3">
                <label className="mb-1 block text-[12px] font-medium text-orange-700">
                  Lý do chọn Sale khác với Sale khách mong muốn *
                </label>
                <input
                  type="text"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Ví dụ: Sale mong muốn đang quá tải / không hoạt động..."
                  className="h-9 w-full rounded border border-orange-300 px-3 text-[13px] outline-none focus:border-orange-500"
                />
              </div>
            )}
          </section>

          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="mb-1 text-[13px] font-bold text-gray-900">Đơn đang chạy của khách ({runningOrders.length})</h3>
            {isOpen && (
              <p className="mb-2 flex items-center gap-1 text-[11px] text-gray-400">
                <CircleHelp className="h-3 w-3" />
                Đơn đang giao mặc định do Sale cũ hoàn tất; chuyển cho Sale mới bắt buộc ghi lý do.
              </p>
            )}

            {runningOrders.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-gray-400">Khách không có đơn đang chạy.</p>
            ) : (
              <div className="space-y-2">
                {runningOrders.map((order) => {
                  const decision = decisions[order.orderId] ?? { transfer: false, note: '' };
                  return (
                    <div key={order.orderId} className="rounded border border-gray-100 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-[13px] font-semibold text-gray-900">
                            {order.orderCode}
                            {order.isInDelivery && (
                              <span className="ml-2 inline-flex items-center gap-1 rounded bg-purple-50 px-1.5 py-0.5 text-[10px] font-semibold text-purple-700">
                                <Truck className="h-3 w-3" /> Đang giao
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            {order.orderStatus} · {formatPrice(order.finalPayment)} · {formatDate(order.createdAt)}
                          </p>
                        </div>

                        {isOpen && (
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setDecision(order.orderId, false)}
                              className={`rounded px-2.5 py-1 text-[11px] font-semibold transition ${
                                !decision.transfer ? 'bg-[#1F3B64] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              Sale cũ hoàn tất
                            </button>
                            <button
                              onClick={() => setDecision(order.orderId, true)}
                              className={`rounded px-2.5 py-1 text-[11px] font-semibold transition ${
                                decision.transfer ? 'bg-[#1F3B64] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                              }`}
                            >
                              Chuyển Sale mới
                            </button>
                          </div>
                        )}
                      </div>

                      {isOpen && decision.transfer && order.isInDelivery && (
                        <input
                          type="text"
                          value={decision.note}
                          onChange={(e) => setDecisionNote(order.orderId, e.target.value)}
                          placeholder="Lý do chuyển đơn đang giao (bắt buộc)..."
                          className="mt-2 h-8 w-full rounded border border-orange-300 px-3 text-[12px] outline-none focus:border-orange-500"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {isOpen && (
            <section className="flex flex-wrap justify-end gap-2">
              <button
                onClick={() => { setModal('request-info'); setModalNote(''); }}
                className="rounded border border-gray-300 bg-white px-4 py-2 text-[12px] font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Yêu cầu bổ sung
              </button>
              <button
                onClick={() => { setModal('reject'); setModalNote(''); }}
                className="rounded border border-red-300 bg-white px-4 py-2 text-[12px] font-semibold text-red-600 transition hover:bg-red-50"
              >
                <span className="inline-flex items-center gap-1"><X className="h-3.5 w-3.5" /> Từ chối</span>
              </button>
              <button
                onClick={handleApprove}
                disabled={submitting}
                className="rounded bg-[#1F3B64] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#2a4d80] disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" /> {submitting ? 'Đang xử lý...' : 'Phê duyệt & chuyển Sale'}</span>
              </button>
            </section>
          )}
        </div>
      </div>

      {/* Modal yêu cầu bổ sung / từ chối */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h3 className="mb-3 text-[14px] font-bold text-gray-900">
              {modal === 'request-info' ? 'Yêu cầu khách bổ sung thông tin' : 'Từ chối yêu cầu đổi Sale'}
            </h3>
            <textarea
              value={modalNote}
              onChange={(e) => setModalNote(e.target.value)}
              rows={4}
              placeholder={modal === 'request-info' ? 'Nội dung cần khách bổ sung...' : 'Lý do từ chối (bắt buộc)...'}
              className="w-full rounded border border-gray-300 px-3 py-2 text-[13px] outline-none focus:border-[#1F3B64]"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setModal(null)}
                className="rounded border border-gray-300 px-4 py-2 text-[12px] font-semibold text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleModalSubmit}
                disabled={submitting || !modalNote.trim()}
                className="rounded bg-[#1F3B64] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#2a4d80] disabled:opacity-50"
              >
                {submitting ? 'Đang gửi...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
