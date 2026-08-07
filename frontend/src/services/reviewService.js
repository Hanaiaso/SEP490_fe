import { fetchWithToken } from './authService.js';

/**
 * Danh sách đánh giá công khai của 1 sản phẩm.
 * @param {string} productId
 * @param {{ page?: number, pageSize?: number }} [params]
 */
export async function getProductReviews(productId, params = {}) {
  const query = new URLSearchParams();
  if (params.page) query.set('page', params.page);
  if (params.pageSize) query.set('pageSize', params.pageSize);
  const qs = query.toString();
  return fetchWithToken('GET', `/products/${productId}/reviews${qs ? `?${qs}` : ''}`);
}

/**
 * Điểm trung bình và số lượt đánh giá của 1 sản phẩm.
 * @param {string} productId
 */
export async function getReviewSummary(productId) {
  return fetchWithToken('GET', `/products/${productId}/reviews/summary`);
}

/**
 * Khách hàng đang đăng nhập có được đánh giá sản phẩm này không (yêu cầu đã đăng nhập Customer).
 * @param {string} productId
 */
export async function getReviewEligibility(productId) {
  return fetchWithToken('GET', `/products/${productId}/reviews/eligibility`);
}

/**
 * Tạo đánh giá mới cho sản phẩm đã mua và nhận hàng thành công.
 * @param {string} productId
 * @param {{ rating: number, comment: string }} payload
 */
export async function createReview(productId, payload) {
  return fetchWithToken('POST', `/products/${productId}/reviews`, payload);
}

/**
 * Sửa đánh giá của chính mình.
 * @param {string} reviewId
 * @param {{ rating: number, comment: string }} payload
 */
export async function updateReview(reviewId, payload) {
  return fetchWithToken('PUT', `/reviews/${reviewId}`, payload);
}

/**
 * Xoá đánh giá của chính mình.
 * @param {string} reviewId
 */
export async function deleteReview(reviewId) {
  return fetchWithToken('DELETE', `/reviews/${reviewId}`);
}

/**
 * Danh sách đánh giá để Sales/Admin phản hồi. SalesStaff chỉ thấy đánh giá của khách mình phụ trách.
 */
export async function getReviewsForSales() {
  return fetchWithToken('GET', '/reviews/for-sales');
}

/**
 * Sales phụ trách/Admin phản hồi công khai 1 đánh giá.
 * @param {string} reviewId
 * @param {string} replyText
 */
export async function replyToReview(reviewId, replyText) {
  return fetchWithToken('POST', `/reviews/${reviewId}/reply`, { replyText });
}
