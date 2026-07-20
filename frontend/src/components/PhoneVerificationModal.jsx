import React, { useState } from 'react'
import { X, Phone, ShieldCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from './ui/Button.jsx'
import { Input } from './ui/Input.jsx'
import { useAuth } from '../context/AuthContext.jsx'

export default function PhoneVerificationModal({ isOpen, onClose, currentPhone }) {
  const { requestPhoneOtp, verifyPhoneOtp } = useAuth()
  
  const [step, setStep] = useState(1) // 1: Request OTP, 2: Verify OTP
  const [phoneNumber, setPhoneNumber] = useState(currentPhone || '')
  const [otpCode, setOtpCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Reset state when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setStep(1)
      setPhoneNumber(currentPhone || '')
      setOtpCode('')
      setErrorMsg('')
      setSuccessMsg('')
    }
  }, [isOpen, currentPhone])

  const handleRequestOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    if (!phoneNumber) {
      setErrorMsg('Vui lòng nhập số điện thoại')
      return
    }
    
    setLoading(true)
    try {
      const result = await requestPhoneOtp(phoneNumber)
      if (result.success) {
        setSuccessMsg('Đã gửi mã OTP qua SMS!')
        setStep(2)
      } else {
        setErrorMsg(result.message || 'Có lỗi xảy ra khi gửi OTP.')
      }
    } catch (err) {
      setErrorMsg(err.message || 'Lỗi kết nối máy chủ.')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    if (!otpCode) {
      setErrorMsg('Vui lòng nhập mã OTP')
      return
    }

    setLoading(true)
    const result = await verifyPhoneOtp(otpCode, phoneNumber)
    setLoading(false)

    if (result.success) {
      setSuccessMsg('Xác minh thành công!')
      setTimeout(() => {
        onClose()
      }, 1500)
    } else {
      setErrorMsg(result.message || 'Mã OTP không chính xác.')
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-6">
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  {step === 1 ? <Phone className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                </div>
                <h2 className="text-xl font-bold text-gray-900">
                  {step === 1 ? 'Xác minh số điện thoại' : 'Nhập mã OTP'}
                </h2>
                <p className="text-sm text-gray-500 mt-2">
                  {step === 1 
                    ? 'Vui lòng nhập số điện thoại để nhận mã xác minh qua SMS.'
                    : `Mã OTP đã được gửi đến số ${phoneNumber}. Vui lòng kiểm tra tin nhắn.`}
                </p>
              </div>

              {errorMsg && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
                  {errorMsg}
                </div>
              )}
              
              {successMsg && (
                <div className="mb-4 p-3 bg-green-50 text-green-600 rounded-lg text-sm border border-green-200">
                  {successMsg}
                </div>
              )}

              {step === 1 ? (
                <form onSubmit={handleRequestOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      type="tel"
                      placeholder="Nhập số điện thoại của bạn"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="w-full text-center text-lg"
                      required
                    />
                  </div>
                  <Button type="button" onClick={handleRequestOtp} className="w-full" disabled={loading}>
                  {loading ? 'Đang gửi...' : 'Gửi mã OTP'}
                </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Input
                      type="text"
                      placeholder="Mã OTP 6 số"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      className="w-full text-center text-xl tracking-widest"
                      maxLength={6}
                      required
                    />
                  </div>
                  <Button type="button" onClick={handleVerifyOtp} className="w-full" disabled={loading}>
                    {loading ? 'Đang xác minh...' : 'Xác minh'}
                  </Button>
                  <div className="flex flex-col items-center gap-3 mt-4">
                    <button 
                      type="button" 
                      onClick={handleRequestOtp} 
                      disabled={loading}
                      className="text-sm font-medium text-gray-900 hover:underline disabled:text-gray-400 disabled:no-underline"
                    >
                      Gửi lại mã OTP
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setStep(1)} 
                      className="text-sm text-gray-500 hover:underline"
                    >
                      Thay đổi số điện thoại
                    </button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
