import { useState } from 'react'
import { Eye, Heart, ShoppingCart } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { formatPrice } from '../services/productService.js'
import { useCart } from '../context/CartContext.jsx'

export default function ProductCard({ product }) {
  const [isWishlisted, setIsWishlisted] = useState(false)
  const { addToCart } = useCart()
  const [adding, setAdding] = useState(false)

  const imageUrl = product.imageUrl
    || product.image  // fallback nếu dùng data tĩnh
    || `https://placehold.co/600x600/f3f4f6/9ca3af?text=${encodeURIComponent(product.name)}`

  const price     = product.standardListedPrice ?? product.price ?? 0
  const category  = product.categoryName ?? product.category ?? ''
  const productId = product.id

  async function handleAddToCartClick(e) {
    e.preventDefault()
    e.stopPropagation()
    setAdding(true)
    try {
      await addToCart(productId, 1)
      alert(`Đã thêm "${product.name}" vào giỏ hàng!`)
    } catch (err) {
      alert(err.message || 'Không thể thêm sản phẩm vào giỏ hàng')
    } finally {
      setAdding(false)
    }
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45 }}
      className="group overflow-hidden rounded-[1.75rem] bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <Link to={`/products/${productId}`} className="block h-full w-full">
          <img
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
        </Link>

        {/* Stock badge */}
        {product.availableStock === 0 && (
          <div className="pointer-events-none absolute left-4 top-4">
            <span className="rounded-full bg-red-500 px-3 py-1 text-xs font-medium text-white">Hết hàng</span>
          </div>
        )}

        {/* Wishlist button */}
        <div className="absolute right-4 top-4">
          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setIsWishlisted((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md transition hover:bg-gray-50"
            aria-label="Toggle wishlist"
          >
            <Heart className={isWishlisted ? 'h-4 w-4 fill-red-500 text-red-500' : 'h-4 w-4 text-gray-600'} />
          </motion.button>
        </div>

        {/* Hover actions */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 opacity-0 transition duration-300 group-hover:opacity-100">
          <Link
            to={`/products/${productId}`}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg transition hover:bg-gray-900 hover:text-white"
            aria-label="Xem chi tiết"
          >
            <Eye className="h-4 w-4" />
          </Link>
          <motion.button
            type="button"
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.96 }}
            disabled={product.availableStock === 0 || adding}
            onClick={handleAddToCartClick}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg transition hover:bg-gray-800 disabled:opacity-40"
            aria-label="Thêm vào giỏ"
          >
            <ShoppingCart className="h-4 w-4" />
          </motion.button>
        </div>
      </div>

      <div className="p-6">
        <p className="mb-2 text-xs uppercase tracking-[0.3em] text-gray-500">{category}</p>
        <Link to={`/products/${productId}`}>
          <h3 className="text-clamp-1 mb-2 text-lg font-semibold text-gray-900 transition-colors hover:text-gray-600">
            {product.name}
          </h3>
        </Link>
        <p className="text-clamp-2 mb-4 min-h-10 text-sm leading-6 text-gray-600">{product.description}</p>
        <span className="text-xl font-bold text-gray-900">{formatPrice(price)}</span>
      </div>
    </motion.article>
  )
}
