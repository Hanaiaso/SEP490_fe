import { useEffect, useRef, useState } from 'react'
import * as signalR from '@microsoft/signalr'
import {
  AlertCircle,
  Paperclip,
  Phone,
  Mail,
  Send,
  UserCog,
  X,
} from 'lucide-react'
import { Badge } from './ui/Badge.jsx'
import { Button } from './ui/Button.jsx'
import {
  cancelRequest,
  createSalesChangeRequest,
  getMyAssignedSale,
  getMyRequests,
  getSalesOptions,
  submitAdditionalInfo,
} from '../services/salesChangeRequestService.js'

const statusBadge = {
  Pending: 'bg-yellow-100 text-yellow-700',
  MoreInfoRequested: 'bg-orange-100 text-orange-700',
  Approved: 'bg-green-100 text-green-700',
  Rejected: 'bg-red-100 text-red-700',
  Cancelled: 'bg-gray-100 text-gray-500',
}

const statusLabel = {
  Pending: 'Đang chờ xử lý',
  MoreInfoRequested: 'Cần bổ sung thông tin',
  Approved: 'Đã phê duyệt',
  Rejected: 'Đã từ chối',
  Cancelled: 'Đã hủy',
}

const REASON_OPTIONS = [
  'Sale phản hồi chậm / khó liên lạc',
  'Thái độ phục vụ chưa tốt',
  'Tư vấn sai thông tin sản phẩm / giá',
  'Muốn làm việc với Sale đã từng hỗ trợ',
  'Lý do khác',
]

const MAX_FILES = 5

function formatDate(value) {
  if (!value) return '-'
  // BE trả DateTime UTC không kèm 'Z' — gắn thêm để hiển thị đúng giờ local
  const normalized = /Z|[+-]\d{2}:\d{2}$/.test(value) ? value : `${value}Z`
  return new Date(normalized).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })
}

