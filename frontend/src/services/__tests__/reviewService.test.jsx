import { beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/msw/server.js'
import * as reviewService from '../reviewService.js'

/**
 * Sheet: FE-Services — reviewService (đánh giá sản phẩm, phía khách hàng).
 * Trọng tâm: HỢP ĐỒNG với backend — đúng endpoint, đúng method, body không bị biến dạng.
 */
describe('reviewService', () => {
  beforeEach(() => localStorage.setItem('accessToken', 'jwt-1'))

  it('getProductReviews gọi GET /api/products/:productId/reviews', async () => {
    let hitUrl = null
    server.use(http.get('/api/products/:productId/reviews', ({ params, request }) => {
      hitUrl = params.productId
      expect(new URL(request.url).search).toBe('')
      return HttpResponse.json([{ id: 'R1', rating: 5, comment: 'Tốt', customerName: 'Nguyễn Văn A' }])
    }))

    const reviews = await reviewService.getProductReviews('P1')

    expect(hitUrl).toBe('P1')
    expect(reviews).toHaveLength(1)
  })

  it('getReviewSummary gọi GET /api/products/:productId/reviews/summary', async () => {
    server.use(http.get('/api/products/:productId/reviews/summary', () =>
      HttpResponse.json({ averageRating: 4.5, reviewCount: 2 }),
    ))

    const summary = await reviewService.getReviewSummary('P1')

    expect(summary).toEqual({ averageRating: 4.5, reviewCount: 2 })
  })

  it('getReviewEligibility gọi GET /api/products/:productId/reviews/eligibility', async () => {
    server.use(http.get('/api/products/:productId/reviews/eligibility', () =>
      HttpResponse.json({ canReview: true, alreadyReviewed: false, existingReviewId: null }),
    ))

    const eligibility = await reviewService.getReviewEligibility('P1')

    expect(eligibility.canReview).toBe(true)
  })

  it('createReview gửi đúng { rating, comment }, productId chỉ nằm trên URL', async () => {
    let hitUrl = null
    let body = null
    server.use(http.post('/api/products/:productId/reviews', async ({ params, request }) => {
      hitUrl = params.productId
      body = await request.json()
      return HttpResponse.json({ id: 'R2', ...body })
    }))

    await reviewService.createReview('P1', { rating: 4, comment: 'Hàng ổn, giao nhanh' })

    expect(hitUrl).toBe('P1')
    expect(body).toEqual({ rating: 4, comment: 'Hàng ổn, giao nhanh' })
    expect(body).not.toHaveProperty('productId')
  })

  it('updateReview gọi PUT /api/reviews/:id kèm id trên URL', async () => {
    let hitUrl = null
    let body = null
    server.use(http.put('/api/reviews/:id', async ({ params, request }) => {
      hitUrl = params.id
      body = await request.json()
      return HttpResponse.json({ id: params.id, ...body })
    }))

    await reviewService.updateReview('R1', { rating: 5, comment: 'Cập nhật lại đánh giá' })

    expect(hitUrl).toBe('R1')
    expect(body).toEqual({ rating: 5, comment: 'Cập nhật lại đánh giá' })
  })

  it('deleteReview gọi DELETE /api/reviews/:id', async () => {
    let hitUrl = null
    server.use(http.delete('/api/reviews/:id', ({ params }) => {
      hitUrl = params.id
      return new HttpResponse(null, { status: 204 })
    }))

    await reviewService.deleteReview('R1')

    expect(hitUrl).toBe('R1')
  })
})
