import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
  showToast: (type: ToastType, message: string, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string, title?: string, duration: number = 4000) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: ToastItem = { id, type, title, message, duration };

    setToasts((prev) => [...prev.slice(-4), newToast]); // Giới hạn tối đa 5 toasts hiển thị cùng lúc

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  // Phải giữ nguyên identity của "toast" (và value của Provider bên dưới) qua các lần render —
  // trước đây là object literal tạo mới mỗi render, nên bất kỳ trang nào có
  // useCallback(fetchX, [..., toast]) + useEffect(() => fetchX(), [fetchX]) sẽ tự động fetch lại
  // MỖI KHI có bất kỳ toast nào (ở bất kỳ đâu trong app) xuất hiện/biến mất — dữ liệu vừa gán ở
  // client (chưa lưu server) bị ghi đè ngay lập tức, trông như "bị nảy ra" (vd trang Sắp xếp vận
  // chuyển: cảnh báo "khác địa điểm" tự kích hoạt refetch, xóa mất đơn vừa kéo vào xe).
  const toast = useMemo(() => ({
    success: (msg: string, title?: string) => showToast('success', msg, title || 'Thành công'),
    error: (msg: string, title?: string) => showToast('error', msg, title || 'Lỗi'),
    warning: (msg: string, title?: string) => showToast('warning', msg, title || 'Cảnh báo'),
    info: (msg: string, title?: string) => showToast('info', msg, title || 'Thông báo'),
  }), [showToast]);

  // Override window.alert mặc định của trình duyệt để hiển thị Toast đẹp mắt
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (message: unknown) => {
      const msgStr = typeof message === 'string' ? message : JSON.stringify(message);
      if (msgStr.toLowerCase().includes('lỗi') || msgStr.toLowerCase().includes('thất bại') || msgStr.toLowerCase().includes('failed') || msgStr.toLowerCase().includes('error')) {
        showToast('error', msgStr, 'Thông báo lỗi');
      } else if (msgStr.toLowerCase().includes('cảnh báo') || msgStr.toLowerCase().includes('vui lòng') || msgStr.toLowerCase().includes('warning')) {
        showToast('warning', msgStr, 'Chú ý');
      } else {
        showToast('success', msgStr, 'Thông báo');
      }
    };

    return () => {
      window.alert = originalAlert;
    };
  }, [showToast]);

  const contextValue = useMemo(() => ({ toast, showToast, removeToast }), [toast, showToast, removeToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      
      {/* Toast Container - Góc trên bên phải */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-[420px] w-full pointer-events-none p-2">
        {toasts.map((item) => (
          <ToastCard key={item.id} item={item} onClose={() => removeToast(item.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  const config = {
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />,
      bar: 'bg-emerald-500',
      badge: 'Thành công'
    },
    error: {
      bg: 'bg-rose-50 border-rose-200 text-rose-900',
      icon: <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />,
      bar: 'bg-rose-500',
      badge: 'Lỗi'
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />,
      bar: 'bg-amber-500',
      badge: 'Cảnh báo'
    },
    info: {
      bg: 'bg-blue-50 border-blue-200 text-blue-900',
      icon: <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />,
      bar: 'bg-blue-500',
      badge: 'Thông báo'
    }
  }[item.type];

  return (
    <div className={`pointer-events-auto border rounded-xl p-4 shadow-xl flex items-start gap-3 relative overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${config.bg}`}>
      {config.icon}
      
      <div className="flex-1 min-w-0 pr-4">
        {item.title && <h4 className="font-bold text-xs uppercase tracking-wide opacity-80 mb-0.5">{item.title}</h4>}
        <p className="text-xs leading-relaxed whitespace-pre-wrap font-medium">{item.message}</p>
      </div>

      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-700 p-1 rounded-md transition-colors flex-shrink-0"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress timer bar */}
      {item.duration && item.duration > 0 && (
        <div 
          className={`absolute bottom-0 left-0 h-1 ${config.bar} opacity-60 transition-all duration-linear`}
          style={{
            animation: `toastProgress ${item.duration}ms linear forwards`
          }}
        />
      )}
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
