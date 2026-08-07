import { describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from '../AuthContext.jsx'

/**
 * Sheet: FE-Contexts — L1-FEC-01..02 (AuthContext login/logout state).
 */
const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>

describe('L1-FEC · AuthContext', () => {
  // L1-FEC-01 | EP-Valid | login() lưu user + token, isAuthenticated = true
  it('L1-FEC-01 login lưu user và token, isAuthenticated = true', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    expect(result.current.isAuthenticated).toBe(false)

    await act(async () => {
      await result.current.login('a@test.com', 'P@ss123')
    })

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))
    expect(result.current.user).toMatchObject({ email: 'a@test.com', role: 'Customer' })
    // Token phải sẵn sàng cho fetchWithToken dùng ở request kế tiếp
    expect(localStorage.getItem('accessToken')).toBe('jwt-1')
  })

  // L1-FEC-02 | EP-Valid | logout() xoá sạch user/token
  it('L1-FEC-02 logout xoá user và token khỏi state lẫn storage', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    await act(async () => {
      await result.current.login('a@test.com', 'P@ss123')
    })
    await waitFor(() => expect(result.current.isAuthenticated).toBe(true))

    await act(async () => {
      await result.current.logout()
    })

    await waitFor(() => expect(result.current.isAuthenticated).toBe(false))
    expect(result.current.user).toBeNull()
    expect(localStorage.getItem('accessToken')).toBeNull()
    expect(localStorage.getItem('user')).toBeNull()
  })
})
