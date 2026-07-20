import { useCallback, useState } from 'react'
import { ArrowLeft, Lock, Mail } from 'lucide-react'
import { motion } from 'motion/react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { useGoogleLogin } from '../hooks/useGoogleLogin.js'
import { Button } from '../components/ui/Button.jsx'
import { Checkbox } from '../components/ui/Checkbox.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Label } from '../components/ui/Label.jsx'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, loginWithGoogle, loading } = useAuth()
  const [email, setEmail] = useState(location.state?.email ?? '')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleRedirect = useCallback((user) => {
    // Nếu profile chưa hoàn chỉnh (chưa có địa chỉ) → yêu cầu thêm địa chỉ
    if (user?.isProfileCompleted === false && (!user?.role || user?.role === 'Customer')) {
      navigate('/profile?tab=addresses', { state: { needAddress: true } })
      return
    }
    // Redirect theo role
    if (user?.role === 'SalesStaff') {
      navigate('/sales')
    } else if (user?.role === 'SalesManager') {
      navigate('/sales-manager/dashboard')
    } else if (user?.role === 'WarehouseStaff') {
      navigate('/warehouse')
    } else if (user?.role === 'AccountingStaff') {
      navigate('/accounting')
    } else if (user?.role === 'CEO') {
      navigate('/ceo')
    } else if (user?.role === 'Admin') {
      navigate('/admin')
    } else {
      navigate('/home')
    }
  }, [navigate])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMsg('')
    const result = await login(email, password)
    if (result.success) {
      handleRedirect(result.user)
    } else {
      setErrorMsg(result.message)
    }
  }

  const handleGoogleSuccess = useCallback(async (idToken) => {
    setErrorMsg('')
    const result = await loginWithGoogle(idToken)
    if (result.success) {
      handleRedirect(result.user)
    } else {
      setErrorMsg(result.message)
    }
  }, [loginWithGoogle, handleRedirect])

  const { triggerGoogleLogin } = useGoogleLogin(
    handleGoogleSuccess,
    (err) => setErrorMsg(err)
  )

  return (
    <div className="flex min-h-screen bg-white">
      <div className="relative hidden overflow-hidden lg:block lg:w-1/2">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-gray-800 opacity-90" />
        <img
          src="https://images.unsplash.com/photo-1497215842964-222b430dc094?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBvZmZpY2UlMjB3b3Jrc3BhY2UlMjBtaW5pbWFsfGVufDF8fHx8MTc3OTg2Mzg4NHww&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Không gian làm việc hiện đại"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center text-white"
          >
            <h1 className="mb-4 text-5xl font-bold">Chào mừng quay lại</h1>
            <p className="text-xl text-gray-200">Đăng nhập để tiếp tục khám phá văn phòng phẩm cao cấp.</p>
          </motion.div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center bg-white p-8 lg:w-1/2">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Link to="/" className="mb-8 inline-flex items-center text-gray-600 transition hover:text-gray-900">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại trang chủ
          </Link>

          <div className="mb-8">
            <h2 className="mb-2 text-3xl font-bold text-gray-900">Đăng nhập</h2>
            <p className="text-gray-600">Nhập thông tin tài khoản để tiếp tục.</p>
          </div>

          {location.state?.verified && (
            <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Tài khoản đã được xác thực. Bạn có thể đăng nhập ngay bây giờ.
            </div>
          )}

          {errorMsg && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Địa chỉ email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 pl-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 pl-11"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="remember" className="flex cursor-pointer items-center gap-2 text-sm font-normal">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />
                Ghi nhớ đăng nhập
              </Label>
              <Link to="/forgot-password" className="text-sm text-gray-700 transition hover:text-gray-900 hover:underline">
                Quên mật khẩu?
              </Link>
            </div>

            <Button type="submit" className="h-12 w-full" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-500">Hoặc tiếp tục với</span>
              </div>
            </div>

            <div className="relative w-full h-12 mt-4">
              <Button
                type="button"
                variant="outline"
                className="absolute inset-0 flex items-center justify-center w-full h-full border-gray-300 pointer-events-none"
                disabled={loading}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 15.02 1 12 1 7.35 1 3.39 3.67 1.4 7.56l3.89 3.02C6.21 7.42 8.87 5.04 12 5.04z"
                  />
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.4 3.58l3.73 2.89c2.18-2.01 3.7-4.99 3.7-8.62z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.29 14.54a7.13 7.13 0 0 1 0-4.54L1.4 6.98A11.96 11.96 0 0 0 0 12c0 1.8.4 3.51 1.4 5.02l3.89-3.02z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.73-2.89c-1.1.74-2.51 1.18-4.23 1.18-3.13 0-5.79-2.38-6.71-5.54l-3.89 3.02C3.39 20.33 7.35 23 12 23z"
                  />
                </svg>
                Tiếp tục với Google
              </Button>
              <div
                id="google-login-btn"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer [&>div]:w-full [&>div]:h-full [&_iframe]:w-full [&_iframe]:h-full"
              ></div>
            </div>
          </form>

          <p className="mt-8 text-center text-gray-600">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="font-semibold text-gray-900 hover:underline">
              Đăng ký
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
