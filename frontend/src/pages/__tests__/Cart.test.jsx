import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/msw/server.js'
import { AuthProvider } from '../../context/AuthContext.jsx'
import { CartProvider } from '../../context/CartContext.jsx'
import { formatPrice } from '../../services/productService.js'
import Cart from '../Cart.jsx'

// Header render NotificationBell, mở WebSocket thật khi có accessToken -> stub để chạy offline.
vi.mock('@microsoft/signalr', () => {
  const connection = {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    onclose: vi.fn(),
    invoke: vi.fn().mockResolvedValue(undefined),
  }
  class HubConnectionBuilder {
    withUrl() { return this }
    withAutomaticReconnect() { return this }
    configureLogging() { return this }
    build() { return connection }
  }
  return { HubConnectionBuilder, LogLevel: { Information: 1, Error: 4, None: 6 }, HttpTransportType: {} }
})

describe('Cart', () => {
  it('opens quotation modal and shows success notice after submit', async () => {
    const user = userEvent.setup()

    // Đăng nhập sẵn + giỏ hàng >= 100 triệu để nút "Gửi yêu cầu báo giá với Sales" hiển thị.
    localStorage.setItem('accessToken', 'jwt-1')
    localStorage.setItem('authUser', JSON.stringify({ id: 'U1', role: 'Customer' }))
    server.use(
      http.get('/api/cart', () => HttpResponse.json({
        id: 'C1',
        items: [{ id: 'CI1', productId: 'P1', productName: 'Ống PVC D21', quantity: 3, unitPrice: 40_000_000 }],
        totalItems: 3,
        totalPrice: 120_000_000,
      })),
      http.get('/api/Quotation', () => HttpResponse.json([])),
      http.post('/api/Quotation/from-cart', () => HttpResponse.json({ id: 'Q1' })),
    )

    render(
      <AuthProvider>
        <CartProvider>
          <MemoryRouter>
            <Cart />
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>,
    )

    await user.click(await screen.findByRole('button', { name: /Gửi yêu cầu báo giá với Sales/i }))

    expect(screen.getByRole('heading', { name: /Gửi yêu cầu báo giá\?/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Gửi yêu cầu$/i }))

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /Gửi yêu cầu báo giá\?/i })).not.toBeInTheDocument()
    })

    expect(
      screen.getByText(/Đã gửi yêu cầu về Mã đơn hàng thành công! Sales sẽ phản hồi nhanh nhất có thể/i),
    ).toBeInTheDocument()
  })

  // Khách vãng lai (chưa đăng nhập) mở Giỏ hàng: trước đây bị văng sang /login vì trang gọi thẳng
  // GET /api/Quotation (yêu cầu xác thực) ngay khi mount — 401 khiến authFetch() tự ép chuyển hướng.
  // Giờ phải xem được giỏ hàng tạm (localStorage) bình thường, không gọi API cần đăng nhập nào.
  it('khách vãng lai xem được giỏ hàng tạm mà không bị chuyển sang trang đăng nhập', async () => {
    localStorage.setItem('guestCart', JSON.stringify([
      { id: 'P1', productId: 'P1', productName: 'Ống PVC D21', imageUrl: '', quantity: 2, unitPrice: 50_000 },
    ]))

    let quotationRequested = false
    server.use(
      http.get('/api/Quotation', () => {
        quotationRequested = true
        return new HttpResponse(null, { status: 401 })
      }),
    )

    render(
      <AuthProvider>
        <CartProvider>
          <MemoryRouter initialEntries={['/cart']}>
            <Cart />
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>,
    )

    expect(await screen.findByText('Ống PVC D21')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Giỏ Hàng/i })).toBeInTheDocument()
    expect(quotationRequested).toBe(false)
  })

  // Khi giỏ đã khớp 1 báo giá đàm phán còn hạn (giá tự động áp dụng), khách vẫn phải có cách yêu
  // cầu đàm phán lại — trước đây nút "Gửi yêu cầu báo giá" chỉ hiện khi CHƯA có giá đàm phán nào,
  // nên một khi giá cũ tự áp dụng thì không còn cách nào trên Giỏ hàng để xin thương lượng lại.
  it('đơn ≥100tr đã áp giá đàm phán vẫn hiện nút yêu cầu đàm phán lại', async () => {
    const user = userEvent.setup()
    localStorage.setItem('accessToken', 'jwt-1')
    localStorage.setItem('authUser', JSON.stringify({ id: 'U1', role: 'Customer' }))

    let newQuotationRequested = false
    server.use(
      http.get('/api/cart', () => HttpResponse.json({
        id: 'C1',
        items: [{ id: 'CI1', productId: 'P1', productName: 'Ống PVC D21', quantity: 3, unitPrice: 40_000_000 }],
        totalItems: 3,
        totalPrice: 120_000_000,
      })),
      http.get('/api/Quotation', () => HttpResponse.json([
        { id: 'Q1', status: 'CustomerAccepted', validUntil: new Date(Date.now() + 7 * 86400_000).toISOString(), acceptedVersionId: 'V1' },
      ])),
      http.get('/api/Quotation/Q1', () => HttpResponse.json({
        id: 'Q1',
        acceptedVersionId: 'V1',
        versions: [{ id: 'V1', items: [{ productId: 'P1', quantity: 3, proposedUnitPrice: 35_000_000 }] }],
      })),
      http.post('/api/Quotation/from-cart', () => {
        newQuotationRequested = true
        return HttpResponse.json({ id: 'Q2' })
      }),
    )

    render(
      <AuthProvider>
        <CartProvider>
          <MemoryRouter>
            <Cart />
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>,
    )

    expect(await screen.findByText('Đã áp dụng giá đàm phán')).toBeInTheDocument()
    // Nút gửi báo giá "lần đầu" không còn (đã có giá đàm phán áp dụng) ...
    expect(screen.queryByRole('button', { name: /Gửi yêu cầu báo giá với Sales/i })).not.toBeInTheDocument()
    // ... nhưng vẫn phải có lối yêu cầu đàm phán LẠI.
    await user.click(screen.getByRole('button', { name: /Yêu cầu đàm phán lại/i }))
    expect(screen.getByRole('heading', { name: /Gửi yêu cầu báo giá\?/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Gửi yêu cầu$/i }))
    await waitFor(() => expect(newQuotationRequested).toBe(true))
  })

  // Khách có NHIỀU báo giá CustomerAccepted còn hạn cùng lúc (ví dụ đã đàm phán cho nhiều SKU khác
  // nhau ở các thời điểm khác nhau). Trước đây Cart chỉ xét cái MỚI NHẤT (acceptedList[0]) — nếu SKU
  // mới nhất đó không khớp giỏ hàng hiện tại thì giá đàm phán của báo giá CŨ hơn (nhưng vẫn còn hạn
  // và khớp đúng SKU trong giỏ) bị bỏ qua hoàn toàn, y hệt lỗi đã sửa ở OrderService.CalculateDiscountAsync.
  it('bỏ qua báo giá mới nhất không khớp giỏ, vẫn tìm báo giá cũ hơn còn hạn khớp đúng SKU', async () => {
    localStorage.setItem('accessToken', 'jwt-1')
    localStorage.setItem('authUser', JSON.stringify({ id: 'U1', role: 'Customer' }))

    server.use(
      http.get('/api/cart', () => HttpResponse.json({
        id: 'C1',
        items: [{ id: 'CI1', productId: 'P1', productName: 'Ống PVC D21', quantity: 3, unitPrice: 40_000_000 }],
        totalItems: 3,
        totalPrice: 120_000_000,
      })),
      http.get('/api/Quotation', () => HttpResponse.json([
        // Mới nhất nhưng KHÔNG khớp giỏ hàng (SKU khác — P2).
        { id: 'Q2', status: 'CustomerAccepted', requestDate: '2026-08-17T10:00:00Z', validUntil: new Date(Date.now() + 7 * 86400_000).toISOString(), acceptedVersionId: 'V2' },
        // Cũ hơn nhưng vẫn còn hạn và khớp đúng SKU trong giỏ (P1).
        { id: 'Q1', status: 'CustomerAccepted', requestDate: '2026-08-10T10:00:00Z', validUntil: new Date(Date.now() + 7 * 86400_000).toISOString(), acceptedVersionId: 'V1' },
      ])),
      http.get('/api/Quotation/Q2', () => HttpResponse.json({
        id: 'Q2',
        acceptedVersionId: 'V2',
        versions: [{ id: 'V2', items: [{ productId: 'P2', quantity: 10, proposedUnitPrice: 5_000_000 }] }],
      })),
      http.get('/api/Quotation/Q1', () => HttpResponse.json({
        id: 'Q1',
        acceptedVersionId: 'V1',
        versions: [{ id: 'V1', items: [{ productId: 'P1', quantity: 3, proposedUnitPrice: 35_000_000 }] }],
      })),
    )

    render(
      <AuthProvider>
        <CartProvider>
          <MemoryRouter>
            <Cart />
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>,
    )

    expect(await screen.findByText('Đã áp dụng giá đàm phán')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Gửi yêu cầu báo giá với Sales/i })).not.toBeInTheDocument()
  })

  // Giá đàm phán HIỆU LỰC phải dịch chuyển theo đúng % thay đổi của giá niêm yết hiện tại
  // (currentListedPrice) — không đứng yên ở đúng con số đã duyệt lúc đàm phán (proposedUnitPrice).
  // Ví dụ: đàm phán 40.000.000 -> 32.000.000 (giảm 20%), sau đó giá niêm yết giảm thêm -2% còn
  // 39.200.000 -> giá đàm phán hiệu lực phải là 0.8 * 39.200.000 = 31.360.000 (vẫn giảm đúng 20%).
  it('giá đàm phán hiệu lực dịch chuyển theo đúng tỉ lệ khi giá niêm yết hiện tại đã đổi', async () => {
    localStorage.setItem('accessToken', 'jwt-1')
    localStorage.setItem('authUser', JSON.stringify({ id: 'U1', role: 'Customer' }))

    server.use(
      http.get('/api/cart', () => HttpResponse.json({
        id: 'C1',
        items: [{ id: 'CI1', productId: 'P1', productName: 'Ống PVC D21', quantity: 3, unitPrice: 40_000_000 }],
        totalItems: 3,
        totalPrice: 120_000_000,
      })),
      http.get('/api/Quotation', () => HttpResponse.json([
        { id: 'Q1', status: 'CustomerAccepted', validUntil: new Date(Date.now() + 7 * 86400_000).toISOString(), acceptedVersionId: 'V1' },
      ])),
      http.get('/api/Quotation/Q1', () => HttpResponse.json({
        id: 'Q1',
        acceptedVersionId: 'V1',
        versions: [{
          id: 'V1',
          items: [{
            productId: 'P1',
            quantity: 3,
            originalUnitPrice: 40_000_000,
            proposedUnitPrice: 32_000_000, // đã đàm phán giảm 20% so với giá niêm yết LÚC ĐÓ
            currentListedPrice: 39_200_000, // giá niêm yết SAU đó đã giảm thêm -2%
          }],
        }],
      })),
    )

    render(
      <AuthProvider>
        <CartProvider>
          <MemoryRouter>
            <Cart />
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>,
    )

    expect(await screen.findByText('Đã áp dụng giá đàm phán')).toBeInTheDocument()
    expect(screen.getByText((_, node) => node?.textContent === `Đàm phán: ${formatPrice(31_360_000)} / sp`)).toBeInTheDocument()
  })
})
