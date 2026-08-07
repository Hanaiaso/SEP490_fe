// ─── Base config ─────────────────────────────────────────────────────────────
const API_BASE = '/api'  // Vite proxy → http://localhost:5112

// Gộp các lần refresh chạy song song (nhiều request 401 cùng lúc) thành 1 lần gọi API.
let refreshPromise = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: localStorage.getItem('refreshToken') }),
      });
      if (!res.ok) throw new Error('Không thể làm mới phiên đăng nhập');
      const json = await res.json();
      localStorage.setItem('accessToken', json.data.accessToken);
      localStorage.setItem('refreshToken', json.data.refreshToken);
    })();
  }
  try {
    await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

function clearSessionAndRedirectToLogin() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

export async function fetchWithToken(method, url, body, _isRetry = false) {
  const accessToken = localStorage.getItem('accessToken');
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : {};

  if (!res.ok) {
    if (res.status === 401 && !_isRetry) {
      try {
        await refreshAccessToken();
      } catch {
        clearSessionAndRedirectToLogin();
        throw new Error(json.message || `Lỗi ${res.status}`);
      }
      return fetchWithToken(method, url, body, true);
    }
    if (res.status === 401) {
      clearSessionAndRedirectToLogin();
    }
    throw new Error(json.message || `Lỗi ${res.status}`);
  }
  return json;
}

export async function fetchFormDataWithToken(method, url, formData) {
  const accessToken = localStorage.getItem('accessToken');
  const headers = {};
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers, // Let browser set Content-Type with boundary for FormData
    body: formData,
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : {};

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    throw new Error(json.message || `Lỗi ${res.status}`);
  }
  return json;
}

async function request(method, url, body) {
  const accessToken = localStorage.getItem('accessToken')

  const headers = { 'Content-Type': 'application/json' }
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`

  const res = await fetch(`${API_BASE}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(json.message || `Lỗi ${res.status}`)
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
  return request('PUT', '/auth/complete-profile', data)
}

/**
 * Đăng xuất — thu hồi Refresh Token trên server.
 */
export async function logout() {
  return request('POST', '/auth/logout')
}

/**
 * Lấy thông tin thuế (CustomerProfile) của người dùng hiện tại.
 */
export async function getCustomerProfile() {
  return request('GET', '/customer-profile')
}

/**
 * Cập nhật thông tin thuế (CustomerProfile) của người dùng hiện tại.
 * @param {{ taxCode, companyName, companyAddress, invoiceEmail, representative, companyPhone }} data
 */
export async function updateCustomerProfile(data) {
  return request('PUT', '/customer-profile', data)
}
