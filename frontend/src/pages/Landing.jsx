import { ArrowRight, Award, CheckCircle2, Shield, Truck } from 'lucide-react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer.jsx'
import Header from '../components/Header.jsx'
import { Button } from '../components/ui/Button.jsx'

const values = [
  {
    icon: Award,
    title: 'Chất lượng cao cấp',
    description: 'Danh mục sản phẩm được tuyển chọn kỹ lưỡng cho môi trường làm việc chỉn chu.',
  },
  {
    icon: Shield,
    title: 'Thương hiệu tin cậy',
    description: 'Hơn 10 năm đồng hành cùng doanh nghiệp với chất lượng ổn định.',
  },
  {
    icon: Truck,
    title: 'Giao hàng nhanh',
    description: 'Giao hàng nhanh chóng trên toàn quốc với quy trình rõ ràng.',
  },
  {
    icon: CheckCircle2,
    title: 'Hướng đến bền vững',
    description: 'Ưu tiên sản phẩm và quy trình thân thiện với môi trường.',
  },
]

export default function Landing() {

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-white" />
        <img
          src="https://images.unsplash.com/photo-1497215842964-222b430dc094?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBvZmZpY2UlMjB3b3Jrc3BhY2UlMjBtaW5pbWFsfGVufDF8fHx8MTc3OTg2Mzg4NHww&ixlib=rb-4.1.0&q=80&w=1080"
          alt="Không gian làm việc"
          className="absolute inset-0 h-full w-full object-cover opacity-10"
        />

        <div className="relative mx-auto max-w-7xl px-6 pt-24 text-center lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="mb-6 text-5xl font-bold tracking-tight text-gray-900 md:text-7xl lg:text-8xl">
              Văn Phòng Phẩm
              <br />
              Cao Cấp
            </h1>
            <p className="mx-auto mb-12 max-w-2xl text-lg leading-relaxed text-gray-600 md:text-2xl">
              Nâng tầm không gian làm việc với bộ sưu tập văn phòng phẩm và giải pháp bao bì được chọn lọc
              dành cho doanh nghiệp hiện đại.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/home">
                <Button size="lg" className="rounded-full px-8 py-6">
                  Khám phá sản phẩm
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/register">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-gray-900 px-8 py-6 text-gray-900"
                >
                  Tạo tài khoản
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-gray-900 p-2"
          >
            <div className="h-2 w-1 rounded-full bg-gray-900" />
          </motion.div>
        </motion.div>
      </section>

      <section className="bg-white py-24">
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 lg:grid-cols-2 lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <p className="mb-4 text-sm uppercase tracking-[0.4em] text-gray-500">Về Viet Tien</p>
            <h2 className="mb-6 text-4xl font-bold text-gray-900 md:text-5xl">Tái định nghĩa trải nghiệm văn phòng</h2>
            <p className="mb-6 text-lg leading-relaxed text-gray-600">
              Trong hơn một thập kỷ, Viet Tien đã trở thành đối tác đáng tin cậy cho doanh nghiệp cần văn
              phòng phẩm và bao bì cao cấp. Chúng tôi kết hợp tay nghề tinh gọn với gu thẩm mỹ hiện đại.
            </p>
            <p className="text-lg leading-relaxed text-gray-600">
              Cam kết về chất lượng, độ bền và trải nghiệm mua sắm giúp thương hiệu đồng hành cùng nhiều đội
              ngũ đang xây dựng không gian làm việc truyền cảm hứng hơn mỗi ngày.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative h-96 overflow-hidden rounded-[2rem] shadow-2xl"
          >
            <img
              src="https://images.unsplash.com/photo-1760804876161-ba0337e998fe?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxvZmZpY2UlMjBzdGF0aW9uZXJ5JTIwcHJlbWl1bSUyMG1pbmltYWx8ZW58MXx8fHwxNzgwMDU2NjUyfDA&ixlib=rb-4.1.0&q=80&w=1080"
              alt="Văn phòng phẩm cao cấp"
              className="h-full w-full object-cover"
            />
          </motion.div>
        </div>
      </section>

      <section className="bg-gray-50 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mb-16 text-center">
            <p className="mb-4 text-sm uppercase tracking-[0.4em] text-gray-500">Giá trị cốt lõi</p>
            <h2 className="text-4xl font-bold text-gray-900 md:text-5xl">Vì sao nên chọn Viet Tien</h2>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            {values.map((value, index) => (
              <motion.div
                key={value.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="rounded-[1.75rem] bg-white p-8 shadow-sm transition hover:shadow-lg"
              >
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-gray-900">
                  <value.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="mb-3 text-xl font-semibold text-gray-900">{value.title}</h3>
                <p className="leading-relaxed text-gray-600">{value.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>



      <section className="bg-gray-900 py-24 text-white">
        <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="mb-6 text-4xl font-bold md:text-5xl">Sẵn sàng nâng cấp không gian làm việc?</h2>
            <p className="mb-10 text-xl text-gray-300">
              Khám phá bộ sưu tập văn phòng phẩm và bao bì cao cấp được chọn lọc cho đội ngũ hiện đại.
            </p>
            <Link to="/home">
              <Button size="lg" className="rounded-full bg-white px-8 py-6 !text-slate-900 hover:bg-gray-100">
                Mua sắm ngay
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
