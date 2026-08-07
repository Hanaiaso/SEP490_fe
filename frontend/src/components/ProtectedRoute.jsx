import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles = [], allowGuest = false }) {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <span className="text-gray-500 font-medium">Đang tải...</span>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    if (allowGuest) {
      return children;
    }
    // Chưa đăng nhập -> Chuyển hướng sang trang Login và lưu lại URL hiện tại để quay về sau khi login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole = user.role || 'Customer';

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(userRole)) {
      // Không có quyền truy cập -> Đẩy về trang tương ứng với role
      let redirectPath = '/';
      if (userRole === 'SalesStaff') redirectPath = '/sales';
      else if (userRole === 'SalesManager') redirectPath = '/sales-manager/dashboard';
      else if (userRole === 'WarehouseStaff') redirectPath = '/warehouse';
      else if (userRole === 'AccountingStaff') redirectPath = '/accounting';
      else if (userRole === 'CEO') redirectPath = '/ceo';
      else if (userRole === 'Admin') redirectPath = '/admin';

      return <Navigate to={redirectPath} replace />;
    }
  }

  return children;
}
