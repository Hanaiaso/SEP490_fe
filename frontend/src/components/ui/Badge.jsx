import { cn } from '../../lib/utils.js'

const badgeVariants = {
  default: 'bg-gray-900 text-white',
  outline: 'border border-gray-300 bg-white text-gray-700',
  secondary: 'bg-gray-100 text-gray-900',
}

export function Badge({
  className = '',
  variant = 'default',
  as: Component = 'span',
  ...props
}) {
  const hasCustomTone = /\b(?:bg|text|border)-/.test(className)
  const resolvedVariant = variant === 'default' && hasCustomTone ? '' : badgeVariants[variant] ?? badgeVariants.default

  return (
    <Component
      className={cn(
        'inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold transition-colors',
        resolvedVariant,
        className,
      )}
      {...props}
    />
  )
}
