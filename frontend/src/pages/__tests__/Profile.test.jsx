import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../context/AuthContext.jsx'
import { CartProvider } from '../../context/CartContext.jsx'
import { server } from '../../test/msw/server.js'
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

  it('filters order history by search keyword', async () => {
    const ORDERS = [
      { id: 'O1', orderCode: 'VT-2024-10039', orderStatus: 'Delivered', paymentStatus: 'Paid', createdAt: '2024-10-01T00:00:00Z', itemCount: 1, finalPayment: 500_000, paymentMethod: 'SePay' },
      { id: 'O2', orderCode: 'VT-2024-10042', orderStatus: 'Delivered', paymentStatus: 'Paid', createdAt: '2024-10-02T00:00:00Z', itemCount: 1, finalPayment: 300_000, paymentMethod: 'COD' },
    ]

    server.use(
      http.get('/api/orders/my-history', ({ request }) => {
        const search = new URL(request.url).searchParams.get('search') || ''
        const items = search
          ? ORDERS.filter((o) => o.orderCode.toLowerCase().includes(search.toLowerCase()))
          : ORDERS
        return HttpResponse.json({ items, totalCount: items.length, page: 1, pageSize: 10, totalPages: 1 })
      }),
    )

    renderProfile('/profile?tab=orders')

    expect((await screen.findAllByText('VT-2024-10039')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('VT-2024-10042').length).toBeGreaterThan(0)

    fireEvent.change(screen.getByPlaceholderText(/Tìm theo mã đơn hàng/i), {
      target: { value: 'VT-2024-10039' },
    })

    await waitFor(() => {
      expect(screen.getAllByText('VT-2024-10039').length).toBeGreaterThan(0)
      expect(screen.queryByText('VT-2024-10042')).not.toBeInTheDocument()
    })
  })

  it('renders personal stats tab from the profile query param', async () => {
    server.use(
      http.get('/api/orders/my-stats', () =>
        HttpResponse.json({
          totalOrders: 5,
          totalSpent: 12_000_000,
          topProductName: 'Bộ Văn Phòng Phẩm Tối Giản',
          vatInvoiceCount: 2,
          spendingByMonth: [{ label: 'T1', value: 4_000_000 }, { label: 'T2', value: 8_000_000 }],
          topProducts: [{ name: 'Bộ Văn Phòng Phẩm Tối Giản', value: 5 }],
        }),
      ),
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
