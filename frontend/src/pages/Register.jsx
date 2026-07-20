import { useState } from 'react'
import { ArrowLeft, Building2, Gift, Lock, Mail, Phone, User } from 'lucide-react'
import { motion } from 'motion/react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Label } from '../components/ui/Label.jsx'

export default function Register() {
  const navigate = useNavigate()
  const { register, loading } = useAuth()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    taxCode: '',
    referralCode: '',
  })
  const [errorMsg, setErrorMsg] = useState('')

  const handleChange = (field, value) => {
    setFormData((current) => ({ ...current, [field]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMsg('')

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.')
      return
    }

    const result = await register(formData)
    if (result.success) {
      navigate('/verify-otp', {
        state: {
          email: formData.email,
          fullName: formData.fullName,
        },
      })
    } else {
      setErrorMsg(result.message)
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      <div className="relative hidden overflow-hidden lg:block lg:w-1/2">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-slate-700 opacity-90" />
        <img
          src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1200&q=80"
          alt="Bàn làm việc tối giản"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center text-white"
          >
            <h1 className="mb-4 text-5xl font-bold">Tham gia Viet Tien</h1>
            <p className="text-xl text-slate-200">Tạo tài khoản để nhận mã OTP xác thực qua email.</p>
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
            <h2 className="mb-2 text-3xl font-bold text-gray-900">Tạo tài khoản</h2>
            <p className="text-gray-600">Điền thông tin để bắt đầu và xác thực bằng mã OTP.</p>
          </div>

          {errorMsg && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">Họ và tên</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Nguyễn Văn A"
                  value={formData.fullName}
                  onChange={(event) => handleChange('fullName', event.target.value)}
                  className="h-12 pl-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Địa chỉ email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(event) => handleChange('email', event.target.value)}
                  className="h-12 pl-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Số điện thoại</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="0912345678"
                  value={formData.phoneNumber}
                  onChange={(event) => handleChange('phoneNumber', event.target.value)}
                  className="h-12 pl-11"
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
                  value={formData.password}
                  onChange={(event) => handleChange('password', event.target.value)}
                  className="h-12 pl-11"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(event) => handleChange('confirmPassword', event.target.value)}
                  className="h-12 pl-11"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxCode">Mã số thuế (tuỳ chọn)</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="taxCode"
                    type="text"
                    placeholder="0312345678"
                    value={formData.taxCode}
                    onChange={(event) => handleChange('taxCode', event.target.value)}
                    className="h-12 pl-11"
                    maxLength={20}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="referralCode">Mã giới thiệu (tuỳ chọn)</Label>
                <div className="relative">
                  <Gift className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="referralCode"
                    type="text"
                    placeholder="Mã hoặc email NV tư vấn"
                    value={formData.referralCode}
                    onChange={(event) => handleChange('referralCode', event.target.value)}
                    className="h-12 pl-11"
                    maxLength={100}
                  />
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              Bằng việc tạo tài khoản, bạn đồng ý với{' '}
              <a href="#" className="text-gray-900 hover:underline">
                Điều khoản dịch vụ
              </a>{' '}
              và{' '}
              <a href="#" className="text-gray-900 hover:underline">
                Chính sách bảo mật
              </a>
              .
            </p>

            <Button type="submit" className="h-12 w-full" disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Tạo tài khoản và nhận OTP'}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-4 text-gray-500">Hoặc đăng ký với</span>
              </div>
            </div>

            <Button type="button" variant="outline" className="h-12 w-full border-gray-300">
              Tiếp tục với Google
            </Button>
          </form>

          <p className="mt-8 text-center text-gray-600">
            Đã có tài khoản?{' '}
            <Link to="/login" className="font-semibold text-gray-900 hover:underline">
              Đăng nhập
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
