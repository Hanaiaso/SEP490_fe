import { useState } from 'react'
import { Heart, ShoppingCart } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { Button } from './ui/Button.jsx'
import { formatPrice } from '../services/productService.js'
import { useCart } from '../context/CartContext.jsx'

export default function ProductListCard({ product }) {
  const [isWishlisted, setIsWishlisted] = useState(false)

  const imageUrl = product.imageUrl
    || product.image
    || `https://placehold.co/600x600/f3f4f6/9ca3af?text=${encodeURIComponent(product.name)}`

  const price    = product.standardListedPrice ?? product.price ?? 0
  const category = product.categoryName ?? product.category ?? ''
  
  const { addToCart } = useCart()
  const [adding, setAdding] = useState(false)
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
      viewport={{ once: true }}
      transition={{ duration: 0.45 }}
      className="group overflow-hidden rounded-[1.5rem] border border-gray-100 bg-white transition-all duration-300 hover:shadow-lg"
    >
      <div className="flex flex-col gap-6 p-5 md:flex-row">
        <div className="relative h-56 overflow-hidden rounded-[1.25rem] bg-gray-100 md:w-48 md:flex-shrink-0">
          <Link to={`/products/${product.id}`} className="block h-full w-full">
            <img
              src={imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          </Link>

          {product.availableStock === 0 && (
            <div className="absolute left-3 top-3">
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">Hết hàng</span>
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setIsWishlisted((v) => !v)}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-md transition hover:bg-gray-50"
            aria-label="Thêm vào yêu thích"
          >
            <Heart className={isWishlisted ? 'h-4 w-4 fill-red-500 text-red-500' : 'h-4 w-4 text-gray-600'} />
          </motion.button>
        </div>

        <div className="flex flex-1 flex-col justify-between gap-5 py-1">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-gray-500">{category}</p>
            <Link to={`/products/${product.id}`}>
              <h3 className="mb-3 text-2xl font-bold text-gray-900 transition-colors hover:text-gray-600">
                {product.name}
              </h3>
            </Link>
            <p className="max-w-2xl text-sm leading-7 text-gray-600">{product.description}</p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-2xl font-bold text-gray-900">{formatPrice(price)}</span>
            <Button
              className="rounded-full bg-black px-8 text-white hover:bg-gray-800 disabled:opacity-40"
              disabled={product.availableStock === 0 || adding}
              onClick={handleAddToCartClick}
            >
              <ShoppingCart className="h-4 w-4" />
              {adding ? 'Đang thêm...' : 'Thêm vào giỏ'}
            </Button>
          </div>
        </div>
      </div>
    </motion.article>
  )
}
