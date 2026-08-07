# Hướng dẫn chạy Unit Test (L1) — Frontend

Áp dụng cho `SEP490_fe/frontend`, đối chiếu theo doc `Report_5_2_L1-UnitTests_VietTien_v2_3.xlsx`
(3 sheet FE: FE-Services, FE-Contexts, FE-Components — 24 case, cộng 5 case đề xuất cho v2.4).
Hướng dẫn cho Backend nằm ở `SEP490_be/HUONG_DAN_CHAY_UNIT_TEST.md`.

---

## 1. Chuẩn bị (chỉ làm 1 lần)

### Yêu cầu
- Node.js 20+ (`node --version`)

### Cài dependency

```bash
npm --prefix D:\SEP490\SEP490_fe\frontend install
```

Bộ test dùng: **Vitest + jsdom + React Testing Library + MSW**. `msw` là devDependency,
`npm install` sẽ tự kéo về — không cần cài tay.

### ⚠ KHÔNG cần chạy backend

MSW chặn toàn bộ request ở tầng network và trả về dữ liệu giả, nên test FE chạy hoàn toàn offline.
**Không cần** `dotnet run`, không cần SQL Server, không cần `appsettings.Development.json`.

---

## 2. Chạy test

Chạy toàn bộ:

```bash
npm --prefix D:\SEP490\SEP490_fe\frontend test
```

Chế độ watch (tự chạy lại khi sửa file):

```bash
npx vitest
```

Chạy 1 file:

```bash
npx vitest run src/components/__tests__/forms.test.jsx
```

Chạy 1 case theo Test ID trong doc:

```bash
npx vitest run -t "L1-FCMP-07"
```

Mở giao diện xem kết quả:

```bash
npx vitest --ui
```

---

## 3. ⚠ KẾT QUẢ MONG ĐỢI — 10 test đỏ

```
Test Files  8 failed | 7 passed (15)
     Tests  10 failed | 53 passed (63)
```

10 test đỏ chia làm **2 nhóm khác hẳn nhau**:

### Nhóm A — 5 test đỏ CÓ CHỦ ĐÍCH (assert theo SPEC, chờ sửa code)

Có comment `🔴 SPEC GAP` ngay phía trên `it()`. Khi code được sửa cho đúng spec, test tự chuyển xanh.

| Test ID | Vấn đề |
|---|---|
| `L1-FES-02` | `fetchWithToken` **không có silent refresh** — gặp 401 là xoá session và đá về `/login` ngay, dù refresh token còn hạn (NFR-SEC02) |
| `L1-FEC-08` | `mergeGuestCartIntoServer` gộp giỏ lỗi chỉ `console.error`, **không gọi `setError`** → khách không biết giỏ hàng chưa được gộp |
| `L1-FCMP-05` | `Cart.jsx` có hiện khối "Yêu cầu báo giá đặc biệt" khi ≥ 100 triệu nhưng **vẫn giữ nút "Đặt Hàng & Xem Hóa Đơn"** bên cạnh → khách bấm đặt hàng thẳng được (FT-02 AC-03) |
| `L1-FCMP-07` (×2 case) | `PhoneVerificationModal` chỉ kiểm tra rỗng, **không validate định dạng SĐT** (FT-01 NAC-02) |

> `L1-FEC-04` từng đỏ nhưng **đã chuyển XANH** (01/08): FE cài xong giỏ tạm cho khách vãng lai
> (`cartService.addGuestCartItem` → `localStorage['guestCart']`, gộp lên server sau khi đăng nhập).

### Nhóm B — 5 test đỏ CÓ TỪ TRƯỚC (không thuộc doc L1, cần chủ file tự sửa)

