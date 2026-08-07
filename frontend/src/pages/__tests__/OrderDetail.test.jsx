import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/msw/server.js'
import { AuthProvider } from '../../context/AuthContext.jsx'
import { CartProvider } from '../../context/CartContext.jsx'
import OrderDetail from '../OrderDetail.jsx'

describe('OrderDetail', () => {
  it('renders the selected order detail information', async () => {
    server.use(
      http.get('/api/orders/my-history/VT-2024-10039', () => HttpResponse.json({
        id: 'O1',
        orderCode: 'VT-2024-10039',
        createdAt: '2026-01-01T00:00:00Z',
        paymentMethod: 'COD',
        paymentStatus: 'Paid',
        orderStatus: 'New',
        finalPayment: 500_000,
        items: [
          { productId: 'P1', productName: 'Bộ Văn Phòng Phẩm Tối Giản', quantity: 1, unitPrice: 500_000 },
        ],
      })),
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
    expect(screen.getByText(/Thông tin đơn hàng/i)).toBeInTheDocument()
    expect(screen.getByText(/Tóm tắt chi phí/i)).toBeInTheDocument()
  })
})
