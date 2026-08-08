// Base URL cho REST API và SignalR hub, đọc từ biến môi trường build-time.
// - Dev (Vite proxy) hoặc khi build chưa set VITE_API_URL/VITE_HUB_URL: giữ đường dẫn tương đối
//   như cũ (proxy trong vite.config.ts lo phần forward tới backend local).
// - Production (Azure Static Web Apps + Azure App Service ở 2 domain khác nhau): cần domain
//   tuyệt đối, lấy từ VITE_API_URL/VITE_HUB_URL (set trong GitHub Actions secrets).
export const API_BASE = import.meta.env.VITE_API_URL || '/api'
export const HUB_BASE = import.meta.env.VITE_HUB_URL || '/hubs'
