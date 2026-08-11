import { useMemo, useState, useEffect } from 'react'
import { Search, SlidersHorizontal } from 'lucide-react'
import { motion } from 'motion/react'
import Footer from '../components/Footer.jsx'
import Header from '../components/Header.jsx'
import ProductCard from '../components/ProductCard.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { useNavigate } from 'react-router-dom'
import { getProducts } from '../services/productService.js'

export default function Home() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  const [newArrivals, setNewArrivals] = useState([])
  const [bestSellers, setBestSellers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadFeaturedProducts() {
      try {
        setLoading(true)
        // Lấy 4 sản phẩm mới nhất
        const newestResponse = await getProducts({ page: 1, pageSize: 4, sortBy: 'newest' })
        setNewArrivals(newestResponse.items || [])
        
        // Lấy 4 sản phẩm bán chạy nhất dựa trên doanh số
        const bestSellersResponse = await getProducts({ page: 1, pageSize: 4, sortBy: 'sales' })
        setBestSellers(bestSellersResponse.items || [])
      } catch (err) {
        console.error("Lỗi tải sản phẩm nổi bật:", err)
      } finally {
        setLoading(false)
      }
    }
    loadFeaturedProducts()
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <section className="relative mt-20 flex h-[70vh] items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-900 to-gray-800">
          <img
            src="https://images.unsplash.com/photo-1722929025573-3d461531ac4d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtaW5pbWFsJTIwZGVzayUyMHN0YXRpb25lcnklMjB3aGl0ZXxlbnwxfHx8fDE3ODAwNTY2NTR8MA&ixlib=rb-4.1.0&q=80&w=1080"
            alt="Bàn làm việc tối giản"
            className="h-full w-full object-cover opacity-30"
          />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 text-center lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="mb-6 text-4xl font-bold text-white md:text-6xl lg:text-7xl">
              Bao Bì & Thùng Carton
              <br />
              Chất Lượng Cao
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-200 md:text-xl">
              Giải pháp đóng gói toàn diện, sản xuất theo yêu cầu chuẩn kích thước và định lượng cho doanh nghiệp.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (searchQuery.trim()) {
                  navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`)
                }
              }}
              className="mx-auto max-w-2xl"
            >
              <div className="relative">
                <button
                  type="submit"
                  className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-900 transition cursor-pointer"
                  aria-label="Tìm kiếm"
                >
                  <Search className="h-5 w-5" />
                </button>
                <Input
                  type="text"
                  placeholder="Tìm kiếm sản phẩm (vd: Thùng carton, Hộp nắp gài...)..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="rounded-full border-0 bg-white/95 py-6 pl-14 pr-6 text-base text-gray-900 placeholder:text-gray-500 backdrop-blur-sm shadow-xl"
                />
              </div>
            </form>
          </motion.div>
        </div>
      </section>



      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-10">
            <p className="mb-2 text-sm uppercase tracking-[0.4em] text-gray-500">Mới nhất</p>
            <h2 className="text-4xl font-bold text-gray-900">Hàng mới về</h2>
          </div>
          {loading ? (
             <div className="flex items-center justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900"></div></div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {newArrivals.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>



      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-10">
            <p className="mb-2 text-sm uppercase tracking-[0.4em] text-gray-500">Bán chạy</p>
            <h2 className="text-4xl font-bold text-gray-900">Sản phẩm nổi bật</h2>
          </div>
          {loading ? (
             <div className="flex items-center justify-center py-10"><div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-gray-900"></div></div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
              {bestSellers.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>



      <Footer />
    </div>
  )
}
