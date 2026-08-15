import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/msw/server.js'
import { AuthProvider } from '../../context/AuthContext.jsx'
import { CartProvider } from '../../context/CartContext.jsx'
import Profile from '../Profile.jsx'

vi.mock('../../services/authService.js', () => ({
  getCustomerProfile: vi.fn().mockResolvedValue({
    taxCode: '0123456789',
    companyName: 'Công ty TNHH Văn Phòng ABC',
    companyAddress: '123 Nguyễn Huệ, Q.1, TP.HCM',
    invoiceEmail: 'invoice@company.com',
    representative: 'Nguyễn Văn A',
    companyPhone: '028 3822 1234',
  }),
  updateCustomerProfile: vi.fn().mockImplementation(async (payload) => payload),
}))

vi.mock('../../services/quotationService.js', () => ({
  getQuotations: vi.fn().mockResolvedValue([
    {
      id: 'QT-2026-001',
      requestDate: '2026-06-01',
      originalTotal: 115000000,
      salesProposedTotal: 103500000,
      status: 'SalesResponded',
    },
  ]),
}))

vi.mock('../../services/provinceService.js', () => ({
  getProvinces: vi.fn().mockResolvedValue([{ code: 1, name: 'Hà Nội' }]),
  getWards: vi.fn().mockResolvedValue([{ code: 11, name: 'Phường Ba Đình' }]),
}))

function renderProfile(initialEntry = '/profile') {
  return render(
    <AuthProvider>
      <CartProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </MemoryRouter>
      </CartProvider>
    </AuthProvider>,
  )
}

