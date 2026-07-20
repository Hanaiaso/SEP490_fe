import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  AlertCircle,
  Banknote,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Edit2,
  FileText,
  Mail,
  MapPin,
  Package,
  Plus,
  Truck,
  XCircle,
  Home,
  Download,
  Search,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AddressModal, { buildFullAddress, emptyAddressForm } from '../components/AddressModal.jsx'
import Footer from '../components/Footer.jsx'
import Header from '../components/Header.jsx'

export function getDisplayAddress(addr) {
  if (!addr) return '—'
  if (addr.fullAddress && addr.fullAddress.trim()) return addr.fullAddress
  if (addr.address && addr.address.trim()) return addr.address
  const parts = [addr.addressLine, addr.ward, addr.district, addr.city].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : '—'
}
import SuccessToast from '../components/SuccessToast.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { useCart } from '../context/CartContext.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getAddresses, createAddress, updateAddress, setDefaultAddress } from '../services/userService.js'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

// ── Helpers ─────────────────────────────────────────────────────────────────
function formatPrice(n) {
  return new Intl.NumberFormat('vi-VN').format(n || 0)
}

function numberToVietnameseWords(amount) {
  if (!amount || amount === 0) return 'Không đồng'
  const units = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ']
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']

  function readGroup3(n, showZeroHundred) {
    const hundred = Math.floor(n / 100)
    const ten = Math.floor((n % 100) / 10)
    const unit = n % 10
    let res = ''
    if (hundred > 0 || showZeroHundred) res += digits[hundred] + ' trăm '
    if (ten > 0) {
      if (ten === 1) res += 'mười '
      else res += digits[ten] + ' mươi '
    } else if (hundred > 0 && unit > 0) {
      res += 'lẻ '
    }
    if (unit > 0) {
      if (unit === 1 && ten > 1) res += 'mốt'
      else if (unit === 5 && ten > 0) res += 'lăm'
      else res += digits[unit]
    }
    return res.trim()
  }

  let strAmount = Math.floor(amount).toString()
  let groups = []
  while (strAmount.length > 0) {
    groups.push(strAmount.substring(Math.max(0, strAmount.length - 3)))
    strAmount = strAmount.substring(0, Math.max(0, strAmount.length - 3))
  }

  let resultStr = ''
  for (let i = groups.length - 1; i >= 0; i--) {
    const groupVal = parseInt(groups[i], 10)
    if (groupVal > 0) {
      const showZeroHundred = i < groups.length - 1
      resultStr += readGroup3(groupVal, showZeroHundred) + units[i] + ' '
    }
  }
  resultStr = resultStr.trim()
  if (!resultStr) return 'Không đồng'
  return resultStr.charAt(0).toUpperCase() + resultStr.slice(1) + ' đồng chẵn.'
}

function getAutomaticDiscount(total) {
  if (total >= 100000000) return 0
  if (total >= 50000000) return 0.1
  if (total >= 10000000) return 0.07
  return 0
}

function getFormatDate() {
  const d = new Date()
  return `Ngày ${String(d.getDate()).padStart(2, '0')} tháng ${String(d.getMonth() + 1).padStart(2, '0')} năm ${d.getFullYear()}`
}

// ── Steps config ─────────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Địa chỉ giao hàng', icon: MapPin },
  { label: 'Xác nhận hóa đơn', icon: FileText },
  { label: 'Phương thức TT', icon: CreditCard },
  { label: 'Hoàn tất', icon: CheckCircle2 },
]

const defaultVatInfo = { taxCode: '', companyName: '', companyAddress: '', invoiceEmail: '' }

