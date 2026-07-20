import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
  },
  server: {
    proxy: {
      // Proxy tất cả request /api/* → backend ASP.NET Core
      '/api': {
        target: 'http://127.0.0.1:5050',
        changeOrigin: true,
        secure: false, // Bỏ qua self-signed SSL cert khi dev
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
