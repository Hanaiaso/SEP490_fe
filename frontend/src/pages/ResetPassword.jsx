import { Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import AuthCardLayout from '../components/AuthCardLayout.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Label } from '../components/ui/Label.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { resetPassword, loading } = useAuth()

  const token = searchParams.get('token') ?? ''
  const email = searchParams.get('email') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Kiểm tra token & email có trong URL không
  useEffect(() => {
    if (!token || !email) {
      setErrorMsg('Liên kết đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu lại.')
    }
  }, [token, email])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMsg('')

    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.')
      return
    }

    const result = await resetPassword(token, email, newPassword, confirmPassword)
    if (result.success) {
      setSuccessMsg('Đặt lại mật khẩu thành công!')
      setTimeout(() => navigate('/login'), 2000)
    } else {
      setErrorMsg(result.message)
    }
  }

  return (
    <AuthCardLayout>
      <div className="flex flex-col items-start gap-8">
        <div className="flex h-18 w-18 items-center justify-center rounded-3xl bg-slate-900 text-white">
          <Lock className="h-8 w-8" />
        </div>
      </div>

      <div className="mt-10">
        <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">Đặt lại mật khẩu</h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-slate-600">
          Nhập mật khẩu mới cho tài khoản <span className="font-semibold text-slate-950">{email}</span>.
        </p>
      </div>

      {errorMsg && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMsg} Đang chuyển hướng đến trang đăng nhập...
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-10 space-y-6">
        <div className="space-y-3">
          <Label htmlFor="new-password" className="text-base text-slate-950">
            Mật khẩu mới
          </Label>
          <div className="relative">
            <Lock className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              id="new-password"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-14 rounded-2xl border-0 bg-slate-100 pl-14 text-base focus:bg-white focus:ring-2 focus:ring-slate-900/10"
              required
              minLength={6}
            />
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="confirm-password" className="text-base text-slate-950">
            Xác nhận mật khẩu mới
          </Label>
          <div className="relative">
            <Lock className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <Input
              id="confirm-password"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-14 rounded-2xl border-0 bg-slate-100 pl-14 text-base focus:bg-white focus:ring-2 focus:ring-slate-900/10"
              required
            />
          </div>
        </div>

        <Button
          type="submit"
          className="h-14 w-full rounded-2xl text-base"
          disabled={loading || !token || !email || !!successMsg}
        >
          {loading ? 'Đang xử lý...' : 'Xác nhận mật khẩu mới'}
        </Button>
      </form>

      <p className="mt-10 text-center text-lg text-slate-600">
        <Link to="/login" className="font-semibold text-slate-950 hover:underline">
          Quay lại đăng nhập
        </Link>
      </p>
    </AuthCardLayout>
  )
}
