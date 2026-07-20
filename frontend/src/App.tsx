import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ForgotPasswordSent from './pages/ForgotPasswordSent.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { CartProvider } from './context/CartContext.jsx'
import Cart from './pages/Cart.jsx'
import Checkout from './pages/Checkout.jsx'
import Landing from './pages/Landing.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import OrderDetail from './pages/OrderDetail.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import Profile from './pages/Profile.jsx'
import Products from './pages/Products.jsx'
import Register from './pages/Register.jsx'
import VerifyOtp from './pages/VerifyOtp.jsx'
import Negotiation from './pages/Negotiation.jsx'
import NegotiationList from './pages/NegotiationList.jsx'
import SalesPortal from './pages/sales/SalesPortal.tsx'
import AdminPortal from './pages/admin/AdminPortal.tsx'
import CEOPortal from './pages/ceo/CEOPortal.tsx'
import CustomerNotificationsPage from './pages/CustomerNotificationsPage.jsx'
import WarehousePortal from './pages/warehouse/WarehousePortal.tsx'
import SalesManagerPortal from './pages/sales-manager/SalesManagerPortal.tsx'
import ProtectedRouteImport from './components/ProtectedRoute.jsx'
import { ToastProvider } from './context/ToastContext.tsx'
const ProtectedRoute = ProtectedRouteImport as any;

function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <CartProvider>
            <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/home" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/forgot-password/sent" element={<ForgotPasswordSent />} />
            <Route path="/verify-otp" element={<VerifyOtp />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Customer Routes */}
            <Route path="/notifications" element={<ProtectedRoute><CustomerNotificationsPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/profile/orders/:orderId" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
            <Route path="/profile/quotations/:id" element={<ProtectedRoute allowedRoles={['Customer']}><Negotiation /></ProtectedRoute>} />
            <Route path="/cart" element={<ProtectedRoute allowedRoles={['Customer']}><Cart /></ProtectedRoute>} />
            <Route path="/checkout" element={<ProtectedRoute allowedRoles={['Customer']}><Checkout /></ProtectedRoute>} />
            <Route path="/negotiation/:id" element={<ProtectedRoute allowedRoles={['Customer']}><Negotiation /></ProtectedRoute>} />
            <Route path="/negotiations" element={<ProtectedRoute allowedRoles={['Customer']}><NegotiationList /></ProtectedRoute>} />

            {/* Sales Routes */}
            <Route path="/sales/*" element={<ProtectedRoute allowedRoles={['SalesStaff', 'Admin']}><SalesPortal /></ProtectedRoute>} />

            {/* Manager Routes */}
            <Route path="/sales-manager/*" element={<ProtectedRoute allowedRoles={['SalesManager', 'Admin']}><SalesManagerPortal /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/admin/*" element={<ProtectedRoute allowedRoles={['Admin']}><AdminPortal /></ProtectedRoute>} />

            {/* CEO Routes */}
            <Route path="/ceo/*" element={<ProtectedRoute allowedRoles={['CEO', 'Admin']}><CEOPortal /></ProtectedRoute>} />

            {/* Warehouse Routes */}
            <Route path="/warehouse/*" element={<ProtectedRoute allowedRoles={['WarehouseStaff', 'Admin']}><WarehousePortal /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </ToastProvider>
  </BrowserRouter>
)
}

export default App
