import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../../context/AuthContext.jsx'
import { CartProvider } from '../../context/CartContext.jsx'
import { server } from '../../test/msw/server.js'
import Cart from '../Cart.jsx'

vi.mock('../../components/Header.jsx', () => ({ default: () => <header /> }))

describe('Cart', () => {
  it('opens quotation modal and shows success notice after submit', async () => {
    localStorage.setItem('accessToken', 'jwt-1')
    localStorage.setItem('refreshToken', 'rt-1')
    localStorage.setItem(
      'authUser',
      JSON.stringify({ id: 'U1', fullName: 'Nguyễn Văn A', email: 'a@test.com', role: 'Customer' }),
    )

    server.use(
      http.get('/api/cart', () =>
        HttpResponse.json({
          id: 'C1',
          items: [{ id: 'CI1', productId: 'P1', productName: 'Ống PVC D21', quantity: 3, unitPrice: 40_000_000 }],
          totalItems: 3,
          totalPrice: 120_000_000,
        }),
      ),
      http.get('/api/Quotation', () => HttpResponse.json([])),
      http.post('/api/Quotation/from-cart', () => HttpResponse.json({ id: 'Q1' })),
    )

    const user = userEvent.setup()

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
})
