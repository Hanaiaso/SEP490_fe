import { render, screen, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { server } from '../../test/msw/server.js'
import { AuthProvider } from '../../context/AuthContext.jsx'
import { CartProvider } from '../../context/CartContext.jsx'
import ProductDetail from '../ProductDetail.jsx'

// Header render NotificationBell, mở WebSocket thật khi có accessToken -> stub để chạy offline.
vi.mock('@microsoft/signalr', () => {
  const connection = {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    off: vi.fn(),
    onclose: vi.fn(),
    invoke: vi.fn().mockResolvedValue(undefined),
  }
  class HubConnectionBuilder {
    withUrl() { return this }
    withAutomaticReconnect() { return this }
    configureLogging() { return this }
    build() { return connection }
  }
  return { HubConnectionBuilder, LogLevel: { Information: 1, Error: 4, None: 6 }, HttpTransportType: {} }
})

const PRODUCT = {
  id: 'P1',
  name: 'Ống PVC D21',
  sku: 'SKU-001',
  standardListedPrice: 50000,
  description: 'Ống nhựa PVC chất lượng cao',
  categoryId: 'C1',
  categoryName: 'Ống nhựa',
  availableStock: 10,
  physicalStock: 10,
}

const REVIEWS = [
  { id: 'R1', productId: 'P1', customerName: 'Trần Thị B', rating: 5, comment: 'Rất hài lòng với sản phẩm', createdAt: '2026-08-01T00:00:00Z' },
]

function mockProductAndReviewEndpoints({ eligibility } = {}) {
  server.use(
    http.get('/api/products/:id', () => HttpResponse.json(PRODUCT)),
    http.get('/api/products', () => HttpResponse.json({ items: [], totalCount: 0 })),
    http.get('/api/products/:productId/reviews', () => HttpResponse.json(REVIEWS)),
    http.get('/api/products/:productId/reviews/summary', () => HttpResponse.json({ averageRating: 5, reviewCount: 1 })),
    ...(eligibility
      ? [http.get('/api/products/:productId/reviews/eligibility', () => HttpResponse.json(eligibility))]
      : []),
  )
}

function renderProductDetail() {
  return render(
    <AuthProvider>
      <CartProvider>
        <MemoryRouter initialEntries={['/products/P1']}>
          <Routes>
            <Route path="/products/:id" element={<ProductDetail />} />
          </Routes>
        </MemoryRouter>
      </CartProvider>
    </AuthProvider>,
  )
}

function loginAsCustomer() {
  localStorage.setItem('accessToken', 'jwt-1')
  localStorage.setItem('authUser', JSON.stringify({ id: 'U1', fullName: 'Nguyễn Văn A', role: 'Customer' }))
}

describe('ProductDetail — đánh giá sản phẩm', () => {
  it('khách chưa đăng nhập chỉ xem được danh sách đánh giá, không có nút viết đánh giá', async () => {
    mockProductAndReviewEndpoints()
    renderProductDetail()

    expect(await screen.findByText(/Rất hài lòng với sản phẩm/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Viết đánh giá/i })).not.toBeInTheDocument()
  })

  it('khách hàng đủ điều kiện (canReview=true) thấy nút "Viết đánh giá"', async () => {
    loginAsCustomer()
    mockProductAndReviewEndpoints({ eligibility: { canReview: true, alreadyReviewed: false, existingReviewId: null } })
    renderProductDetail()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Viết đánh giá/i })).toBeInTheDocument()
    })
  })

  it('khách hàng đã đánh giá rồi (alreadyReviewed=true) thấy nút Sửa/Xoá, không thấy nút Viết đánh giá', async () => {
    loginAsCustomer()
    mockProductAndReviewEndpoints({ eligibility: { canReview: false, alreadyReviewed: true, existingReviewId: 'R1' } })
    renderProductDetail()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Sửa đánh giá/i })).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: /^Viết đánh giá$/i })).not.toBeInTheDocument()
  })
})
