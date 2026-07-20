import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { useAuth } from './AuthContext.jsx'
import * as cartService from '../services/cartService.js'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch cart from backend
  const fetchCart = useCallback(async () => {
    if (!isAuthenticated) {
      setCart(null)
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

  // Load cart when authentication status changes
  useEffect(() => {
    fetchCart()
  }, [fetchCart])

  // Add item
  const addToCart = useCallback(async (productId, quantity = 1) => {
    if (!isAuthenticated) {
      throw new Error('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng.')
    }
    setLoading(true)
    setError(null)
    try {
      const updatedCart = await cartService.addItem({ productId, quantity })
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
    if (!isAuthenticated) return
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
    if (!isAuthenticated) return
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
    if (!isAuthenticated) return
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
