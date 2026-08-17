// Base URL cho REST API và SignalR hub, đọc từ biến môi trường build-time.
// - Dev (Vite proxy) hoặc khi build chưa set VITE_API_URL/VITE_HUB_URL: giữ đường dẫn tương đối
//   như cũ (proxy trong vite.config.ts lo phần forward tới backend local).
// - Production (Azure Static Web Apps + Azure App Service ở 2 domain khác nhau): cần domain
//   tuyệt đối, lấy từ VITE_API_URL/VITE_HUB_URL (set trong GitHub Actions secrets).
export const API_BASE = import.meta.env.VITE_API_URL || '/api'
export const HUB_BASE = import.meta.env.VITE_HUB_URL || '/hubs'

// Origin phục vụ file tĩnh của backend (bỏ hậu tố /api khỏi API_BASE).
export const FILE_BASE = API_BASE.replace(/\/api\/?$/, '')

/**
 * Phân giải URL file do backend trả về (vd: order.invoicePdfUrl).
 * Backend trả về 2 dạng:
 * - Tuyệt đối (Cloudinary) -> dùng nguyên.
 * - Tương đối "/invoices/xxx.pdf" (đơn cũ, file nằm trong wwwroot của API) -> phải gắn origin
 *   của API. Nếu để nguyên, trình duyệt phân giải theo origin của FRONTEND, SPA fallback trả
 *   index.html, React Router không khớp route nào và đẩy người dùng về dashboard.
 * @param {string | null | undefined} url
 * @returns {string | null}
 */
export function resolveApiFileUrl(url) {
  if (!url) return null
  if (/^https?:\/\//i.test(url)) return url
  return `${FILE_BASE}${url.startsWith('/') ? '' : '/'}${url}`
}
