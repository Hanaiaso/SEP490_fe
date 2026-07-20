import { ArrowLeft, Mail } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthCardLayout from '../components/AuthCardLayout.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Label } from '../components/ui/Label.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const { forgotPassword, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMsg('')
    const result = await forgotPassword(email)
    // Server luôn trả 200 để không lộ user tồn tại
    if (result.success) {
      navigate('/forgot-password/sent', { state: { email } })
    } else {
      setErrorMsg(result.message)
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

        <div className="flex h-18 w-18 items-center justify-center rounded-3xl bg-slate-900 text-white">
          <Mail className="h-8 w-8" />
        </div>
      </div>

      <div className="mt-10">
        <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">Quên mật khẩu?</h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">
          Đừng lo, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu đến email của bạn.
        </p>
      </div>

      {errorMsg && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-10 space-y-8">
        <div className="space-y-3">
          <Label htmlFor="reset-email" className="text-base text-slate-950">
            Địa chỉ email
          </Label>
          <div className="relative">
            <Mail className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              id="reset-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-14 rounded-2xl border-0 bg-slate-100 pl-14 text-base text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/10"
              required
            />
          </div>
        </div>

        <Button type="submit" className="h-14 w-full rounded-2xl text-base" disabled={loading}>
          {loading ? 'Đang gửi...' : 'Gửi liên kết đặt lại'}
        </Button>
      </form>

      <p className="mt-10 text-center text-lg text-slate-600">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="font-semibold text-slate-950 hover:underline">
          Đăng ký
        </Link>
      </p>
    </AuthCardLayout>
  )
}
