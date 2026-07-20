import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
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

  it('filters order history by search keyword', () => {
    renderProfile('/profile?tab=orders')

    fireEvent.change(screen.getByPlaceholderText(/Tìm theo mã đơn hoặc sản phẩm/i), {
      target: { value: 'VT-2024-10039' },
    })

    expect(screen.getByText('VT-2024-10039')).toBeInTheDocument()
    expect(screen.queryByText('VT-2024-10042')).not.toBeInTheDocument()
  })

  it('renders personal stats tab from the profile query param', () => {
    renderProfile('/profile?tab=stats')

    expect(screen.getByText(/Tổng đơn hàng/i)).toBeInTheDocument()
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
