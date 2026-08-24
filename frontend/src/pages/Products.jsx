import { useCallback, useEffect, useState } from 'react'
import { Grid3x3, List, Loader2, SlidersHorizontal } from 'lucide-react'
import { motion } from 'motion/react'
import { useSearchParams } from 'react-router-dom'
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

const PRICE_PRESETS = [
  { id: 'all', label: 'Tất cả mức giá', min: null, max: null },
  { id: 'under-100k', label: 'Dưới 100.000 đ', min: 0, max: 100000 },
  { id: '100k-500k', label: '100.000 đ – 500.000 đ', min: 100000, max: 500000 },
  { id: '500k-2m', label: '500.000 đ – 2.000.000 đ', min: 500000, max: 2000000 },
  { id: '2m-10m', label: '2.000.000 đ – 10.000.000 đ', min: 2000000, max: 10000000 },
  { id: 'above-10m', label: 'Trên 10.000.000 đ', min: 10000000, max: null },
]

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialSearch = searchParams.get('search') || searchParams.get('q') || ''

  // ─── Filter / UI state ─────────────────────────────────────────────────────
  const [selectedCategoryId, setSelectedCategoryId] = useState(null)
  const [minPrice, setMinPrice]                     = useState('')
  const [maxPrice, setMaxPrice]                     = useState('')
  const [activePreset, setActivePreset]             = useState('all')
  const [sortBy, setSortBy]                         = useState('featured')
  const [viewMode, setViewMode]                     = useState('list')
  const [showFilters, setShowFilters]               = useState(true)
  const [currentPage, setCurrentPage]               = useState(1)
  const [searchText, setSearchText]                 = useState(initialSearch)

  // Sync if URL search query changes (e.g., navigated from Home search)
  useEffect(() => {
    const q = searchParams.get('search') || searchParams.get('q') || ''
    setSearchText(q)
    setCurrentPage(1)
  }, [searchParams])

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
        sortBy:     sortBy !== 'featured' ? sortBy : undefined,
        minPrice:   minPrice || undefined,
        maxPrice:   maxPrice || undefined,
      })
      setProducts(data.items ?? [])
      setTotalCount(data.totalCount ?? 0)
      setTotalPages(data.totalPages ?? 1)
    } catch (err) {
      setError(err.message || 'Không thể tải sản phẩm.')
    } finally {
      setLoading(false)
    }
  }, [currentPage, selectedCategoryId, searchText, sortBy, minPrice, maxPrice])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function toggleCategory(categoryId) {
    setSelectedCategoryId((prev) => (prev === categoryId ? null : categoryId))
    setCurrentPage(1)
  }

  function handleSelectPreset(preset) {
    setActivePreset(preset.id)
    setMinPrice(preset.min !== null ? preset.min.toString() : '')
    setMaxPrice(preset.max !== null ? preset.max.toString() : '')
    setCurrentPage(1)
  }

  function handleCustomPriceChange(type, rawVal) {
    const clean = rawVal.replace(/\D/g, '')
    setActivePreset('custom')
    if (type === 'min') setMinPrice(clean)
    if (type === 'max') setMaxPrice(clean)
    setCurrentPage(1)
  }

  function resetFilters() {
    setSelectedCategoryId(null)
    setMinPrice('')
    setMaxPrice('')
    setActivePreset('all')
    setSearchText('')
    setCurrentPage(1)
  }

  // Sort & lọc giá đã thực hiện ở backend (page hiện tại luôn là kết quả cuối cùng)
  const displayedProducts = products

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
                  onChange={(e) => {
                    const val = e.target.value
                    setSearchText(val)
                    setCurrentPage(1)
                    const newParams = new URLSearchParams(searchParams)
                    if (val.trim()) {
                      newParams.set('search', val.trim())
                    } else {
                      newParams.delete('search')
                      newParams.delete('q')
                    }
                    setSearchParams(newParams, { replace: true })
                  }}
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
                  onChange={(e) => {
                    setSortBy(e.target.value)
                    setCurrentPage(1)
                  }}
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
                    
                    {/* Presets */}
                    <div className="space-y-2 mb-4">
                      {PRICE_PRESETS.map((preset) => {
                        const isSelected = activePreset === preset.id
                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleSelectPreset(preset)}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                              isSelected
                                ? 'bg-gray-900 text-white shadow-xs'
                                : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {preset.label}
                          </button>
                        )
                      })}
                    </div>

                    {/* Custom Min - Max inputs */}
                    <div className="pt-3 border-t border-gray-100">
                      <p className="text-xs font-medium text-gray-700 mb-2">Hoặc nhập khoảng giá (đ):</p>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Từ đ"
                            value={minPrice ? Number(minPrice).toLocaleString('vi-VN') : ''}
                            onChange={(e) => handleCustomPriceChange('min', e.target.value)}
                            className="w-full h-9 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="Đến đ"
                            value={maxPrice ? Number(maxPrice).toLocaleString('vi-VN') : ''}
                            onChange={(e) => handleCustomPriceChange('max', e.target.value)}
                            className="w-full h-9 px-2.5 rounded-lg border border-gray-200 text-xs text-gray-900 outline-none focus:border-gray-900 focus:ring-1 focus:ring-gray-900"
                          />
                        </div>
                      </div>
                      {(minPrice || maxPrice) && (
                        <div className="text-[11px] text-gray-500 italic mb-2">
                          Đang lọc: {minPrice ? `${Number(minPrice).toLocaleString('vi-VN')} đ` : '0 đ'} → {maxPrice ? `${Number(maxPrice).toLocaleString('vi-VN')} đ` : 'Không giới hạn'}
                        </div>
                      )}
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