// ── Invoice Preview Component (identical template to POS) ─────────────────────
function InvoicePreview({ cartProducts, selectedAddress, discountRate, discountAmount, vatRequested, subtotal, total, vat, paymentMethod, orderCode, isPaid, customerName, customerPhone, profileFull }) {
  const minRows = 10
  const blankRowsCount = Math.max(0, minRows - cartProducts.length)
  const blankRows = Array.from({ length: blankRowsCount })

  return (
    <div
      className="relative overflow-hidden flex flex-col shrink-0"
      style={{
        width: '148mm',
        minHeight: '210mm',
        fontFamily: '"Times New Roman", Times, serif',
        color: '#000',
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        padding: '1.5rem',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
      }}
    >
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ fontSize: '10px', lineHeight: '1.6' }}>
          <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#1e3a5f' }}>CÔNG TY TNHH VIỆT TIẾN</div>
          <div>Địa chỉ: Số 5, Đường Lê Lợi, TP. Thái Bình</div>
          <div>Tel: 0227 3 123 456 | MST: 1000123456</div>
        </div>
        {orderCode && (
          <div style={{ textAlign: 'right', fontSize: '9px', color: '#64748b' }}>
            <div style={{ fontWeight: 'bold', color: '#1e3a5f' }}>Số: {orderCode}</div>
            <div>{new Date().toLocaleDateString('vi-VN')}</div>
          </div>
        )}
      </div>

      {/* DIVIDER */}
      <div style={{ borderTop: '2px solid #1e3a5f', marginBottom: '6px' }} />

      {/* TITLE */}
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0 }}>
          Phiếu Xác Nhận Đơn Hàng
        </h1>
        <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>
          (Xác nhận nội bộ — Không phải hóa đơn VAT nhà nước)
        </div>
        {isPaid && paymentMethod === 'sepay' && (
          <div style={{
            marginTop: '6px',
            padding: '4px 12px',
            backgroundColor: '#dcfce7',
            border: '2px solid #16a34a',
            borderRadius: '4px',
            color: '#15803d',
            fontWeight: 'bold',
            fontSize: '11px',
            letterSpacing: '0.05em',
          }}>
            ✓ ĐÃ THANH TOÁN CHUYỂN KHOẢN — KHÔNG THU THÊM TIỀN MẶT
          </div>
        )}
        {paymentMethod === 'cod' && isPaid && (
          <div style={{ marginTop: '4px', fontSize: '9px', color: '#64748b' }}>
            Hình thức: Thanh toán khi nhận hàng (COD)
          </div>
        )}
      </div>

      {/* CUSTOMER INFO */}
      <div style={{ fontSize: '11px', lineHeight: '1.8', marginBottom: '10px' }}>
        <div style={{ display: 'flex' }}>
          <span style={{ whiteSpace: 'nowrap' }}>Tên khách hàng:&nbsp;</span>
          <span style={{ borderBottom: '1px dotted black', flex: 1, fontWeight: 'bold' }}>
            {customerName || selectedAddress?.name || ''}
          </span>
        </div>
        <div style={{ display: 'flex' }}>
          <span style={{ whiteSpace: 'nowrap' }}>Địa chỉ giao hàng:&nbsp;</span>
          <span style={{ borderBottom: '1px dotted black', flex: 1 }}>
            {getDisplayAddress(selectedAddress)}
          </span>
        </div>
        {(customerPhone || selectedAddress?.phone) && (
          <div style={{ display: 'flex' }}>
            <span style={{ whiteSpace: 'nowrap' }}>Số điện thoại:&nbsp;</span>
            <span style={{ borderBottom: '1px dotted black', flex: 1 }}>
              {customerPhone || selectedAddress?.phone}
            </span>
          </div>
        )}
      </div>

      {/* PRODUCTS TABLE */}
      <div style={{ flex: 1, marginBottom: '10px' }}>
        <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold', textAlign: 'center', fontSize: '10px' }}>
              <th style={{ border: '1px solid black', padding: '4px 6px', width: '40%' }}>Tên sản phẩm</th>
              <th style={{ border: '1px solid black', padding: '4px 6px', width: '8%' }}>ĐVT</th>
              <th style={{ border: '1px solid black', padding: '4px 6px', width: '10%' }}>SL</th>
              <th style={{ border: '1px solid black', padding: '4px 6px', width: '20%' }}>Đơn giá</th>
              <th style={{ border: '1px solid black', padding: '4px 6px', width: '22%' }}>Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {cartProducts.map((item, idx) => (
              <tr key={item.productId || idx}>
                <td style={{ border: '1px solid black', padding: '3px 6px', fontWeight: 'bold', verticalAlign: 'middle' }}>
                  {item.product?.name || item.productName || ''}
                </td>
                <td style={{ border: '1px solid black', padding: '3px 6px', textAlign: 'center', verticalAlign: 'middle' }}>Cuộn</td>
                <td style={{ border: '1px solid black', padding: '3px 6px', textAlign: 'center', verticalAlign: 'middle' }}>{item.quantity}</td>
                <td style={{ border: '1px solid black', padding: '3px 6px', textAlign: 'right', verticalAlign: 'middle' }}>
                  {formatPrice(item.product?.price || item.unitPrice || 0)}
                </td>
                <td style={{ border: '1px solid black', padding: '3px 6px', textAlign: 'right', fontWeight: 'bold', verticalAlign: 'middle' }}>
                  {formatPrice((item.product?.price || item.unitPrice || 0) * item.quantity)}
                </td>
              </tr>
            ))}
            {blankRows.map((_, idx) => (
              <tr key={`blank-${idx}`} style={{ height: '20px' }}>
                <td style={{ border: '1px solid black' }}>&nbsp;</td>
                <td style={{ border: '1px solid black' }}>&nbsp;</td>
                <td style={{ border: '1px solid black' }}>&nbsp;</td>
                <td style={{ border: '1px solid black' }}>&nbsp;</td>
                <td style={{ border: '1px solid black' }}>&nbsp;</td>
              </tr>
            ))}
            {/* Subtotal */}
            <tr>
              <td colSpan={4} style={{ border: '1px solid black', padding: '4px 6px', fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: '#f8fafc' }}>
                Cộng
              </td>
              <td style={{ border: '1px solid black', padding: '4px 6px', textAlign: 'right', fontWeight: 'bold', color: '#dc2626', backgroundColor: '#f8fafc' }}>
                {formatPrice(subtotal)}
              </td>
            </tr>
            {/* Discount */}
            {discountAmount > 0 && (
              <tr>
                <td colSpan={4} style={{ border: '1px solid black', padding: '3px 6px', textAlign: 'right', fontSize: '10px', color: '#64748b' }}>
                  Chiết khấu ({Math.round(discountRate * 100)}%)
                </td>
                <td style={{ border: '1px solid black', padding: '3px 6px', textAlign: 'right', color: '#64748b' }}>
                  -{formatPrice(discountAmount)}
                </td>
              </tr>
            )}
            {/* VAT */}
            {vatRequested && vat > 0 && (
              <tr>
                <td colSpan={4} style={{ border: '1px solid black', padding: '3px 6px', textAlign: 'right', fontSize: '10px', color: '#64748b' }}>
                  Thuế VAT (10%)
                </td>
                <td style={{ border: '1px solid black', padding: '3px 6px', textAlign: 'right', color: '#64748b' }}>
                  +{formatPrice(vat)}
                </td>
              </tr>
            )}
            {/* Total */}
            <tr style={{ backgroundColor: '#eff6ff' }}>
              <td colSpan={4} style={{ border: '1px solid black', padding: '5px 6px', fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Tổng thanh toán
              </td>
              <td style={{ border: '1px solid black', padding: '5px 6px', textAlign: 'right', fontWeight: 'bold', fontSize: '13px', color: '#b91c1c' }}>
                {formatPrice(total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* IN WORDS */}
      <div style={{ fontSize: '11px', lineHeight: '1.6', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start' }}>
          <span style={{ whiteSpace: 'nowrap' }}>Thành tiền viết thành chữ:&nbsp;</span>
          <span style={{ flex: 1, fontWeight: 'bold', fontStyle: 'italic' }}>
            {numberToVietnameseWords(total)}
          </span>
        </div>
      </div>

      {/* BANK INFO */}
      <div style={{ fontSize: '10px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '6px 10px', marginBottom: '10px' }}>
        <div style={{ fontWeight: 'bold', color: '#1e3a5f', marginBottom: '2px' }}>Thông tin tài khoản công ty:</div>
        <div>Ngân hàng TP Bank | STK: 71111810204 | Chủ TK: CONG TY VIET TIEN</div>
      </div>

      {/* DATE + SIGNATURES */}
      <div style={{ fontSize: '11px' }}>
        <div style={{ textAlign: 'right', fontStyle: 'italic', fontWeight: '500', marginBottom: '8px' }}>
          {getFormatDate()}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center', fontWeight: 'bold', fontSize: '11px', gap: '8px' }}>
          <div>
            <div>Người nhận hàng</div>
            <div style={{ fontSize: '9px', fontWeight: 'normal', color: '#94a3b8', marginTop: '2px' }}>(Ký, ghi rõ họ tên)</div>
            <div style={{ height: '40px' }} />
          </div>
          <div>
            <div>Người bán hàng</div>
            <div style={{ fontSize: '9px', fontWeight: 'normal', color: '#94a3b8', marginTop: '2px' }}>(Ký, ghi rõ họ tên)</div>
            <div style={{ height: '40px' }} />
          </div>
          <div>
            <div>Người giao hàng</div>
            <div style={{ fontSize: '9px', fontWeight: 'normal', color: '#94a3b8', marginTop: '2px' }}>(Ký, ghi rõ họ tên)</div>
            <div style={{ height: '40px' }} />
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ borderTop: '1px solid #e2e8f0', marginTop: '8px', paddingTop: '4px', textAlign: 'center', fontSize: '8px', color: '#94a3b8' }}>
        Phiếu được xuất bởi Hệ thống Quản lý Việt Tiến | viettien.vn
      </div>
    </div>
  )
}

// ── Main Checkout Component ───────────────────────────────────────────────────
export default function Checkout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { clearCart } = useCart()
  const { user } = useAuth()

  const sourceCart = Array.isArray(location.state?.cartItems) && location.state.cartItems.length > 0
    ? location.state.cartItems
    : []

  // ── Steps ──────────────────────────────────────────────────────────────────
  const [currentStep, setCurrentStep] = useState(0) // 0=Address 1=Invoice 2=Payment 3=Done

  // ── Address ────────────────────────────────────────────────────────────────
  const [addresses, setAddresses] = useState([])
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [showAddressModal, setShowAddressModal] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState(null)
  const [addressForm, setAddressForm] = useState(emptyAddressForm)

  // ── Profile ────────────────────────────────────────────────────────────────
  const [profileFull, setProfileFull] = useState(null)
  const [vatRequested, setVatRequested] = useState(false)
  const [vatInfo, setVatInfo] = useState(defaultVatInfo)
  const [vatForm, setVatForm] = useState(defaultVatInfo)
  const [isEditingVat, setIsEditingVat] = useState(false)
  const [searchingMst, setSearchingMst] = useState(false)

  // ── Payment ────────────────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState('cod')

  // ── Order result ───────────────────────────────────────────────────────────
  const [createdOrder, setCreatedOrder] = useState(null)
  const [qrDetails, setQrDetails] = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [sepayPaid, setSepayPaid] = useState(false)
  const [showSuccessScreen, setShowSuccessScreen] = useState(false)
  const [countdown, setCountdown] = useState(5)

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [successToast, setSuccessToast] = useState(null)
  const invoiceRef = useRef(null)
  const uploadInvoiceRef = useRef(null)

  // ── Fetch profile & addresses ─────────────────────────────────────────────
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/customer-profile', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        })
        let profile = null
        if (res.ok) {
          const data = await res.json()
          profile = data
          setProfileFull(data)
          const mappedInfo = {
            taxCode: data.taxCode || '',
            companyName: data.companyName || '',
            companyAddress: data.companyAddress || '',
            invoiceEmail: data.invoiceEmail || '',
          }
          setVatInfo(mappedInfo)
          setVatForm(mappedInfo)
        }

        // Tải danh sách địa chỉ thật từ API
        try {
          const list = await getAddresses()
          if (list && list.length > 0) {
            setAddresses(list)
            const defaultAddr = list.find(a => a.isDefault) || list[0]
            setSelectedAddressId(defaultAddr.id)
          } else if (profile?.companyAddress || profile?.representative) {
            // Fallback nếu chưa có địa chỉ lưu, tạo địa chỉ tạm từ profile
            const profileAddr = {
              id: 'profile-default',
              name: profile.representative || profile.companyName || 'Công ty',
              phone: profile.companyPhone || '',
              city: '',
              district: '',
              ward: '',
              addressLine: profile.companyAddress || '',
              address: profile.companyAddress || '',
              type: 'Công ty',
              isDefault: true,
            }
            setAddresses([profileAddr])
            setSelectedAddressId('profile-default')
          }
        } catch (addrErr) {
          console.error('Lỗi khi tải danh sách địa chỉ:', addrErr)
        }
      } catch (err) {
        console.error('Error loading profile:', err)
      }
    }
    loadData()
  }, [])

  // ── Cart products ──────────────────────────────────────────────────────────
  const cartProducts = useMemo(() => {
    if (!sourceCart.length) return []
    return sourceCart.map((item) => ({
      ...item,
      product: {
        id: item.productId,
        name: item.productName,
        image: item.imageUrl || `https://placehold.co/600x600/f3f4f6/9ca3af?text=${encodeURIComponent(item.productName || 'SP')}`,
        price: item.unitPrice,
        category: 'Sản phẩm',
      },
    }))
  }, [sourceCart])

  // ── Calculations ───────────────────────────────────────────────────────────
  const subtotal = useMemo(() => cartProducts.reduce((s, i) => s + (i.product?.price || 0) * i.quantity, 0), [cartProducts])
  const discountRate = getAutomaticDiscount(subtotal)
  const discountAmount = Math.round(subtotal * discountRate)
  const afterDiscount = subtotal - discountAmount
  const vat = vatRequested ? Math.round(afterDiscount * 0.1) : 0
  const total = afterDiscount + vat
  const availableCredit = profileFull?.availableCredit || 0
  const creditApplied = Math.min(total, availableCredit)
  const finalPayment = total - creditApplied
  const selectedAddress = addresses.find((a) => a.id === selectedAddressId)

  // ── Countdown after success ────────────────────────────────────────────────
  useEffect(() => {
    if (!showSuccessScreen) return
    setCountdown(5)
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval)
          navigate('/')
          return 0
        }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [showSuccessScreen, navigate])

  // ── Poll SePay payment status ──────────────────────────────────────────────
  useEffect(() => {
    if (!createdOrder || paymentMethod !== 'sepay' || sepayPaid) return
    let isMounted = true
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch(`/api/orders/${createdOrder.orderId}/payment-status`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
        })
        if (res.ok && isMounted) {
          const data = await res.json()
          if (data.status === 'Paid') {
            setSepayPaid(true)
          }
        }
      } catch (err) {
        console.error('Error polling payment status:', err)
      }
    }, 3000)
    return () => { isMounted = false; clearInterval(intervalId) }
  }, [createdOrder, paymentMethod, sepayPaid])

  // ── Transition to success screen after SePay paid ───────────────────────────
  useEffect(() => {
    if (!sepayPaid) return
    const timer = setTimeout(() => {
      setShowSuccessScreen(true)
    }, 800)
    return () => clearTimeout(timer)
  }, [sepayPaid])

  // ── Auto-upload PDF when order is created ──────────────────────────────────
  useEffect(() => {
    if (!createdOrder) return
    const run = async () => {
      // Wait a short delay to make sure the element is mounted in the DOM
      await new Promise((resolve) => setTimeout(resolve, 800))
      await generateAndUploadPdf(createdOrder.orderId, createdOrder.orderCode)
    }
    run()
  }, [createdOrder])

  function showSuccess(message) {
    setSuccessToast({ id: Date.now(), message })
  }

  // ── PDF Generation ─────────────────────────────────────────────────────────
  async function generateAndDownloadPdf() {
    if (!uploadInvoiceRef.current) return
    try {
      const canvas = await html2canvas(uploadInvoiceRef.current, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
      pdf.addImage(imgData, 'JPEG', 0, 0, 148, 210)
      const code = createdOrder?.orderCode || Date.now()
      pdf.save(`HoaDon_VietTien_${code}.pdf`)
    } catch (err) {
      console.error('PDF error:', err)
      alert('Không thể xuất PDF. Vui lòng thử lại.')
    }
  }

  // ── Generate and Upload PDF Invoice to Backend ─────────────────────────────
  async function generateAndUploadPdf(orderId, orderCode) {
    if (!uploadInvoiceRef.current) return
    try {
      const canvas = await html2canvas(uploadInvoiceRef.current, { scale: 2, useCORS: true })
      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
      pdf.addImage(imgData, 'JPEG', 0, 0, 148, 210)
      const pdfBase64 = pdf.output('datauristring')

      const res = await fetch(`/api/orders/${orderId}/upload-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({ pdfBase64 }),
      })
      if (!res.ok) {
        console.error('Failed to upload PDF invoice to server')
      }
    } catch (err) {
      console.error('Error generating/uploading PDF:', err)
    }
  }

  // ── Confirm order ──────────────────────────────────────────────────────────
  async function handleConfirmOrder() {
    setIsProcessing(true)
    try {
      // Nếu địa chỉ được chọn chưa phải là mặc định (và là địa chỉ thật lưu trong DB, không phải 'profile-default'), 
      // set làm default trước khi đặt hàng để backend có thể tự lấy đúng địa chỉ này mà không cần sửa bảng Order.
      const selectedAddrObj = addresses.find(a => a.id === selectedAddressId)
      if (selectedAddrObj && !selectedAddrObj.isDefault && selectedAddressId !== 'profile-default') {
        try {
          await setDefaultAddress(selectedAddressId)
          // Đặt lại state local để UI khớp
          setAddresses(prev => prev.map(a => ({ ...a, isDefault: a.id === selectedAddressId })))
        } catch (setDefaultErr) {
          console.error("Lỗi khi cập nhật địa chỉ mặc định, vẫn tiếp tục đặt hàng:", setDefaultErr)
        }
      }

      const res = await fetch('/api/orders/place-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          addressId: selectedAddressId === 'profile-default' ? null : selectedAddressId,
          paymentMethod: paymentMethod === 'sepay' ? 'SePay' : 'COD',
          notes: '',
          requiresRedInvoice: vatRequested,
        }),
      })

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.message || 'Lỗi khi tạo đơn hàng')
      }

      const orderData = await res.json()
      setCreatedOrder(orderData)
      await clearCart().catch(() => {})

      // Generate & upload PDF in the background after setting createdOrder
      setTimeout(async () => {
        await generateAndUploadPdf(orderData.orderId, orderData.orderCode)
      }, 500)

      if (paymentMethod === 'sepay') {
        // Fetch QR
        try {
          const qrRes = await fetch(`/api/orders/${orderData.orderId}/sepay-qr`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
          })
          if (qrRes.ok) setQrDetails(await qrRes.json())
        } catch (err) { console.error('QR fetch error:', err) }
        setCurrentStep(3)
      } else {
        // COD
        setCurrentStep(3)
        setTimeout(() => setShowSuccessScreen(true), 400)
        showSuccess('Đặt đơn hàng thành công!')
      }
    } catch (err) {
      alert(err.message || 'Có lỗi xảy ra khi tạo đơn hàng')
    } finally {
      setIsProcessing(false)
    }
  }

  // ── Address modal helpers ──────────────────────────────────────────────────
  function openCreateAddressModal() {
    setEditingAddressId(null)
    setAddressForm({ ...emptyAddressForm })
    setShowAddressModal(true)
  }

  function openEditAddressModal(addr) {
    setEditingAddressId(addr.id)
    setAddressForm({
      id: addr.id,
      name: addr.name,
      phone: addr.phone,
      city: addr.city,
      district: addr.district,
      ward: addr.ward || '',
      addressLine: addr.addressLine,
      type: addr.type,
      isDefault: addr.isDefault,
      provinceCode: addr.provinceCode || '',
      districtCode: addr.districtCode || '',
      wardCode: addr.wardCode || '',
      latitude: addr.latitude || null,
      longitude: addr.longitude || null,
    })
    setShowAddressModal(true)
  }

  function closeAddressModal() {
    setShowAddressModal(false)
    setEditingAddressId(null)
    setAddressForm({ ...emptyAddressForm })
  }

  function handleAddressFormChange(key, value) {
    setAddressForm((cur) => ({ ...cur, [key]: value }))
  }

  async function handleAddAddress(event) {
    event.preventDefault()
    
    const payload = {
      name: addressForm.name,
      phone: addressForm.phone,
      city: addressForm.city,
      district: addressForm.district,
      ward: addressForm.ward || '',
      addressLine: addressForm.addressLine,
      type: addressForm.type || 'Nhà riêng',
      isDefault: addressForm.isDefault,
      provinceCode: addressForm.provinceCode || undefined,
      districtCode: addressForm.districtCode || undefined,
      wardCode: addressForm.wardCode || undefined,
      latitude: addressForm.latitude || undefined,
      longitude: addressForm.longitude || undefined,
    }

    try {
      if (editingAddressId) {
        const updated = await updateAddress(editingAddressId, payload)
        setAddresses((items) => {
          if (updated.isDefault) {
            return items.map((item) =>
              item.id === editingAddressId ? updated : { ...item, isDefault: false }
            )
          }
          return items.map((item) => (item.id === editingAddressId ? updated : item))
        })
      } else {
        const created = await createAddress(payload)
        setAddresses((items) => {
          if (created.isDefault) {
            return [...items.map((item) => ({ ...item, isDefault: false })), created]
          }
          return [...items, created]
        })
        setSelectedAddressId(created.id)
      }
      closeAddressModal()
      showSuccess('Lưu địa chỉ thành công')
    } catch (err) {
      alert(err.message || 'Lỗi khi lưu địa chỉ')
    }
  }

  // ── Guard: no cart items ───────────────────────────────────────────────────
  if (sourceCart.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="flex min-h-[60vh] items-center justify-center pt-20">
          <div className="text-center">
            <Package className="mx-auto mb-6 h-20 w-20 text-gray-300" />
            <h2 className="mb-4 text-3xl font-bold text-gray-900">Giỏ hàng trống</h2>
            <p className="mb-8 text-gray-600">Vui lòng thêm sản phẩm trước khi thanh toán.</p>
            <Link to="/products">
              <Button size="lg" className="rounded-full bg-gray-900 hover:bg-gray-800 text-white">
                Tiếp tục mua sắm
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  // ── Success screen ─────────────────────────────────────────────────────────
  if (showSuccessScreen && createdOrder) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <AnimatePresence>
          {successToast && (
            <SuccessToast key={successToast.id} message={successToast.message} onClose={() => setSuccessToast(null)} />
          )}
        </AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex min-h-[90vh] items-center justify-center pt-20 px-6"
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            className="max-w-lg w-full text-center"
          >
            {/* Icon */}
            <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-green-100">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>

            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {paymentMethod === 'sepay' ? 'Thanh toán thành công!' : 'Đặt hàng thành công!'}
            </h1>
            <p className="text-gray-500 mb-2">
              {paymentMethod === 'sepay'
                ? 'Chuyển khoản đã được xác nhận. Hóa đơn đã được gửi qua email.'
                : 'Đơn hàng đã được tiếp nhận. Nhân viên sẽ liên hệ sớm nhất.'}
            </p>

            {/* Email notice */}
            <div className="flex items-center justify-center gap-2 mb-6 text-sm text-green-700 bg-green-50 rounded-full px-4 py-2 w-fit mx-auto">
              <Mail className="w-4 h-4" />
              <span>Email xác nhận đã được gửi tới hộp thư của bạn</span>
            </div>

            {/* Order summary card */}
            <div className="bg-gray-50 rounded-2xl p-6 text-left mb-6 border border-gray-100">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-gray-900">Tóm tắt đơn hàng</h2>
                <span className="text-sm font-mono font-bold text-blue-900 bg-blue-50 px-3 py-1 rounded-full">
                  {createdOrder.orderCode}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                {cartProducts.slice(0, 4).map((item) => (
                  <div key={item.productId} className="flex justify-between text-gray-600">
                    <span className="truncate max-w-[200px]">{item.product?.name} x{item.quantity}</span>
                    <span className="font-medium">{formatPrice((item.product?.price || 0) * item.quantity)}</span>
                  </div>
                ))}
                {cartProducts.length > 4 && (
                  <p className="text-xs text-gray-400">+{cartProducts.length - 4} sản phẩm khác</p>
                )}
                <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between font-bold text-gray-900">
                  <span>Tổng cộng</span>
                  <span className="text-blue-900">{formatPrice(total)}</span>
                </div>
              </div>
            </div>

            {/* Invoice preview hidden for PDF generation */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
              <div ref={uploadInvoiceRef}>
                <InvoicePreview
                  cartProducts={cartProducts}
                  selectedAddress={selectedAddress}
                  discountRate={discountRate}
                  discountAmount={discountAmount}
                  vatRequested={vatRequested}
                  subtotal={subtotal}
                  total={total}
                  vat={vat}
                  paymentMethod={paymentMethod}
                  orderCode={createdOrder.orderCode}
                  isPaid={true}
                  customerName={profileFull?.representative || profileFull?.companyName || ''}
                  customerPhone={profileFull?.companyPhone || ''}
                  profileFull={profileFull}
                />
              </div>
            </div>

            {/* Countdown */}
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-2">
                Tự động về trang chủ sau <span className="font-bold text-gray-900">{countdown}</span> giây...
              </p>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-green-500 rounded-full"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3">
              <Button
                size="lg"
                className="w-full rounded-full bg-gray-900 text-white hover:bg-gray-800"
                onClick={generateAndDownloadPdf}
              >
                <Download className="mr-2 h-4 w-4" />
                Tải hóa đơn PDF
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="w-full rounded-full"
                onClick={() => navigate('/')}
              >
                <Home className="mr-2 h-4 w-4" />
                Về trang chủ ngay
              </Button>
            </div>
          </motion.div>
        </motion.div>
        <Footer />
      </div>
    )
  }

  // ── STEP 3: SePay QR waiting ───────────────────────────────────────────────
  if (currentStep === 3 && paymentMethod === 'sepay' && createdOrder) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <AnimatePresence>
          {successToast && (
            <SuccessToast key={successToast.id} message={successToast.message} onClose={() => setSuccessToast(null)} />
          )}
        </AnimatePresence>
        <div className="flex min-h-[90vh] items-center justify-center pt-20 px-6">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md w-full"
          >
            <div className="rounded-[1.75rem] border border-gray-100 bg-white p-8 shadow-xl text-center">
              {sepayPaid ? (
                <div className="py-6 flex flex-col items-center gap-4">
                  <div className="h-20 w-20 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                    <Check className="h-10 w-10 stroke-[3]" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Thanh toán thành công!</h3>
                  <p className="text-sm text-gray-500">
                    Đơn hàng đã được xác nhận. Hóa đơn gửi qua email.
                  </p>
                  <p className="text-xs text-gray-400 animate-pulse mt-2">
                    Đang chuyển đến màn hình hoàn tất...
                  </p>
                </div>
              ) : (
                <>
                  <h3 className="text-xl font-bold text-gray-900 mb-1 text-left">
                    Thanh toán chuyển khoản SePay
                  </h3>
                  <p className="text-xs text-gray-500 mb-4 text-left">
                    Mở App Ngân hàng bất kỳ để quét mã VietQR bên dưới
                  </p>

                  <div className="bg-gray-50 rounded-2xl p-4 flex flex-col items-center mb-4">
                    {qrDetails ? (
                      <img
                        src={qrDetails.QrImageUrl || qrDetails.qrImageUrl}
                        alt="SePay QR"
                        className="w-56 h-56 object-contain bg-white rounded-lg p-2 border border-gray-100 shadow-sm"
                      />
                    ) : (
                      <div className="w-56 h-56 flex items-center justify-center bg-gray-100 rounded-lg">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
                      </div>
                    )}
                    {qrDetails?.transferContent && (
                      <div className="mt-3 text-center space-y-1">
                        <p className="text-xs text-gray-400 font-medium">NỘI DUNG CHUYỂN KHOẢN (BẮT BUỘC)</p>
                        <div className="bg-blue-50 text-blue-900 font-bold px-4 py-1.5 rounded-full text-sm inline-block select-all border border-blue-100 uppercase tracking-wider">
                          {qrDetails.transferContent}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-left bg-gray-50 rounded-2xl p-4 mb-5 text-sm text-gray-600 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Số tiền:</span>
                      <span className="font-bold text-gray-900">{formatPrice(createdOrder.finalPayment || total)} đ</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Ngân hàng:</span>
                      <span className="font-medium text-gray-900">TP Bank</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Số tài khoản:</span>
                      <span className="font-medium text-gray-900">71111810204</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Chủ tài khoản:</span>
                      <span className="font-medium text-gray-900">CONG TY VIET TIEN</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mb-6 font-semibold animate-pulse">
                    <Clock className="w-4 h-4 text-blue-600 animate-spin" />
                    <span>Đang chờ bạn chuyển khoản...</span>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full rounded-full h-11 border-gray-200"
                    onClick={() => navigate('/profile')}
                  >
                    Thanh toán sau / Về trang cá nhân
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </div>

        {/* Hidden InvoicePreview for PDF upload generation */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0, pointerEvents: 'none' }}>
          <div ref={uploadInvoiceRef}>
            <InvoicePreview
              cartProducts={cartProducts}
              selectedAddress={selectedAddress}
              discountRate={discountRate}
              discountAmount={discountAmount}
              vatRequested={vatRequested}
              subtotal={subtotal}
              total={total}
              vat={vat}
              paymentMethod={paymentMethod}
              orderCode={createdOrder.orderCode}
              isPaid={true}
              customerName={profileFull?.representative || profileFull?.companyName || ''}
              customerPhone={profileFull?.companyPhone || ''}
              profileFull={profileFull}
            />
          </div>
        </div>

        <Footer />
      </div>
    )
  }

  // ── Main checkout UI (steps 0–2) ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      <Header />

      <AnimatePresence>
        {successToast && (
          <SuccessToast key={successToast.id} message={successToast.message} onClose={() => setSuccessToast(null)} />
        )}
      </AnimatePresence>

      <div className="pt-20">
        {/* Breadcrumb */}
        <div className="border-b border-gray-100">
          <div className="mx-auto max-w-7xl px-6 py-4 lg:px-8">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Link to="/" className="hover:text-gray-900">Trang chủ</Link>
              <ChevronRight className="h-4 w-4" />
              <Link to="/cart" className="hover:text-gray-900">Giỏ Hàng</Link>
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium text-gray-900">Đặt hàng</span>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <h1 className="mb-8 text-3xl font-bold text-gray-900">Xác nhận đơn hàng</h1>

          {/* Step indicator */}
          <div className="mb-10 overflow-x-auto">
            <div className="flex min-w-max items-center gap-0">
              {STEPS.map((step, index) => {
                const Icon = step.icon
                const done = index < currentStep
                const active = index === currentStep
                return (
                  <div key={step.label} className="flex items-center">
                    <div className="flex flex-col items-center gap-1">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                          done ? 'bg-gray-900 text-white' : active ? 'bg-gray-200 text-gray-900 ring-2 ring-gray-900' : 'bg-gray-100 text-gray-400'
                        }`}
                      >
                        {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </div>
                      <span className={`max-w-[84px] text-center text-[11px] leading-tight ${active ? 'font-medium text-gray-900' : done ? 'text-gray-600' : 'text-gray-400'}`}>
                        {step.label}
                      </span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className={`mx-1 mb-5 h-[2px] w-12 ${index < currentStep ? 'bg-gray-900' : 'bg-gray-200'}`} />
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── STEP 0: Address ─────────────────────────────────────────────── */}
          {currentStep === 0 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 gap-10 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <section className="rounded-[1.5rem] border border-gray-100 p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-gray-700" />
                      <h2 className="text-lg font-semibold text-gray-900">Địa chỉ giao hàng</h2>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-full text-xs" onClick={openCreateAddressModal}>
                      <Plus className="h-3 w-3" />
                      Thêm địa chỉ
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {addresses.length === 0 && (
                      <div className="rounded-[1.25rem] border-2 border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
                        Chưa có địa chỉ. Nhấn "Thêm địa chỉ" để thêm địa chỉ giao hàng.
                      </div>
                    )}
                    {addresses.map((addr) => (
                      <label
                        key={addr.id}
                        className={`flex gap-4 rounded-[1.25rem] border-2 p-4 cursor-pointer transition-colors ${
                          selectedAddressId === addr.id ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="address"
                          value={addr.id}
                          checked={selectedAddressId === addr.id}
                          onChange={() => setSelectedAddressId(addr.id)}
                          className="mt-1 accent-gray-900"
                        />
                        <div className="flex-1">
                          <div className="mb-1 flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-gray-900">{addr.name}</span>
                            <span className="text-sm text-gray-500">{addr.phone}</span>
                            <Badge className={`px-2.5 py-1 text-[11px] font-medium hover:opacity-90 ${
                              addr.type === 'Công ty' ? 'bg-blue-50 text-blue-700'
                              : addr.type === 'Nhà riêng' ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                            }`}>
                              {addr.type}
                            </Badge>
                            {addr.isDefault && <Badge className="bg-gray-900 text-[10px] text-white hover:bg-gray-900">Mặc định</Badge>}
                          </div>
                          <p className="text-sm font-medium text-gray-700 mt-1">{getDisplayAddress(addr)}</p>
                        </div>
                        <button type="button" onClick={() => openEditAddressModal(addr)} className="self-start text-gray-400 hover:text-gray-700">
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </label>
                    ))}
                  </div>
                </section>

                {/* VAT */}
                <section className="rounded-[1.5rem] border border-gray-100 p-6">
                  <div className="mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gray-700" />
                    <h2 className="text-lg font-semibold text-gray-900">Hóa đơn VAT</h2>
                  </div>
                  <label className="mb-4 flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={vatRequested}
                      onChange={(e) => { setVatRequested(e.target.checked); if (!e.target.checked) setIsEditingVat(false) }}
                      className="h-4 w-4 accent-gray-900"
                    />
                    <span className="text-sm font-medium text-gray-800">Yêu cầu hóa đơn VAT (10%)</span>
                  </label>
                  <AnimatePresence>
                    {vatRequested && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                        <div className="mb-3 space-y-3 rounded-[1.25rem] bg-gray-50 p-4">
                          {[['Mã số thuế', vatInfo.taxCode], ['Tên công ty', vatInfo.companyName], ['Địa chỉ công ty', vatInfo.companyAddress], ['Email nhận hóa đơn', vatInfo.invoiceEmail]].map(([label, value]) => (
                            <div key={label} className="flex gap-4">
                              <span className="w-36 flex-shrink-0 pt-0.5 text-xs text-gray-500">{label}</span>
                              <span className="text-sm font-medium text-gray-900">{value || '—'}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mb-3 flex items-start gap-2 text-xs text-gray-500">
                          <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                          <span>Khách có thể yêu cầu hóa đơn VAT tối đa 7 ngày sau khi giao hàng thành công.</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                          <Link to="/profile?tab=tax" target="_blank">
                            <Button variant="outline" size="sm" className="rounded-full text-xs gap-1.5 hover:bg-gray-100">
                              <Edit2 className="h-3 w-3" />
                              Cập nhật thông tin MST trong Hồ sơ
                              <ExternalLink className="h-3 w-3 text-gray-400" />
                            </Button>
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </section>
              </div>

              {/* Order summary sidebar */}
              <div>
                <div className="space-y-6 lg:sticky lg:top-24">
                  <section className="rounded-[1.75rem] border border-gray-100 bg-gray-50 p-8">
                    <h2 className="mb-6 text-2xl font-bold text-gray-900">Tóm tắt đơn hàng</h2>
                    <div className="mb-6 space-y-4">
                      <div className="flex justify-between text-gray-600">
                        <span>Tạm tính</span>
                        <span className="font-medium">{formatPrice(subtotal)}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Chiết khấu ({Math.round(discountRate * 100)}%)</span>
                          <span className="font-medium">-{formatPrice(discountAmount)}</span>
                        </div>
                      )}
                      {vatRequested && (
                        <div className="flex justify-between text-gray-600">
                          <span>VAT (10%)</span>
                          <span className="font-medium">+{formatPrice(vat)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-gray-600">
                        <span>Vận chuyển</span>
                        <span className="font-medium">Miễn phí</span>
                      </div>
                    </div>
                    <div className="mb-6 border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold text-gray-900">Tổng cộng</span>
                        <span className="text-2xl font-bold text-gray-900">{formatPrice(total)}</span>
                      </div>
                    </div>
                    <Button
                      size="lg"
                      className="w-full rounded-full bg-gray-900 text-white hover:bg-gray-800"
                      disabled={!selectedAddressId || addresses.length === 0}
                      onClick={() => setCurrentStep(1)}
                    >
                      Xem hóa đơn & Tiếp tục
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    {(!selectedAddressId || addresses.length === 0) && (
                      <p className="mt-2 text-center text-xs text-amber-600">Vui lòng thêm và chọn địa chỉ giao hàng</p>
                    )}
                  </section>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 1: Invoice Preview ──────────────────────────────────────── */}
          {currentStep === 1 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Hóa đơn xác nhận nội bộ</h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Vui lòng kiểm tra thông tin trước khi xác nhận. Sau khi đồng ý, giá sẽ được chốt và không thay đổi.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" className="rounded-full" onClick={() => setCurrentStep(0)}>
                    ← Quay lại
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={async () => {
                      if (!invoiceRef.current) return
                      try {
                        const canvas = await html2canvas(invoiceRef.current, { scale: 2, useCORS: true })
                        const imgData = canvas.toDataURL('image/jpeg', 0.95)
                        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
                        pdf.addImage(imgData, 'JPEG', 0, 0, 148, 210)
                        pdf.save(`HoaDon_Preview_VietTien.pdf`)
                      } catch (err) { alert('Không thể xuất PDF') }
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Tải PDF
                  </Button>
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-8 items-start">
                {/* Invoice preview */}
                <div className="flex-shrink-0 bg-gray-100 rounded-2xl p-6 flex justify-center" style={{ minWidth: '148mm' }}>
                  <div ref={invoiceRef}>
                    <InvoicePreview
                      cartProducts={cartProducts}
                      selectedAddress={selectedAddress}
                      discountRate={discountRate}
                      discountAmount={discountAmount}
                      vatRequested={vatRequested}
                      subtotal={subtotal}
                      total={total}
                      vat={vat}
                      paymentMethod={null}
                      orderCode={null}
                      isPaid={false}
                      customerName={profileFull?.representative || profileFull?.companyName || ''}
                      customerPhone={profileFull?.companyPhone || ''}
                      profileFull={profileFull}
                    />
                  </div>
                </div>

                {/* Side panel */}
                <div className="flex-1 space-y-6 lg:sticky lg:top-24">
                  <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 p-5">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-amber-800">
                        <p className="font-semibold mb-1">Lưu ý về giá (Price Snapshot)</p>
                        <p>Giá hiển thị trên hóa đơn này sẽ được chốt tại thời điểm bạn bấm <strong>"Đồng ý"</strong>. Mọi thay đổi giá sản phẩm sau này sẽ không ảnh hưởng đơn hàng của bạn.</p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-gray-100 bg-gray-50 p-6">
                    <h3 className="font-bold text-gray-900 mb-4">Thông tin giao hàng</h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span>{getDisplayAddress(selectedAddress)}</span>
                      </div>
                      {selectedAddress?.phone && (
                        <div className="flex gap-2">
                          <span className="text-gray-400">SĐT:</span>
                          <span>{selectedAddress.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 border-t border-gray-200 pt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Tạm tính</span>
                        <span>{formatPrice(subtotal)}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-sm text-green-600">
                          <span>Chiết khấu ({Math.round(discountRate * 100)}%)</span>
                          <span>-{formatPrice(discountAmount)}</span>
                        </div>
                      )}
                      {vatRequested && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">VAT (10%)</span>
                          <span>+{formatPrice(vat)}</span>
                        </div>
                      )}
                      
                      {creditApplied > 0 && (
                        <div className="flex justify-between text-sm text-blue-600">
                          <span>Sử dụng Credit</span>
                          <span>-{formatPrice(creditApplied)}</span>
                        </div>
                      )}

                      <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-200">
                        <span>{creditApplied > 0 ? "Khách cần trả thêm" : "Tổng thanh toán"}</span>
                        <span className="text-lg">{formatPrice(finalPayment)}</span>
                      </div>
                    </div>

                    <Button
                      size="lg"
                      className="mt-6 w-full rounded-full bg-gray-900 text-white hover:bg-gray-800"
                      onClick={() => setCurrentStep(2)}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Đồng ý & Chọn thanh toán
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: Payment Method ───────────────────────────────────────── */}
          {currentStep === 2 && (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 gap-10 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <section className="rounded-[1.5rem] border border-gray-100 p-6">
                  <div className="mb-5 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-gray-700" />
                    <h2 className="text-lg font-semibold text-gray-900">Phương thức thanh toán</h2>
                  </div>

                  <div className="space-y-3">
                    {/* COD */}
                    <label className={`flex gap-4 rounded-[1.25rem] border-2 p-4 cursor-pointer transition-colors ${paymentMethod === 'cod' ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
                      <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="mt-1 accent-gray-900" />
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <Banknote className="h-4 w-4 text-gray-700" />
                          <span className="font-semibold text-gray-900">Thanh toán khi nhận hàng (COD)</span>
                        </div>
                        <p className="text-sm text-gray-600">Tài xế giao hàng thu tiền mặt và ký biên nhận.</p>
                      </div>
                    </label>

                    {/* SePay */}
                    <label className={`flex gap-4 rounded-[1.25rem] border-2 p-4 cursor-pointer transition-colors ${paymentMethod === 'sepay' ? 'border-gray-900 bg-gray-50' : 'border-gray-100 hover:border-gray-300'}`}>
                      <input type="radio" name="payment" value="sepay" checked={paymentMethod === 'sepay'} onChange={() => setPaymentMethod('sepay')} className="mt-1 accent-gray-900" />
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-700" />
                          <span className="font-semibold text-gray-900">Chuyển khoản SePay (Tự động đối soát)</span>
                        </div>
                        <p className="text-sm text-gray-600">QR Code động — xác nhận thanh toán tự động theo thời gian thực.</p>
                      </div>
                    </label>
                  </div>

                  {paymentMethod === 'sepay' && (
                    <div className="mt-4 rounded-[1.25rem] border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600 space-y-1">
                      <p className="font-medium text-gray-900">Thông tin tài khoản</p>
                      <p>Ngân hàng: TP Bank</p>
                      <p>Số tài khoản: 71111810204</p>
                      <p>Chủ tài khoản: CONG TY VIET TIEN</p>
                    </div>
                  )}

                  {paymentMethod === 'cod' && (
                    <div className="mt-4 rounded-[1.25rem] border border-dashed border-gray-300 bg-blue-50 p-4 text-sm text-blue-700">
                      <div className="flex items-start gap-2">
                        <Truck className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>Tài xế sẽ thu tiền mặt khi giao hàng và ký biên nhận. Sales / Kế toán sẽ cập nhật trạng thái "Đã thanh toán" sau khi đối soát.</span>
                      </div>
                    </div>
                  )}
                </section>

                <Button variant="outline" className="rounded-full" onClick={() => setCurrentStep(1)}>
                  ← Xem lại hóa đơn
                </Button>
              </div>

              {/* Summary sidebar */}
              <div>
                <div className="space-y-6 lg:sticky lg:top-24">
                  <section className="rounded-[1.75rem] border border-gray-100 bg-gray-50 p-8">
                    <h2 className="mb-4 text-xl font-bold text-gray-900">Xác nhận thanh toán</h2>

                    <div className="mb-4 space-y-2 text-sm">
                      <div className="flex justify-between text-gray-600">
                        <span>Tạm tính</span>
                        <span>{formatPrice(subtotal)}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Chiết khấu</span>
                          <span>-{formatPrice(discountAmount)}</span>
                        </div>
                      )}
                      {vatRequested && (
                        <div className="flex justify-between text-gray-600">
                          <span>VAT (10%)</span>
                          <span>+{formatPrice(vat)}</span>
                        </div>
                      )}
                      {creditApplied > 0 && (
                        <div className="flex justify-between text-blue-600">
                          <span>Sử dụng Credit</span>
                          <span>-{formatPrice(creditApplied)}</span>
                        </div>
                      )}
                    </div>

                    <div className="mb-6 border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold text-gray-900">{creditApplied > 0 ? "Cần thanh toán" : "Tổng cộng"}</span>
                        <span className="text-2xl font-bold text-gray-900">{formatPrice(finalPayment)}</span>
                      </div>
                    </div>

                    <div className="mb-4 rounded-[1rem] bg-white border border-gray-200 p-3 text-xs text-gray-600 space-y-1">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                        <span className="line-clamp-2">{getDisplayAddress(selectedAddress)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                        <span>{paymentMethod === 'sepay' ? 'Chuyển khoản SePay' : 'COD - Tiền mặt khi nhận'}</span>
                      </div>
                    </div>

                    <Button
                      size="lg"
                      className="w-full rounded-full bg-gray-900 text-white hover:bg-gray-800"
                      onClick={handleConfirmOrder}
                      disabled={isProcessing}
                    >
                      {isProcessing
                        ? <><span className="animate-spin mr-2">⟳</span>Đang xử lý...</>
                        : <><Check className="h-4 w-4 mr-1" />Xác nhận & Đặt hàng</>
                      }
                    </Button>
                    <p className="mt-3 text-center text-xs text-gray-500">
                      Bằng cách xác nhận, bạn đồng ý với điều khoản đặt hàng của Việt Tiến
                    </p>
                  </section>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Address Modal */}
      <AnimatePresence>
        {showAddressModal && (
          <AddressModal
            title={editingAddressId ? 'Cập nhật địa chỉ giao hàng' : 'Thêm địa chỉ giao hàng'}
            form={addressForm}
            onChange={handleAddressFormChange}
            onClose={closeAddressModal}
            onSubmit={handleAddAddress}
            submitLabel={editingAddressId ? 'Lưu thay đổi' : 'Lưu địa chỉ'}
          />
        )}
      </AnimatePresence>

      <Footer />
    </div>
  )
}
