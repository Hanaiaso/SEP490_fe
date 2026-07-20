// ─── Province / Ward API (public) ───────────────────────────────────────────
// Nguồn: https://provinces.open-api.vn/api/v2  (SAU SÁP NHẬP 07/2025 — mô hình 2 cấp)
// Tỉnh/Thành phố → Phường/Xã (KHÔNG còn cấp Quận/Huyện).
// FE gọi trực tiếp — không qua backend.

const PROVINCE_API = 'https://provinces.open-api.vn/api/v2'

/**
 * Lấy danh sách tỉnh/thành phố (34 tỉnh/thành sau sáp nhập).
 * @returns {Promise<Array<{ code: number, name: string }>>}
 */
export async function getProvinces() {
  const res = await fetch(`${PROVINCE_API}/p/`)
  if (!res.ok) throw new Error('Không thể tải danh sách tỉnh/thành phố')
  return res.json()
}

/**
 * Lấy danh sách phường/xã theo tỉnh/thành (mô hình 2 cấp — lấy trực tiếp, không qua quận/huyện).
 * @param {number|string} provinceCode
 * @returns {Promise<Array<{ code: number, name: string }>>}
 */
export async function getWards(provinceCode) {
  if (!provinceCode) return []
  const res = await fetch(`${PROVINCE_API}/p/${provinceCode}?depth=2`)
  if (!res.ok) throw new Error('Không thể tải danh sách phường/xã')
  const data = await res.json()
  return data.wards || []
}
