import { Link } from 'react-router-dom'
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from 'lucide-react'

const footerLinks = [
  { label: 'Về chúng tôi', to: '/' },
  { label: 'Sản phẩm', to: '/products' },
  { label: 'Đăng nhập', to: '/login' },
  { label: 'Đăng ký', to: '/register' },
]

const categories = ['Băng keo dính', 'Văn phòng phẩm', 'Bao bì đóng gói', 'Vật tư kho bãi']

export default function Footer() {
  return (
    <footer className="bg-gray-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="mb-4 text-xl font-bold tracking-tight">VIET TIEN</h3>
            <p className="mb-6 text-sm leading-relaxed text-gray-400">
              Giải pháp văn phòng phẩm và bao bì cao cấp cho doanh nghiệp hiện đại.
            </p>
            <div className="flex gap-4">
              {[Facebook, Instagram, Linkedin].map((Icon) => (
                <a key={Icon.name} href="#" className="text-gray-400 transition hover:text-white" aria-label="Mạng xã hội">
                  <Icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide">Liên kết</h4>
            <ul className="space-y-3">
              {footerLinks.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="text-sm text-gray-400 transition hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide">Danh mục</h4>
            <ul className="space-y-3">
              {categories.map((item) => (
                <li key={item}>
                  <span className="text-sm text-gray-400">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wide">Liên hệ</h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li className="flex items-start gap-3">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0" />
                <span>123 Đường Kinh Doanh, Quận 1, Thành phố Hồ Chí Minh, Việt Nam</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 shrink-0" />
                <span>+84 28 1234 5678</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 shrink-0" />
                <span>lienhe@viettien.vn</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-800 pt-8 text-sm text-gray-400 md:flex-row">
          <p>© 2026 Viet Tien. Bảo lưu mọi quyền.</p>
          <div className="flex gap-6">
            <a href="#" className="transition hover:text-white">
              Chính sách bảo mật
            </a>
            <a href="#" className="transition hover:text-white">
              Điều khoản dịch vụ
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
