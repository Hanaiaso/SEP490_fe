import { Star } from 'lucide-react'
import { cn } from '../../lib/utils.js'

const SIZES = {
  sm: 'h-3.5 w-3.5',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
}

/**
 * Hiển thị/chọn số sao đánh giá (1-5).
 * - readOnly: chỉ hiển thị, không click được (dùng cho danh sách/badge).
 * - !readOnly: interactive, gọi onChange(star) khi click (dùng cho form đánh giá).
 */
export function StarRating({ value = 0, onChange, readOnly = true, size = 'md', className = '' }) {
  const sizeClass = SIZES[size] ?? SIZES.md

  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= Math.round(value)
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(star)}
            aria-label={`${star} sao`}
            className={cn(readOnly ? 'cursor-default' : 'cursor-pointer')}
          >
            <Star className={cn(sizeClass, filled ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300')} />
          </button>
        )
      })}
    </div>
  )
}
