// ─── Base config ─────────────────────────────────────────────────────────────
import { API_BASE } from './apiBase';
import { authFetch } from './httpClient';

function extractErrorMessage(status, json, text) {
  if (json && typeof json === 'object') {
    if (json.message) return json.message;
    if (json.Message) return json.Message;
    if (json.detail) return json.detail;
    if (json.errors && typeof json.errors === 'object') {
      const msgs = [];
      for (const k of Object.keys(json.errors)) {
        const val = json.errors[k];
        if (Array.isArray(val)) msgs.push(...val);
        else if (typeof val === 'string') msgs.push(val);
      }
      if (msgs.length > 0) return msgs.join(', ');
    }
    if (json.title && json.title !== 'Bad Request' && json.title !== 'One or more validation errors occurred.') {
      return json.title;
    }
  }
  if (typeof text === 'string' && text.trim().length > 0 && text.trim().length < 250 && !text.includes('<html')) {
    return text.trim();
  }
  return `Lỗi ${status}`;
}

/**
 * @param {string} method
 * @param {string} url
 * @param {any} [body]
 * @returns {Promise<any>}
 */
export async function fetchWithToken(method, url, body) {
  const res = await authFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }

  // 401 sau khi authFetch đã thử refresh nghĩa là phiên thật sự hết hạn — authFetch tự xoá
  // phiên + điều hướng /login, ở đây chỉ cần throw để dừng luồng gọi tiếp theo.
  if (!res.ok) {
    throw new Error(extractErrorMessage(res.status, json, text));
  }
  return json;
}

/**
 * @param {string} method
 * @param {string} url
 * @param {FormData} formData
 * @returns {Promise<any>}
 */
export async function fetchFormDataWithToken(method, url, formData) {
  // Không set Content-Type: để trình duyệt tự gắn boundary cho multipart/form-data.
  const res = await authFetch(url, { method, body: formData });

  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }

  if (!res.ok) {
    throw new Error(extractErrorMessage(res.status, json, text));
  }
  return json;
}

/**
 * @param {string} method
 * @param {string} url
 * @param {any} [body]
 * @returns {Promise<any>}
 */
async function request(method, url, body) {
  const accessToken = localStorage.getItem('accessToken')

  const headers = { 'Content-Type': 'application/json' }
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }

  if (!res.ok) {
    throw new Error(extractErrorMessage(res.status, json, text));
  }

  return json
}

// ─── Auth endpoints ──────────────────────────────────────────────────────────

/**
 * Đăng ký tài khoản. Sau khi thành công, OTP sẽ được gửi qua email.
 * @param {{ fullName, email, phoneNumber, password, confirmPassword }} data
 */
export async function register(data) {
  return request('POST', '/auth/register', data)
}

/**
 * Xác minh OTP để kích hoạt tài khoản.
 * @param {{ email, otpCode }} data
 */
export async function verifyOtp(data) {
  return request('POST', '/auth/verify-otp', data)
}

/**
 * Yêu cầu gửi mã OTP SMS để xác minh số điện thoại.
 */
export async function requestPhoneOtp(phoneNumber) {
  return request('POST', '/auth/request-phone-otp', { phoneNumber })
}

/**
 * Xác thực mã OTP SMS.
 */
export async function verifyPhoneOtp(otpCode, phoneNumber) {
  return request('POST', '/auth/verify-phone-otp', { otpCode, phoneNumber })
}

/**
 * Gửi lại OTP.
 */
export async function resendOtp(email) {
  return request('POST', '/auth/resend-otp', { email })
}

/**
 * Đăng nhập bằng email/mật khẩu.
 * @param {{ email, password }} data
 * @returns {{ message, data: { accessToken, refreshToken, expiresAt, user } }}
 */
export async function login(data) {
  return request('POST', '/auth/login', data)
}

/**
 * Đăng nhập bằng Google ID Token từ Google Sign-In.
 * @param {{ idToken }} data
 */
export async function loginWithGoogle(data) {
  return request('POST', '/auth/google-login', data)
}

/**
 * Yêu cầu gửi email đặt lại mật khẩu.
 * @param {{ email }} data
 */
export async function forgotPassword(data) {
  return request('POST', '/auth/forgot-password', data)
}

/**
 * Đặt lại mật khẩu bằng token từ email.
 * @param {{ token, email, newPassword, confirmPassword }} data
 */
export async function resetPassword(data) {
  return request('POST', '/auth/reset-password', data)
}

/**
 * Làm mới Access Token bằng Refresh Token.
 * @param {{ refreshToken }} data
 */
export async function refreshToken(data) {
  return request('POST', '/auth/refresh-token', data)
}

/**
 * Hoàn thiện hồ sơ sau khi đăng ký bằng Google.
 * @param {{ fullName, phoneNumber }} data
 */
export async function completeProfile(data) {
  return fetchWithToken('PUT', '/auth/complete-profile', data)
}

// Các endpoint dưới đây yêu cầu đăng nhập (khác register/login/OTP/reset-password ở trên,
// vốn là pre-auth và không được đi qua authFetch — 401 do sai mật khẩu sẽ bị authFetch hiểu
// nhầm thành hết phiên và đá về /login). Dùng fetchWithToken để có silent refresh (NFR-SEC02).

/**
 * Đăng xuất — thu hồi Refresh Token trên server.
 */
export async function logout() {
  return fetchWithToken('POST', '/auth/logout')
}

/**
 * Lấy thông tin thuế (CustomerProfile) của người dùng hiện tại.
 */
export async function getCustomerProfile() {
  return fetchWithToken('GET', '/customer-profile')
}

/**
 * Cập nhật thông tin thuế (CustomerProfile) của người dùng hiện tại.
 * @param {{ taxCode, companyName, companyAddress, invoiceEmail, representative, companyPhone }} data
 */
export async function updateCustomerProfile(data) {
  return fetchWithToken('PUT', '/customer-profile', data)
}
