import { useCallback, useEffect, useState } from 'react'
import { Grid3x3, List, Loader2, SlidersHorizontal } from 'lucide-react'
import { motion } from 'motion/react'
import Footer from '../components/Footer.jsx'
import Header from '../components/Header.jsx'
import Pagination from '../components/Pagination.jsx'
import ProductCard from '../components/ProductCard.jsx'
import ProductListCard from '../components/ProductListCard.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Checkbox } from '../components/ui/Checkbox.jsx'
import { Label } from '../components/ui/Label.jsx'
import { getCategories, getProducts } from '../services/productService.js'

const PAGE_SIZE = 6
const MAX_PRICE = 2000000

export default function Products() {
  // ─── Filter / UI state ─────────────────────────────────────────────────────
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [priceLimit, setPriceLimit]                 = useState(MAX_PRICE)
  const [sortBy, setSortBy]                         = useState('featured')
  const [viewMode, setViewMode]                     = useState('list')
  const [showFilters, setShowFilters]               = useState(true)
  const [currentPage, setCurrentPage]               = useState(1)
  const [searchText, setSearchText]                 = useState('')

  // ─── API state ─────────────────────────────────────────────────────────────
  const [products, setProducts]     = useState([])
  const [categories, setCategories] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  // ─── Load categories once ──────────────────────────────────────────────────
  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
  }, [])

  // ─── Load products whenever filters / page change ─────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getProducts({
        page:       currentPage,
        pageSize:   PAGE_SIZE,
        categoryId: selectedCategoryId ?? undefined,
        search:     searchText || undefined,
      })
      setProducts(data.items ?? [])
      setTotalCount(data.totalCount ?? 0)
      setTotalPages(data.totalPages ?? 1)
    } catch (err) {
      setError(err.message || 'Không thể tải sản phẩm.')
    } finally {
      setLoading(false)
    }
  }, [currentPage, selectedCategoryId, searchText])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function toggleCategory(categoryId) {
    setSelectedCategoryId((prev) => (prev === categoryId ? null : categoryId))
    setCurrentPage(1)
  }

  function resetFilters() {
    setSelectedCategoryId(null)
    setPriceLimit(MAX_PRICE)
    setSearchText('')
    setCurrentPage(1)
  }

  // Client-side sort (price sort needs data already fetched; name sort is local)
  const displayedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case 'price-low':
        return a.standardListedPrice - b.standardListedPrice
      case 'price-high':
        return b.standardListedPrice - a.standardListedPrice
      case 'name':
        return a.name.localeCompare(b.name)
      default:
        return 0
    }
  }).filter((p) => p.standardListedPrice <= priceLimit)

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <div className="bg-white pt-20">
        {/* Breadcrumb */}
        <div className="border-b border-gray-100">
          <div className="mx-auto max-w-7xl px-6 py-6 lg:px-8">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-600">Trang chủ</span>
              <span className="text-gray-400">/</span>
              <span className="font-medium text-gray-900">Sản phẩm</span>
            </div>
          </div>
        </div>

        {/* Header bar */}
        <div className="border-b border-gray-100">
          <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="mb-2 text-4xl font-bold text-gray-900">Tất Cả Sản Phẩm</h1>
                <p className="text-gray-600">
                  {loading
                    ? 'Đang tải...'
                    : `Hiển thị ${displayedProducts.length} trên ${totalCount} sản phẩm`}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                {/* Search */}
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => { setSearchText(e.target.value); setCurrentPage(1) }}
                  placeholder="Tìm kiếm sản phẩm..."
                  className="h-11 w-52 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                />

                {/* View mode toggle */}
                <div className="flex items-center gap-2 rounded-lg bg-gray-100 p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`rounded p-2 ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`rounded p-2 ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-900 outline-none focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                >
                  <option value="featured">Mặc định</option>
                  <option value="price-low">Giá: Thấp đến Cao</option>
                  <option value="price-high">Giá: Cao đến Thấp</option>
                  <option value="name">Tên: A đến Z</option>
                </select>

                <Button variant="outline" onClick={() => setShowFilters((v) => !v)} className="gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Bộ lọc
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            {/* Sidebar filter */}
            {showFilters && (
              <motion.aside
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:w-64 lg:flex-shrink-0"
              >
                <div className="space-y-8 lg:sticky lg:top-24">
                  {/* Category filter */}
                  <div>
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-900">Danh Mục</h3>
                    <div className="space-y-3">
                      {categories.map((cat) => (
                        <div key={cat.id} className="flex items-center">
                          <Checkbox
                            id={cat.id}
                            checked={selectedCategoryId === cat.id}
                            onChange={() => toggleCategory(cat.id)}
                          />
                          <Label htmlFor={cat.id} className="ml-3 cursor-pointer text-sm text-gray-700">
                            {cat.name}
                          </Label>
                        </div>
                      ))}
                      {categories.length === 0 && !loading && (
                        <p className="text-sm text-gray-400">Không có danh mục</p>
                      )}
                    </div>
                  </div>

                  {/* Price filter */}
                  <div>
                    <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-900">Khoảng Giá</h3>
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <input
                          type="range"
                          min="0"
                          max={MAX_PRICE}
                          step="50000"
                          value={priceLimit}
                          onChange={(e) => { setPriceLimit(Number(e.target.value)); setCurrentPage(1) }}
                          className="price-slider w-full"
                        />
                        <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                          Lọc đến {priceLimit.toLocaleString('vi-VN')} đ
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <span>0 đ</span>
                        <span>{MAX_PRICE.toLocaleString('vi-VN')} đ</span>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" onClick={resetFilters} className="w-full">
                    Xóa Tất Cả Bộ Lọc
                  </Button>
                </div>
              </motion.aside>
            )}

            {/* Product grid / list */}
            <div className="flex-1">
              {/* Loading skeleton */}
              {loading && (
                <div className={viewMode === 'grid' ? 'grid gap-6 md:grid-cols-2 xl:grid-cols-3' : 'space-y-4'}>
                  {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <div
                      key={i}
                      className={`animate-pulse rounded-[1.75rem] bg-gray-100 ${viewMode === 'grid' ? 'aspect-[3/4]' : 'h-44'}`}
                    />
                  ))}
                </div>
              )}

              {/* Error state */}
              {!loading && error && (
                <div className="py-20 text-center">
                  <p className="mb-4 text-lg text-red-500">{error}</p>
                  <Button variant="outline" onClick={fetchProducts}>
                    Thử lại
                  </Button>
                </div>
              )}

              {/* Empty state */}
              {!loading && !error && displayedProducts.length === 0 && (
                <div className="py-20 text-center">
                  <p className="text-lg text-gray-500">Không tìm thấy sản phẩm phù hợp.</p>
                  <Button variant="outline" onClick={resetFilters} className="mt-4">
                    Xóa bộ lọc
                  </Button>
                </div>
              )}

              {/* Products */}
              {!loading && !error && displayedProducts.length > 0 && (
                <>
                  <div className={viewMode === 'grid' ? 'grid gap-6 md:grid-cols-2 xl:grid-cols-3' : 'space-y-4'}>
                    {displayedProducts.map((product) =>
                      viewMode === 'grid' ? (
                        <ProductCard key={product.id} product={product} />
                      ) : (
                        <ProductListCard key={product.id} product={product} />
                      ),
                    )}
                  </div>

                  {totalPages > 1 && (
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                  )}
                </>
              )}

              {/* Loading spinner khi đang fetch trang mới (sau load đầu) */}
              {loading && products.length > 0 && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
