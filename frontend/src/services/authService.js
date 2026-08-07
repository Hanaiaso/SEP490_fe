// ─── Base config ─────────────────────────────────────────────────────────────
const API_BASE = '/api'  // Vite proxy → http://localhost:5112

async function doFetchWithToken(method, url, body) {
  const accessToken = localStorage.getItem('accessToken');
  const headers = { 'Content-Type': 'application/json' };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  return fetch(`${API_BASE}${url}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
}

// Refresh token bằng RefreshToken lưu trong localStorage. Trả về true nếu accessToken mới
// đã được lưu lại, false nếu refresh thất bại (RefreshToken thiếu hoặc hết hạn).
async function tryRefreshAccessToken() {
  const storedRefreshToken = localStorage.getItem('refreshToken');
  if (!storedRefreshToken) return false;

  try {
    const res = await refreshToken({ refreshToken: storedRefreshToken });
    const { accessToken, refreshToken: newRefreshToken } = res.data || {};
    if (!accessToken) return false;

    localStorage.setItem('accessToken', accessToken);
    if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
    return true;
  } catch {
    return false;
  }
}

export async function fetchWithToken(method, url, body) {
  let res = await doFetchWithToken(method, url, body);

  // Access token hết hạn -> silent refresh rồi thử lại request gốc đúng 1 lần.
  if (res.status === 401 && (await tryRefreshAccessToken())) {
    res = await doFetchWithToken(method, url, body);
  }

  const text = await res.text();
  const json = text ? JSON.parse(text) : {};

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
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
