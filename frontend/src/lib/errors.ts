/**
 * Trích message người dùng-đọc-được từ 1 lỗi bắt trong catch (kiểu unknown), hỗ trợ cả
 * Error thường (throw new Error(...) từ các service dùng fetch) lẫn lỗi dạng axios
 * (err.response.data.message).
 */
export function getErrorMessage(err: unknown, fallback = 'Đã xảy ra lỗi'): string {
  if (err && typeof err === 'object') {
    const withMessage = err as { message?: string; response?: { data?: { message?: string } } }
    return withMessage.response?.data?.message || withMessage.message || fallback
  }
  return fallback
}