| File | Số test đỏ | Nguyên nhân |
|---|---|---|
| `src/pages/__tests__/Cart.test.jsx` | 1 | Render page mà **không bọc `CartProvider`/`AuthProvider`** → `Error: useCart must be used within a CartProvider` |
| `src/pages/__tests__/Checkout.test.jsx` | 1 | Như trên |
| `src/pages/__tests__/OrderDetail.test.jsx` | 1 | Như trên |
| `src/pages/__tests__/Profile.test.jsx` | 2 | Như trên |

> Đã xác minh 5 test này **đỏ từ trước khi thêm MSW**: stash `src/test/setup.js` về bản gốc rồi chạy
> lại vẫn đỏ y hệt. Cách sửa: bọc component trong provider, hoặc `vi.mock` context như
> `src/pages/__tests__/CartCheckout.test.jsx` đang làm.

Chi tiết đầy đủ: **`SEP490_be/VietTien.Tests/DOC_MISMATCHES.md`**.

---

## 4. Cấu trúc thư mục test

```
src/
├── test/
│   ├── setup.js              # Đăng ký MSW + polyfill IntersectionObserver/ResizeObserver/matchMedia
│   └── msw/
│       ├── server.js         # setupServer dùng chung
│       └── handlers.js       # Handler mặc định cho /api/*
├── services/__tests__/
│   ├── authService.test.jsx        (FES-01..03)
│   ├── serviceContracts.test.jsx   (FES-04..06)
│   ├── resendOtp.test.jsx          (FES-07..08)
│   ├── api.test.jsx                (FES-09  — đề xuất v2.4)
│   └── adminServices.test.jsx      (FES-10..11 — đề xuất v2.4)
├── context/__tests__/
│   ├── AuthContext.test.jsx        (FEC-01..02)
│   ├── CartContext.test.jsx        (FEC-03..04, FEC-06..08)
│   └── ToastContext.test.jsx       (FEC-05)
├── components/__tests__/
│   ├── ProtectedRoute.test.jsx     (FCMP-01..02, 11, 12, 13)
│   └── forms.test.jsx              (FCMP-07..10)
└── pages/__tests__/
    └── CartCheckout.test.jsx       (FCMP-03, FCMP-05)
```

Cấu hình Vitest nằm trong `vite.config.ts` (mục `test`), không có file `vitest.config.ts` riêng.

---

## 5. Quy ước khi viết test mới

1. **Mỗi test mang Test ID của doc ngay trong tên `it()`** — đây là thứ duy nhất nối test với case
   trong Excel, và cũng để `npx vitest run -t "L1-..."` chạy được đúng 1 case:
   ```jsx
   it('L1-FCMP-08 Pagination ở trang 1 vô hiệu hoá nút Prev', () => { ... })
   ```
   **Đừng đặt mã vào tên `describe`** — nó sẽ "nuốt" mã của các test con khi đối chiếu.

2. **Đuôi file là `.jsx`, không phải `.tsx`** — dự án là JavaScript (doc ghi "frontend TypeScript" là sai).

3. **Giả lập API bằng MSW**, không mock `fetch` thủ công. Handler riêng cho từng test:
   ```jsx
   server.use(http.get('/api/orders', () => HttpResponse.json({ items: [] })))
   ```
   `setup.js` đặt `onUnhandledRequest: 'error'` → **request nào không có handler sẽ làm test đỏ**.
   Đây là chủ ý: buộc mọi lời gọi mạng phải được khai báo tường minh.

4. **Component dùng SignalR** (vd `NotificationBell`) phải `vi.mock('@microsoft/signalr', ...)`,
   nếu không test sẽ cố mở WebSocket thật. Xem `forms.test.jsx` làm mẫu.

5. **Component đọc `localStorage.getItem('accessToken')` mới gọi API** — nhớ set token trước khi render:
   ```jsx
   localStorage.setItem('accessToken', 'jwt-1')
   ```
   `setup.js` tự `localStorage.clear()` sau mỗi test.

6. **Đừng thay cả `window.location`** để bắt điều hướng — làm vậy sẽ mất `origin` và `localStorage`
   nhảy sang storage area khác. Xem cách stub đúng trong `authService.test.jsx` (L1-FES-03).

