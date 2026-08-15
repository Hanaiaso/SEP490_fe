import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    // e2e/ là bộ test Playwright riêng (package.json/node_modules độc lập, chạy qua
    // `npx playwright test`) — không phải test unit của vitest, phải loại khỏi glob mặc định
    // nếu không vitest sẽ cố import "@playwright/test" (chưa cài ở gốc frontend) và báo lỗi.
    exclude: ['**/node_modules/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      // BẮT BUỘC với dự án này: mặc định vitest KHÔNG ghi báo cáo coverage khi còn test đỏ.
      // Bộ test L1 luôn có ~10 test đỏ cố ý (assert theo SPEC), nếu để false sẽ không bao giờ
      // xuất được báo cáo.
      reportOnFailure: true,
      // Khai báo include -> vitest tự đếm CẢ file chưa có test nào (thay cho option `all`
      // đã bị bỏ khỏi vitest/coverage-v8 phiên bản mới). Nếu bỏ include, vitest chỉ đếm
      // file được test import, mẫu số nhỏ đi và % cao giả tạo.
      include: ['src/**/*.{js,jsx,ts,tsx}'],
      exclude: [
        'src/test/**',            // hạ tầng test (MSW, setup), không phải code sản phẩm
        'src/**/__tests__/**',
        'src/main.jsx',
        'src/App.tsx',
        'src/assets/**',
        'src/data/**',            // dữ liệu mẫu tĩnh
      ],
    },
  },
  server: {
    proxy: {
      // Proxy tất cả request /api/* → backend ASP.NET Core
      '/api': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
        secure: false, // Bỏ qua self-signed SSL cert khi dev
      },
      // Proxy file hóa đơn tĩnh /invoices/* → backend ASP.NET Core. Đơn cũ lưu InvoicePdfUrl
      // dạng tương đối; ở dev API_BASE là '/api' nên FILE_BASE rỗng và URL vẫn trỏ về origin
      // của Vite — không có proxy này thì SPA fallback nuốt request và trả index.html.
      '/invoices': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
        secure: false,
      },
      // Proxy SignalR WebSocket /hubs/* → backend ASP.NET Core
      '/hubs': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
        secure: false,
        ws: true, // Bắt buộc cho WebSocket (SignalR)
      },
    },
  },
})
