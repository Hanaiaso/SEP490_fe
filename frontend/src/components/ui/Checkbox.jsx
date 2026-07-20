import { cn } from '../../lib/utils.js'

export function Checkbox({ className = '', ...props }) {
  return (
    <input
      type="checkbox"
      className={cn(
        'h-4 w-4 rounded border border-gray-300 accent-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/20',
        className,
      )}
      {...props}
    />
  )
}