describe('Profile', () => {
  it('updates tax information after saving MST details', async () => {
    renderProfile('/profile?tab=tax')

    fireEvent.click(await screen.findByRole('button', { name: /Chỉnh sửa/i }))

    fireEvent.change(screen.getByDisplayValue('0123456789'), { target: { value: '9876543210' } })
    fireEvent.change(screen.getByDisplayValue('Công ty TNHH Văn Phòng ABC'), { target: { value: 'Demo XYZ' } })
    fireEvent.change(screen.getByDisplayValue('123 Nguyễn Huệ, Q.1, TP.HCM'), { target: { value: '88 Lê Lợi, Q.1' } })
    fireEvent.change(screen.getByDisplayValue('invoice@company.com'), { target: { value: 'ketoan@demo.vn' } })

    fireEvent.click(screen.getByRole('button', { name: /^Lưu$/i }))

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /^Lưu$/i })).not.toBeInTheDocument()
      expect(screen.getByText('9876543210')).toBeInTheDocument()
      expect(screen.getByText('Demo XYZ')).toBeInTheDocument()
      expect(screen.getByText('88 Lê Lợi, Q.1')).toBeInTheDocument()
      expect(screen.getByText('ketoan@demo.vn')).toBeInTheDocument()
    })

    expect(screen.getByText(/Lưu thông tin MST thành công/i)).toBeInTheDocument()
  })

  // Backend ChangePasswordDto yêu cầu đúng field "confirmNewPassword" (có [Required]) — trước đây
  // FE gửi "confirmPassword" (tên khác hoàn toàn, không phải lệch hoa/thường) nên model binding để
  // trống field này, luôn bị BadRequest "Xác nhận mật khẩu không được để trống" dù nhập đúng.
  it('gửi đúng field confirmNewPassword khi đổi mật khẩu và báo thành công', async () => {
    let capturedBody = null
    server.use(
      http.post('/api/user/change-password', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ message: 'Đổi mật khẩu thành công' })
      }),
    )

    renderProfile('/profile')

    const [currentInput, newInput, confirmInput] = await screen.findAllByPlaceholderText('••••••••')
    fireEvent.change(currentInput, { target: { value: 'OldPass123' } })
    fireEvent.change(newInput, { target: { value: 'NewPass123' } })
    fireEvent.change(confirmInput, { target: { value: 'NewPass123' } })

    fireEvent.click(screen.getByRole('button', { name: /Cập nhật mật khẩu/i }))

    await waitFor(() => {
      expect(screen.getByText(/Thay đổi mật khẩu thành công/i)).toBeInTheDocument()
    })

    expect(capturedBody).toMatchObject({
      currentPassword: 'OldPass123',
      newPassword: 'NewPass123',
      confirmNewPassword: 'NewPass123',
    })
    expect(capturedBody).not.toHaveProperty('confirmPassword')
  })

  // Lần đầu đăng nhập, giỏ chưa có địa chỉ nào -> modal thêm địa chỉ tự mở (needAddress).
  // Trước đây AddressModal không có ô nhập SĐT nào cả — giá trị gửi lên bị "câm" theo
  // user.phoneNumber (rỗng nếu đăng ký không nhập SĐT) rồi bị BE từ chối bằng exception
  // "Số điện thoại phải có 10 số..." mà người dùng không có cách nào tự sửa trên form.
  it('modal thêm địa chỉ lần đầu có ô nhập SĐT và gửi đúng giá trị đã nhập', async () => {
    let capturedBody = null
    server.use(
      http.get('/api/user/addresses', () => HttpResponse.json([])),
      http.post('/api/user/addresses', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({ id: 'A1', ...capturedBody, fullAddress: 'demo' })
      }),
    )

    render(
      <AuthProvider>
        <CartProvider>
          <MemoryRouter initialEntries={[{ pathname: '/profile', search: '?tab=addresses', state: { needAddress: true } }]}>
            <Routes>
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>,
    )

    // Modal tự mở vì chưa có địa chỉ nào (needAddress).
    expect(await screen.findByRole('heading', { name: /Thêm địa chỉ mới/i })).toBeInTheDocument()

    // Ô SĐT phải thực sự tồn tại trên form — đây chính là phần trước đây bị thiếu.
    const phoneInput = await screen.findByPlaceholderText('0912345678')
    fireEvent.change(phoneInput, { target: { value: '0987654321' } })

    fireEvent.change(await screen.findByDisplayValue('-- Chọn Tỉnh/Thành phố --'), { target: { value: '1' } })
    fireEvent.change(await screen.findByDisplayValue('-- Chọn Phường/Xã --'), { target: { value: '11' } })
    fireEvent.change(screen.getByPlaceholderText('123 Đường ABC'), { target: { value: '12 Ngõ Nhỏ' } })

    fireEvent.click(screen.getByRole('button', { name: /^Lưu địa chỉ$/i }))

    await waitFor(() => expect(capturedBody).not.toBeNull())
    expect(capturedBody.phone).toBe('0987654321')
  })

  it('filters order history by search keyword', async () => {
    // BR-OH-07: backend chỉ hỗ trợ tìm theo Mã đơn hàng (OrderRepository.GetOrderHistoryAsync),
    // không tìm theo tên sản phẩm — mock lại đúng hành vi lọc phía server.
    server.use(
      http.get('/api/orders/my-history', ({ request }) => {
        const search = (new URL(request.url).searchParams.get('search') || '')
          .toUpperCase().replace(/-/g, '')
        const allOrders = [
          { id: 'O1', orderCode: 'VT-2024-10039', createdAt: '2026-01-01', itemCount: 2, finalPayment: 500000, paymentMethod: 'COD', paymentStatus: 'Paid', orderStatus: 'Delivered' },
          { id: 'O2', orderCode: 'VT-2024-10042', createdAt: '2026-01-02', itemCount: 1, finalPayment: 300000, paymentMethod: 'COD', paymentStatus: 'Paid', orderStatus: 'Delivered' },
        ]
        const items = search
          ? allOrders.filter((o) => o.orderCode.toUpperCase().replace(/-/g, '').includes(search))
          : allOrders
        return HttpResponse.json({ items, totalPages: 1, totalCount: items.length })
      }),
    )

    renderProfile('/profile?tab=orders')
    // Desktop table + mobile card cùng render trong DOM (ẩn/hiện bằng CSS responsive,
    // jsdom không lọc theo đó) -> mỗi mã đơn xuất hiện 2 lần, phải dùng findAllByText.
    await screen.findAllByText('VT-2024-10042')

    fireEvent.change(screen.getByPlaceholderText(/Tìm theo mã đơn hàng/i), {
      target: { value: 'VT-2024-10039' },
    })

    // Debounce 400ms trước khi filter thật sự chạy lên server.
    await waitFor(() => expect(screen.queryAllByText('VT-2024-10042')).toHaveLength(0), { timeout: 2000 })
    expect(screen.getAllByText('VT-2024-10039').length).toBeGreaterThan(0)
  })

  it('renders personal stats tab from the profile query param', async () => {
    server.use(
      http.get('/api/orders/my-stats', () => HttpResponse.json({
        totalOrders: 12,
        totalSpent: 45000000,
        topProductName: 'Ống PVC D21',
        vatInvoiceCount: 3,
        spendingByMonth: [{ label: 'T1', value: 5000000 }, { label: 'T2', value: 7000000 }],
        topProducts: [{ name: 'Ống PVC D21', value: 20 }],
      })),
    )

    renderProfile('/profile?tab=stats')

    expect(await screen.findByText(/Tổng đơn hàng/i)).toBeInTheDocument()
    expect(screen.getByText(/Chi tiêu theo tháng/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Sản phẩm đặt nhiều nhất/i)).toHaveLength(2)
  })
  it('renders quotation requests tab from the profile query param', async () => {
    renderProfile('/profile?tab=quotations')

    expect(await screen.findByText('QT-2026-001')).toBeInTheDocument()
    expect(screen.getByText(/Xem chi tiết/i)).toBeInTheDocument()
    expect(screen.getByText(/^Chat$/i)).toBeInTheDocument()
  })
})
