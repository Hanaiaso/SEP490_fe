import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from 'lucide-react'
import PolicyModal from './PolicyModal.jsx'

const footerLinks = [
  { label: 'Về chúng tôi', to: '/' },
  { label: 'Sản phẩm', to: '/products' },
  { label: 'Đăng nhập', to: '/login' },
  { label: 'Đăng ký', to: '/register' },
]

const categories = ['Băng keo dính', 'Văn phòng phẩm', 'Bao bì đóng gói', 'Vật tư kho bãi']

export default function Footer() {
  const [modalState, setModalState] = useState({ isOpen: false, type: 'privacy' })

  return (
    <>
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
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-blue-400" />
                  <span>Số 5, Đường Lê Lợi, TP. Thái Bình</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="h-5 w-5 shrink-0 text-emerald-400" />
                  <a href="tel:0398996177" className="hover:text-white transition">0398 996 177 (Hotline)</a>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="h-5 w-5 shrink-0 text-amber-400" />
                  <a href="mailto:lienhe@viettien.store" className="hover:text-white transition">lienhe@viettien.store</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-800 pt-8 text-sm text-gray-400 md:flex-row">
            <p>© 2026 Bao Bì Việt Tiến. Bảo lưu mọi quyền.</p>
            <div className="flex gap-6">
              <button
                type="button"
                onClick={() => setModalState({ isOpen: true, type: 'privacy' })}
                className="transition hover:text-white cursor-pointer"
              >
                Chính sách bảo mật
              </button>
              <button
                type="button"
                onClick={() => setModalState({ isOpen: true, type: 'terms' })}
                className="transition hover:text-white cursor-pointer"
              >
                Điều khoản dịch vụ
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Popup Policy Modal */}
      <PolicyModal
        isOpen={modalState.isOpen}
        type={modalState.type}
        onClose={() => setModalState({ isOpen: false, type: 'privacy' })}
      />
    </>
  )
}
