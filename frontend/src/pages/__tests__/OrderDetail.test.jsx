import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '../../context/AuthContext.jsx'
import OrderDetail from '../OrderDetail.jsx'

describe('OrderDetail', () => {
  it('renders the selected order detail information', () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/profile/orders/VT-2024-10039']}>
          <Routes>
            <Route path="/profile/orders/:orderId" element={<OrderDetail />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    )

    expect(screen.getByRole('heading', { name: /Chi tiết đơn hàng VT-2024-10039/i })).toBeInTheDocument()
    expect(screen.getByText(/Bộ Văn Phòng Phẩm Tối Giản/i)).toBeInTheDocument()
    expect(screen.getByText(/Thông tin giao hàng/i)).toBeInTheDocument()
    expect(screen.getByText(/Tóm tắt chi phí/i)).toBeInTheDocument()
  })
})
