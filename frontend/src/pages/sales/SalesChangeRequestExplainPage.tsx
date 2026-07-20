import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ChevronDown, FileText, FileWarning, Paperclip, Send, X } from 'lucide-react';
import {
  getRequestsAboutMe,
  submitExplanation,
} from '../../services/salesChangeRequestService';

// LUỒNG 7 Bước 3: Sale hiện tại xem yêu cầu đổi Sale của khách (read-only) và gửi giải trình kèm file.
// Sale không có quyền sửa/xóa/từ chối yêu cầu của khách.
// Gate bảo vệ khách: chỉ các yêu cầu Manager đã bấm "Yêu cầu giải trình" mới xuất hiện ở đây.

type ChangeRequest = {
  id: string;
  customerName: string;
  companyName?: string;
  reason: string;
  problemDescription: string;
  evidenceUrls: string[];
  status: string;
  explanationRequestedAt?: string;
  saleExplanation?: string;
  saleExplanationFileUrls: string[];
  saleExplainedAt?: string;
  managerNote?: string;
  customerAdditionalInfo?: string;
  newSalesStaffName?: string;
  createdAt: string;
  reviewedAt?: string;
};

const MAX_FILES = 5;
const MAX_FILE_MB = 10;
const ALLOWED_EXT = /\.(jpe?g|png|gif|webp|pdf|docx?)$/i;
const IMAGE_EXT = /\.(jpe?g|png|gif|webp)$/i;

function isImageUrl(url: string) {
  return IMAGE_EXT.test(url.split('?')[0]);
}

function fileNameFromUrl(url: string) {
  try {
    return decodeURIComponent(url.split('?')[0].split('/').pop() || 'file');
  } catch {
    return 'file';
  }
}

