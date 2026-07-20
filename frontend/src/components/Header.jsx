import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Bell,
  ChevronDown,
  LogOut,
  MapPin,
  Menu,
  Package,
  Search,
  ShoppingCart,
  User,
  X,
} from 'lucide-react'
import { motion } from 'motion/react'
import { Button } from './ui/Button.jsx'
import { cn } from '../lib/utils.js'
import { useAuth } from '../context/AuthContext.jsx'
import { useCart } from '../context/CartContext.jsx'
import NotificationBell from './NotificationBell'

const navigation = [
  { to: '/', label: 'Giới thiệu' },
  { to: '/home', label: 'Trang chủ' },
  { to: '/products', label: 'Sản phẩm' },
]

const dropdownItems = [
  { icon: User, label: 'Hồ sơ cá nhân', href: '/profile' },
  { icon: Package, label: 'Lịch sử đơn hàng', href: '/profile?tab=orders' },
  { icon: MapPin, label: 'Theo dõi đơn hàng', href: '/profile?tab=tracking' },
  { icon: BarChart3, label: 'Thống kê cá nhân', href: '/profile?tab=stats' },
]

export default function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, logout, user } = useAuth()
  const { totalItems } = useCart()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const dropdownRef = useRef(null)

  const authLink = useMemo(() => {
    if (location.pathname === '/login') return { to: '/register', label: 'Đăng ký' }
    if (location.pathname === '/register') return { to: '/login', label: 'Đăng nhập' }
    return { to: '/login', label: 'Đăng nhập' }
  }, [location.pathname])

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleLogout() {
    logout()
    setDropdownOpen(false)
    setMobileOpen(false)
    navigate('/login')
  }

  const userInitial = user?.fullName?.charAt(0)?.toUpperCase() ?? 'N'

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
        <Link to="/" className="flex flex-col">
          <motion.span whileHover={{ scale: 1.02 }} className="text-2xl font-bold tracking-tight text-gray-900">
            VIET TIEN
          </motion.span>
          <span className="text-[11px] tracking-[0.35em] text-gray-500">VĂN PHÒNG PHẨM CAO CẤP</span>
        </Link>

        <nav className="hidden items-center gap-10 md:flex">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'relative text-sm tracking-wide transition-colors',
                  isActive ? 'font-medium text-gray-900' : 'text-gray-600 hover:text-gray-900',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {item.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute -bottom-[1.7rem] left-0 right-0 h-0.5 bg-gray-900"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 md:flex">
          <button
            type="button"
            className="rounded-full p-2 text-slate-500 transition hover:text-slate-900"
            aria-label="Tìm kiếm sản phẩm"
          >
            <Search className="h-5 w-5 stroke-[1.8]" />
          </button>

          {isAuthenticated && (
            <div className="flex items-center">
              <NotificationBell role="Customer" onViewAll={() => navigate('/notifications')} />
            </div>
          )}

          <Link
            to="/cart"
            className="relative rounded-full p-2 text-slate-500 transition hover:text-slate-900"
            aria-label="Giỏ hàng"
          >
            <ShoppingCart className="h-5 w-5 stroke-[1.8]" />
            {isAuthenticated && totalItems > 0 && (
              <span className="absolute -right-0.5 top-0 flex min-w-4.5 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-semibold leading-none text-white">
                {totalItems}
              </span>
            )}
          </Link>

          {isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full px-2 py-1 text-slate-700 transition hover:bg-slate-50"
                onClick={() => setDropdownOpen((current) => !current)}
                aria-label="Mở menu tài khoản"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                  {userInitial}
                </div>
                <span className="text-base font-medium text-slate-700">{user.fullName}</span>
                <ChevronDown className={cn('h-4 w-4 transition-transform', dropdownOpen && 'rotate-180')} />
              </button>

              {dropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 top-[calc(100%+10px)] w-[272px] overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]"
                >
                  <div className="border-b border-slate-100 px-4 py-4">
                    <p className="text-xl font-semibold leading-none text-slate-900">{user.fullName}</p>
                    <p className="mt-1.5 text-sm text-slate-500">{user.email}</p>
                  </div>

                  <div className="px-2.5 py-2.5">
                    {dropdownItems.map((item) =>
                      item.href.startsWith('/') ? (
                        <Link
                          key={item.label}
                          to={item.href}
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-base text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                        >
                          <item.icon className="h-4 w-4 shrink-0 text-slate-400" />
                          <span>{item.label}</span>
                        </Link>
                      ) : (
                        <a
                          key={item.label}
                          href={item.href}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-base text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                        >
                          <item.icon className="h-4 w-4 shrink-0 text-slate-400" />
                          <span>{item.label}</span>
                        </a>
                      ),
                    )}
                  </div>

                  <div className="border-t border-slate-100 px-2.5 py-2.5">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-base text-red-500 transition hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4 shrink-0" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </div>
          ) : (
            <Link
              to={authLink.to}
              className="rounded-full p-2 text-slate-500 transition hover:text-slate-900"
              aria-label={authLink.label}
            >
              <User className="h-5 w-5 stroke-[1.8]" />
            </Link>
          )}
        </div>

        <button
          type="button"
          className="rounded-full p-2 text-gray-700 transition hover:bg-gray-100 md:hidden"
          onClick={() => setMobileOpen((value) => !value)}
          aria-label="Bật menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-gray-100 bg-white px-6 py-4 md:hidden">
          <div className="flex flex-col gap-3">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  cn(
                    'rounded-2xl px-4 py-3 text-sm transition',
                    isActive ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-700',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}

            {isAuthenticated ? (
              <>
                <div className="rounded-[1.25rem] border border-slate-200 px-4 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                      {userInitial}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{user.fullName}</p>
                      <p className="text-sm text-slate-500">{user.email}</p>
                    </div>
                  </div>
                </div>
                <Link to="/notifications" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full rounded-2xl">
                    Thông báo
                  </Button>
                </Link>
                <Link to="/cart" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full rounded-2xl">
                    Giỏ hàng
                  </Button>
                </Link>
                <Link to="/profile" onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full rounded-2xl">
                    Hồ sơ cá nhân
                  </Button>
                </Link>
                <Button className="w-full rounded-2xl bg-red-500 hover:bg-red-600" onClick={handleLogout}>
                  Đăng xuất
                </Button>
              </>
            ) : (
              <>
                <Link to={authLink.to} onClick={() => setMobileOpen(false)}>
                  <Button variant="outline" className="w-full rounded-2xl">
                    {authLink.label}
                  </Button>
                </Link>
                <Link to="/cart" onClick={() => setMobileOpen(false)}>
                  <Button className="w-full rounded-2xl">Giỏ hàng</Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
