import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '../ProtectedRoute.jsx'

/**
 * Sheet: FE-Components — L1-FCMP-01..02 (ProtectedRoute role gating).
 * Mock useAuth để cô lập component khỏi network/localStorage.
 */
const mockUseAuth = vi.fn()
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}))

// Bảng đích điều hướng theo role — bám đúng ProtectedRoute.jsx sau commit f677894
const ROLE_HOME = {
  '/': 'Trang chủ',
  '/sales': 'Cổng Sales',
  '/sales-manager/dashboard': 'Dashboard Sales Manager',
  '/warehouse': 'Cổng kho',
  '/accounting': 'Cổng kế toán',
  '/ceo': 'Cổng CEO',
  '/admin': 'Cổng Admin',
}

function renderAt(initialPath, element) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/login" element={<div>Trang đăng nhập</div>} />
        {Object.entries(ROLE_HOME).map(([path, label]) => (
          <Route key={path} path={path} element={<div>{label}</div>} />
        ))}
        <Route path={initialPath} element={element} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('L1-FCMP · ProtectedRoute', () => {
  // L1-FCMP-01 | BC-TRUE | Chưa đăng nhập vào route được bảo vệ -> chuyển sang /login
  it('L1-FCMP-01 người dùng chưa đăng nhập bị chuyển về /login, nội dung được bảo vệ không render', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, isAuthenticated: false })

    renderAt('/checkout', (
      <ProtectedRoute>
        <div>Nội dung thanh toán</div>
      </ProtectedRoute>
    ))

    expect(screen.getByText('Trang đăng nhập')).toBeInTheDocument()
    expect(screen.queryByText('Nội dung thanh toán')).not.toBeInTheDocument()
  })

  // L1-FCMP-02 | EP-Invalid | Vai trò Customer mở cổng kho -> bị chặn, không thấy nội dung kho
  it('L1-FCMP-02 vai trò Customer không vào được route dành cho WarehouseStaff', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'U1', role: 'Customer' },
      loading: false,
      isAuthenticated: true,
    })

    // Dùng path riêng, không trùng với các route đích trong ROLE_HOME
    renderAt('/warehouse-portal', (
      <ProtectedRoute allowedRoles={['WarehouseStaff']}>
        <div>Cổng quản lý kho</div>
      </ProtectedRoute>
    ))

    expect(screen.queryByText('Cổng quản lý kho')).not.toBeInTheDocument()
    expect(screen.getByText('Trang chủ')).toBeInTheDocument()
  })

  // Nhánh hợp lệ: đúng vai trò thì nội dung được render bình thường
  it('L1-FCMP-02 vai trò đúng thì nội dung được bảo vệ hiển thị', () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'W1', role: 'WarehouseStaff' },
      loading: false,
      isAuthenticated: true,
    })

    renderAt('/warehouse-portal', (
      <ProtectedRoute allowedRoles={['WarehouseStaff']}>
        <div>Cổng quản lý kho</div>
      </ProtectedRoute>
    ))

    expect(screen.getByText('Cổng quản lý kho')).toBeInTheDocument()
  })

  // ── ⊕ v2.3: hành vi mới thêm ở commit f677894 ──────────────────────────

  // L1-FCMP-11 | BC-TRUE | allowGuest -> khách CHƯA đăng nhập vẫn xem được nội dung,
  // KHÔNG bị đá về /login (dùng cho giỏ hàng/xem sản phẩm của khách vãng lai)
  it('L1-FCMP-11 allowGuest cho phép khách vãng lai xem nội dung', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, isAuthenticated: false })

    renderAt('/cart', (
      <ProtectedRoute allowGuest>
        <div>Giỏ hàng của khách</div>
      </ProtectedRoute>
    ))

    expect(screen.getByText('Giỏ hàng của khách')).toBeInTheDocument()
    expect(screen.queryByText('Trang đăng nhập')).not.toBeInTheDocument()
  })

  // L1-FCMP-11b | BC-FALSE | KHÔNG có allowGuest -> vẫn phải chặn như cũ (chống hồi quy)
  it('L1-FCMP-11b không có allowGuest thì khách vãng lai vẫn bị chặn', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, isAuthenticated: false })

    renderAt('/cart', (
      <ProtectedRoute>
        <div>Giỏ hàng của khách</div>
      </ProtectedRoute>
    ))

    expect(screen.queryByText('Giỏ hàng của khách')).not.toBeInTheDocument()
    expect(screen.getByText('Trang đăng nhập')).toBeInTheDocument()
  })

  // L1-FCMP-12 | EP-Invalid | allowGuest KHÔNG được rò sang route nhạy cảm.
  // Cờ này chỉ có tác dụng ở route được khai báo TƯỜNG MINH; mọi route nhạy cảm khác
  // (không khai báo allowGuest) vẫn phải đá khách vãng lai về /login.
  it.each([
    ['/checkout', 'Thanh toán'],
    ['/profile', 'Hồ sơ cá nhân'],
    ['/orders', 'Lịch sử đơn hàng'],
    ['/admin', 'Cổng Admin'],
    ['/sales', 'Cổng Sales'],
  ])('L1-FCMP-12 khách vãng lai vào %s vẫn bị đá về /login', (path, label) => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, isAuthenticated: false })

    render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<div>Trang đăng nhập</div>} />
          <Route path={path} element={(
            // KHÔNG truyền allowGuest — đây là route nhạy cảm
            <ProtectedRoute>
              <div>{label}</div>
            </ProtectedRoute>
          )} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.queryByText(label)).not.toBeInTheDocument()
    expect(screen.getByText('Trang đăng nhập')).toBeInTheDocument()
  })

  // L1-FCMP-12 | BC-TRUE | allowGuest ở route CÔNG KHAI không làm lộ route nhạy cảm bên cạnh
  it('L1-FCMP-12 allowGuest ở route công khai không ảnh hưởng route nhạy cảm khác', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false, isAuthenticated: false })

    render(
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes>
          <Route path="/login" element={<div>Trang đăng nhập</div>} />
          <Route path="/products" element={(
            <ProtectedRoute allowGuest><div>Danh mục sản phẩm</div></ProtectedRoute>
          )} />
          <Route path="/checkout" element={(
            <ProtectedRoute><div>Thanh toán</div></ProtectedRoute>
          )} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.queryByText('Thanh toán')).not.toBeInTheDocument()
    expect(screen.getByText('Trang đăng nhập')).toBeInTheDocument()
  })

  // L1-FCMP-13 | EP-Invalid | Sai vai trò -> đá về ĐÚNG trang chủ của vai trò đó,
  // không phải luôn đá về '/' như bản trước
  it.each([
    ['SalesStaff', 'Cổng Sales'],
    ['SalesManager', 'Dashboard Sales Manager'],
    ['WarehouseStaff', 'Cổng kho'],
    ['AccountingStaff', 'Cổng kế toán'],
    ['CEO', 'Cổng CEO'],
    ['Admin', 'Cổng Admin'],
    ['Customer', 'Trang chủ'],
  ])('L1-FCMP-13 vai trò %s vào route cấm -> về "%s"', (role, expectedLabel) => {
    mockUseAuth.mockReturnValue({
      user: { id: 'U1', role },
      loading: false,
      isAuthenticated: true,
    })

    renderAt('/restricted', (
      <ProtectedRoute allowedRoles={['__KhongAiCoVaiTroNay__']}>
        <div>Nội dung bị cấm</div>
      </ProtectedRoute>
    ))

    expect(screen.queryByText('Nội dung bị cấm')).not.toBeInTheDocument()
    expect(screen.getByText(expectedLabel)).toBeInTheDocument()
  })

  // L1-FCMP-13b | EP-Valid | user không có field role -> mặc định coi như Customer, không crash
  it('L1-FCMP-13b user thiếu role thì mặc định về Customer, không crash', () => {
    mockUseAuth.mockReturnValue({ user: { id: 'U1' }, loading: false, isAuthenticated: true })

    renderAt('/restricted', (
      <ProtectedRoute allowedRoles={['Admin']}>
        <div>Nội dung bị cấm</div>
      </ProtectedRoute>
    ))

    expect(screen.getByText('Trang chủ')).toBeInTheDocument()
  })
})
