import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from '../../context/AuthContext.jsx'
import Checkout from '../Checkout.jsx'

describe('Checkout', () => {
  it('updates VAT information after editing MST details', async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={['/checkout']}>
          <Routes>
            <Route path="/checkout" element={<Checkout />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    )

    fireEvent.click(screen.getByRole('checkbox', { name: /Yêu cầu hóa đơn VAT/i }))
    fireEvent.click(screen.getByRole('button', { name: /Cập nhật thông tin MST/i }))

    const taxCodeInput = screen.getByPlaceholderText(/Mã số thuế/i)
    const companyNameInput = screen.getByPlaceholderText(/Tên công ty/i)
    const companyAddressInput = screen.getByPlaceholderText(/Địa chỉ công ty/i)
    const invoiceEmailInput = screen.getByPlaceholderText(/Email nhận hóa đơn/i)

    fireEvent.change(taxCodeInput, { target: { value: '9876543210' } })
    fireEvent.change(companyNameInput, { target: { value: 'Demo XYZ' } })
    fireEvent.change(companyAddressInput, { target: { value: '88 Le Loi' } })
    fireEvent.change(invoiceEmailInput, { target: { value: 'ketoan@demo.vn' } })

    const saveButton = screen.getByRole('button', { name: /Lưu thông tin MST/i })
    fireEvent.submit(saveButton.closest('form'))

    expect(screen.getByText('9876543210')).toBeInTheDocument()
    expect(screen.getByText('Demo XYZ')).toBeInTheDocument()
    expect(screen.getByText('88 Le Loi')).toBeInTheDocument()
    expect(screen.getByText('ketoan@demo.vn')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Lưu thông tin MST/i })).not.toBeInTheDocument()
    })
  })
})
