import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/msw/server.js'
import { AuthProvider } from '../../context/AuthContext.jsx'
import Register from '../Register.jsx'

// useGoogleLogin gọi Google Identity Services script thật -> stub để chạy offline.
vi.mock('../../hooks/useGoogleLogin.js', () => ({ useGoogleLogin: () => {} }))

function renderRegister() {
  return render(
    <AuthProvider>
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    </AuthProvider>,
  )
}

function fillRequiredFields({ phone } = {}) {
  fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Nguyễn Văn A' } })
  fireEvent.change(screen.getByLabelText('Địa chỉ email'), { target: { value: 'a@example.com' } })
  if (phone !== undefined) {
    fireEvent.change(screen.getByLabelText(/Số điện thoại/i), { target: { value: phone } })
  }
  fireEvent.change(screen.getByLabelText('Mật khẩu'), { target: { value: '123456' } })
  fireEvent.change(screen.getByLabelText('Xác nhận mật khẩu'), { target: { value: '123456' } })
}

describe('Register', () => {
  // SĐT sai định dạng (thiếu số 0 đầu, không đủ 10 số...) trước đây không bị chặn ở FE — số sai
  // định dạng lọt vào hồ sơ rồi gây lỗi khó hiểu ở bước thêm địa chỉ giao hàng sau này.
  it('chặn đăng ký khi số điện thoại sai định dạng, không gọi API', async () => {
    let registerCalled = false
    server.use(
      http.post('/api/auth/register', () => {
        registerCalled = true
        return HttpResponse.json({})
      }),
    )

    renderRegister()
    fillRequiredFields({ phone: '12345' }) // thiếu số 0 đầu, chưa đủ 10 số

    fireEvent.click(screen.getByRole('button', { name: /Tạo tài khoản và nhận OTP/i }))

    await waitFor(() => {
      expect(screen.getByText(/Số điện thoại phải có 10 số và bắt đầu bằng 0/i)).toBeInTheDocument()
    })
    expect(registerCalled).toBe(false)
  })

  it('SĐT bỏ trống vẫn đăng ký được bình thường (trường tuỳ chọn)', async () => {
    let capturedBody = null
    server.use(
      http.post('/api/auth/register', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({})
      }),
    )

    renderRegister()
    fillRequiredFields()

    fireEvent.click(screen.getByRole('button', { name: /Tạo tài khoản và nhận OTP/i }))

    await waitFor(() => expect(capturedBody).not.toBeNull())
    expect(capturedBody.phoneNumber).toBeFalsy()
  })

  it('SĐT đúng định dạng thì đăng ký thành công', async () => {
    let capturedBody = null
    server.use(
      http.post('/api/auth/register', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json({})
      }),
    )

    renderRegister()
    fillRequiredFields({ phone: '0912345678' })

    fireEvent.click(screen.getByRole('button', { name: /Tạo tài khoản và nhận OTP/i }))

    await waitFor(() => expect(capturedBody).not.toBeNull())
    expect(capturedBody.phoneNumber).toBe('0912345678')
    expect(screen.queryByText(/Số điện thoại phải có 10 số/i)).not.toBeInTheDocument()
  })
})
