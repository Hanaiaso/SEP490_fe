import { ReactNode } from 'react'

export interface AuthUser {
  id: string
  fullName: string
  email: string
  phoneNumber: string
  role: string
  isEmailVerified?: boolean
  isProfileCompleted?: boolean
  isPhoneVerified?: boolean
  avatarUrl?: string
}

export interface AuthActionResult {
  success: boolean
  message?: string
  user?: AuthUser
}

export interface RegisterFormData {
  fullName: string
  email: string
  phoneNumber?: string
  password: string
  confirmPassword: string
  taxCode?: string
  referralCode?: string
}

export interface ProfileStatus {
  isProfileCompleted: boolean
  [key: string]: unknown
}

export interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  error: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<AuthActionResult>
  loginWithGoogle: (idToken: string) => Promise<AuthActionResult>
  logout: () => Promise<void>
  register: (formData: RegisterFormData) => Promise<AuthActionResult>
  verifyOtp: (email: string, otpCode: string) => Promise<AuthActionResult>
  resendOtp: (email: string) => Promise<AuthActionResult>
  requestPhoneOtp: (phoneNumber: string) => Promise<AuthActionResult>
  verifyPhoneOtp: (otpCode: string, verifiedPhoneNumber: string) => Promise<AuthActionResult>
  forgotPassword: (email: string) => Promise<AuthActionResult>
  resetPassword: (token: string, email: string, newPassword: string, confirmPassword: string) => Promise<AuthActionResult>
  completeProfile: (fullName: string, phoneNumber: string, password: string, confirmPassword: string) => Promise<AuthActionResult>
  updateUser: (updatedFields: Partial<AuthUser>) => void
  refreshProfileStatus: () => Promise<ProfileStatus | null>
}

export function AuthProvider(props: { children: ReactNode }): JSX.Element
export function useAuth(): AuthContextValue
