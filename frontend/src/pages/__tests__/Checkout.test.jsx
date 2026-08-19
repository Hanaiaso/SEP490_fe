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

    fireEvent.click(screen.getByRole('checkbox', { name: /Yêu cầu xuất hóa đơn đỏ/i }))

    const updateLink = screen.getByRole('link', { name: /Cập nhật thông tin MST trong Hồ sơ/i })
    expect(updateLink).toHaveAttribute('href', '/profile?tab=tax')
    expect(updateLink).toHaveAttribute('target', '_blank')
  })

  // BUGFIX: VAT 10% được cộng vào MỌI đơn hàng bất kể khách có tick "Yêu cầu xuất hóa đơn đỏ"
  // hay không (hóa đơn đỏ chỉ là chứng từ xuất trình thêm, không phải điều kiện tính thuế).
  // Trước đây dòng VAT trong bảng tổng kết chỉ hiện khi đã tick ô này, khiến khách thấy tổng
  // tiền đã gồm VAT nhưng không rõ VAT là bao nhiêu nếu không tick.
  it('shows VAT line even when "Yêu cầu xuất hóa đơn đỏ" is left unchecked', () => {
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

    expect(screen.queryByRole('checkbox', { name: /Yêu cầu xuất hóa đơn đỏ/i })).not.toBeChecked()
    expect(screen.getAllByText(/VAT \(10%\)/i).length).toBeGreaterThan(0)
  })
})
