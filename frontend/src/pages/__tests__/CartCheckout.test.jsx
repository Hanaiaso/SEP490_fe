import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/msw/server.js'
import Cart from '../Cart.jsx'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

/**
 * Sheet: FE-Components — L1-FCMP-03, L1-FCMP-05 (trang Giỏ hàng).
 *
 * ⚠ L1-FCMP-04 (banner "giá đã thay đổi" khi giỏ hết hạn giá) BỊ BLOCKED:
 *    Không tồn tại khái niệm isPriceExpired / banner cảnh báo giá trong toàn bộ FE
 *    (grep 'priceExpired' không có kết quả) — chưa có gì để unit test.
 * ⚠ L1-FCMP-06 (đếm ngược 15 phút của màn QR SePay) BỊ BLOCKED:
 *    Màn QR ở Checkout.jsx KHÔNG có bộ đếm ngược hạn giữ tồn; biến `countdown` hiện có là
 *    đếm 5 giây tự chuyển về trang chủ SAU KHI thanh toán thành công, không phải hạn 15 phút.
 *    Cả hai đều là tính năng CHƯA ĐƯỢC HIỆN THỰC. Xem DOC_MISMATCHES.md.
 */

const mockUseCart = vi.fn()
const mockUseAuth = vi.fn()

vi.mock('../../context/CartContext.jsx', () => ({ useCart: () => mockUseCart() }))
vi.mock('../../context/AuthContext.jsx', () => ({ useAuth: () => mockUseAuth() }))
vi.mock('../../components/Header.jsx', () => ({ default: () => <header /> }))
vi.mock('../../components/Footer.jsx', () => ({ default: () => <footer /> }))
vi.mock('../../services/quotationService.js', () => ({
  getQuotations: vi.fn().mockResolvedValue([]),
  getQuotationById: vi.fn().mockResolvedValue(null),
  createQuotation: vi.fn().mockResolvedValue({}),
}))

// useCart() phơi ra items/totalItems/totalPrice ở CẤP CAO NHẤT (không phải bên trong cart) —
// bám đúng shape thật của CartContext.value.
function renderCart(cart) {
  mockUseAuth.mockReturnValue({
    user: { id: 'U1', role: 'Customer' },
    isAuthenticated: true,
    loading: false,
  })
  mockUseCart.mockReturnValue({
    cart,
    loading: false,
    error: null,
    items: cart?.items ?? [],
    totalItems: cart?.totalItems ?? 0,
    totalPrice: cart?.totalPrice ?? 0,
    fetchCart: vi.fn(),
    addToCart: vi.fn(),
    updateQuantity: vi.fn(),
    removeFromCart: vi.fn(),
    clearCart: vi.fn(),
  })
  return render(<MemoryRouter><Cart /></MemoryRouter>)
}

const item = (overrides = {}) => ({
  id: 'CI1',
  productId: 'P1',
  productName: 'Ống PVC D21',
  quantity: 1,
  unitPrice: 50_000,
  imageUrl: 'https://cdn/p1.png',
  ...overrides,
})

describe('L1-FCMP · trang Giỏ hàng', () => {
  // L1-FCMP-03 | BC-TRUE | Giỏ rỗng -> không có lối đi tiếp sang thanh toán
  it('L1-FCMP-03 giỏ hàng rỗng thì chặn đường sang thanh toán', async () => {
    renderCart({ id: 'C1', items: [], totalItems: 0, totalPrice: 0 })

    expect(await screen.findByText('Giỏ hàng trống')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /đặt hàng|thanh toán/i })).not.toBeInTheDocument()
  })

  // L1-FCMP-05 | Guard-FALSE | Tổng >= 100 triệu chưa có giá thoả thuận -> ẩn thanh toán, hiện yêu cầu báo giá
  it('L1-FCMP-05 đơn từ 100 triệu chưa có giá thoả thuận thì hiện gợi ý báo giá và ẩn nút đặt hàng trực tiếp', async () => {
    renderCart({
      id: 'C1',
      items: [item({ quantity: 3, unitPrice: 40_000_000 })], // 120 triệu
      totalItems: 3,
      totalPrice: 120_000_000,
    })

    await waitFor(() =>
      expect(screen.getByText(/yêu cầu báo giá đặc biệt/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /gửi yêu cầu báo giá/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /đặt hàng & xem hóa đơn/i })).not.toBeInTheDocument()
  })

  // Nhánh đối chứng: dưới ngưỡng báo giá thì nút đặt hàng vẫn hiển thị bình thường
  it('L1-FCMP-05 đơn dưới ngưỡng báo giá vẫn cho đặt hàng bình thường', async () => {
    renderCart({
      id: 'C1',
      items: [item({ quantity: 2, unitPrice: 5_000_000 })], // 10 triệu
      totalItems: 2,
      totalPrice: 10_000_000,
    })

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /đặt hàng & xem hóa đơn/i })).toBeInTheDocument())
    expect(screen.queryByText(/yêu cầu báo giá đặc biệt/i)).not.toBeInTheDocument()
  })

  // Khách chỉ chọn 1 trong 2 sản phẩm để thanh toán -> nút "Đặt hàng" chỉ mang đúng sản phẩm đó
  // sang trang Checkout, sản phẩm còn lại vẫn ở nguyên trong giỏ.
  it('chỉ chọn 1 sản phẩm để thanh toán thì chỉ sản phẩm đó được đưa sang Checkout', async () => {
    const user = userEvent.setup()
    server.use(
      http.get('/api/orders/checkout-summary', () => HttpResponse.json({
        totalAmount: 50_000, discountAmount: 0, discountPercentage: 0,
        vatPercentage: 0, vatAmount: 0, finalPayment: 50_000,
        requiresPhoneOtp: false, isPriceExpired: false, items: [],
      })),
    )
    const itemA = item({ id: 'CI1', productId: 'P1', productName: 'Ống PVC D21', unitPrice: 50_000 })
    const itemB = item({ id: 'CI2', productId: 'P2', productName: 'Van Cầu D42', unitPrice: 70_000 })
    renderCart({ id: 'C1', items: [itemA, itemB], totalItems: 2, totalPrice: 120_000 })

    const checkboxB = await screen.findByRole('checkbox', { name: /Chọn Van Cầu D42 để thanh toán/i })
    await user.click(checkboxB) // bỏ chọn sản phẩm B, chỉ còn A được chọn

    expect(await screen.findByText('Đã chọn 1/2 để thanh toán', { exact: false })).toBeInTheDocument()

    const orderButton = screen.getByRole('button', { name: /đặt hàng & xem hóa đơn/i })
    await user.click(orderButton)

    expect(mockNavigate).toHaveBeenCalledWith('/checkout', {
      state: {
        cartItems: [expect.objectContaining({ cartItemId: 'CI1', productId: 'P1' })],
      },
    })
  })

  // Bỏ chọn hết mọi sản phẩm -> nút "Đặt hàng" bị khoá, không cho thanh toán "giỏ rỗng theo lựa chọn"
  it('bỏ chọn hết sản phẩm thì khoá nút đặt hàng', async () => {
    const user = userEvent.setup()
    const itemA = item({ id: 'CI1' })
    renderCart({ id: 'C1', items: [itemA], totalItems: 1, totalPrice: 50_000 })

    const checkbox = await screen.findByRole('checkbox', { name: /Chọn Ống PVC D21 để thanh toán/i })
    await user.click(checkbox)

    const orderButton = screen.getByRole('button', { name: /đặt hàng & xem hóa đơn/i })
    expect(orderButton).toBeDisabled()
  })
})
