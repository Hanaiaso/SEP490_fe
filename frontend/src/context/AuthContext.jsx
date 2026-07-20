import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as authService from '../services/authService.js'
import { getProfileStatus } from '../services/userService.js'

// ─── Storage keys ──────────────────────────────────────────────────────────────
const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'
const USER_KEY = 'authUser'

// ─── Helpers ───────────────────────────────────────────────────────────────────
function readJson(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeJson(key, value) {
  if (value == null) {
    localStorage.removeItem(key)
  } else {
    localStorage.setItem(key, JSON.stringify(value))
  }
}

function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY)
  localStorage.removeItem(REFRESH_TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

function saveSession({ accessToken, refreshToken, user }) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
  writeJson(USER_KEY, user)
}

// ─── Context ───────────────────────────────────────────────────────────────────
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readJson(USER_KEY))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Khôi phục session từ localStorage khi app khởi động
  useEffect(() => {
    setUser(readJson(USER_KEY))
  }, [])

  // ─── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    setLoading(true)
    setError(null)
    try {
      const res = await authService.login({ email, password })
      const { accessToken, refreshToken, user: userData } = res.data
      saveSession({ accessToken, refreshToken, user: userData })
      setUser(userData)
      return { success: true, user: userData }
    } catch (err) {
      setError(err.message)
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Login with Google ───────────────────────────────────────────────────────
  const loginWithGoogle = useCallback(async (idToken) => {
    setLoading(true)
    setError(null)
    try {
      const res = await authService.loginWithGoogle({ idToken })
      const { accessToken, refreshToken, user: userData } = res.data
      saveSession({ accessToken, refreshToken, user: userData })
      setUser(userData)
      return { success: true, user: userData }
    } catch (err) {
      setError(err.message)
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Complete Profile ────────────────────────────────────────────────────────
  const completeProfile = useCallback(async (fullName, phoneNumber, password, confirmPassword) => {
    setLoading(true)
    setError(null)
    try {
      await authService.completeProfile({ fullName, phoneNumber, password, confirmPassword })
      // Cập nhật thông tin user trong localStorage
      const currentUser = readJson(USER_KEY)
      if (currentUser) {
        const updated = { ...currentUser, fullName, phoneNumber }
        writeJson(USER_KEY, updated)
        setUser(updated)
      }
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Update User state locally ───────────────────────────────────────────────
  const updateUser = useCallback((updatedFields) => {
    setUser((prev) => {
      if (!prev) return null
      const updated = { ...prev, ...updatedFields }
      writeJson(USER_KEY, updated)
      return updated
    })
  }, [])

  // ─── Refresh Profile Status (gọi sau khi thêm địa chỉ) ─────────────────────
  const refreshProfileStatus = useCallback(async () => {
    try {
      const status = await getProfileStatus()
      setUser((prev) => {
        if (!prev) return null
        const updated = { ...prev, isProfileCompleted: status.isProfileCompleted }
        writeJson(USER_KEY, updated)
        return updated
      })
      return status
    } catch (err) {
      console.error('Lỗi kiểm tra trạng thái hồ sơ:', err)
      return null
    }
  }, [])

  // ─── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } catch {
      // Dù server lỗi vẫn xoá session local
    } finally {
      clearSession()
      setUser(null)
    }
  }, [])

  // ─── Register ───────────────────────────────────────────────────────────────
  const register = useCallback(async (formData) => {
    setLoading(true)
    setError(null)
    try {
      await authService.register({
        fullName: formData.fullName,
        email: formData.email,
        phoneNumber: formData.phoneNumber || undefined,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        taxCode: formData.taxCode || undefined,
        referralCode: formData.referralCode || undefined,
      })
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Verify OTP ─────────────────────────────────────────────────────────────
  const verifyOtp = useCallback(async (email, otpCode) => {
    setLoading(true)
    setError(null)
    try {
      await authService.verifyOtp({ email, otpCode })
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Forgot Password ────────────────────────────────────────────────────────
  const forgotPassword = useCallback(async (email) => {
    setLoading(true)
    setError(null)
    try {
      await authService.forgotPassword({ email })
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Reset Password ─────────────────────────────────────────────────────────
  const resetPassword = useCallback(async (token, email, newPassword, confirmPassword) => {
    setLoading(true)
    setError(null)
    try {
      await authService.resetPassword({ token, email, newPassword, confirmPassword })
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, message: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  // ─── Phone Verification ──────────────────────────────────────────────────
  const requestPhoneOtp = useCallback(async (phoneNumber) => {
    setError(null)
    try {
      await authService.requestPhoneOtp(phoneNumber)
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, message: err.message }
    }
  }, [])

  const verifyPhoneOtp = useCallback(async (otpCode, verifiedPhoneNumber) => {
    setError(null)
    try {
      await authService.verifyPhoneOtp(otpCode, verifiedPhoneNumber)
      // Cập nhật state user
      const currentUser = readJson(USER_KEY)
      if (currentUser) {
        const updated = { ...currentUser, isPhoneVerified: true, phoneNumber: verifiedPhoneNumber }
        writeJson(USER_KEY, updated)
        setUser(updated)
      }
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, message: err.message }
    }
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    error,
    isAuthenticated: Boolean(user),
    login,
    loginWithGoogle,
    logout,
    register,
    verifyOtp,
    requestPhoneOtp,
    verifyPhoneOtp,
    forgotPassword,
    resetPassword,
    completeProfile,
    updateUser,
    refreshProfileStatus,
  }), [user, loading, error, login, loginWithGoogle, logout, register, verifyOtp, requestPhoneOtp, verifyPhoneOtp, forgotPassword, resetPassword, completeProfile, updateUser, refreshProfileStatus])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
