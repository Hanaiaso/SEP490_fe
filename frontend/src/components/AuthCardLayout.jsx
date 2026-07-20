import { motion } from 'motion/react'

export default function AuthCardLayout({ children }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.15),_transparent_30%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-[42rem] rounded-[2rem] border border-slate-100 bg-white p-8 shadow-[0_24px_60px_rgba(15,23,42,0.12)] sm:p-12"
        >
          {children}
        </motion.div>
      </div>
    </div>
  )
}