export default function SalesChangeRequestTab({ onSuccess }) {
  const [assignedSale, setAssignedSale] = useState(null)
  const [requests, setRequests] = useState([])
  const [salesOptions, setSalesOptions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Form tạo yêu cầu
  const [showForm, setShowForm] = useState(false)
  const [reasonOption, setReasonOption] = useState(REASON_OPTIONS[0])
  const [reasonText, setReasonText] = useState('')
  const [description, setDescription] = useState('')
  const [desiredSaleId, setDesiredSaleId] = useState('')
  const [files, setFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const fileInputRef = useRef(null)

  // Bổ sung thông tin
  const [additionalInfo, setAdditionalInfo] = useState('')
  const [additionalSubmitting, setAdditionalSubmitting] = useState(false)

  const openRequest = requests.find((r) => r.status === 'Pending' || r.status === 'MoreInfoRequested')

  async function loadData() {
    try {
      setError('')
      const [sale, mine] = await Promise.all([getMyAssignedSale(), getMyRequests()])
      setAssignedSale(sale)
      setRequests(Array.isArray(mine) ? mine : [])
    } catch (err) {
      setError(err.message || 'Không thể tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    getSalesOptions().then(setSalesOptions).catch(() => {})
  }, [])

  // Nhận realtime kết quả xử lý trong lúc mở tab (kết nối scoped theo tab, đóng khi unmount)
  useEffect(() => {
    const accessToken = localStorage.getItem('accessToken')
    if (!accessToken) return

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/sales', { accessTokenFactory: () => accessToken })
      .withAutomaticReconnect()
      .build()

    const refetch = (payload) => {
      loadData()
      if (payload?.message) onSuccess?.(payload.message)
    }
    connection.on('SalesChangeRequestApproved', refetch)
    connection.on('SalesChangeRequestRejected', refetch)
    connection.on('SalesChangeRequestMoreInfo', refetch)

    connection.start().catch(() => {})
    return () => {
      connection.stop().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleFilesChange(event) {
    const selected = Array.from(event.target.files || [])
    const merged = [...files, ...selected].slice(0, MAX_FILES)
    setFiles(merged)
    event.target.value = ''
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError('')

    const reason = reasonOption === 'Lý do khác' ? reasonText.trim() : reasonOption
    if (!reason) {
      setFormError('Vui lòng nhập lý do.')
      return
    }
    if (!description.trim()) {
      setFormError('Vui lòng mô tả vấn đề bạn gặp phải.')
      return
    }

    try {
      setSubmitting(true)
      await createSalesChangeRequest({
        reason,
        problemDescription: description.trim(),
        desiredSalesStaffId: desiredSaleId || undefined,
        files,
      })
      onSuccess?.('Đã gửi yêu cầu đổi Sale. Quản lý sẽ xử lý trong thời gian sớm nhất.')
      setShowForm(false)
      setReasonOption(REASON_OPTIONS[0])
      setReasonText('')
      setDescription('')
      setDesiredSaleId('')
      setFiles([])
      await loadData()
    } catch (err) {
      setFormError(err.message || 'Gửi yêu cầu thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleCancel(id) {
    if (!window.confirm('Bạn chắc chắn muốn hủy yêu cầu đổi Sale này?')) return
    try {
      await cancelRequest(id)
      onSuccess?.('Đã hủy yêu cầu.')
      await loadData()
    } catch (err) {
      setError(err.message || 'Hủy yêu cầu thất bại')
    }
  }

  async function handleSubmitAdditionalInfo(id) {
    if (!additionalInfo.trim()) return
    try {
      setAdditionalSubmitting(true)
      await submitAdditionalInfo(id, additionalInfo.trim())
      onSuccess?.('Đã gửi thông tin bổ sung.')
      setAdditionalInfo('')
      await loadData()
    } catch (err) {
      setError(err.message || 'Gửi thông tin bổ sung thất bại')
    } finally {
      setAdditionalSubmitting(false)
    }
  }

  if (loading) {
    return (
      <section className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-950" />
        <p className="mt-4 text-sm text-gray-500">Đang tải thông tin Sale phụ trách...</p>
      </section>
    )
  }

  return (
    <div className="space-y-5">
      {error && (
        <section className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </section>
      )}

      {/* Sale phụ trách hiện tại */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <UserCog className="h-4 w-4" />
          Nhân viên Sale phụ trách của bạn
        </h4>

        {assignedSale?.salesStaffId ? (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              {assignedSale.avatarUrl ? (
                <img src={assignedSale.avatarUrl} alt="Avatar" className="h-12 w-12 rounded-full object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-base font-bold text-white">
                  {(assignedSale.fullName || '?').charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-gray-900">{assignedSale.fullName}</p>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                  {assignedSale.email && (
                    <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{assignedSale.email}</span>
                  )}
                  {assignedSale.phoneNumber && (
                    <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{assignedSale.phoneNumber}</span>
                  )}
                </div>
                {assignedSale.assignedAt && (
                  <p className="mt-1 text-xs text-gray-400">Phụ trách từ {formatDate(assignedSale.assignedAt)}</p>
                )}
              </div>
            </div>

            {!openRequest && !showForm && (
              <Button variant="outline" className="whitespace-nowrap" onClick={() => setShowForm(true)}>
                Yêu cầu đổi Sale
              </Button>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">Bạn chưa được gán nhân viên Sale phụ trách.</p>
        )}
      </section>

      {/* Form tạo yêu cầu */}
      {showForm && !openRequest && (
        <section className="rounded-2xl border border-gray-100 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-900">Tạo yêu cầu đổi Sale phụ trách</h4>
            <button type="button" className="text-gray-400 hover:text-gray-600" onClick={() => setShowForm(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">Lý do *</label>
              <select
                value={reasonOption}
                onChange={(e) => setReasonOption(e.target.value)}
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              >
                {REASON_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {reasonOption === 'Lý do khác' && (
                <input
                  type="text"
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  placeholder="Nhập lý do của bạn..."
                  className="mt-2 h-11 w-full rounded-xl border border-gray-200 px-4 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                />
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">Mô tả vấn đề *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Mô tả cụ thể vấn đề bạn gặp phải với Sale hiện tại..."
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">Sale mong muốn (không bắt buộc)</label>
              <select
                value={desiredSaleId}
                onChange={(e) => setDesiredSaleId(e.target.value)}
                className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
              >
                <option value="">— Để quản lý chỉ định —</option>
                {salesOptions
                  .filter((s) => s.id !== assignedSale?.salesStaffId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>{s.fullName}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-700">
                Ảnh bằng chứng (tối đa {MAX_FILES} ảnh)
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFilesChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-2.5 text-sm text-gray-600 transition hover:border-gray-900 hover:text-gray-900"
              >
                <Paperclip className="h-4 w-4" />
                Chọn ảnh
              </button>

              {files.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {files.map((file, index) => (
                    <div key={`${file.name}-${index}`} className="relative">
                      <img
                        src={URL.createObjectURL(file)}
                        alt={file.name}
                        className="h-16 w-16 rounded-lg border border-gray-200 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFiles(files.filter((_, i) => i !== index))}
                        className="absolute -right-1.5 -top-1.5 rounded-full bg-gray-900 p-0.5 text-white"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {formError && (
              <p className="flex items-center gap-1.5 text-sm text-red-600">
                <AlertCircle className="h-4 w-4" />
                {formError}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Hủy</Button>
              <Button type="submit" disabled={submitting} className="inline-flex items-center gap-2">
                <Send className="h-4 w-4" />
                {submitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
              </Button>
            </div>
          </form>
        </section>
      )}

      {/* Danh sách yêu cầu */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6">
        <h4 className="mb-4 text-sm font-semibold text-gray-900">Yêu cầu đổi Sale của bạn</h4>

        {requests.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">Bạn chưa có yêu cầu đổi Sale nào.</p>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="rounded-xl border border-gray-100 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className={`${statusBadge[request.status] ?? 'bg-gray-100 text-gray-700'} text-[10px] hover:opacity-100`}>
                        {statusLabel[request.status] ?? request.status}
                      </Badge>
                      <span className="text-xs text-gray-400">Gửi lúc {formatDate(request.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-gray-900">{request.reason}</p>
                    <p className="mt-1 text-sm text-gray-600">{request.problemDescription}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      Sale hiện tại: <span className="font-medium">{request.currentSalesStaffName}</span>
                      {request.desiredSalesStaffName && (
                        <> · Sale mong muốn: <span className="font-medium">{request.desiredSalesStaffName}</span></>
                      )}
                      {request.newSalesStaffName && (
                        <> · Sale mới: <span className="font-medium text-green-700">{request.newSalesStaffName}</span></>
                      )}
                    </p>
                  </div>

                  {(request.status === 'Pending' || request.status === 'MoreInfoRequested') && (
                    <Button variant="outline" size="sm" onClick={() => handleCancel(request.id)}>
                      Hủy yêu cầu
                    </Button>
                  )}
                </div>

                {request.evidenceUrls?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {request.evidenceUrls.map((url) => (
                      <a key={url} href={url} target="_blank" rel="noreferrer">
                        <img src={url} alt="Bằng chứng" className="h-14 w-14 rounded-lg border border-gray-200 object-cover" />
                      </a>
                    ))}
                  </div>
                )}

                {request.managerNote && (
                  <div className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                    <span className="font-medium">Phản hồi từ quản lý:</span> {request.managerNote}
                  </div>
                )}

                {request.customerAdditionalInfo && (
                  <div className="mt-2 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">
                    <span className="font-medium">Thông tin bạn đã bổ sung:</span> {request.customerAdditionalInfo}
                  </div>
                )}

                {request.status === 'MoreInfoRequested' && (
                  <div className="mt-3 space-y-2">
                    <textarea
                      value={additionalInfo}
                      onChange={(e) => setAdditionalInfo(e.target.value)}
                      rows={3}
                      placeholder="Nhập thông tin bổ sung theo yêu cầu của quản lý..."
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                    />
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        disabled={additionalSubmitting || !additionalInfo.trim()}
                        onClick={() => handleSubmitAdditionalInfo(request.id)}
                      >
                        {additionalSubmitting ? 'Đang gửi...' : 'Gửi bổ sung'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
