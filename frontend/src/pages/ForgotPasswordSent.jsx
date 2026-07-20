import { ArrowLeft, Check } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import AuthCardLayout from '../components/AuthCardLayout.jsx'
import { Button } from '../components/ui/Button.jsx'

export default function ForgotPasswordSent() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email ?? 'minhtan050804@gmail.com'

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

      <div className="mx-auto mt-10 max-w-xl space-y-5">
        <Button
          type="button"
          variant="outline"
          className="h-14 w-full rounded-2xl border-slate-300 text-base !text-slate-950 hover:!bg-slate-50 hover:!text-slate-950"
          onClick={() => navigate('/forgot-password/sent', { state: { email }, replace: true })}
        >
          Gửi lại email
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
