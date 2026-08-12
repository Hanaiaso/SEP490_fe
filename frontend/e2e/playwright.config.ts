import { defineConfig, devices } from '@playwright/test';

/**
 * L4 E2E — Report_5_4_L4-E2ETests_VietTien_v1_3.xlsx (47 case).
 *
 * Bo test nay TU CHUA: package.json + node_modules rieng trong thu muc e2e/.
 * Khong them dependency nao vao package.json cua app, khong sua vite.config.ts.
 * Xoa thu muc e2e/ la repo ve nguyen trang.
 *
 * Backend KHONG khai trong webServer — bat tay bang:
 *   powershell -ExecutionPolicy Bypass -File ..\..\..\SEP490_be\tests\run-l4-api.ps1
 * de nguoi chay nhin thay log ket noi DB va xac nhan dung DB local VietTien22_L3.
 */
export default defineConfig({
  testDir: './specs',
  outputDir: './test-results',

  // Seed tien dieu kien (dia chi khach, du 10 san pham Active, nha cung cap SUP-01).
  globalSetup: './seed/seed-l4.ts',

  // Tuan tu. Cac case dung chung ton kho / hang doi marketing / round-robin; chay song song
  // se do gia vi tranh chap du lieu.
  workers: 1,
  fullyParallel: false,

  // Moi lan retry la them mot luot du lieu rac trong DB (don hang, OTP, bai marketing).
  retries: 0,

  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: [
    ['list'],
    ['html', { outputFolder: './playwright-report', open: 'never' }],
    ['json', { outputFile: './playwright-report/results.json' }],
  ],

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    locale: 'vi-VN',
    timezoneId: 'Asia/Ho_Chi_Minh',
  },

  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
      testIgnore: /05-responsive/,
    },
    {
      // NFR-U01: >= 375px. Chi L4-RS-01..04 chay o project nay.
      name: 'mobile375',
      use: { ...devices['Pixel 5'], viewport: { width: 375, height: 812 } },
      testMatch: /05-responsive/,
    },
  ],

  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    cwd: '..',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
