import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'motion/react'

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)

  function getVisiblePages() {
    if (totalPages <= 5) return pages
    if (currentPage <= 3) return pages.slice(0, 5)
    if (currentPage >= totalPages - 2) return pages.slice(totalPages - 5)
    return pages.slice(currentPage - 3, currentPage + 2)
  }

  const visiblePages = getVisiblePages()

  return (
    <div className="mt-12 flex items-center justify-center gap-2">
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white transition-colors disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        <ChevronLeft className="h-5 w-5" />
      </motion.button>

      {visiblePages.map((page) => (
        <motion.button
          key={page}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onPageChange(page)}
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
            currentPage === page ? 'bg-black text-white' : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          {page}
        </motion.button>
      ))}

      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-white transition-colors disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        <ChevronRight className="h-5 w-5" />
      </motion.button>
    </div>
  )
}
