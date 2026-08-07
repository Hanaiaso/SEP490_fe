import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/msw/server.js'
import Pagination from '../Pagination.jsx'
import ProductCard from '../ProductCard.jsx'
import PhoneVerificationModal from '../PhoneVerificationModal.jsx'
import NotificationBell from '../NotificationBell.tsx'

/**
 * Sheet: FE-Components — L1-FCMP-07..10 (form validation & shared components).
 */

// SignalR mở WebSocket thật khi NotificationBell mount -> stub toàn bộ để test chạy offline.
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

const mockRequestPhoneOtp = vi.fn()
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ requestPhoneOtp: mockRequestPhoneOtp, verifyPhoneOtp: vi.fn() }),
}))
vi.mock('../../context/CartContext.jsx', () => ({
  useCart: () => ({ addToCart: vi.fn().mockResolvedValue({}) }),
}))

describe('L1-FCMP · form validation & shared components', () => {
  // L1-FCMP-07 | EP-Invalid | SĐT sai định dạng -> hiện lỗi, chặn submit, KHÔNG gọi API
  //
  // 🔴 SPEC GAP v2.2: PhoneVerificationModal chỉ kiểm tra "rỗng", không hề validate ĐỊNH DẠNG.
  // SĐT 9 chữ số hay có chữ cái vẫn được gửi thẳng lên server. FT-01 NAC-02 / BV-02 yêu cầu
  // chặn tại client. Test ĐỎ cho tới khi bổ sung regex SĐT Việt Nam (RTW OI-11).
  it.each(['091234567', '0912345678a'])(
    'L1-FCMP-07 SĐT sai định dạng "%s" bị chặn ngay tại form, không phát sinh gọi API',
    async (invalidPhone) => {
      mockRequestPhoneOtp.mockClear()
      mockRequestPhoneOtp.mockResolvedValue({ success: true })
      const user = userEvent.setup()

      render(<PhoneVerificationModal isOpen onClose={() => {}} currentPhone="" />)

      const input = screen.getByPlaceholderText(/0[0-9x]{4,}|số điện thoại/i)
      await user.type(input, invalidPhone)
      await user.click(screen.getByRole('button', { name: /gửi mã|xác minh|tiếp tục/i }))

      expect(mockRequestPhoneOtp).not.toHaveBeenCalled()
      expect(await screen.findByText(/không hợp lệ|sai định dạng/i)).toBeInTheDocument()
    },
  )

  // L1-FCMP-08 | BVA-Min | Trang 1 -> nút Prev bị disable; render đủ số trang; onChange đúng trang
  it('L1-FCMP-08 Pagination ở trang 1 vô hiệu hoá nút Prev và phát đúng trang khi bấm', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()

    render(<Pagination currentPage={1} totalPages={5} onPageChange={onPageChange} />)

    const buttons = screen.getAllByRole('button')
    expect(buttons[0]).toBeDisabled() // nút Prev
    for (const page of ['1', '2', '3', '4', '5'])
      expect(screen.getByRole('button', { name: page })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '3' }))
    expect(onPageChange).toHaveBeenCalledWith(3)
  })

  // L1-FCMP-09 | EP-Valid | ProductCard hiển thị giá VND đã format, tên sản phẩm và alt cho ảnh
  it('L1-FCMP-09 ProductCard render giá VND đã format, tên sản phẩm và alt ảnh', () => {
    render(
      <MemoryRouter>
        <ProductCard product={{
          id: 'P1',
          name: 'Ống PVC D21',
          standardListedPrice: 9999999,
          description: 'Ống nhựa PVC chịu lực',
          imageUrl: 'https://cdn/p1.png',
        }} />
      </MemoryRouter>,
    )

    expect(screen.getByText('Ống PVC D21')).toBeInTheDocument()
    const priceNode = screen.getByText((content) => content.replace(/\s| /g, '').includes('9.999.999'))
    expect(priceNode).toBeInTheDocument()
    expect(priceNode.textContent).toContain('₫')
    expect(screen.getByRole('img')).toHaveAttribute('alt')
  })

  // L1-FCMP-10 | EP-Valid | NotificationBell hiển thị badge số thông báo chưa đọc lấy từ service
  it('L1-FCMP-10 NotificationBell hiển thị badge số chưa đọc từ API', async () => {
    // NotificationBell bỏ qua việc gọi API nếu chưa có accessToken trong localStorage.
    localStorage.setItem('accessToken', 'jwt-1')
    server.use(
      http.get('/api/notifications/unread-count', () => HttpResponse.json({ unreadCount: 3 })),
      http.get('/api/notifications', () => HttpResponse.json({ items: [] })),
    )

    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText('3')).toBeInTheDocument())
  })
})
