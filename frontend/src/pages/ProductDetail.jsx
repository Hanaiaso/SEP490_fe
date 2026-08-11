import { useEffect, useState } from 'react'
import { Headphones, Loader2, Minus, Package, Plus, Shield, ShoppingCart, Truck } from 'lucide-react'
import { motion } from 'motion/react'
import { Link, useParams } from 'react-router-dom'
import Footer from '../components/Footer.jsx'
import Header from '../components/Header.jsx'
import ProductCard from '../components/ProductCard.jsx'
import ConfirmModal from '../components/ui/ConfirmModal.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Button } from '../components/ui/Button.jsx'
import { StarRating } from '../components/ui/StarRating.jsx'
import { formatPrice, getProductById, getProducts } from '../services/productService.js'
import {
  createReview,
  deleteReview,
  getProductReviews,
  getReviewEligibility,
  getReviewSummary,
  updateReview,
} from '../services/reviewService.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'

const tabs = [
  { id: 'description', label: 'Mô Tả' },
  { id: 'specifications', label: 'Thông Số' },
]

export default function ProductDetail() {
  const { id } = useParams()
  const { addToCart } = useCart()
  const { user, isAuthenticated } = useAuth()
  const [addingToCart, setAddingToCart] = useState(false)

  const [product, setProduct] = useState(null)
  const [relatedProducts, setRelatedProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [activeTab, setActiveTab] = useState('description')

  // ─── Đánh giá sản phẩm ───────────────────────────────────────────────────
  const isCustomer = isAuthenticated && (user?.role ?? 'Customer') === 'Customer'
  const [reviews, setReviews] = useState([])
  const [reviewSummary, setReviewSummary] = useState({ averageRating: 0, reviewCount: 0 })
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [eligibility, setEligibility] = useState(null)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [editingReviewId, setEditingReviewId] = useState(null)
  const [formRating, setFormRating] = useState(5)
  const [formComment, setFormComment] = useState('')
  const [submittingReview, setSubmittingReview] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  async function handleAddToCart() {
    if (!product) return
    const qty = Number(quantity) || 1
    setAddingToCart(true)
    try {
      await addToCart({
        id: product.id,
        name: product.name,
        imageUrl: product.imageUrl,
        price: product.standardListedPrice ?? product.price,
      }, qty)
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

  // ─── Fetch đánh giá sản phẩm ────────────────────────────────────────────────
  async function loadReviews() {
    setReviewsLoading(true)
    try {
      const [list, summary] = await Promise.all([getProductReviews(id), getReviewSummary(id)])
      setReviews(list)
      setReviewSummary(summary)
    } catch {
      setReviews([])
    } finally {
      setReviewsLoading(false)
    }
  }

  async function loadEligibility() {
    if (!isCustomer) {
      setEligibility(null)
      return
    }
    try {
      setEligibility(await getReviewEligibility(id))
    } catch {
      setEligibility(null)
    }
  }

  useEffect(() => {
    if (!id) return
    setShowReviewForm(false)
    setEditingReviewId(null)
    loadReviews()
    loadEligibility()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isCustomer])

  function openCreateReviewForm() {
    setEditingReviewId(null)
    setFormRating(5)
    setFormComment('')
    setShowReviewForm(true)
  }

  function openEditReviewForm() {
    const mine = reviews.find((r) => r.id === eligibility?.existingReviewId)
    setEditingReviewId(eligibility?.existingReviewId ?? null)
    setFormRating(mine?.rating ?? 5)
    setFormComment(mine?.comment ?? '')
    setShowReviewForm(true)
  }

  async function handleSubmitReview(e) {
    e.preventDefault()
    if (!formComment.trim()) return
    setSubmittingReview(true)
    try {
      if (editingReviewId) {
        await updateReview(editingReviewId, { rating: formRating, comment: formComment.trim() })
      } else {
        await createReview(id, { rating: formRating, comment: formComment.trim() })
      }
      setShowReviewForm(false)
      setEditingReviewId(null)
      await Promise.all([loadReviews(), loadEligibility()])
    } catch (err) {
      alert(err.message || 'Không thể gửi đánh giá.')
    } finally {
      setSubmittingReview(false)
    }
  }

  async function handleDeleteReview() {
    if (!eligibility?.existingReviewId) return
    try {
      await deleteReview(eligibility.existingReviewId)
      setDeleteConfirmOpen(false)
      await Promise.all([loadReviews(), loadEligibility()])
    } catch (err) {
      alert(err.message || 'Không thể xoá đánh giá.')
    }
  }

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
              </div>

              {/* Features */}
              <div className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2">
                {[
                  { icon: Truck, title: 'Giao Hàng Tận Nơi', description: 'Theo lịch & thỏa thuận đơn hàng' },
                  { icon: Shield, title: 'Chuẩn Quy Cách', description: 'Đúng sóng, kích thước & định lượng' },
                  { icon: Package, title: 'Đóng Kiện Chắc Chắn', description: 'Đai nẹp pallet & màng PE bảo vệ' },
                  { icon: Headphones, title: 'Hỗ Trợ Kỹ Thuật', description: 'Tư vấn & tiếp nhận xử lý trong 24h' },
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

          {/* Đánh giá sản phẩm */}
          <div className="mt-20 border-t border-gray-100 pt-16">
            <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="mb-2 text-sm uppercase tracking-[0.4em] text-gray-500">Khách Hàng Nói Gì</p>
                <h2 className="text-4xl font-bold text-gray-900">Đánh Giá Sản Phẩm</h2>
              </div>
              <div className="flex items-center gap-3">
                <StarRating value={reviewSummary.averageRating} size="lg" />
                <span className="text-lg font-semibold text-gray-900">{reviewSummary.averageRating.toFixed(1)}</span>
                <span className="text-sm text-gray-500">({reviewSummary.reviewCount} đánh giá)</span>
              </div>
            </div>

            {isCustomer && (
              <div className="mb-10 rounded-2xl border border-gray-100 bg-gray-50 p-6">
                {showReviewForm ? (
                  <form onSubmit={handleSubmitReview} className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-gray-900">Số sao</label>
                      <StarRating value={formRating} onChange={setFormRating} readOnly={false} size="lg" />
                    </div>
                    <textarea
                      value={formComment}
                      onChange={(e) => setFormComment(e.target.value)}
                      rows={4}
                      maxLength={2000}
                      placeholder="Chia sẻ cảm nhận của bạn về sản phẩm..."
                      className="w-full rounded-xl border border-gray-200 p-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                    />
                    <div className="flex gap-3">
                      <Button type="submit" disabled={submittingReview || !formComment.trim()} className="rounded-full">
                        {submittingReview ? 'Đang gửi...' : editingReviewId ? 'Lưu đánh giá' : 'Gửi đánh giá'}
                      </Button>
                      <Button type="button" variant="outline" className="rounded-full" onClick={() => setShowReviewForm(false)}>
                        Hủy
                      </Button>
                    </div>
                  </form>
                ) : eligibility?.canReview ? (
                  <Button className="rounded-full" onClick={openCreateReviewForm}>Viết đánh giá</Button>
                ) : eligibility?.alreadyReviewed ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-sm text-gray-600">Bạn đã đánh giá sản phẩm này.</p>
                    <Button variant="outline" size="sm" className="rounded-full" onClick={openEditReviewForm}>Sửa đánh giá</Button>
                    <Button variant="outline" size="sm" className="rounded-full" onClick={() => setDeleteConfirmOpen(true)}>Xoá</Button>
                  </div>
                ) : null}
              </div>
            )}

            {reviewsLoading ? (
              <p className="text-sm text-gray-500">Đang tải đánh giá...</p>
            ) : reviews.length === 0 ? (
              <p className="text-sm text-gray-500">Chưa có đánh giá nào cho sản phẩm này.</p>
            ) : (
              <div className="space-y-6">
                {reviews.map((r) => (
                  <div key={r.id} className="border-b border-gray-100 pb-6">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-gray-900">{r.customerName}</span>
                        <StarRating value={r.rating} size="sm" />
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(r.updatedAt || r.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-600">{r.comment}</p>
                    {r.replyText && (
                      <div className="mt-3 ml-6 rounded-xl bg-gray-50 p-4">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                          Phản hồi từ Việt Tiến{r.repliedByName ? ` · ${r.repliedByName}` : ''}
                        </p>
                        <p className="text-sm leading-relaxed text-gray-600">{r.replyText}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <ConfirmModal
            isOpen={deleteConfirmOpen}
            title="Xoá đánh giá"
            message="Bạn có chắc muốn xoá đánh giá này? Hành động này không thể hoàn tác."
            confirmText="Xoá"
            onConfirm={handleDeleteReview}
            onCancel={() => setDeleteConfirmOpen(false)}
          />

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
