import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '../../context/AuthContext.jsx'
import { CartProvider } from '../../context/CartContext.jsx'
import Checkout from '../Checkout.jsx'

describe('Checkout', () => {
  // Sửa MST được quản lý tập trung ở trang Profile (đã có form + test riêng) để tránh
  // trùng lặp logic ở 2 nơi. Checkout chỉ hiển thị thông tin VAT hiện có và link sang đó.
  it('shows VAT summary and links to Profile to edit MST details', () => {
    const cartItems = [
      { productId: 'P1', productName: 'Ống PVC D21', imageUrl: 'https://cdn/p1.png', quantity: 2, unitPrice: 50_000 },
    ]

    render(
      <AuthProvider>
        <CartProvider>
          <MemoryRouter initialEntries={[{ pathname: '/checkout', state: { cartItems } }]}>
            <Routes>
              <Route path="/checkout" element={<Checkout />} />
            </Routes>
          </MemoryRouter>
        </CartProvider>
      </AuthProvider>,
    )

    fireEvent.click(screen.getByRole('checkbox', { name: /Yêu cầu hóa đơn VAT/i }))

    const updateLink = screen.getByRole('link', { name: /Cập nhật thông tin MST trong Hồ sơ/i })
    expect(updateLink).toHaveAttribute('href', '/profile?tab=tax')
    expect(updateLink).toHaveAttribute('target', '_blank')
  })
})
