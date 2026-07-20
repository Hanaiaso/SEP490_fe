import { ArrowLeft, MailCheck } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthCardLayout from '../components/AuthCardLayout.jsx'
import { Button } from '../components/ui/Button.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import * as authService from '../services/authService.js'

function normalizeOtp(value) {
  return value.replace(/\D/g, '').slice(0, 6)
}

export default function VerifyOtp() {
  const navigate = useNavigate()
  const location = useLocation()
  const { verifyOtp, loading } = useAuth()
  const email = location.state?.email ?? 'you@example.com'
  const [otp, setOtp] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [resending, setResending] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMsg('')
    const result = await verifyOtp(email, otp)
    if (result.success) {
      navigate('/login', { state: { email, verified: true } })
    } else {
      setErrorMsg(result.message)
    }
  }

  const handleResend = async () => {
    setResending(true)
    setErrorMsg('')
    setSuccessMsg('')
    try {
      await authService.resendOtp(email)
      setSuccessMsg('Đã gửi lại mã OTP. Vui lòng kiểm tra email.')
      setOtp('')
    } catch (err) {
      setErrorMsg(err.message || 'Không thể gửi lại OTP. Vui lòng thử lại.')
    } finally {
      setResending(false)
    }
  }

  return (
    <AuthCardLayout>
      <div className="flex flex-col items-start gap-8">
        <Link
          to="/register"
          className="inline-flex items-center gap-2 text-lg text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-5 w-5" />
          Quay lại đăng ký
        </Link>

        <div className="flex h-18 w-18 items-center justify-center rounded-3xl bg-slate-900 text-white">
          <MailCheck className="h-8 w-8" />
        </div>
      </div>

      <div className="mt-10">
        <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">Nhập mã OTP</h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">
          Chúng tôi đã gửi mã xác thực gồm 6 số đến <span className="font-semibold text-slate-950">{email}</span>.
        </p>
      </div>

      {errorMsg && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-10 space-y-8">
        <label className="block">
          <span className="mb-4 block text-base font-medium text-slate-950">Mã xác thực</span>
          <div className="grid grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className={`flex h-14 items-center justify-center rounded-2xl border text-center text-xl font-semibold text-slate-950 shadow-sm transition ${
                  otp[index]
                    ? 'border-slate-900 bg-white'
                    : 'border-slate-200 bg-slate-50'
                }`}
              >
                {otp[index] ?? ''}
              </div>
            ))}
          </div>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(event) => setOtp(normalizeOtp(event.target.value))}
            placeholder="Nhập 6 số OTP"
            className="mt-4 h-14 w-full rounded-2xl border border-slate-200 px-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            required
          />
        </label>

        <Button
          type="submit"
          className="h-14 w-full rounded-2xl text-base"
          disabled={otp.length !== 6 || loading}
        >
          {loading ? 'Đang xác minh...' : 'Xác nhận và quay lại đăng nhập'}
        </Button>

        <button
          type="button"
          className="w-full text-center text-base text-slate-600 transition hover:text-slate-950 disabled:opacity-50"
          onClick={handleResend}
          disabled={resending || loading}
        >
          {resending ? 'Đang gửi lại...' : 'Gửi lại mã OTP'}
        </button>
      </form>
    </AuthCardLayout>
  )
}
