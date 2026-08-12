// Tiền tố key SystemConfig thuộc nhóm "Tích hợp hệ thống" (UC-59) — tách riêng khỏi trang
// "Cấu hình hệ thống" (tham số nghiệp vụ) để tránh trộn lẫn 2 nhóm khác bản chất.
export const INTEGRATION_KEY_PREFIXES = ['SEPAY_', 'GOOGLE_', 'ESMS_', 'EMAIL_', 'MAKE_'];

export function isIntegrationConfigKey(key: string): boolean {
  return INTEGRATION_KEY_PREFIXES.some(prefix => key.startsWith(prefix));
}
