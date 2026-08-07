import { useEffect, useState } from 'react';
import { Plus, Search, ShieldCheck, Lock, Unlock } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
  searchUsers, createUser, changeUserRole, setUserStatus, ASSIGNABLE_ROLES,
} from '../../services/adminUserService.js';

const ROLE_LABELS: Record<string, string> = {
  SalesStaff: 'Nhân viên Sale',
  SalesManager: 'Trưởng nhóm Sale',
  WarehouseStaff: 'Nhân viên kho',
  AccountingStaff: 'Kế toán',
  CEO: 'CEO',
  Admin: 'Admin',
  Customer: 'Khách hàng',
  Guest: 'Khách',
};

function roleLabel(role: string) {
  return ROLE_LABELS[role] || role;
}

function formatDate(iso: string) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('vi-VN');
}

// ─── Modal: Tạo tài khoản nhân viên ─────────────────────────────────────────
function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ fullName: '', email: '', phoneNumber: '', password: '', role: 'SalesStaff' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.fullName.trim()) return toast.error('Vui lòng nhập họ tên.');
    if (!form.email.trim()) return toast.error('Vui lòng nhập email.');
    if (!form.password || form.password.length < 6) return toast.error('Mật khẩu phải có ít nhất 6 ký tự.');

    setSaving(true);
    try {
      await createUser(form);
      toast.success('Tạo tài khoản thành công!');
      onCreated();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-[480px] flex flex-col gap-4 shadow-xl">
        <h2 className="text-lg font-semibold text-[#1f3b64] border-b pb-2">Tạo tài khoản nhân viên</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-xs font-medium text-gray-600">Họ tên *</label>
            <input className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
              value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-xs font-medium text-gray-600">Email *</label>
            <input className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
              value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Số điện thoại</label>
            <input className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
              value={form.phoneNumber} onChange={e => setForm({ ...form, phoneNumber: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Mật khẩu *</label>
            <input type="password" className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
              value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-xs font-medium text-gray-600">Vai trò *</label>
            <select className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
              value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
              {ASSIGNABLE_ROLES.map((r: string) => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2 border-t pt-3">
          <button onClick={onClose} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Hủy</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium disabled:opacity-50">
            {saving ? 'Đang lưu...' : 'Tạo tài khoản'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Đổi vai trò / Khóa-Mở tài khoản (đều cần lý do) ─────────────────
function ReasonActionModal({ title, children, confirmLabel, onConfirm, onClose }: {
  title: string; children: React.ReactNode; confirmLabel: string; onConfirm: (reason: string) => Promise<void>; onClose: () => void;
}) {
  const { toast } = useToast();
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!reason.trim()) return toast.error('Vui lòng nhập lý do.');
    setSaving(true);
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-[420px] flex flex-col gap-4 shadow-xl">
        <h2 className="text-lg font-semibold text-[#1f3b64] border-b pb-2">{title}</h2>
        {children}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Lý do *</label>
          <textarea rows={3} className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 resize-none"
            value={reason} onChange={e => setReason(e.target.value)} placeholder="Nhập lý do thực hiện thao tác này..." />
        </div>
        <div className="flex justify-end gap-2 border-t pt-3">
          <button onClick={onClose} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Hủy</button>
          <button onClick={handleConfirm} disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium disabled:opacity-50">
            {saving ? 'Đang xử lý...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<any>(null);
  const [statusTarget, setStatusTarget] = useState<any>(null);
  const [newRole, setNewRole] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const result = await searchUsers({
        page, pageSize: 20, searchQuery: searchQuery || undefined,
        role: roleFilter || undefined, isActive: activeFilter || undefined,
      });
      setUsers(result.items || []);
      setTotalPages(result.totalPages || 1);
      setTotalCount(result.totalCount || 0);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, searchQuery, roleFilter, activeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const openRoleModal = (u: any) => {
    setNewRole(u.role);
    setRoleTarget(u);
  };

  return (
    <div className="flex flex-col gap-[20px] p-[24px]">
      <div className="flex justify-between items-center">
        <h1 className="font-semibold text-[20px] text-[#1f3b64]">Quản lý người dùng</h1>
        <button onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-[#1f3b64] text-white px-[16px] py-[8px] rounded-[4px] text-[12px] font-medium hover:bg-[#162a4a]">
          <Plus className="w-4 h-4" /> Tạo tài khoản
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex gap-3 items-center bg-white border border-[#e5e7eb] rounded-[8px] p-[12px]">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 flex-1">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            className="flex-1 text-sm outline-none"
            placeholder="Tìm theo tên, email, số điện thoại..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
          />
        </form>
        <select className="border rounded px-2 py-1.5 text-xs" value={roleFilter}
          onChange={e => { setPage(1); setRoleFilter(e.target.value); }}>
          <option value="">Tất cả vai trò</option>
          {ASSIGNABLE_ROLES.map((r: string) => <option key={r} value={r}>{roleLabel(r)}</option>)}
        </select>
        <select className="border rounded px-2 py-1.5 text-xs" value={activeFilter}
          onChange={e => { setPage(1); setActiveFilter(e.target.value); }}>
          <option value="">Tất cả trạng thái</option>
          <option value="true">Đang hoạt động</option>
          <option value="false">Đã khóa</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#e5e7eb] rounded-[8px] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f5f7fa] border-b border-[#e5e7eb]">
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Tên</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Email</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">SĐT</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Vai trò</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Trạng thái</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Ngày tạo</th>
              <th className="text-center px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center py-4 text-sm text-gray-500">Đang tải...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-4 text-sm text-gray-500">Chưa có dữ liệu</td></tr>
            ) : users.map(u => (
              <tr key={u.id} className="border-b border-[#f5f7fa] hover:bg-[#f5f7fa]">
                <td className="px-[16px] py-[12px] text-[12px] font-medium text-[#1f3b64]">{u.fullName}</td>
                <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">{u.email}</td>
                <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">{u.phoneNumber || '-'}</td>
                <td className="px-[16px] py-[12px] text-[12px]">
                  <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">{roleLabel(u.role)}</span>
                </td>
                <td className="px-[16px] py-[12px] text-[12px]">
                  <span className={`px-2 py-1 rounded text-xs ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {u.isActive ? 'Hoạt động' : 'Đã khóa'}
                  </span>
                </td>
                <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">{formatDate(u.createdAt)}</td>
                <td className="px-[16px] py-[12px]">
                  <div className="flex items-center justify-center gap-2">
                    <button onClick={() => openRoleModal(u)} title="Đổi vai trò"
                      className="text-[#3b82f6] hover:text-[#2563eb]">
                      <ShieldCheck className="w-4 h-4" />
                    </button>
                    <button onClick={() => setStatusTarget(u)} title={u.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                      className={u.isActive ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}>
                      {u.isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[12px] text-[#64748b]">
          <span>Tổng {totalCount} người dùng</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">Trước</button>
            <span>Trang {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">Sau</button>
          </div>
        </div>
      )}

      {isCreateOpen && (
        <CreateUserModal onClose={() => setIsCreateOpen(false)} onCreated={load} />
      )}

      {roleTarget && (
        <ReasonActionModal
          title={`Đổi vai trò: ${roleTarget.fullName}`}
          confirmLabel="Xác nhận đổi vai trò"
          onClose={() => setRoleTarget(null)}
          onConfirm={async (reason) => {
            await changeUserRole(roleTarget.id, { newRole, reason });
            toast.success('Đổi vai trò thành công!');
            load();
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-600">Vai trò mới</label>
            <select className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
              value={newRole} onChange={e => setNewRole(e.target.value)}>
              {ASSIGNABLE_ROLES.map((r: string) => <option key={r} value={r}>{roleLabel(r)}</option>)}
            </select>
          </div>
        </ReasonActionModal>
      )}

      {statusTarget && (
        <ReasonActionModal
          title={statusTarget.isActive ? `Khóa tài khoản: ${statusTarget.fullName}` : `Mở khóa tài khoản: ${statusTarget.fullName}`}
          confirmLabel={statusTarget.isActive ? 'Khóa tài khoản' : 'Mở khóa'}
          onClose={() => setStatusTarget(null)}
          onConfirm={async (reason) => {
            await setUserStatus(statusTarget.id, { isActive: !statusTarget.isActive, reason });
            toast.success(statusTarget.isActive ? 'Đã khóa tài khoản.' : 'Đã mở khóa tài khoản.');
            load();
          }}
        >
          <p className="text-sm text-gray-500">
            {statusTarget.isActive
              ? 'Tài khoản sẽ không thể đăng nhập cho đến khi được mở khóa lại.'
              : 'Tài khoản sẽ có thể đăng nhập trở lại bình thường.'}
          </p>
        </ReasonActionModal>
      )}
    </div>
  );
}
