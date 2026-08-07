import { ArrowLeft, Check } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthCardLayout from '../components/AuthCardLayout.jsx'
import { Button } from '../components/ui/Button.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function ForgotPasswordSent() {
  const navigate = useNavigate()
  const location = useLocation()
  const { forgotPassword, loading } = useAuth()
  const email = location.state?.email ?? 'minhtan050804@gmail.com'
  const [countdown, setCountdown] = useState(60)
  const [resending, setResending] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const handleResend = async () => {
    if (countdown > 0) return

    setResending(true)
    setErrorMsg('')
    try {
      const result = await forgotPassword(email)
      if (result.success) {
        setCountdown(60)
      } else {
        setErrorMsg(result.message || 'Có lỗi xảy ra khi gửi lại email.')
      }
    } catch (err) {
      setErrorMsg(err.message || 'Không thể gửi lại email. Vui lòng thử lại.')
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthCardLayout>
      <div className="flex flex-col items-start gap-8">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-lg text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-5 w-5" />
          Quay lại đăng nhập
        </Link>

        <div className="mx-auto flex h-18 w-18 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-600">
          <Check className="h-9 w-9" />
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">Kiểm tra email của bạn</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">
          Chúng tôi đã gửi liên kết đặt lại mật khẩu đến <span className="font-semibold text-slate-950">{email}</span>
        </p>
      </div>

      {errorMsg && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-center text-red-700">
          {errorMsg}
        </div>
      )}

      <div className="mx-auto mt-10 max-w-xl space-y-5">
        <Button
          type="button"
          variant="outline"
          className="h-14 w-full rounded-2xl border-slate-300 text-base !text-slate-950 hover:!bg-slate-50 hover:!text-slate-950 disabled:opacity-50"
          onClick={handleResend}
          disabled={resending || loading || countdown > 0}
        >
          {resending 
            ? 'Đang gửi lại...' 
            : countdown > 0 
              ? `Gửi lại email sau ${countdown}s` 
              : 'Gửi lại email'}
        </Button>

        <Link to="/login" className="block text-center text-lg text-slate-700 transition hover:text-slate-950">
          Quay lại đăng nhập
        </Link>
      </div>

      <p className="mt-14 text-center text-lg text-slate-600">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="font-semibold text-slate-950 hover:underline">
          Đăng ký
        </Link>
      </p>
    </AuthCardLayout>
  )
}
