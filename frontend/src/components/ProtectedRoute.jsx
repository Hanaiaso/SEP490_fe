import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
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
    // Chưa đăng nhập -> Chuyển hướng sang trang Login và lưu lại URL hiện tại để quay về sau khi login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(user.role)) {
      // Không có quyền truy cập -> Đẩy về trang chủ
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
