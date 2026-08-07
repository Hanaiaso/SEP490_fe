import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useAuth } from './AuthContext.jsx'
import * as cartService from '../services/cartService.js'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  // Chặn 2 lần merge chạy song song (vd. React StrictMode double-invoke effect ở dev),
  // tránh gọi POST /cart/items đồng thời có thể tạo trùng Cart cho cùng 1 CustomerProfile.
  const mergingRef = useRef(false)

  // Fetch cart (backend nếu đã đăng nhập, giỏ tạm localStorage nếu là khách)
  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(cartService.buildGuestCartDto(cartService.getGuestCartItems()))
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await cartService.getCart()
      setCart(data)
    } catch (err) {
      console.error('Error fetching cart:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  // Gộp giỏ hàng tạm (localStorage) vào giỏ hàng thật trên server sau khi đăng nhập.
  // Trả về thông báo lỗi nếu gộp thất bại (giữ nguyên guestCart để thử lại), null nếu thành công.
  const mergeGuestCartIntoServer = useCallback(async () => {
    if (mergingRef.current) return null
    mergingRef.current = true
    let mergeError = null
    try {
      const guestItems = cartService.getGuestCartItems()
      for (const item of guestItems) {
        try {
          await cartService.addItem({ productId: item.productId, quantity: item.quantity })
          cartService.removeGuestCartItem(item.productId)
        } catch (err) {
          console.error('Không thể gộp sản phẩm vào giỏ hàng:', item.productId, err)
          mergeError = err.message || 'Không thể gộp giỏ hàng tạm vào giỏ hàng của bạn.'
          break
        }
      }
    } finally {
      mergingRef.current = false
    }
    return mergeError
  }, [])

  // Load cart khi trạng thái đăng nhập thay đổi; nếu vừa đăng nhập thì gộp giỏ tạm trước
  useEffect(() => {
    (async () => {
      let mergeError = null
      if (isAuthenticated) {
        mergeError = await mergeGuestCartIntoServer()
      }
      await fetchCart()
      // fetchCart() vừa reset error về null khi thành công — báo lại lỗi gộp giỏ (nếu có)
      // sau cùng để người dùng biết giỏ tạm chưa được gộp, thay vì chỉ console.error.
      if (mergeError) setError(mergeError)
    })()
  }, [isAuthenticated, mergeGuestCartIntoServer, fetchCart])

  // Add item
  const addToCart = useCallback(async (product, quantity = 1) => {
    if (!isAuthenticated) {
      const items = cartService.addGuestCartItem(product, quantity)
      const updatedCart = cartService.buildGuestCartDto(items)
      setCart(updatedCart)
      return updatedCart
    }
    setLoading(true)
    setError(null)
    try {
      const updatedCart = await cartService.addItem({ productId: product.id, quantity })
      setCart(updatedCart)
      return updatedCart
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  // Update item quantity
  const updateQuantity = useCallback(async (cartItemId, quantity) => {
    if (!isAuthenticated) {
      const items = cartService.updateGuestCartItem(cartItemId, quantity)
      const updatedCart = cartService.buildGuestCartDto(items)
      setCart(updatedCart)
      return updatedCart
    }
    setLoading(true)
    setError(null)
    try {
      const updatedCart = await cartService.updateItem(cartItemId, { quantity })
      setCart(updatedCart)
      return updatedCart
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  // Remove item
  const removeFromCart = useCallback(async (cartItemId) => {
    if (!isAuthenticated) {
      const items = cartService.removeGuestCartItem(cartItemId)
      const updatedCart = cartService.buildGuestCartDto(items)
      setCart(updatedCart)
      return updatedCart
    }
    setLoading(true)
    setError(null)
    try {
      const updatedCart = await cartService.removeItem(cartItemId)
      setCart(updatedCart)
      return updatedCart
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  // Clear cart
  const clearCart = useCallback(async () => {
    if (!isAuthenticated) {
      const items = cartService.clearGuestCartItems()
      const updatedCart = cartService.buildGuestCartDto(items)
      setCart(updatedCart)
      return updatedCart
    }
    setLoading(true)
    setError(null)
    try {
      const updatedCart = await cartService.clearCart()
      setCart(updatedCart)
      return updatedCart
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  const value = useMemo(() => ({
    cart,
    loading,
    error,
    totalItems: cart?.totalItems ?? 0,
    totalPrice: cart?.totalPrice ?? 0,
    items: cart?.items ?? [],
    fetchCart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  }), [cart, loading, error, fetchCart, addToCart, updateQuantity, removeFromCart, clearCart])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
