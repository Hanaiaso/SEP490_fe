import { render, screen } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '../../context/AuthContext.jsx'
import { CartProvider } from '../../context/CartContext.jsx'
import { server } from '../../test/msw/server.js'
import OrderDetail from '../OrderDetail.jsx'

describe('OrderDetail', () => {
  it('renders the selected order detail information', async () => {
    server.use(
      http.get('/api/orders/my-history/VT-2024-10039', () =>
        HttpResponse.json({
          id: 'VT-2024-10039',
          orderCode: 'VT-2024-10039',
          orderStatus: 'Confirmed',
          paymentStatus: 'Paid',
          deliveryStatus: 'NotScheduled',
          paymentMethod: 'SePay',
          createdAt: '2024-10-01T08:00:00Z',
          customerName: 'Nguyễn Văn A',
          customerPhone: '0912345678',
          shippingAddress: '88 Le Loi, Q1, TP.HCM',
          totalAmount: 500_000,
          discountAmount: 0,
          vatAmount: 0,
          finalPayment: 500_000,
          items: [
            {
              productId: 'P1',
              productName: 'Bộ Văn Phòng Phẩm Tối Giản',
              priceSnapshot: 500_000,
              quantity: 1,
              lineTotal: 500_000,
            },
          ],
        }),
      ),
    )

    render(
      <AuthProvider>
        <CartProvider>
          <MemoryRouter initialEntries={['/profile/orders/VT-2024-10039']}>
            <Routes>
              <Route path="/profile/orders/:orderId" element={<OrderDetail />} />
            </Routes>
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>,
    )

    expect(await screen.findByRole('heading', { name: /Chi tiết đơn hàng VT-2024-10039/i })).toBeInTheDocument()
    expect(screen.getByText(/Bộ Văn Phòng Phẩm Tối Giản/i)).toBeInTheDocument()
    expect(screen.getByText(/Địa chỉ giao hàng/i)).toBeInTheDocument()
    expect(screen.getByText(/Tóm tắt chi phí/i)).toBeInTheDocument()
  })
})
