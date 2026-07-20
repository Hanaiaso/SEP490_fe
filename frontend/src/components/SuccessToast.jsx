import { useEffect } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { motion } from 'motion/react'

export default function SuccessToast({ message, onClose, duration = 3500 }) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      onClose()
    }, duration)

    return () => window.clearTimeout(timer)
  }, [duration, onClose])

  return (
    <motion.div
      initial={{ opacity: 0, x: 28 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 28 }}
      transition={{ duration: 0.22 }}
      className="fixed right-6 top-24 z-[80] inline-flex w-fit max-w-[calc(100vw-3rem)] items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-800 shadow-lg"
    >
      <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
      <span>{message}</span>
    </motion.div>
  )
}
