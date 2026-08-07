import { useEffect, useMemo, useState, useRef } from 'react'
import {
  AlertCircle,
  BarChart3,
  Building2,
  Camera,
  Check,
  ChevronRight,
  Download,
  Edit2,
  Eye,
  EyeOff,
  ExternalLink,
  FileText,
  Mail,
  MapPin,
  MessageSquare,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Star,
  TrendingUp,
  Trash2,
  Truck,
  User,
  Wallet,
  UserCog,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import AddressModal, { buildFullAddress, emptyAddressForm } from '../components/AddressModal.jsx'
import Footer from '../components/Footer.jsx'
import Header from '../components/Header.jsx'
import PhoneVerificationModal from '../components/PhoneVerificationModal.jsx'
import SalesChangeRequestTab from '../components/SalesChangeRequestTab.jsx'
import SuccessToast from '../components/SuccessToast.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { getTrackingSteps, isVatExpired, orders as mockOrders, shippingStatusMeta } from '../data/orders.js'
import {
  getOrderDetail,
  getOrderHistory,
  getOrderTimeline,
  getSpendingStats,
  requestVatInvoice,
  downloadInvoicePdf,
  orderStatusMeta,
  paymentStatusMeta,
  redInvoiceStatusMeta,
} from '../services/orderService.js'
import { exportInvoiceToPdf } from '../utils/exportPdf.js'
import { formatPrice } from '../data/products.js'
import { getCustomerProfile, updateCustomerProfile } from '../services/authService.js'
import { getQuotations } from '../services/quotationService.js'
import {
  uploadAvatar,
  updateUserProfile,
  changePassword,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from '../services/userService.js'

const profileTabs = [
  { id: 'info', label: 'Thông tin cá nhân', icon: User },
  { id: 'addresses', label: 'Địa chỉ giao hàng', icon: MapPin },
  { id: 'tax', label: 'Thông tin MST', icon: Building2 },
  { id: 'orders', label: 'Lịch sử đơn hàng', icon: Package },
  { id: 'stats', label: 'Thống kê cá nhân', icon: BarChart3 },
  { id: 'quotations', label: 'Báo giá đặc biệt', icon: MessageSquare },
  { id: 'sales-change', label: 'Sale phụ trách', icon: UserCog },
  { id: 'tracking', label: 'Theo dõi đơn hàng', icon: Truck },
  { id: 'credit', label: 'Lịch sử Credit', icon: Wallet },
]

const mockAddresses = [
  {
    id: '1',
    name: 'Nguyễn Văn A',
    phone: '0901 234 567',
    city: 'TP.HCM',
    district: 'Quận 1',
    ward: 'Phường Bến Nghé',
    addressLine: '123 Nguyễn Huệ',
    address: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
    type: 'Công ty',
    isDefault: true,
  },
  {
    id: '2',
    name: 'Nguyễn Văn A',
    phone: '0901 234 567',
    city: 'TP.HCM',
    district: 'Quận Gò Vấp',
    ward: 'Phường 2',
    addressLine: '456 Lê Lợi',
    address: '456 Lê Lợi, Phường 2, Quận Gò Vấp, TP.HCM',
    type: 'Nhà riêng',
    isDefault: false,
  },
  {
    id: '3',
    name: 'Kho Hàng A',
    phone: '0901 234 568',
    city: 'TP.HCM',
    district: 'Bình Chánh',
    ward: '',
    addressLine: '789 Quốc Lộ 1A',
    address: '789 Quốc Lộ 1A, Bình Chánh, TP.HCM',
    type: 'Kho hàng',
    isDefault: false,
  },
]

const defaultTaxInfo = {
  taxCode: '0123456789',
  companyName: 'Công ty TNHH Văn Phòng ABC',
  companyAddress: '123 Nguyễn Huệ, Q.1, TP.HCM',
  invoiceEmail: 'invoice@company.com',
  representative: 'Nguyễn Văn A',
  companyPhone: '028 3822 1234',
}

function normalizeQuotationStatus(status) {
  return String(status || '').toLowerCase().replace(/_/g, '')
}

function ToggleRow({ checked, label, onToggle }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        onClick={onToggle}
        className={`relative h-6 w-11 rounded-full transition-colors ${checked ? 'bg-gray-900' : 'bg-gray-200'}`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`}
        />
      </button>
    </div>
  )
}

function PersonalInfoTab({ user, onSuccess }) {
  const { updateUser } = useAuth()
  const [fullName, setFullName] = useState(user?.fullName || '')
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '')
  
  const [profileFull, setProfileFull] = useState(null)
  
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await getCustomerProfile()
        setProfileFull(res)
      } catch (err) {}
    }
    loadProfile()
  }, [])

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isVerifyPhoneOpen, setIsVerifyPhoneOpen] = useState(false)

  const [savingInfo, setSavingInfo] = useState(false)
  const [updatingPassword, setUpdatingPassword] = useState(false)

  const [notifications, setNotifications] = useState({
    orderConfirm: true,
    shipStatus: true,
    vatInvoice: false,
    promotions: true,
  })

  const isPhoneMatchedAndVerified = !phoneNumber || (user?.isPhoneVerified && user?.phoneNumber === phoneNumber);

  const fileInputRef = useRef(null)

  // Địa chỉ mặc định lấy từ danh sách địa chỉ giao hàng (địa chỉ có isDefault)
  const [defaultAddress, setDefaultAddress] = useState('')
  useEffect(() => {
    let cancelled = false
    getAddresses()
      .then((list) => {
        if (cancelled) return
        const def = (list || []).find((a) => a.isDefault)
        setDefaultAddress(def ? (def.fullAddress || def.address || '') : '')
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const userInitial = (fullName || user?.fullName || 'U').charAt(0).toUpperCase()

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      onSuccess('Đang tải ảnh đại diện lên...')
      const res = await uploadAvatar(file)
      updateUser({ avatarUrl: res.avatarUrl })
      onSuccess('Cập nhật ảnh đại diện thành công')
    } catch (err) {
      alert(err.message || 'Lỗi khi tải ảnh đại diện')
    }
  }

  const handleSaveInfo = async () => {
    if (!fullName.trim()) {
      alert('Họ tên không được để trống')
      return
    }
    if (!phoneNumber.trim()) {
      alert('Số điện thoại không được để trống')
      return
    }
    // Khớp validation backend: SĐT Việt Nam phải đủ 10 số và bắt đầu bằng 0
    if (!/^0\d{9}$/.test(phoneNumber.trim())) {
      alert('Số điện thoại phải có 10 số và bắt đầu bằng 0')
      return
    }
    
    if (!isPhoneMatchedAndVerified) {
      alert('Vui lòng xác minh số điện thoại trước khi lưu thông tin.')
      return
    }

    try {
      setSavingInfo(true)
      const res = await updateUserProfile({ fullName: fullName.trim(), phoneNumber: phoneNumber.trim() })
      updateUser({ fullName: res.fullName, phoneNumber: res.phoneNumber })
      onSuccess('Lưu thông tin cá nhân thành công')
    } catch (err) {
      alert(err.message || 'Lỗi khi cập nhật thông tin cá nhân')
    } finally {
      setSavingInfo(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      alert('Vui lòng nhập mật khẩu hiện tại')
      return
    }
    if (!newPassword) {
      alert('Vui lòng nhập mật khẩu mới')
      return
    }
    if (newPassword !== confirmPassword) {
      alert('Xác nhận mật khẩu mới không trùng khớp')
      return
    }

    try {
      setUpdatingPassword(true)
      await changePassword({ currentPassword, newPassword, confirmPassword })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      onSuccess('Thay đổi mật khẩu thành công')
    } catch (err) {
      alert(err.message || 'Lỗi khi đổi mật khẩu')
    } finally {
      setUpdatingPassword(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-100 bg-white p-6">
        <h3 className="mb-5 text-base font-semibold text-gray-900">Thông tin cơ bản</h3>
        <div className="mb-6 flex flex-col gap-6 sm:flex-row sm:items-start">
          <div className="relative">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="Avatar" className="h-20 w-20 rounded-full object-cover" />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-900 text-2xl font-bold text-white">
                {userInitial}
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={handleAvatarClick}
              className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition hover:bg-gray-50"
            >
              <Camera className="h-3 w-3 text-gray-600" />
            </button>
          </div>

          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Họ tên</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="rounded-xl text-sm"
              />
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between">
                <label className="block text-xs text-gray-500">Số điện thoại</label>
                {isPhoneMatchedAndVerified ? (
                  <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none text-[10px] px-1.5 py-0 h-4">
                    Đã xác minh <Check className="w-3 h-3 ml-0.5" />
                  </Badge>
                ) : (
                  <button 
                    type="button" 
                    onClick={() => setIsVerifyPhoneOpen(true)} 
                    className="text-[10px] text-blue-600 hover:underline font-medium"
                  >
                    Xác minh ngay
                  </button>
                )}
              </div>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Email</label>
              <Input
                value={user?.email || ''}
                disabled
                className="rounded-xl bg-gray-50 text-sm cursor-not-allowed"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Địa chỉ mặc định</label>
              <Input
                value={defaultAddress || 'Chưa thiết lập'}
                title={defaultAddress}
                disabled
                className="rounded-xl bg-gray-50 text-sm cursor-not-allowed"
              />
            </div>
            {profileFull && (
              <div>
                <label className="mb-1 block text-xs text-blue-600 font-semibold">Số dư Credit</label>
                <Input
                  value={`${formatPrice(profileFull.availableCredit || 0)}`}
                  disabled
                  className="rounded-xl bg-blue-50/50 text-blue-700 text-sm font-bold border-blue-200 cursor-default"
                />
              </div>
            )}
          </div>
        </div>
        <Button
          className="rounded-full bg-gray-900 text-sm text-white hover:bg-gray-800 disabled:bg-gray-400"
          onClick={handleSaveInfo}
          disabled={savingInfo || !isPhoneMatchedAndVerified}
        >
          {savingInfo ? 'Đang lưu...' : 'Lưu thông tin'}
        </Button>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6">
        <h3 className="mb-5 text-base font-semibold text-gray-900">Đổi mật khẩu</h3>
        <div className="max-w-sm space-y-4">
          <div>
            <label className="mb-1 block text-xs text-gray-500">Mật khẩu hiện tại</label>
            <div className="relative">
              <Input
                type={showCurrent ? 'text' : 'password'}
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="rounded-xl pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-700"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">Mật khẩu mới</label>
            <div className="relative">
              <Input
                type={showNew ? 'text' : 'password'}
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="rounded-xl pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-700"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-gray-500">Xác nhận mật khẩu mới</label>
            <div className="relative">
              <Input
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="rounded-xl pr-10 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-700"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            className="rounded-full bg-gray-900 text-sm text-white hover:bg-gray-800"
            onClick={handleUpdatePassword}
            disabled={updatingPassword}
          >
            {updatingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="mb-5 flex items-center gap-2">
          <Mail className="h-4 w-4 text-gray-700" />
          <h3 className="text-base font-semibold text-gray-900">Thông báo email</h3>
        </div>
        <div className="space-y-4">
          <ToggleRow
            checked={notifications.orderConfirm}
            label="Nhận email xác nhận đơn hàng"
            onToggle={() => setNotifications((value) => ({ ...value, orderConfirm: !value.orderConfirm }))}
          />
          <ToggleRow
            checked={notifications.shipStatus}
            label="Nhận email trạng thái giao hàng"
            onToggle={() => setNotifications((value) => ({ ...value, shipStatus: !value.shipStatus }))}
          />
          <ToggleRow
            checked={notifications.vatInvoice}
            label="Nhận email hóa đơn VAT"
            onToggle={() => setNotifications((value) => ({ ...value, vatInvoice: !value.vatInvoice }))}
          />
          <ToggleRow
            checked={notifications.promotions}
            label="Nhận email khuyến mãi"
            onToggle={() => setNotifications((value) => ({ ...value, promotions: !value.promotions }))}
          />
        </div>
      </section>

      <PhoneVerificationModal 
        isOpen={isVerifyPhoneOpen}
        onClose={() => setIsVerifyPhoneOpen(false)}
        currentPhone={phoneNumber}
      />
    </div>
  )
}

function AddressesTab({ onSuccess, needAddress }) {
  const { refreshProfileStatus } = useAuth()
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAddressId, setEditingAddressId] = useState(null)
  const [addressForm, setAddressForm] = useState(emptyAddressForm)

  useEffect(() => {
    async function loadAddresses() {
      try {
        setLoading(true)
        const list = await getAddresses()
        setAddresses(list || [])
      } catch (err) {
        console.error("Lỗi tải danh sách địa chỉ:", err)
      } finally {
        setLoading(false)
      }
    }
    loadAddresses()
  }, [])

  // Auto-open modal khi redirect từ login (needAddress)
  useEffect(() => {
    if (needAddress && !loading && addresses.length === 0) {
      openCreateModal()
    }
  }, [needAddress, loading, addresses.length])

  async function handleSetDefaultAddress(id) {
    try {
      await setDefaultAddress(id)
      setAddresses((items) =>
        items.map((item) => ({ ...item, isDefault: item.id === id }))
      )
      onSuccess('Đặt địa chỉ mặc định thành công')
    } catch (err) {
      alert(err.message || 'Lỗi khi đặt địa chỉ mặc định')
    }
  }

  async function removeAddress(id) {
    try {
      await deleteAddress(id)
      setAddresses((items) => items.filter((item) => item.id !== id))
      onSuccess('Xóa địa chỉ thành công')
    } catch (err) {
      alert(err.message || 'Lỗi khi xóa địa chỉ')
    }
  }

  function handleAddressFormChange(key, value) {
    setAddressForm((current) => ({ ...current, [key]: value }))
  }

  function openCreateModal() {
    setEditingAddressId(null)
    setAddressForm({ ...emptyAddressForm })
    setShowModal(true)
  }

  function openEditModal(address) {
    setEditingAddressId(address.id)
    setAddressForm({
      id: address.id,
      name: address.name,
      phone: address.phone,
      city: address.city,
      district: address.district,
      ward: address.ward || '',
      addressLine: address.addressLine,
      type: address.type,
      isDefault: address.isDefault,
      provinceCode: address.provinceCode || '',
      districtCode: address.districtCode || '',
      wardCode: address.wardCode || '',
      latitude: address.latitude || null,
      longitude: address.longitude || null,
    })
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditingAddressId(null)
    setAddressForm({ ...emptyAddressForm })
  }

  async function handleSubmitAddress(event) {
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
      // Mã hành chính
      provinceCode: addressForm.provinceCode || undefined,
      districtCode: addressForm.districtCode || undefined,
      wardCode: addressForm.wardCode || undefined,
      // Toạ độ GPS
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
        onSuccess('Cập nhật địa chỉ thành công')
      } else {
        const created = await createAddress(payload)
        setAddresses((items) => {
          if (created.isDefault) {
            return [...items.map((item) => ({ ...item, isDefault: false })), created]
          }
          return [...items, created]
        })
        onSuccess('Thêm địa chỉ thành công')
      }
      closeModal()

      // Refresh profile status sau khi lưu (mở khoá mua hàng)
      refreshProfileStatus()
    } catch (err) {
      alert(err.message || 'Lỗi khi lưu địa chỉ')
    }
  }

  const typeColor = {
    'Công ty': 'bg-blue-50 text-blue-700',
    'Nhà riêng': 'bg-green-100 text-green-700',
    'Kho hàng': 'bg-orange-100 text-orange-700',
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-gray-100 bg-white p-6 flex flex-col items-center justify-center min-h-[200px]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-950" />
        <p className="mt-4 text-sm text-gray-500">Đang tải danh sách địa chỉ...</p>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      {/* Banner khi cần thêm địa chỉ */}
      {needAddress && addresses.length === 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <MapPin className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Vui lòng thêm địa chỉ giao hàng</p>
            <p className="text-xs text-amber-600">Bạn cần có ít nhất 1 địa chỉ giao hàng để bắt đầu mua hàng.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">{addresses.length} địa chỉ đã lưu</p>
        <Button className="gap-1.5 rounded-full bg-gray-900 text-sm text-white hover:bg-gray-800" onClick={openCreateModal}>
          <Plus className="h-4 w-4" />
          Thêm địa chỉ
        </Button>
      </div>

      {addresses.map((address) => (
        <section key={address.id} className="rounded-2xl border border-gray-100 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-gray-900">{address.name}</span>
                <span className="text-sm text-gray-500">{address.phone}</span>
                <Badge
                  className={`${typeColor[address.type] ?? 'bg-gray-100 text-gray-600'} px-2.5 py-1 text-[11px] font-medium hover:opacity-90`}
                >
                  {address.type}
                </Badge>
                {address.isDefault && <Badge className="bg-gray-900 text-[10px] text-white hover:bg-gray-900">Mặc định</Badge>}
              </div>
              <p className="text-sm text-gray-600">{address.fullAddress || address.address}</p>
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => openEditModal(address)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
              >
                <Edit2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => removeAddress(address.id)}
                className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {!address.isDefault && (
            <button
              type="button"
              onClick={() => handleSetDefaultAddress(address.id)}
              className="mt-3 text-xs text-gray-500 underline underline-offset-2 transition hover:text-gray-900"
            >
              Đặt làm mặc định
            </button>
          )}
        </section>
      ))}

      <AnimatePresence>
        {showModal && (
          <AddressModal
            title={editingAddressId ? 'Cập nhật địa chỉ' : 'Thêm địa chỉ mới'}
            form={addressForm}
            onChange={handleAddressFormChange}
            onClose={closeModal}
            onSubmit={handleSubmitAddress}
            submitLabel={editingAddressId ? 'Lưu thay đổi' : 'Lưu địa chỉ'}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function TaxInfoTab({ userName, userEmail, userPhone, onSuccess }) {
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [taxInfo, setTaxInfo] = useState({
    taxCode: '',
    companyName: '',
    companyAddress: '',
    invoiceEmail: '',
    representative: '',
    companyPhone: '',
  })
  const [taxForm, setTaxForm] = useState({
    taxCode: '',
    companyName: '',
    companyAddress: '',
    invoiceEmail: '',
    representative: '',
    companyPhone: '',
  })
  const [searchingMst, setSearchingMst] = useState(false)

  const fields = [
    { key: 'taxCode', label: 'Mã số thuế', placeholder: 'Nhập mã số thuế (10 hoặc 13 số)' },
    { key: 'companyName', label: 'Tên công ty', placeholder: 'Tên công ty sẽ tự động điền khi tra cứu' },
    { key: 'companyAddress', label: 'Địa chỉ công ty', placeholder: 'Địa chỉ công ty sẽ tự động điền khi tra cứu' },
    { key: 'invoiceEmail', label: 'Email nhận hóa đơn', placeholder: 'invoice@company.com' },
    { key: 'representative', label: 'Người đại diện', placeholder: 'Nguyễn Văn A' },
    { key: 'companyPhone', label: 'Số điện thoại công ty', placeholder: '028 3822 1234' },
  ]

  useEffect(() => {
    async function fetchTaxInfo() {
      try {
        setLoading(true)
        const data = await getCustomerProfile()
        const info = {
          taxCode: data.taxCode || '',
          companyName: data.companyName || '',
          companyAddress: data.companyAddress || '',
          invoiceEmail: data.invoiceEmail || '',
          representative: data.representative || '',
          companyPhone: data.companyPhone || '',
        }
        setTaxInfo(info)
        setTaxForm(info)
      } catch (err) {
        console.error("Lỗi khi tải thông tin thuế:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchTaxInfo()
  }, [])

  function startEditing() {
    setTaxForm({ ...taxInfo })
    setEditing(true)
  }

  function cancelEditing() {
    setTaxForm({ ...taxInfo })
    setEditing(false)
  }

  async function saveTaxInfo() {
    try {
      await updateCustomerProfile(taxForm)
      setTaxInfo(taxForm)
      setEditing(false)
      onSuccess('Lưu thông tin MST thành công')
    } catch (err) {
      alert(err.message || 'Lỗi khi lưu thông tin thuế')
    }
  }

  async function removeTaxInfo() {
    const emptyForm = {
      taxCode: '',
      companyName: '',
      companyAddress: '',
      invoiceEmail: '',
      representative: '',
      companyPhone: '',
    }
    try {
      await updateCustomerProfile(emptyForm)
      setTaxInfo(emptyForm)
      setTaxForm(emptyForm)
      setEditing(false)
      onSuccess('Xóa thông tin MST thành công')
    } catch (err) {
      alert(err.message || 'Lỗi khi xóa thông tin thuế')
    }
  }

  async function handleMstLookup() {
    const code = taxForm.taxCode?.trim()
    if (!code) {
      alert('Vui lòng nhập mã số thuế để tra cứu.')
      return
    }

    const cleanedCode = code.replace(/[\s-]/g, '')
    if (cleanedCode.length !== 10 && cleanedCode.length !== 13) {
      alert('Mã số thuế của doanh nghiệp phải có độ dài 10 hoặc 13 số.')
      return
    }

    try {
      setSearchingMst(true)
      const res = await fetch(`https://api.vietqr.io/v2/business/${cleanedCode}`)
      const json = await res.json()

      if (json && json.code === '00' && json.data) {
        const businessName = json.data.name
        const businessAddress = json.data.address

        setTaxForm(prev => ({
          ...prev,
          taxCode: cleanedCode,
          companyName: businessName || prev.companyName,
          companyAddress: businessAddress || prev.companyAddress,
          // Autofill email/representative/phone with profile info if they are empty
          invoiceEmail: prev.invoiceEmail || userEmail || '',
          representative: prev.representative || userName || '',
          companyPhone: prev.companyPhone || userPhone || '',
        }))
        onSuccess(`Tìm thấy doanh nghiệp: ${businessName}`)
      } else {
        alert(json.desc || 'Không tìm thấy doanh nghiệp tương ứng với mã số thuế này. Vui lòng kiểm tra lại.')
      }
    } catch (err) {
      console.error(err)
      alert('Không thể kết nối đến hệ thống tra cứu. Vui lòng thử lại sau.')
    } finally {
      setSearchingMst(false)
    }
  }

  if (loading) {
    return (
      <section className="rounded-2xl border border-gray-100 bg-white p-6 flex flex-col items-center justify-center min-h-[300px]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-950" />
        <p className="mt-4 text-sm text-gray-500">Đang tải thông tin thuế...</p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-gray-900">Thông tin thuế</h3>
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <>
              <Button variant="outline" size="sm" className="h-8 rounded-full px-3 text-[11px]" onClick={cancelEditing}>
                Hủy
              </Button>
              <Button
                size="sm"
                className="h-8 rounded-full bg-gray-900 px-3 text-[11px] text-white hover:bg-gray-800"
                onClick={saveTaxInfo}
              >
                Lưu
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" className="h-8 gap-1 rounded-full px-3 text-[11px]" onClick={startEditing}>
                <Edit2 className="h-3 w-3" />
                Chỉnh sửa
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1 rounded-full border-red-200 px-3 text-[11px] text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={removeTaxInfo}
              >
                <Trash2 className="h-3 w-3" />
                Xóa
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mb-5 flex items-start gap-2 rounded-xl bg-blue-50 px-4 py-3 text-xs text-blue-600">
        <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        <span>Khi yêu cầu hóa đơn VAT, hệ thống sẽ tự động điền thông tin MST từ hồ sơ này.</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.key}>
            <label className="mb-1 block text-xs text-gray-500">{field.label}</label>
            {editing ? (
              field.key === 'taxCode' ? (
                <div className="flex gap-2">
                  <Input
                    placeholder={field.placeholder}
                    value={taxForm[field.key]}
                    className="flex-1 rounded-xl text-sm"
                    onChange={(event) => setTaxForm((value) => ({ ...value, [field.key]: event.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl px-4 text-xs font-semibold hover:bg-gray-100 flex items-center gap-1.5 border-gray-200"
                    onClick={handleMstLookup}
                    disabled={searchingMst}
                  >
                    {searchingMst ? (
                      <>
                        <span className="h-3 w-3 animate-spin rounded-full border border-gray-300 border-t-gray-800" />
                        Đang tìm...
                      </>
                    ) : (
                      <>
                        <Search className="h-3.5 w-3.5" />
                        Tra cứu
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <Input
                  placeholder={field.placeholder}
                  value={taxForm[field.key]}
                  className="rounded-xl text-sm"
                  onChange={(event) => setTaxForm((value) => ({ ...value, [field.key]: event.target.value }))}
                  disabled={field.key === 'companyName' || field.key === 'companyAddress'}
                />
              )
            ) : (
              <p className="rounded-xl bg-gray-50 px-3 py-3 text-sm font-medium text-gray-900">
                {taxInfo[field.key] || 'Chưa cập nhật'}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

function OrderHistoryTab({ onSuccess }) {
  const [search, setSearch]               = useState('')
  const [searchInput, setSearchInput]     = useState('')
  const [statusFilter, setStatusFilter]   = useState('all')
  const [payFilter, setPayFilter]         = useState('all')
  const [fromDate, setFromDate]           = useState('')
  const [toDate, setToDate]               = useState('')
  const [page, setPage]                   = useState(1)
  const PAGE_SIZE                         = 10

  const [orders, setOrders]               = useState([])
  const [totalPages, setTotalPages]       = useState(1)
  const [totalCount, setTotalCount]       = useState(0)
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [vatLoading, setVatLoading]       = useState({})

  // Debounce search 400ms
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400)
    return () => clearTimeout(t)
  }, [searchInput])

  // Load orders bất cứ khi nào filter thay đổi
  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await getOrderHistory({
          search: search || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          paymentStatus: payFilter !== 'all' ? payFilter : undefined,
          fromDate: fromDate || undefined,
          toDate: toDate || undefined,
          page,
          pageSize: PAGE_SIZE,
        })
        setOrders(data.items || [])
        setTotalPages(data.totalPages || 1)
        setTotalCount(data.totalCount || 0)
      } catch (err) {
        setError(err.message || 'Không thể tải danh sách đơn hàng.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [search, statusFilter, payFilter, fromDate, toDate, page])

  // Reset về trang 1 khi filter thay đổi
  useEffect(() => { setPage(1) }, [search, statusFilter, payFilter, fromDate, toDate])

  async function handleRequestVat(orderId, orderCode) {
    setVatLoading((prev) => ({ ...prev, [orderId]: true }))
    try {
      await requestVatInvoice(orderId)
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, canRequestVat: false, redInvoiceStatus: 'Pending' } : o
        )
      )
      onSuccess(`Yêu cầu hóa đơn VAT cho đơn ${orderCode} đã được ghi nhận.`)
    } catch (err) {
      alert(err.message || 'Lỗi khi yêu cầu VAT.')
    } finally {
      setVatLoading((prev) => ({ ...prev, [orderId]: false }))
    }
  }

  async function handleDownloadPdf(order) {
    try {
      const detail = await getOrderDetail(order.id)
      await exportInvoiceToPdf(detail)
    } catch (err) {
      alert(err.message || 'Lỗi khi tải PDF.')
    }
  }

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const formatPrice = (n) =>
    n?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }) ?? '—'

  // ─── Loading ───────────────────────────────────────────────────────────────
  const loadingBlock = (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
      <p className="mt-4 text-sm text-gray-500">Đang tải lịch sử đơn hàng...</p>
    </div>
  )

  // ─── Error ─────────────────────────────────────────────────────────────────
  const errorBlock = (
    <div className="flex flex-col items-center justify-center py-16">
      <AlertCircle className="h-10 w-10 text-red-400" />
      <p className="mt-3 text-sm font-medium text-gray-700">{error}</p>
      <button
        type="button"
        onClick={() => setPage((p) => p)}
        className="mt-4 rounded-full border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
      >
        Thử lại
      </button>
    </div>
  )

  // ─── Empty ─────────────────────────────────────────────────────────────────
  const emptyBlock = (
    <div className="flex flex-col items-center justify-center py-16">
      <Package className="h-10 w-10 text-gray-300" />
      <p className="mt-3 text-sm font-medium text-gray-500">Không tìm thấy đơn hàng phù hợp.</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* ─── Filter bar ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={searchInput}
            placeholder="Tìm theo mã đơn hàng..."
            className="rounded-xl pl-9 text-sm"
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="New">Đơn mới</option>
          <option value="Received">Đã tiếp nhận</option>
          <option value="Packing">Đang đóng gói</option>
          <option value="InTransit">Đang giao</option>
          <option value="Delivered">Đã giao</option>
          <option value="Cancelled">Đã hủy</option>
        </select>

        <select
          value={payFilter}
          onChange={(e) => setPayFilter(e.target.value)}
          className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
        >
          <option value="all">Tất cả thanh toán</option>
          <option value="Pending">Chờ thanh toán</option>
          <option value="Paid">Đã thanh toán</option>
          <option value="Failed">Thất bại</option>
        </select>

        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-gray-900"
          placeholder="Từ ngày"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-gray-900"
          placeholder="Đến ngày"
        />
      </div>

      {/* ─── Count ──────────────────────────────────────────────────── */}
      {!loading && !error && (
        <p className="text-xs text-gray-400">
          Tìm thấy <span className="font-semibold text-gray-700">{totalCount}</span> đơn hàng
        </p>
      )}

      {/* ─── Desktop table ──────────────────────────────────────────── */}
      <section className="hidden overflow-hidden rounded-2xl border border-gray-100 bg-white md:block">
        {loading ? loadingBlock : error ? errorBlock : orders.length === 0 ? emptyBlock : (
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[13%]" />
              <col className="w-[11%]" />
              <col className="w-[8%]" />
              <col className="w-[13%]" />
              <col className="w-[11%]" />
              <col className="w-[11%]" />
              <col className="w-[11%]" />
              <col className="w-[22%]" />
            </colgroup>
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {['Mã đơn', 'Ngày đặt', 'SL', 'Tổng TT', 'PT Thanh toán', 'TT Thanh toán', 'TT Đơn hàng', 'Hành động'].map((h) => (
                  <th key={h} className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map((order) => {
                const payMeta   = paymentStatusMeta[order.paymentStatus]   || { label: order.paymentStatus,   badgeClass: 'bg-gray-100 text-gray-500' }
                const orderMeta = orderStatusMeta[order.orderStatus]       || { label: order.orderStatus,     badgeClass: 'bg-gray-100 text-gray-500' }
                return (
                  <tr key={order.id} className="transition-colors hover:bg-gray-50/50">
                    <td className="px-3 py-4 align-top">
                      <span className="block break-all font-mono text-xs font-semibold text-gray-900">{order.orderCode}</span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 align-top text-xs text-gray-600">{formatDate(order.createdAt)}</td>
                    <td className="px-3 py-4 align-top text-xs text-gray-700">{order.itemCount} sp</td>
                    <td className="whitespace-nowrap px-3 py-4 align-top text-xs font-semibold text-gray-900">{formatPrice(order.finalPayment)}</td>
                    <td className="px-3 py-4 align-top text-xs text-gray-600">{order.paymentMethod}</td>
                    <td className="px-2 py-4 align-top">
                      <Badge className={`${payMeta.badgeClass} whitespace-nowrap px-2 py-0.5 text-[10px] font-medium hover:opacity-100`}>
                        {payMeta.label}
                      </Badge>
                    </td>
                    <td className="px-2 py-4 align-top">
                      <Badge className={`${orderMeta.badgeClass} whitespace-nowrap px-2 py-0.5 text-[10px] font-medium hover:opacity-100`}>
                        {orderMeta.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-4 align-top">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Link
                          to={`/profile/orders/${order.id}`}
                          className="inline-flex items-center gap-1 font-medium text-gray-600 transition hover:text-gray-900 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Chi tiết
                        </Link>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 font-medium text-gray-600 transition hover:text-gray-900 hover:underline"
                            onClick={() => handleDownloadPdf(order)}
                          >
                            <Download className="h-3 w-3" />
                            PDF
                          </button>
                        {isVatExpired(order) ? (
                          <span className="text-xs font-medium text-gray-400">Quá hạn VAT</span>
                        ) : (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 font-medium text-blue-600 transition hover:text-blue-800 hover:underline"
                            onClick={() => onSuccess(`Đã tải hóa đơn VAT của ${order.id}`)}
                          >
                            VAT
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* ─── Mobile cards ───────────────────────────────────────────── */}
      <div className="space-y-3 md:hidden">
        {loading ? loadingBlock : error ? errorBlock : orders.length === 0 ? emptyBlock : orders.map((order) => {
          const payMeta   = paymentStatusMeta[order.paymentStatus]   || { label: order.paymentStatus,   badgeClass: 'bg-gray-100 text-gray-500' }
          const orderMeta = orderStatusMeta[order.orderStatus]       || { label: order.orderStatus,     badgeClass: 'bg-gray-100 text-gray-500' }
          return (
            <section key={order.id} className="rounded-2xl border border-gray-100 bg-white p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-xs font-bold text-gray-900">{order.orderCode}</span>
                <span className="text-xs text-gray-400">{formatDate(order.createdAt)}</span>
              </div>
              <p className="mt-1 text-xs text-gray-500">{order.itemCount} sản phẩm · {order.paymentMethod}</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">{formatPrice(order.finalPayment)}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Badge className={`${payMeta.badgeClass} px-2 py-0.5 text-[10px] font-medium hover:opacity-100`}>{payMeta.label}</Badge>
                <Badge className={`${orderMeta.badgeClass} px-2 py-0.5 text-[10px] font-medium hover:opacity-100`}>{orderMeta.label}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                <Link to={`/profile/orders/${order.id}`} className="inline-flex items-center gap-1 font-medium text-gray-600 hover:underline">
                  <ExternalLink className="h-3 w-3" /> Chi tiết
                </Link>
                  <button type="button" className="inline-flex items-center gap-1 font-medium text-gray-600 hover:underline" onClick={() => handleDownloadPdf(order)}>
                    <Download className="h-3 w-3" /> PDF
                  </button>
                {isVatExpired(order) ? (
                  <span className="text-xs font-medium text-gray-400">Quá hạn VAT</span>
                ) : (
                  <button type="button" className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline" onClick={() => onSuccess(`Đã tải hóa đơn VAT của ${order.id}`)}>
                    VAT
                  </button>
                )}
              </div>
            </section>
          )
        })}
      </div>

      {/* ─── Pagination ─────────────────────────────────────────────── */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-full border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            ← Trước
          </button>
          <span className="text-xs text-gray-500">
            Trang <span className="font-semibold text-gray-900">{page}</span> / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded-full border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            Tiếp →
          </button>
        </div>
      )}
    </div>
  )
}

function PersonalStatsTab() {
  const [period, setPeriod] = useState('month')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await getSpendingStats(period)
        if (!cancelled) setStats(data)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Không thể tải thống kê chi tiêu.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [period])

  const statsData = useMemo(() => {
    const spendingData = (stats?.spendingByMonth ?? []).map((p) => ({ name: p.label, value: p.value }))
    const productData = (stats?.topProducts ?? []).map((p) => ({ name: p.name, value: p.value }))

    return {
      spendingData,
      productData,
      statCards: [
        {
          label: 'Tổng đơn hàng',
          value: String(stats?.totalOrders ?? 0),
          icon: ShoppingBag,
          color: 'bg-blue-50 text-blue-600',
        },
        {
          label: 'Tổng chi tiêu',
          value: formatPrice(stats?.totalSpent ?? 0),
          icon: TrendingUp,
          color: 'bg-green-50 text-green-600',
        },
        {
          label: 'Sản phẩm đặt nhiều nhất',
          value: stats?.topProductName || 'Chưa có dữ liệu',
          icon: Star,
          color: 'bg-yellow-50 text-yellow-600',
        },
        {
          label: 'Số hóa đơn VAT',
          value: String(stats?.vatInvoiceCount ?? 0),
          icon: FileText,
          color: 'bg-purple-50 text-purple-600',
        },
      ],
    }
  }, [stats])

  const periodButtons = (
    <div className="flex flex-wrap gap-2">
      {[
        { key: 'week', label: 'Tuần' },
        { key: 'month', label: 'Tháng' },
        { key: 'quarter', label: 'Quý' },
        { key: 'year', label: 'Năm' },
      ].map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => setPeriod(item.key)}
          className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
            period === item.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {item.label}
        </button>
      ))}
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-6">
        {periodButtons}
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900" />
          <p className="mt-4 text-sm text-gray-500">Đang tải thống kê chi tiêu...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        {periodButtons}
        <div className="flex flex-col items-center justify-center py-16">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="mt-3 text-sm font-medium text-gray-700">{error}</p>
          <button
            type="button"
            onClick={() => setPeriod((p) => p)}
            className="mt-4 rounded-full border border-gray-200 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Thử lại
          </button>
        </div>
      </div>
    )
  }

  const hasData = (stats?.totalOrders ?? 0) > 0

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statsData.statCards.map(({ label, value, icon: Icon, color }) => (
          <section key={label} className="rounded-2xl border border-gray-100 bg-white p-5">
            <div className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="mb-1 text-xs text-gray-500">{label}</p>
            <p className="truncate text-lg font-bold text-gray-900">{value}</p>
          </section>
        ))}
      </div>

      {periodButtons}

      {!hasData ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-16">
          <BarChart3 className="h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-500">Chưa có dữ liệu chi tiêu trong khoảng thời gian này.</p>
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-100 bg-white p-5">
          <h4 className="mb-4 text-sm font-semibold text-gray-900">Chi tiêu theo tháng</h4>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={statsData.spendingData}>
              <defs>
                <linearGradient id="profile-spending" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#111827" stopOpacity={0.16} />
                  <stop offset="95%" stopColor="#111827" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickFormatter={(value) => `${Math.round(value / 1000)}k`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip formatter={(value) => formatPrice(Number(value))} />
              <Area type="monotone" dataKey="value" stroke="#111827" strokeWidth={2} fill="url(#profile-spending)" />
            </AreaChart>
          </ResponsiveContainer>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5">
          <h4 className="mb-4 text-sm font-semibold text-gray-900">Sản phẩm đặt nhiều nhất</h4>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={statsData.productData} layout="vertical" margin={{ top: 4, right: 12, left: 12, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis
                dataKey="name"
                type="category"
                width={140}
                tick={{ fontSize: 10, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip formatter={(value) => `${value} sản phẩm`} />
              <Bar dataKey="value" fill="#111827" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>
      )}
    </div>
  )
}

function QuotationRequestsTab() {
  const [quotations, setQuotations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadQuotations() {
      try {
        setLoading(true)
        setError('')
        const data = await getQuotations()
        if (!cancelled) {
          setQuotations(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Không thể tải danh sách báo giá')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadQuotations()
    return () => {
      cancelled = true
    }
  }, [])

  const statusBadge = {
    pending: 'bg-yellow-100 text-yellow-700',
    salesresponded: 'bg-blue-100 text-blue-700',
    negotiating: 'bg-purple-100 text-purple-700',
    waitingforadminapproval: 'bg-orange-100 text-orange-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  }

  const statusLabel = {
    pending: 'Đang chờ Sales phản hồi',
    salesresponded: 'Sales đã gửi bảng giá',
    negotiating: 'Đang trao đổi',
    waitingforadminapproval: 'Chờ Admin duyệt',
    accepted: 'Đã chấp nhận',
    rejected: 'Đã hủy',
  }

  if (loading) {
    return (
      <section className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-950" />
        <p className="mt-4 text-sm text-gray-500">Đang tải danh sách báo giá...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
        <p className="font-medium text-red-700">{error}</p>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{quotations.length} yêu cầu báo giá</p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-100 bg-gray-50">
              <tr>
                {['Mã yêu cầu', 'Ngày gửi', 'Tổng ban đầu', 'Tổng Sales báo giá', 'Tiết kiệm', 'Trạng thái', 'Hành động'].map((heading) => (
                  <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {quotations.map((quotation) => {
                const statusKey = normalizeQuotationStatus(quotation.status)
                const savings = quotation.salesProposedTotal ? quotation.originalTotal - quotation.salesProposedTotal : 0

                return (
                  <tr key={quotation.id} className="transition-colors hover:bg-gray-50/50">
                    <td className="px-4 py-4">
                      <span className="font-mono text-sm font-medium text-gray-900">{quotation.id}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-600">{quotation.requestDate}</td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-gray-900">
                      {formatPrice(quotation.originalTotal)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-green-600">
                      {quotation.salesProposedTotal ? formatPrice(quotation.salesProposedTotal) : '-'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-sm font-semibold text-green-600">
                      {savings > 0 ? `- ${formatPrice(savings)}` : '-'}
                    </td>
                    <td className="px-4 py-4">
                      <Badge className={`${statusBadge[statusKey] ?? 'bg-gray-100 text-gray-700'} text-[10px] hover:opacity-100`}>
                        {statusLabel[statusKey] ?? quotation.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3 text-xs">
                        <Link
                          to={`/profile/quotations/${quotation.id}`}
                          className="inline-flex items-center gap-1 font-medium text-gray-600 transition hover:text-gray-900 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Xem chi tiết
                        </Link>

                        {statusKey !== 'accepted' && statusKey !== 'rejected' && (
                          <Link
                            to={`/profile/quotations/${quotation.id}?chat=1`}
                            className="inline-flex items-center gap-1 font-medium text-blue-600 transition hover:text-blue-800 hover:underline"
                          >
                            <MessageSquare className="h-3 w-3" />
                            Chat
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {quotations.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              <MessageSquare className="mx-auto mb-2 h-10 w-10" />
              <p className="text-sm">Chưa có yêu cầu báo giá nào</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function OrderTrackingTab() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null)

  useEffect(() => {
    async function fetchOrders() {
      try {
        setLoading(true)
        const res = await getOrderHistory({ pageSize: 50 })
        const list = res.items || []
        setOrders(list)
        if (list.length > 0) {
          setSelectedOrderId(list[0].id)
        }
      } catch (err) {
        console.error("Lỗi tải danh sách đơn hàng:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [])

  useEffect(() => {
    if (!selectedOrderId) {
      setSelectedOrderDetail(null)
      return
    }
    async function fetchDetail() {
      try {
        const detail = await getOrderDetail(selectedOrderId)
        setSelectedOrderDetail(detail)
      } catch (err) {
        console.error("Lỗi tải chi tiết đơn hàng:", err)
        setSelectedOrderDetail(null)
      }
    }
    fetchDetail()
  }, [selectedOrderId])

  if (loading) {
    return (
      <section className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-900 border-t-transparent mb-2" />
        Đang tải dữ liệu theo dõi đơn hàng...
      </section>
    )
  }

  if (orders.length === 0) {
    return (
      <section className="rounded-2xl border border-gray-100 bg-white p-8 text-center text-sm text-gray-400">
        Chưa có đơn hàng nào để theo dõi.
      </section>
    )
  }

  const selectedOrder = selectedOrderDetail || orders.find((o) => o.id === selectedOrderId) || orders[0]
  const timeline = getOrderTimeline(selectedOrder?.orderStatus, selectedOrder?.deliveryStatus)

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="mb-1 text-xs text-gray-500">Mã đơn hàng</p>
            <p className="font-mono text-lg font-bold text-gray-900">{selectedOrder?.orderCode || selectedOrder?.id}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {selectedOrder?.orderStatus && (
              <Badge className={`${(orderStatusMeta[selectedOrder.orderStatus] || {}).badgeClass || 'bg-gray-100 text-gray-700'} px-3 py-1.5 text-xs font-medium hover:opacity-100`}>
                {(orderStatusMeta[selectedOrder.orderStatus] || {}).label || selectedOrder.orderStatus}
              </Badge>
            )}
            <select
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="h-11 min-w-[240px] rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 font-mono"
            >
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderCode} - {formatPrice(o.finalPayment)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tiến trình Stepper 5 bước */}
        <div className="flex items-start gap-0 overflow-x-auto pb-4 pt-2">
          {timeline.map((step, index) => (
            <div key={step.key} className="flex min-w-[160px] flex-1 items-start">
              <div className="flex flex-col items-center text-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                    step.done
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {step.done ? <Check className="h-5 w-5" /> : <span className="text-sm font-bold">{index + 1}</span>}
                </div>
                <p className={`mt-2 max-w-[120px] text-center text-xs font-semibold leading-tight ${step.done ? 'text-gray-900' : 'text-gray-400'}`}>
                  {step.title}
                </p>
              </div>
              {index < timeline.length - 1 && (
                <div className={`mx-2 mt-5 h-[2px] flex-1 ${step.done ? 'bg-gray-900' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Thông tin vận chuyển */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs">
        <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Truck className="h-4 w-4 text-gray-700" />
          Thông tin vận chuyển
        </h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 text-xs">
          <div>
            <p className="mb-0.5 text-gray-500">Người nhận</p>
            <p className="text-sm font-medium text-gray-900">{selectedOrder?.customerName || '—'}</p>
          </div>
          <div>
            <p className="mb-0.5 text-gray-500">Số điện thoại</p>
            <p className="text-sm font-medium text-gray-900">{selectedOrder?.customerPhone || '—'}</p>
          </div>
          <div className="md:col-span-2">
            <p className="mb-0.5 text-gray-500">Địa chỉ giao hàng</p>
            <p className="text-sm font-medium text-gray-900">{selectedOrder?.shippingAddress || '—'}</p>
          </div>
          {selectedOrder?.deliveryShift && (
            <div>
              <p className="mb-0.5 text-gray-500">Ca vận chuyển</p>
              <p className="text-sm font-medium text-gray-900">{selectedOrder.deliveryShift}</p>
            </div>
          )}
          {selectedOrder?.scheduledDeliveryDate && (
            <div>
              <p className="mb-0.5 text-gray-500">Thời gian dự kiến giao</p>
              <p className="text-sm font-medium text-gray-900">{new Date(selectedOrder.scheduledDeliveryDate).toLocaleDateString('vi-VN')}</p>
            </div>
          )}
        </div>
      </section>

      {/* Sản phẩm & Chi tiết */}
      <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xs flex items-center justify-between">
        <div>
          <h4 className="mb-1 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Package className="h-4 w-4 text-gray-700" />
            Tổng giá trị đơn hàng
          </h4>
          <p className="text-lg font-bold text-gray-900">{formatPrice(selectedOrder?.finalPayment)}</p>
        </div>
        <button
          onClick={() => navigate(`/profile/orders/${selectedOrder.id}`)}
          className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl transition"
        >
          Xem chi tiết đơn hàng
        </button>
      </section>
    </div>
  )
}

function CreditHistoryTab() {
  const [history, setHistory] = useState([])
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        // Lấy profile để hiển thị số dư hiện tại trực tiếp từ DB
        const profileRes = await getCustomerProfile()
        const directBalance = profileRes?.availableCredit ?? profileRes?.data?.availableCredit ?? 0
        setBalance(directBalance)

        const res = await fetch('/api/customer-profile/credit-history', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        })
        if (res.ok) {
          const data = await res.json()
          setHistory(data)
        }
      } catch (err) {
        console.error("Lỗi tải lịch sử Credit:", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-100 bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">Lịch sử giao dịch Credit</h3>
          <div className="rounded-xl bg-blue-50/50 px-4 py-2 text-sm font-bold text-blue-700 border border-blue-100">
            Số dư hiện tại: {formatPrice(balance)}
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-gray-900"></div>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500">
            <Wallet className="mb-4 h-12 w-12 text-gray-300" />
            <p className="text-sm">Chưa có giao dịch Credit nào.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-6 py-4">Thời gian</th>
                  <th className="px-6 py-4">Mô tả</th>
                  <th className="px-6 py-4 text-right">Số tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {history.map((tx) => (
                  <tr key={tx.id} className="transition-colors hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {new Date(tx.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {tx.description}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                      {tx.amount > 0 ? (
                        <span className="text-emerald-600">+{formatPrice(tx.amount)}</span>
                      ) : (
                        <span className="text-red-600">{formatPrice(tx.amount)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

export default function Profile() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [successToast, setSuccessToast] = useState(null)
  const activeTab = searchParams.get('tab') || 'info'
  const activeTabMeta = profileTabs.find((tab) => tab.id === activeTab) ?? profileTabs[0]

  // Đọc needAddress từ location.state (khi redirect từ login)
  const location = useLocation()
  const needAddress = location.state?.needAddress === true

  const userName = user?.fullName || 'Nguyễn Văn A'
  const userEmail = user?.email || 'nguyen.van.a@company.com'
  const userPhone = user?.phoneNumber || '0901 234 567'
  const userInitial = userName.charAt(0).toUpperCase()

  function showSuccess(message) {
    setSuccessToast({ id: Date.now(), message })
  }

  const tabContent = {
    info: (
      <PersonalInfoTab
        user={user}
        onSuccess={showSuccess}
      />
    ),
    addresses: <AddressesTab onSuccess={showSuccess} needAddress={needAddress} />,
    tax: (
      <TaxInfoTab
        userName={userName}
        userEmail={userEmail}
        userPhone={userPhone}
        onSuccess={showSuccess}
      />
    ),
    orders: <OrderHistoryTab onSuccess={showSuccess} />,
    stats: <PersonalStatsTab />,
    quotations: <QuotationRequestsTab />,
    'sales-change': <SalesChangeRequestTab onSuccess={showSuccess} />,
    tracking: <OrderTrackingTab />,
    credit: <CreditHistoryTab />
  }

  function setTab(tabId) {
    setSearchParams({ tab: tabId })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <AnimatePresence>
        {successToast && (
          <SuccessToast key={successToast.id} message={successToast.message} onClose={() => setSuccessToast(null)} />
        )}
      </AnimatePresence>

      <div className="pt-20">
        <div className="border-b border-gray-100 bg-white">
          <div className="mx-auto max-w-[1440px] px-6 py-4 lg:px-8">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Link to="/" className="hover:text-gray-900">
                Trang Chủ
              </Link>
              <ChevronRight className="h-4 w-4" />
              <span className="font-medium text-gray-900">Tài khoản của tôi</span>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-[1440px] px-6 py-8 lg:px-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
            <aside className="lg:w-56 lg:flex-shrink-0">
              <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white lg:sticky lg:top-24">
                <div className="border-b border-gray-100 bg-gray-50 px-5 py-5">
                  <div className="flex items-center gap-3">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt="Avatar" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-sm font-bold text-white">
                        {userInitial}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-gray-900">{userName}</p>
                      <p className="truncate text-xs text-gray-500">{userEmail}</p>
                    </div>
                  </div>
                </div>

                <nav className="py-2">
                  {profileTabs.map((tab) => {
                    const isActive = activeTab === tab.id

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setTab(tab.id)}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                          isActive ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <tab.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{tab.label}</span>
                        {isActive && <ChevronRight className="ml-auto h-3.5 w-3.5 flex-shrink-0" />}
                      </button>
                    )
                  })}
                </nav>
              </div>
            </aside>

            <main className="min-w-0 flex-1">
              <div className="mb-6 flex items-center gap-2">
                <activeTabMeta.icon className="h-5 w-5 text-gray-700" />
                <h1 className="text-2xl font-bold text-gray-900">{activeTabMeta.label}</h1>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  {tabContent[activeTab] ?? tabContent.info}
                </motion.div>
              </AnimatePresence>
            </main>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