---

## 6. Xem Test Coverage (độ phủ code)

### Cài một lần

```bash
npm --prefix D:\SEP490\SEP490_fe\frontend install -D @vitest/coverage-v8
```

Vitest **không thể** đo coverage nếu thiếu package này. Cấu hình đã có sẵn trong `vite.config.ts`.

> ⚠ Hai option sống còn trong cấu hình, đừng gỡ:
> - **`reportOnFailure: true`** — mặc định vitest **KHÔNG ghi báo cáo khi còn test đỏ**. Bộ test này
>   luôn có 10 test đỏ cố ý, không bật thì chạy xong chẳng thấy thư mục `coverage/` đâu.
> - **`all: true`** — mặc định chỉ đếm file được test import, làm % cao giả tạo vì file chưa ai
>   test thì không nằm trong mẫu số.

### Chạy

Số thô (toàn bộ `src/`):

```bash
npx vitest run --coverage
```

Số theo phạm vi L1 (bỏ `src/pages/` — thuộc L4 E2E):

```bash
npx vitest run --coverage --coverage.exclude="src/pages/**" --coverage.exclude="src/test/**" --coverage.exclude="src/**/__tests__/**" --coverage.exclude="src/main.jsx" --coverage.exclude="src/App.tsx" --coverage.exclude="src/assets/**" --coverage.exclude="src/data/**" --coverage.reportsDirectory=./coverage-l1
```

Mở báo cáo:

```bash
start D:\SEP490\SEP490_fe\frontend\coverage-l1\index.html
```

### Kết quả đo 02/08/2026

| Phạm vi | Lines | Branches | Functions |
|---|---|---|---|
| **Toàn bộ `src/`** (số thô) | **7,4%** (633/8.569) | 4,4% | 5,0% |
| **Phạm vi L1** (services + context + components) | **23,9%** (380/1.589) | 15,7% | 19,7% |

Chênh lệch do `src/pages/` chiếm **35.426 dòng = 82% code FE**, thuộc phạm vi **L4 E2E** chứ không
phải L1 — trong 106 page chỉ 5 page có test.

### Nhận định thẳng thắn

**23,9% là thấp** và cần nói rõ khi báo cáo, đừng che. Nguyên nhân: L1 hiện chỉ phủ 5/26 service FE.
13 file còn 0% coverage, lớn nhất là:

| File | Dòng |
|---|---|
| `src/utils/exportPdf.js` | 79 |
| `src/services/warehouseService.js` | 78 |
| `src/services/adminAuditLogService.js` | 31 |
| `src/hooks/useChat.js` | 28 |
| `src/services/purchaseOrderService.js` | 25 |

Đây chính là danh sách việc cho đợt mở rộng test tiếp theo — ưu tiên các `service` vì chúng là
logic thuần, đúng tầm L1 và rẻ để test.

---

## 7. Lỗi thường gặp

| Triệu chứng | Nguyên nhân & cách xử lý |
|---|---|
| `Tests 10 failed \| 53 passed` | **Bình thường** — xem mục 3 |
| `[MSW] Error: intercepted a request without a matching request handler` | Component gọi endpoint chưa khai báo → thêm handler vào `src/test/msw/handlers.js` hoặc `server.use(...)` trong test |
| `IntersectionObserver is not defined` | Component dùng `motion/react`. Polyfill đã có trong `setup.js` — kiểm tra file test có bị bỏ qua `setupFiles` không |
| `useCart must be used within a CartProvider` | Test render page mà thiếu provider → bọc provider hoặc `vi.mock` context |
| `Not implemented: navigation to another Document` | jsdom cảnh báo khi code gán `window.location.href`. Không làm test đỏ; muốn bắt điều hướng thì stub như mục 5.6 |
| Test treo / rất chậm | Component mở WebSocket SignalR thật → thiếu `vi.mock('@microsoft/signalr', ...)` |
