import { motion, AnimatePresence } from 'motion/react'
import { Button } from './Button.jsx'

export default function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h3 className="mb-2 text-lg font-bold text-gray-900">{title}</h3>
            <p className="mb-6 text-sm text-gray-500 leading-relaxed">{message}</p>

            <div className="flex justify-end gap-3">
              <Button variant="outline" size="sm" onClick={onCancel} className="rounded-xl">
                {cancelText}
              </Button>
              <Button size="sm" onClick={onConfirm} className="rounded-xl">
                {confirmText}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

