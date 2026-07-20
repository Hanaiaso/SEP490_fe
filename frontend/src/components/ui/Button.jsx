import { cn } from '../../lib/utils.js'

const variantClasses = {
  default: 'bg-gray-900 text-white hover:bg-gray-800',
  outline: 'border border-gray-300 bg-white text-gray-900 hover:bg-gray-900 hover:text-white',
  ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 hover:text-gray-900',
}

const sizeClasses = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-base',
}

export function Button({
  className = '',
  variant = 'default',
  size = 'md',
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition duration-200 focus:outline-none focus:ring-2 focus:ring-gray-900/20 disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant] ?? variantClasses.default,
        sizeClasses[size] ?? sizeClasses.md,
        className,
      )}
      {...props}
    />
  )
}
