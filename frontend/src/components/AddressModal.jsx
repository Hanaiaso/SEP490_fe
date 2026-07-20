import { useEffect, useState } from 'react'
import { Loader2, MapPin } from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from './ui/Button.jsx'
import { Input } from './ui/Input.jsx'
import { getProvinces, getWards } from '../services/provinceService.js'

export function buildFullAddress({ addressLine, ward, district, city }) {
  return [addressLine, ward, district, city].filter(Boolean).join(', ')
}

export const emptyAddressForm = {
  id: '',
  name: '',
  phone: '',
  city: '',
  district: '',
  ward: '',
  addressLine: '',
  type: 'Nhà riêng',
  isDefault: false,
  provinceCode: '',
  districtCode: '',
  wardCode: '',
  latitude: null,
  longitude: null,
}

const ADDRESS_TYPES = ['Nhà riêng', 'Công ty', 'Kho hàng']

export default function AddressModal({
  title,
  form,
  onChange,
  onClose,
  onSubmit,
  submitLabel,
}) {
  // ─── Danh mục tỉnh/phường (2 cấp sau sáp nhập) ─────────────────────────────
  const [provinces, setProvinces] = useState([])
  const [wards, setWards] = useState([])
  const [loadingProvinces, setLoadingProvinces] = useState(true)
  const [loadingWards, setLoadingWards] = useState(false)

  // GPS state
  const [gettingLocation, setGettingLocation] = useState(false)
  const [locationError, setLocationError] = useState('')

  // Load provinces on mount
  useEffect(() => {
    let cancelled = false
    setLoadingProvinces(true)
    getProvinces()
      .then((data) => {
        if (!cancelled) setProvinces(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingProvinces(false)
      })
    return () => { cancelled = true }
  }, [])

  // Load wards (phường/xã) trực tiếp khi form.provinceCode thay đổi (mô hình 2 cấp)
  useEffect(() => {
    if (!form.provinceCode) {
      setWards([])
      return
    }
    let cancelled = false
    setLoadingWards(true)
    getWards(form.provinceCode)
      .then((data) => {
        if (!cancelled) setWards(data)
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingWards(false)
      })
    return () => { cancelled = true }
  }, [form.provinceCode])

  // ─── Handlers ───────────────────────────────────────────────────────────────
  function handleProvinceChange(e) {
    const code = e.target.value
    const selected = provinces.find((p) => String(p.code) === code)
    onChange('provinceCode', code)
    onChange('city', selected?.name || '')
    // Không còn cấp quận/huyện — giữ rỗng cho tương thích
    onChange('districtCode', '')
    onChange('district', '')
    // Reset phường/xã
    onChange('wardCode', '')
    onChange('ward', '')
  }

  function handleWardChange(e) {
    const code = e.target.value
    const selected = wards.find((w) => String(w.code) === code)
    onChange('wardCode', code)
    onChange('ward', selected?.name || '')
  }

  // ─── Lấy vị trí hiện tại ───────────────────────────────────────────────────
  async function handleGetLocation() {
    if (!navigator.geolocation) {
      setLocationError('Trình duyệt không hỗ trợ định vị.')
      return
    }

    setGettingLocation(true)
    setLocationError('')

    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        })
      })

      const { latitude, longitude } = position.coords
      onChange('latitude', latitude)
      onChange('longitude', longitude)

      // Reverse geocode qua Nominatim
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1&accept-language=vi`,
        { headers: { 'User-Agent': 'VietTienApp/1.0' } }
      )
      const geo = await res.json()

      if (geo?.address) {
        // Auto-fill addressLine
        const road = geo.address.road || geo.address.pedestrian || ''
        const houseNumber = geo.address.house_number || ''
        if (road) {
          onChange('addressLine', [houseNumber, road].filter(Boolean).join(' '))
        }

        // Tìm tỉnh/thành phố phù hợp
        const geoState = geo.address.state || geo.address.city || ''
        if (geoState && provinces.length > 0) {
          const matchedProvince = findBestMatch(geoState, provinces)
          if (matchedProvince) {
            onChange('provinceCode', String(matchedProvince.code))
            onChange('city', matchedProvince.name)
            // Không còn cấp quận/huyện
            onChange('districtCode', '')
            onChange('district', '')

            // Load phường/xã trực tiếp theo tỉnh và tìm phường/xã phù hợp
            try {
              const wds = await getWards(matchedProvince.code)
              setWards(wds)

              const geoWard = geo.address.quarter || geo.address.village
                || geo.address.hamlet || geo.address.suburb
                || geo.address.city_district || geo.address.town || ''
              if (geoWard && wds.length > 0) {
                const matchedWard = findBestMatch(geoWard, wds)
                if (matchedWard) {
                  onChange('wardCode', String(matchedWard.code))
                  onChange('ward', matchedWard.name)
                }
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      if (err.code === 1) {
        setLocationError('Bạn đã từ chối quyền vị trí. Vui lòng chọn thủ công.')
      } else {
        setLocationError('Không thể lấy vị trí. Vui lòng thử lại.')
      }
    } finally {
      setGettingLocation(false)
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  const selectClass = 'h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10 disabled:bg-gray-50 disabled:text-gray-400'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h3 className="mb-5 text-lg font-bold text-gray-900">{title}</h3>

        <form onSubmit={onSubmit} className="space-y-3">
          {/* Tên + SĐT */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Họ tên người nhận</label>
              <Input
                placeholder="Nguyễn Văn A"
                className="rounded-xl text-sm"
                value={form.name}
                onChange={(e) => onChange('name', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Số điện thoại</label>
              <Input
                placeholder="0901 234 567"
                className="rounded-xl text-sm"
                value={form.phone}
                onChange={(e) => onChange('phone', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Nút lấy vị trí */}
          <div>
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 rounded-xl border-dashed border-gray-300 text-sm text-gray-600 hover:border-gray-900 hover:text-gray-900"
              onClick={handleGetLocation}
              disabled={gettingLocation}
            >
              {gettingLocation ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang lấy vị trí...
                </>
              ) : (
                <>
                  <MapPin className="h-4 w-4" />
                  📍 Lấy vị trí hiện tại
                </>
              )}
            </Button>
            {locationError && (
              <p className="mt-1 text-xs text-red-500">{locationError}</p>
            )}
            {form.latitude && form.longitude && (
              <p className="mt-1 text-xs text-emerald-600">
                ✓ Đã xác định vị trí ({form.latitude.toFixed(4)}, {form.longitude.toFixed(4)})
              </p>
            )}
          </div>

          {/* Tỉnh/Thành phố */}
          <div>
            <label className="mb-1 block text-xs text-gray-500">Tỉnh/Thành phố</label>
            <select
              className={selectClass}
              value={form.provinceCode || ''}
              onChange={handleProvinceChange}
              disabled={loadingProvinces}
              required
            >
              <option value="">
                {loadingProvinces ? 'Đang tải...' : '-- Chọn Tỉnh/Thành phố --'}
              </option>
              {provinces.map((p) => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Phường/Xã (2 cấp — load trực tiếp theo Tỉnh/Thành phố) */}
          <div>
            <label className="mb-1 block text-xs text-gray-500">Phường/Xã</label>
            <select
              className={selectClass}
              value={form.wardCode || ''}
              onChange={handleWardChange}
              disabled={!form.provinceCode || loadingWards}
              required
            >
              <option value="">
                {loadingWards ? 'Đang tải...' : '-- Chọn Phường/Xã --'}
              </option>
              {wards.map((w) => (
                <option key={w.code} value={w.code}>{w.name}</option>
              ))}
            </select>
          </div>

          {/* Địa chỉ chi tiết */}
          <div>
            <label className="mb-1 block text-xs text-gray-500">Địa chỉ chi tiết (số nhà, tên đường)</label>
            <Input
              placeholder="123 Đường ABC"
              className="rounded-xl text-sm"
              value={form.addressLine}
              onChange={(e) => onChange('addressLine', e.target.value)}
              required
            />
          </div>

          {/* Loại địa chỉ */}
          <div>
            <label className="mb-1 block text-xs text-gray-500">Loại địa chỉ</label>
            <div className="flex gap-2">
              {ADDRESS_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => onChange('type', type)}
                  className={`rounded-full border px-4 py-2 text-xs font-medium transition-all ${
                    form.type === type
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Mặc định */}
          <label className="flex cursor-pointer items-center gap-2 pt-1">
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(event) => onChange('isDefault', event.target.checked)}
              className="h-4 w-4 accent-gray-900"
            />
            <span className="text-sm text-gray-700">Đặt làm địa chỉ mặc định</span>
          </label>

          {/* Buttons */}
          <div className="mt-5 flex gap-3">
            <Button type="button" variant="outline" className="flex-1 rounded-full" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" className="flex-1 rounded-full bg-gray-900 text-white hover:bg-gray-800">
              {submitLabel}
            </Button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// ─── Helpers: fuzzy match tên tỉnh/quận/phường ─────────────────────────────
function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

function findBestMatch(query, items) {
  const q = normalize(query)
  // 1. Exact match
  let match = items.find((item) => normalize(item.name) === q)
  if (match) return match
  // 2. Contains match
  match = items.find((item) => normalize(item.name).includes(q) || q.includes(normalize(item.name)))
  if (match) return match
  // 3. Word overlap match
  const qWords = q.split(/\s+/)
  let bestScore = 0
  let bestItem = null
  for (const item of items) {
    const iWords = normalize(item.name).split(/\s+/)
    const overlap = qWords.filter((w) => iWords.some((iw) => iw.includes(w) || w.includes(iw))).length
    const score = overlap / Math.max(qWords.length, iWords.length)
    if (score > bestScore && score >= 0.4) {
      bestScore = score
      bestItem = item
    }
  }
  return bestItem
}
