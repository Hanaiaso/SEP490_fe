import { useEffect, useState } from 'react'
import { Heart, Loader2, Minus, Package, Plus, RotateCcw, Shield, ShoppingCart, Truck } from 'lucide-react'
import { motion } from 'motion/react'
import { Link, useParams } from 'react-router-dom'
import Footer from '../components/Footer.jsx'
import Header from '../components/Header.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Button } from '../components/ui/Button.jsx'
import { formatPrice, getProductById, getProducts } from '../services/productService.js'
import { useCart } from '../context/CartContext.jsx'

const tabs = [
  { id: 'description', label: 'Mô Tả' },
  { id: 'specifications', label: 'Thông Số' },
]

export default function ProductDetail() {
  const { id } = useParams()
  const { addToCart } = useCart()
  const [addingToCart, setAddingToCart] = useState(false)

  const [product, setProduct] = useState(null)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [activeTab, setActiveTab] = useState('description')

  async function handleAddToCart() {
    if (!product) return
    const qty = Number(quantity) || 1
    setAddingToCart(true)
    try {
      await addToCart(product.id, qty)
      alert('Đã thêm sản phẩm vào giỏ hàng thành công!')
    } catch (err) {
      alert(err.message || 'Không thể thêm vào giỏ hàng')
    } finally {
      setAddingToCart(false)
    }
  }

  // ─── Fetch product detail ──────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return
    setLoading(true)
    setError(null)
    setProduct(null)
    setRelatedProducts([])
    setSelectedImage(0)
    setQuantity(1)

    getProductById(id)
      .then(async (data) => {
        setProduct(data)
        // Load sản phẩm liên quan cùng danh mục
        try {
          const related = await getProducts({ pageSize: 4, categoryId: data.categoryId })
          setRelatedProducts((related.items ?? []).filter((p) => p.id !== data.id).slice(0, 4))
        } catch {
          setRelatedProducts([])
        }
      })
      .catch((err) => setError(err.message || 'Không thể tải sản phẩm.'))
      .finally(() => setLoading(false))
  }, [id])

  function handleQuantityChange(delta) {
    setQuantity((v) => Math.max(1, Math.min(product?.availableStock ?? 99, v + delta)))
  }

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4 text-gray-400">
          <Loader2 className="h-10 w-10 animate-spin" />
          <p>Đang tải sản phẩm...</p>
        </div>
      </div>
    )
  }

  // ─── Error ─────────────────────────────────────────────────────────────────
  if (error || !product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <h2 className="mb-2 text-2xl font-bold text-gray-900">
            {error ?? 'Không tìm thấy sản phẩm'}
          </h2>
          <Link to="/products" className="text-gray-600 hover:text-gray-900">
            Quay lại danh sách
          </Link>
        </div>
      </div>
    )
  }

  // Use the single ImageUrl from API (or placeholder if null)
  const placeholderImg = `https://placehold.co/600x600/f3f4f6/9ca3af?text=${encodeURIComponent(product.name)}`
  const productImages = Array.from({ length: 4 }, () => product.imageUrl || placeholderImg)

  const stockLabel = product.availableStock != null
    ? product.availableStock > 0
      ? `Còn hàng (${product.availableStock} sản phẩm)`
      : 'Hết hàng'
    : 'Liên hệ để kiểm tra'

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="pt-20">
        {/* Breadcrumb */}
        <div className="border-b border-gray-100">
          <div className="mx-auto max-w-7xl px-6 py-6 lg:px-8">
            <div className="flex items-center gap-2 text-sm">
              <Link to="/" className="text-gray-600 hover:text-gray-900">Trang chủ</Link>
              <span className="text-gray-400">/</span>
              <Link to="/products" className="text-gray-600 hover:text-gray-900">Sản phẩm</Link>
              <span className="text-gray-400">/</span>
              <span className="font-medium text-gray-900">{product.name}</span>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
            {/* Images */}
            <div className="space-y-4">
              <motion.div
                key={selectedImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="aspect-square overflow-hidden rounded-[2rem] bg-gray-100"
              >
                <img
                  src={productImages[selectedImage]}
                  alt={product.name}
                  className="h-full w-full object-cover"
                />
              </motion.div>

              <div className="grid grid-cols-4 gap-4">
                {productImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-square overflow-hidden rounded-[1.25rem] border-2 bg-gray-100 transition-all ${selectedImage === index ? 'border-gray-900 shadow-lg' : 'border-transparent hover:border-gray-300'
                      }`}
                  >
                    <img src={image} alt={`${product.name} ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

            {/* Product info */}
            <div className="space-y-6">
              <div>
                <p className="mb-2 text-sm uppercase tracking-[0.3em] text-gray-500">{product.categoryName}</p>
                <h1 className="mb-1 text-4xl font-bold text-gray-900">{product.name}</h1>
                <p className="text-sm text-gray-400">SKU: {product.sku}</p>
              </div>

              <div className="border-y border-gray-100 py-6">
                <div className="text-4xl font-bold text-gray-900">{formatPrice(product.standardListedPrice)}</div>
                <p className="mt-2 text-sm text-gray-600">Đã bao gồm thuế. Phí vận chuyển được tính khi thanh toán.</p>
              </div>

              {product.description && (
                <p className="leading-relaxed text-gray-600">{product.description}</p>
              )}

              {/* Quantity */}
              <div>
                <label className="mb-3 block text-sm font-semibold uppercase tracking-wider text-gray-900">Số Lượng</label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center rounded-full border border-gray-300">
                    <button
                      onClick={() => handleQuantityChange(-1)}
                      className="rounded-l-full p-3 transition-colors hover:bg-gray-100"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={product?.availableStock ?? 9999}
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10)
                        if (!isNaN(val)) {
                          const maxStock = product?.availableStock ?? 9999
                          setQuantity(Math.max(1, Math.min(maxStock, val)))
                        } else if (e.target.value === '') {
                          setQuantity('')
                        }
                      }}
                      onBlur={() => {
                        if (quantity === '' || quantity < 1) {
                          setQuantity(1)
                        }
                      }}
                      className="w-16 text-center font-medium bg-transparent border-none focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-0"
                    />
                    <button
                      onClick={() => handleQuantityChange(1)}
                      disabled={product.availableStock != null && quantity >= product.availableStock}
                      className="rounded-r-full p-3 transition-colors hover:bg-gray-100 disabled:opacity-40"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <span className={`text-sm ${product.availableStock === 0 ? 'text-red-500' : 'text-gray-600'}`}>
                    {stockLabel}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <Button
                  size="lg"
                  className="flex-1 rounded-full bg-gray-900 text-white hover:bg-gray-800"
                  disabled={product.availableStock === 0 || addingToCart}
                  onClick={handleAddToCart}
                >
                  <ShoppingCart className="h-5 w-5" />
                  {addingToCart ? 'Đang thêm...' : 'Thêm Vào Giỏ'}
                </Button>
                <Button size="lg" variant="outline" className="rounded-full px-6">
                  <Heart className="h-5 w-5" />
                </Button>
              </div>

              {/* Features */}
              <div className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
                {[
                  { icon: Truck, title: 'Miễn Phí Vận Chuyển', description: 'Đơn hàng trên 500.000 đ' },
                  { icon: RotateCcw, title: 'Đổi Trả Dễ Dàng', description: 'Chính sách 30 ngày' },
                  { icon: Package, title: 'Đóng Gói Cẩn Thận', description: 'Xử lý cẩn trọng' },
                  { icon: Shield, title: 'Bảo Hành Chất Lượng', description: 'Sản phẩm cao cấp' },
                ].map((feature) => (
                  <div key={feature.title} className="flex items-start gap-3">
                    <div className="rounded-lg bg-gray-100 p-2">
                      <feature.icon className="h-5 w-5 text-gray-900" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{feature.title}</p>
                      <p className="text-xs text-gray-600">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-20">
            <div className="flex flex-wrap border-b border-gray-100">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`border-b-2 px-8 py-4 text-sm font-medium transition-colors ${activeTab === tab.id
                      ? 'border-gray-900 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-900'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'description' && (
              <div className="py-12">
                <p className="leading-relaxed text-gray-600">
                  {product.description || 'Chưa có mô tả cho sản phẩm này.'}
                </p>
              </div>
            )}

            {activeTab === 'specifications' && (
              <div className="grid grid-cols-1 gap-x-12 gap-y-4 py-12 md:grid-cols-2">
                {[
                  ['Thương Hiệu', 'Việt Tiến'],
                  ['SKU', product.sku],
                  ['Danh Mục', product.categoryName],
                  ['Tồn Kho Thực Tế', product.physicalStock != null ? `${product.physicalStock} sản phẩm` : 'N/A'],
                  ...(product.specifications
                    ? product.specifications.split('\n').map((line) => {
                      const [k, ...v] = line.split(':')
                      return [k?.trim(), v.join(':').trim()]
                    }).filter(([k]) => k)
                    : []),
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between border-b border-gray-100 pb-3">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-medium text-gray-900">{value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Related products */}
          {relatedProducts.length > 0 && (
            <div className="mt-20">
              <div className="mb-10">
                <p className="mb-2 text-sm uppercase tracking-[0.4em] text-gray-500">Có Thể Bạn Thích</p>
                <h2 className="text-4xl font-bold text-gray-900">Sản Phẩm Liên Quan</h2>
              </div>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
                {relatedProducts.map((rp) => (
                  <ProductCard key={rp.id} product={rp} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
