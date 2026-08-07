const API_BASE = '/api'

async function request(method, url, body) {
  const accessToken = localStorage.getItem('accessToken')

  const headers = {}
  if (!(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers,
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
  })

  if (res.status === 204) {
    return null
  }

  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    // Ưu tiên hiện lỗi chi tiết theo từng trường (ModelState) nếu có
    let message = json.message || json.detail || `Lỗi ${res.status}`
    if (json.errors && typeof json.errors === 'object') {
      const fieldMessages = Object.values(json.errors).flat().filter(Boolean)
      if (fieldMessages.length > 0) {
        message = fieldMessages.join(' ')
      }
    }
    throw new Error(message)
  }

  return json
}

/**
 * Lấy thông tin cá nhân của người dùng hiện tại
 */
export async function getUserProfile() {
  return request('GET', '/user/profile')
}

/**
 * Cập nhật thông tin cá nhân (Họ tên, SĐT)
 * @param {{ fullName, phoneNumber }} data
 */
export async function updateUserProfile(data) {
  return request('PUT', '/user/profile', data)
}

/**
 * Tải ảnh đại diện lên
 * @param {File} file
 */
export async function uploadAvatar(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request('POST', '/user/avatar', formData)
}

/**
 * Xóa ảnh đại diện hiện tại
 */
export async function deleteAvatar() {
  return request('DELETE', '/user/avatar')
}

/**
 * Thay đổi mật khẩu
 * @param {{ currentPassword, newPassword, confirmPassword }} data
 */
export async function changePassword(data) {
  return request('POST', '/user/change-password', data)
}

/**
 * Kiểm tra trạng thái hồ sơ (có địa chỉ chưa).
 * @returns {Promise<{ isProfileCompleted: boolean, hasAddress: boolean }>}
 */
export async function getProfileStatus() {
  return request('GET', '/customer-profile/status')
}

/**
 * Lấy danh sách địa chỉ của người dùng
 */
export async function getAddresses() {
  return request('GET', '/user/addresses')
}

/**
 * Thêm địa chỉ mới
 * @param {{ name, phone, city, district, ward, addressLine, type, isDefault, provinceCode?, districtCode?, wardCode?, latitude?, longitude? }} data
 */
export async function createAddress(data) {
  return request('POST', '/user/addresses', data)
}

/**
 * Cập nhật địa chỉ hiện tại
 * @param {string} id
 * @param {{ name, phone, city, district, ward, addressLine, type, isDefault, provinceCode?, districtCode?, wardCode?, latitude?, longitude? }} data
 */
export async function updateAddress(id, data) {
  return request('PUT', `/user/addresses/${id}`, data)
}

/**
 * Xóa địa chỉ
 * @param {string} id
 */
export async function deleteAddress(id) {
  return request('DELETE', `/user/addresses/${id}`)
}

/**
 * Đặt địa chỉ làm mặc định
 * @param {string} id
 */
export async function setDefaultAddress(id) {
  return request('PATCH', `/user/addresses/${id}/set-default`)
}