// Thumbnail ảnh hoặc chip link cho file tài liệu (PDF/Word)
function AttachmentLink({ url }: { url: string }) {
  if (isImageUrl(url)) {
    return (
      <a href={url} target="_blank" rel="noreferrer">
        <img src={url} alt="File giải trình" className="h-14 w-14 rounded border border-gray-200 object-cover" />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-[220px] items-center gap-1.5 rounded border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[12px] text-gray-700 hover:border-[#1F3B64] hover:text-[#1F3B64]"
    >
      <FileText className="h-3.5 w-3.5 flex-shrink-0" />
      <span className="truncate">{fileNameFromUrl(url)}</span>
    </a>
  );
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  Pending: { label: 'Đang chờ xử lý', className: 'bg-yellow-100 text-yellow-700' },
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

function isOpen(status: string) {
  return status === 'Pending' || status === 'MoreInfoRequested';
}

export default function SalesChangeRequestExplainPage() {
  const [requests, setRequests] = useState<ChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [explanation, setExplanation] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadData() {
    try {
      setError('');
      const data = await getRequestsAboutMe();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách yêu cầu');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function toggleExpand(request: ChangeRequest) {
    if (expandedId === request.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(request.id);
    setExplanation(request.saleExplanation || '');
    setFiles([]);
  }

  function handleFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files || []);
    const valid: File[] = [];
    for (const file of selected) {
      if (!ALLOWED_EXT.test(file.name)) {
        alert(`File "${file.name}" không được hỗ trợ. Chỉ chấp nhận ảnh, PDF, Word (doc/docx).`);
        continue;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        alert(`File "${file.name}" vượt quá ${MAX_FILE_MB}MB.`);
        continue;
      }
      valid.push(file);
    }
    setFiles((prev) => [...prev, ...valid].slice(0, MAX_FILES));
    event.target.value = '';
  }

  async function handleSubmit(requestId: string) {
    if (!explanation.trim()) return;
    try {
      setSubmitting(true);
      await submitExplanation(requestId, {
        explanation: explanation.trim(),
        files,
      });
      alert('Đã gửi giải trình cho quản lý.');
      setFiles([]);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gửi giải trình thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  const openCount = requests.filter((r) => isOpen(r.status)).length;

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-[#1F3B64]" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-gray-900">Yêu cầu đổi Sale phụ trách</h1>
        <p className="text-[13px] text-gray-500">
          Khách hàng của bạn đã gửi {requests.length} yêu cầu đổi Sale
          {openCount > 0 && <span className="font-semibold text-orange-600"> · {openCount} đang chờ giải trình</span>}
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white py-16 text-center text-gray-400">
          <FileWarning className="mx-auto mb-2 h-10 w-10" />
          <p className="text-[13px]">Chưa có yêu cầu đổi Sale nào liên quan tới bạn</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((request) => {
            const meta = STATUS_META[request.status] ?? { label: request.status, className: 'bg-gray-100 text-gray-700' };
            const expanded = expandedId === request.id;

            return (
              <div key={request.id} className="rounded-lg border border-gray-200 bg-white">
                <button
                  className="flex w-full items-center gap-3 px-4 py-3 text-left"
                  onClick={() => toggleExpand(request)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-semibold text-gray-900">
                        {request.companyName || request.customerName}
                      </span>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}>
                        {meta.label}
                      </span>
                      {isOpen(request.status) && !request.saleExplainedAt && (
                        <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                          Chưa giải trình
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[12px] text-gray-500">
                      Lý do: {request.reason} · Gửi lúc {formatDate(request.createdAt)}
                    </p>
                  </div>
                  <ChevronDown className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </button>

                {expanded && (
                  <div className="space-y-4 border-t border-gray-100 px-4 py-4">
                    {/* Nội dung yêu cầu của khách — chỉ đọc */}
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        Nội dung yêu cầu của khách
                      </p>
                      <p className="text-[13px] text-gray-800">{request.problemDescription}</p>
                      {request.customerAdditionalInfo && (
                        <p className="mt-2 rounded bg-blue-50 px-3 py-2 text-[13px] text-blue-800">
                          <span className="font-semibold">Khách bổ sung:</span> {request.customerAdditionalInfo}
                        </p>
                      )}
                      {request.evidenceUrls?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {request.evidenceUrls.map((url) => (
                            <a key={url} href={url} target="_blank" rel="noreferrer">
                              <img src={url} alt="Bằng chứng" className="h-14 w-14 rounded border border-gray-200 object-cover" />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>

                    {request.managerNote && (
                      <div className="rounded bg-gray-50 px-3 py-2 text-[13px] text-gray-700">
                        <span className="font-semibold">Ghi chú của quản lý:</span> {request.managerNote}
                      </div>
                    )}

                    {request.status === 'Approved' && request.newSalesStaffName && (
                      <div className="rounded bg-green-50 px-3 py-2 text-[13px] text-green-800">
                        Khách hàng đã được chuyển cho <span className="font-semibold">{request.newSalesStaffName}</span>.
                        Vui lòng hoàn tất các đơn được giữ lại cho bạn.
                      </div>
                    )}

                    {/* Giải trình của Sale */}
                    <div>
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                        Giải trình của bạn
                        {request.saleExplainedAt && (
                          <span className="ml-2 font-normal normal-case text-gray-400">
                            (đã gửi lúc {formatDate(request.saleExplainedAt)})
                          </span>
                        )}
                      </p>

                      {isOpen(request.status) ? (
                        <div className="space-y-2">
                          <textarea
                            value={explanation}
                            onChange={(e) => setExplanation(e.target.value)}
                            rows={3}
                            placeholder="Trình bày quan điểm của bạn về phản ánh của khách..."
                            className="w-full rounded border border-gray-300 px-3 py-2 text-[13px] outline-none focus:border-[#1F3B64] focus:ring-1 focus:ring-[#1F3B64]/30"
                          />

                          {/* File đính kèm giải trình (thay cho ô ghi chú text) */}
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,.pdf,.doc,.docx"
                            multiple
                            className="hidden"
                            onChange={handleFilesChange}
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center gap-1.5 rounded border border-dashed border-gray-300 px-3 py-2 text-[12px] text-gray-600 transition hover:border-[#1F3B64] hover:text-[#1F3B64]"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                            Đính kèm minh chứng — ảnh, PDF, Word (tối đa {MAX_FILES}, ≤{MAX_FILE_MB}MB/file)
                          </button>

                          {files.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {files.map((file, index) => (
                                <div key={`${file.name}-${index}`} className="relative">
                                  {file.type.startsWith('image/') ? (
                                    <img
                                      src={URL.createObjectURL(file)}
                                      alt={file.name}
                                      className="h-14 w-14 rounded border border-gray-200 object-cover"
                                    />
                                  ) : (
                                    <span className="inline-flex max-w-[200px] items-center gap-1.5 rounded border border-gray-200 bg-gray-50 py-1.5 pl-2.5 pr-4 text-[12px] text-gray-700">
                                      <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                                      <span className="truncate">{file.name}</span>
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setFiles(files.filter((_, i) => i !== index))}
                                    className="absolute -right-1.5 -top-1.5 rounded-full bg-[#1F3B64] p-0.5 text-white"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {request.saleExplanationFileUrls?.length > 0 && (
                            <div>
                              <p className="mb-1 text-[11px] text-gray-400">File đã gửi trước đó:</p>
                              <div className="flex flex-wrap gap-2">
                                {request.saleExplanationFileUrls.map((url) => (
                                  <AttachmentLink key={url} url={url} />
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex justify-end">
                            <button
                              onClick={() => handleSubmit(request.id)}
                              disabled={submitting || !explanation.trim()}
                              className="inline-flex items-center gap-1.5 rounded bg-[#1F3B64] px-4 py-2 text-[12px] font-semibold text-white transition hover:bg-[#2a4d80] disabled:opacity-50"
                            >
                              <Send className="h-3.5 w-3.5" />
                              {submitting ? 'Đang gửi...' : request.saleExplainedAt ? 'Cập nhật giải trình' : 'Gửi giải trình'}
                            </button>
                          </div>
                        </div>
                      ) : request.saleExplanation ? (
                        <div className="space-y-1 text-[13px] text-gray-800">
                          <p>{request.saleExplanation}</p>
                          {request.saleExplanationFileUrls?.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-1">
                              {request.saleExplanationFileUrls.map((url) => (
                                <AttachmentLink key={url} url={url} />
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-[13px] text-gray-400">Không có giải trình.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
