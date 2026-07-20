# Frontend React Vite

## Giới thiệu

Đây là project frontend dùng `React + Vite`.

Hiện tại project đã có sẵn:

- Trang landing
- Trang home
- Trang đăng nhập
- Trang đăng ký
- Trang quên mật khẩu
- Trang nhập OTP
- Header có mock user dropdown và nút đăng xuất để backend có thể nối vào sau

Project đang dùng dữ liệu mock ở frontend, chưa gọi API backend thật.

## Yêu cầu trước khi chạy

Máy cần cài sẵn:

- `Node.js`
- `npm`

Nên dùng:

- `Node.js 18+`

Kiểm tra nhanh:

```bash
node -v
npm -v
```

## Cách chạy project

### 1. Mở đúng thư mục project

Quan trọng: phải chạy lệnh bên trong thư mục `frontend`, vì file `package.json` nằm ở đây.

```bash
cd D:\frontend\frontend
```

### 2. Cài thư viện

```bash
npm install
```

### 3. Chạy môi trường dev

```bash
npm run dev
```

Sau khi chạy xong, terminal sẽ hiện link local, ví dụ:

```bash
http://localhost:5173
```

Nếu cổng `5173` đang bận, Vite sẽ tự đổi sang `5174`, `5175`, ...

## Các lệnh thường dùng

### Chạy dev

```bash
npm run dev
```

### Build production

```bash
npm run build
```

### Xem bản build

```bash
npm run preview
```

### Kiểm tra lint

```bash
npm run lint
```

## Các route hiện có

| Route | Mô tả |
|---|---|
| `/` | Landing page |
| `/home` | Home page |
| `/login` | Đăng nhập |
| `/register` | Đăng ký |
| `/forgot-password` | Quên mật khẩu |
| `/forgot-password/sent` | Màn hình đã gửi link reset |
| `/verify-otp` | Màn hình nhập OTP |

## Luồng test nhanh

### Đăng ký và OTP

1. Vào `/register`
2. Nhập thông tin tài khoản
3. Bấm tạo tài khoản
4. Hệ thống sẽ chuyển sang trang nhập OTP
5. Nhập đủ 6 số OTP mock
6. Hệ thống quay về trang đăng nhập

### Đăng nhập

1. Vào `/login`
2. Nhập email
3. Bấm `Đăng nhập`
4. Sau khi đăng nhập, header sẽ hiện tên user và menu dropdown

### Đăng xuất

1. Bấm vào khu vực user trên header
2. Chọn `Đăng xuất`

## Lưu ý cho team backend

- Phần auth hiện tại đang là mock ở frontend
- User login đang được lưu tạm bằng `localStorage`
- Có thể thay phần mock này bằng API thật sau
- Header đã có sẵn dropdown user để tiện test tích hợp

## Cấu trúc thư mục chính

```text
src/
  components/   -> component dùng chung
  context/      -> auth mock context
  data/         -> dữ liệu mock
  pages/        -> các trang
  lib/          -> hàm tiện ích
```

## Một số lỗi thường gặp

### Lỗi `Could not read package.json`

Nguyên nhân:

- Đang chạy lệnh sai thư mục

Cách sửa:

```bash
cd D:\frontend\frontend
```

Rồi chạy lại:

```bash
npm install
npm run dev
```

### Chạy `npm run dev` nhưng không vào được trang

Kiểm tra:

- Terminal có báo link local chưa
- Có đang mở đúng cổng không
- Có app khác đang chiếm cổng `5173` không

## Ghi chú

- Không cần backend để chạy giao diện
- Có thể chạy độc lập chỉ với `npm install` và `npm run dev`
- Nếu team muốn nối backend, nên giữ nguyên cấu trúc route hiện tại để dễ tích hợp
