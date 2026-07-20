import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '../../context/AuthContext.jsx'
import Cart from '../Cart.jsx'

describe('Cart', () => {
  it('opens quotation modal and shows success notice after submit', async () => {
    const user = userEvent.setup()

    render(
      <AuthProvider>
        <MemoryRouter>
          <Cart />
        </MemoryRouter>
      </AuthProvider>,
    )

    await user.click(screen.getByRole('button', { name: /Gửi yêu cầu báo giá với Sales/i }))

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
