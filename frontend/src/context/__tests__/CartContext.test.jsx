import { StrictMode } from 'react'
import { describe, expect, it } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/msw/server.js'
import { cartWith, emptyCart } from '../../test/msw/handlers.js'
import { AuthProvider, useAuth } from '../AuthContext.jsx'
import { CartProvider, useCart } from '../CartContext.jsx'

/**
 * Sheet: FE-Contexts — L1-FEC-03..04 (CartContext).
 *
 * ⚠ Chữ ký ĐÃ ĐỔI: addToCart(product, quantity) nhận OBJECT sản phẩm
 *   ({ id, name, imageUrl, price }), không phải productId dạng chuỗi như bản trước.
 *   Xem cách code thật gọi ở components/ProductCard.jsx.
 */
const wrapper = ({ children }) => (
  <AuthProvider>
    <CartProvider>{children}</CartProvider>
  </AuthProvider>
)

function useAuthAndCart() {
  return { auth: useAuth(), cart: useCart() }
}

const PRODUCT = { id: 'P1', name: 'Ống PVC D21', imageUrl: 'https://cdn/p1.png', price: 50_000 }

describe('L1-FEC · CartContext', () => {
  // L1-FEC-03 | EP-Valid | addToCart cập nhật state giỏ và tổng số lượng
  it('L1-FEC-03 addToCart gửi đúng productId lên server và cập nhật giỏ hàng', async () => {
    // Bắt body thật thay vì trả cart cứng — nếu addToCart truyền sai kiểu thì productId
    // sẽ là undefined và test phải ĐỎ (bản trước dùng mock cứng nên bug này lọt lưới).
    let capturedBody = null
    server.use(
      http.post('/api/cart/items', async ({ request }) => {
        capturedBody = await request.json()
        return HttpResponse.json(cartWith(capturedBody.productId, capturedBody.quantity))
      }),
    )
    const { result } = renderHook(() => useAuthAndCart(), { wrapper })

    await act(async () => {
      await result.current.auth.login('a@test.com', 'P@ss123')
    })
    await waitFor(() => expect(result.current.auth.isAuthenticated).toBe(true))

    await act(async () => {
      await result.current.cart.addToCart(PRODUCT, 2)
    })

    expect(capturedBody).toEqual({ productId: 'P1', quantity: 2 })
    await waitFor(() => expect(result.current.cart.items).toHaveLength(1))
    expect(result.current.cart.items[0]).toMatchObject({ productId: 'P1', quantity: 2 })
    expect(result.current.cart.totalItems).toBe(2)
  })

  // L1-FEC-04 | BC-TRUE | Khách VÃNG LAI thêm giỏ -> giữ lại sản phẩm định mua,
  // sau khi đăng nhập thì tự gộp vào giỏ thật trên server.
  it('L1-FEC-04 khách vãng lai thêm giỏ thì lưu vào giỏ tạm localStorage', async () => {
    const { result } = renderHook(() => useAuthAndCart(), { wrapper })
    expect(result.current.auth.isAuthenticated).toBe(false)

    await act(async () => {
      await result.current.cart.addToCart(PRODUCT, 1)
    })

    const guestCart = JSON.parse(localStorage.getItem('guestCart') ?? '[]')
    expect(guestCart, 'sản phẩm khách định mua phải được giữ lại để gộp sau khi đăng nhập')
      .toHaveLength(1)
    expect(guestCart[0]).toMatchObject({ productId: 'P1', quantity: 1 })

    // Giỏ hiển thị ngay cho khách vãng lai, không cần đăng nhập
    await waitFor(() => expect(result.current.cart.totalItems).toBe(1))
  })

  // L1-FEC-04 (nhánh gộp) | EP-Valid | Sau khi đăng nhập, giỏ tạm được đẩy lên server và xoá khỏi localStorage
  it('L1-FEC-04 sau khi đăng nhập thì giỏ tạm được gộp lên server rồi dọn sạch', async () => {
    localStorage.setItem('guestCart', JSON.stringify([
      { id: 'P1', productId: 'P1', productName: 'Ống PVC D21', quantity: 3, unitPrice: 50_000 },
    ]))

    const posted = []
    server.use(
      http.post('/api/cart/items', async ({ request }) => {
        const body = await request.json()
        posted.push(body)
        return HttpResponse.json(cartWith(body.productId, body.quantity))
      }),
      http.get('/api/cart', () => HttpResponse.json(cartWith('P1', 3))),
    )

    const { result } = renderHook(() => useAuthAndCart(), { wrapper })
    await act(async () => {
      await result.current.auth.login('a@test.com', 'P@ss123')
    })

    await waitFor(() => expect(posted).toHaveLength(1))
    expect(posted[0]).toEqual({ productId: 'P1', quantity: 3 })
    // Gộp xong phải dọn giỏ tạm, tránh lần đăng nhập sau cộng dồn lần nữa
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('guestCart') ?? '[]')).toHaveLength(0))
  })

  // L1-FEC-06 | Concurrency | React StrictMode double-invoke effect khi mount
  // -> giỏ tạm CHỈ được đẩy lên server đúng 1 lần, không tạo item trùng.
  // Khoá lại cờ `mergingRef` + việc dọn item sau mỗi lần gộp, thêm ở commit f677894.
  //
  // ⚠ Lưu ý phạm vi: mergingRef chỉ chặn trong CÙNG MỘT CartProvider. Hai provider độc lập
  //   (2 tab, 2 lần mount riêng) vẫn gộp riêng — đó là hành vi đúng, không phải bug.
  it('L1-FEC-06 StrictMode double-invoke chỉ gộp giỏ tạm đúng một lần', async () => {
    localStorage.setItem('guestCart', JSON.stringify([
      { id: 'P1', productId: 'P1', productName: 'Ống PVC D21', quantity: 2, unitPrice: 50_000 },
    ]))

    const posted = []
    server.use(
      http.post('/api/cart/items', async ({ request }) => {
        const body = await request.json()
        posted.push(body)
        // Trễ nhân tạo để 2 lần gộp có cơ hội chồng lấn nếu thiếu cờ chặn
        await new Promise((r) => setTimeout(r, 20))
        return HttpResponse.json(cartWith(body.productId, body.quantity))
      }),
      http.get('/api/cart', () => HttpResponse.json(cartWith('P1', 2))),
    )

    // Đăng nhập sẵn để CartProvider vào thẳng nhánh gộp ngay khi mount.
    // ⚠ AuthContext đọc user từ key 'authUser' (KHÔNG phải 'user') — xem AuthContext.jsx:8
    localStorage.setItem('accessToken', 'jwt-1')
    localStorage.setItem('authUser', JSON.stringify({ id: 'U1', role: 'Customer' }))

    const strictWrapper = ({ children }) => (
      <StrictMode>
        <AuthProvider>
          <CartProvider>{children}</CartProvider>
        </AuthProvider>
      </StrictMode>
    )

    const view = renderHook(() => useCart(), { wrapper: strictWrapper })

    await waitFor(() => expect(posted.length).toBeGreaterThan(0))
    await new Promise((r) => setTimeout(r, 150)) // chờ mọi lần gộp có thể xảy ra

    expect(posted).toHaveLength(1)
    expect(posted[0]).toEqual({ productId: 'P1', quantity: 2 })
    view.unmount()
  })

  // L1-FEC-07 | EP-Valid | Giá của giỏ khách vãng lai phải do SERVER tính lại khi gộp.
  // Request gộp CHỈ được gửi productId + quantity; nếu FE gửi kèm price và server tin theo
  // thì khách tự đặt giá được — lỗ hổng cùng loại với việc tin giá từ client.
  it('L1-FEC-07 request gộp chỉ gửi productId + quantity, không gửi giá từ client', async () => {
    localStorage.setItem('guestCart', JSON.stringify([
      // Giá bịa cực thấp trong giỏ tạm — tuyệt đối không được gửi lên server
      { id: 'P1', productId: 'P1', productName: 'Ống PVC D21', quantity: 2, unitPrice: 1 },
    ]))
    localStorage.setItem('accessToken', 'jwt-1')
    localStorage.setItem('authUser', JSON.stringify({ id: 'U1', role: 'Customer' }))

    const posted = []
    server.use(
      http.post('/api/cart/items', async ({ request }) => {
        const body = await request.json()
        posted.push(body)
        return HttpResponse.json(cartWith(body.productId, body.quantity))
      }),
      http.get('/api/cart', () => HttpResponse.json(cartWith('P1', 2))),
    )

    const view = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(posted).toHaveLength(1))

    expect(Object.keys(posted[0]).sort()).toEqual(['productId', 'quantity'])
    expect(posted[0]).not.toHaveProperty('unitPrice')
    expect(posted[0]).not.toHaveProperty('price')
    view.unmount()
  })

  // L1-FEC-08 | EP-Invalid | Gộp thất bại -> KHÔNG xoá guestCart (không làm mất hàng của khách)
  // và phải báo lỗi cho người dùng, không im lặng.
  //
  // 🔴 SPEC GAP (doc v2.3): `mergeGuestCartIntoServer` bắt lỗi rồi chỉ `console.error(...)` + `break`,
  // KHÔNG gọi setError -> người dùng không hề biết giỏ hàng chưa được gộp.
  // Phần giữ lại guestCart thì code làm ĐÚNG (removeGuestCartItem chỉ chạy sau khi addItem thành công).
  it('L1-FEC-08 gộp thất bại thì giữ nguyên guestCart và báo lỗi cho người dùng', async () => {
    localStorage.setItem('guestCart', JSON.stringify([
      { id: 'P1', productId: 'P1', productName: 'Ống PVC D21', quantity: 2, unitPrice: 50_000 },
    ]))
    localStorage.setItem('accessToken', 'jwt-1')
    localStorage.setItem('authUser', JSON.stringify({ id: 'U1', role: 'Customer' }))

    server.use(
      http.post('/api/cart/items', () =>
        new HttpResponse(JSON.stringify({ message: 'Sản phẩm đã ngừng kinh doanh.' }), { status: 400 })),
      http.get('/api/cart', () => HttpResponse.json(emptyCart())),
    )

    const { result } = renderHook(() => useCart(), { wrapper })
    await waitFor(() => expect(result.current.cart).not.toBeNull())

    // Phần code làm ĐÚNG: không mất hàng của khách
    expect(JSON.parse(localStorage.getItem('guestCart') ?? '[]'))
      .toHaveLength(1, 'gộp lỗi thì phải giữ nguyên giỏ tạm để thử lại lần sau')

    // Phần ĐANG THIẾU: khách không được biết giỏ hàng chưa gộp
    expect(result.current.error)
      .not.toBeNull('lỗi gộp giỏ phải hiển thị cho người dùng, không chỉ console.error')
  })
})
