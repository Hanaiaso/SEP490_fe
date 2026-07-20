import { cn } from '../../lib/utils.js'

export function Input({ className = '', ...props }) {
  return (
    <input
      className={cn(
        'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10',
        className,
      )}
      {...props}
    />
  )
}
