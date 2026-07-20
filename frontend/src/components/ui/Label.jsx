import { cn } from '../../lib/utils.js'

export function Label({ className = '', ...props }) {
  return <label className={cn('text-sm font-medium text-gray-800', className)} {...props} />
}
