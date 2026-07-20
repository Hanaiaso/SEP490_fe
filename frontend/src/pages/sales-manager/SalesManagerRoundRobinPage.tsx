import { useCallback, useEffect, useState } from 'react';
import {
  Shuffle,
  RefreshCw,
  Play,
  Pause,
  UserCheck,
  Users,
  ArrowRight,
  CheckCircle,
  MapPin,
} from 'lucide-react';
import {
  getRoundRobinState,
  runRoundRobinAssign,
  updateRoundRobin,
} from '../../services/roundRobinService';

const PRIMARY = '#1F3B64';
const INFO = '#2563EB';
const SUCCESS = '#16A34A';
const WARNING = '#F97316';
const ERROR = '#DC2626';
const NEUTRAL = '#64748B';

const SOURCE_LABELS: Record<string, { label: string; bg: string }> = {
  ROUND_ROBIN: { label: 'Round-robin', bg: INFO },
  REFERRAL: { label: 'Giới thiệu', bg: SUCCESS },
  RETURNING_CUSTOMER: { label: 'Khách cũ', bg: WARNING },
  MANUAL_REASSIGNMENT: { label: 'Gán tay', bg: '#8B5CF6' },
};

type Participant = {
  participantId: string;
  staffId: string;
  name: string;
  email: string;
  isActive: boolean;
  sortOrder: number;
  assignedCustomerCount: number;
};

type AssignmentLog = {
  id: string;
  customerName: string;
  staffName: string;
  assignedByName?: string | null;
  source: string;
  assignedAt: string;
};

type RoundRobinState = {
  isPaused: boolean;
  cursorStaffId?: string | null;
  cursorStaffName?: string | null;
  nextStaff?: { id: string; name: string } | null;
  participants: Participant[];
  unassignedCustomerCount: number;
  updatedAt: string;
  recentAssignments: AssignmentLog[];
};

type AssignResult = {
  assignedCount: number;
  assignments: { customerProfileId: string; customerName: string; staffId: string; staffName: string }[];
};

const parseDate = (dateStr: string) => {
  const hasTimezone = /([+-]\d{2}(:?\d{2})?|Z)$/.test(dateStr);
  return new Date(hasTimezone ? dateStr : `${dateStr}Z`);
};

const formatDateTime = (dateStr?: string | null) => {
  if (!dateStr) return '--';
  return parseDate(dateStr).toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

function SourceBadge({ source }: { source: string }) {
  const info = SOURCE_LABELS[source] || { label: source, bg: NEUTRAL };
  return (
    <span
      className="inline-flex min-w-[80px] items-center justify-center px-2 text-white text-[11px] font-medium"
      style={{ backgroundColor: info.bg, borderRadius: 4, lineHeight: '22px', height: 22, whiteSpace: 'nowrap' }}
    >
      {info.label}
    </span>
  );
}

function StatCard({ label, value, hint, accent }: { label: string; value: string; hint: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">{label}</p>
      <p className="mt-2 text-[20px] font-extrabold leading-none" style={{ color: accent || '#374151' }}>
        {value}
      </p>
      <p className="mt-2 text-[11px] text-[#9CA3AF]">{hint}</p>
    </div>
  );
}

export default function SalesRoundRobinPage() {
  const [state, setState] = useState<RoundRobinState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assignResult, setAssignResult] = useState<AssignResult | null>(null);

  const fetchState = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getRoundRobinState();
      setState(data);
    } catch (err: any) {
      setError(err.message || 'Không tải được trạng thái round-robin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchState();
  }, [fetchState]);

  const applyUpdate = async (payload: Parameters<typeof updateRoundRobin>[0]) => {
    try {
      setUpdating(true);
      const data = await updateRoundRobin(payload);
      setState(data);
    } catch (err: any) {
      alert(err.message || 'Cập nhật thất bại.');
    } finally {
      setUpdating(false);
    }
  };

  const handleTogglePause = () => {
    if (!state) return;
    applyUpdate({ isPaused: !state.isPaused });
  };

  const handleToggleParticipant = (p: Participant) => {
    applyUpdate({ participants: [{ staffId: p.staffId, isActive: !p.isActive }] });
  };

  const handleSetCursor = (p: Participant) => {
    applyUpdate({ cursorStaffId: p.staffId });
  };

  const handleAssign = async () => {
    if (!state) return;
    if (!window.confirm(`Gán ${state.unassignedCustomerCount} khách chưa có Sale phụ trách theo round-robin?`)) return;
    try {
      setAssigning(true);
      setAssignResult(null);
      const result = await runRoundRobinAssign();
      setAssignResult(result);
      await fetchState();
    } catch (err: any) {
      alert(err.message || 'Gán khách thất bại.');
    } finally {
      setAssigning(false);
    }
  };

  if (loading && !state) {
    return (
      <div className="flex items-center justify-center py-24 text-[13px] text-gray-500">
        <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Đang tải...
      </div>
    );
  }

  if (error && !state) {
    return <div className="px-5 py-16 text-center text-[13px] text-red-600">{error}</div>;
  }

  if (!state) return null;

  return (
    <div className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-[18px] font-bold text-[#374151]">
            <Shuffle className="h-5 w-5" style={{ color: PRIMARY }} />
            Quản lý Round-robin
          </h1>
          <p className="mt-0.5 text-[12px] text-gray-500">
            Phân bổ khách hàng tự động cho đội Sale theo vòng tròn · Cập nhật lần cuối: {formatDateTime(state.updatedAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchState}
            className="inline-flex items-center gap-1.5 rounded border border-gray-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </button>
          <button
            onClick={handleTogglePause}
            disabled={updating}
            className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: state.isPaused ? SUCCESS : WARNING }}
          >
            {state.isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {state.isPaused ? 'Tiếp tục gán tự động' : 'Tạm dừng gán tự động'}
          </button>
        </div>
      </div>

      {state.isPaused && (
        <div className="mb-4 rounded border border-orange-200 bg-orange-50 px-4 py-2.5 text-[12px] font-semibold text-orange-700">
          Round-robin đang TẠM DỪNG — khách hàng mới đăng ký sẽ không được gán Sale tự động.
        </div>
      )}

      <div className="mb-5 grid grid-cols-4 gap-3">
        <StatCard
          label="Trạng thái"
          value={state.isPaused ? 'Tạm dừng' : 'Đang chạy'}
          hint="Gán tự động khi khách đăng ký"
          accent={state.isPaused ? WARNING : SUCCESS}
        />
        <StatCard
          label="Cursor hiện tại"
          value={state.cursorStaffName || 'Chưa có'}
          hint="Sale vừa được gán khách gần nhất"
        />
        <StatCard
          label="Người kế tiếp"
          value={state.nextStaff?.name || '--'}
          hint="Sale sẽ nhận khách tiếp theo"
          accent={INFO}
        />
        <StatCard
          label="Khách chưa phân bổ"
          value={String(state.unassignedCustomerCount)}
          hint="Khách hàng chưa có Sale phụ trách"
          accent={state.unassignedCustomerCount > 0 ? ERROR : SUCCESS}
        />
      </div>

      <div className="mb-5 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="flex items-center gap-2 text-[14px] font-bold text-[#374151]">
            <Users className="h-4 w-4" style={{ color: PRIMARY }} /> Đội Sale tham gia round-robin
          </h2>
          <button
            onClick={handleAssign}
            disabled={assigning || state.unassignedCustomerCount === 0}
            className="inline-flex items-center gap-1.5 rounded px-3.5 py-1.5 text-[12px] font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: PRIMARY }}
          >
            {assigning ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
            Gán {state.unassignedCustomerCount} khách chưa phân bổ
          </button>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-2.5">#</th>
              <th className="px-4 py-2.5">Nhân viên</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5 text-right">Khách phụ trách</th>
              <th className="px-4 py-2.5 text-center">Tham gia vòng</th>
              <th className="px-4 py-2.5 text-center">Cursor</th>
            </tr>
          </thead>
          <tbody>
            {state.participants.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-400">
                  Chưa có nhân viên Sale nào trong hệ thống.
                </td>
              </tr>
            ) : (
              state.participants.map((p, idx) => {
                const isCursor = state.cursorStaffId === p.staffId;
                const isNext = state.nextStaff?.id === p.staffId;
                return (
                  <tr key={p.participantId} className={idx % 2 === 1 ? 'bg-gray-50/50' : ''}>
                    <td className="px-4 py-2.5 text-gray-400">{p.sortOrder}</td>
                    <td className="px-4 py-2.5">
                      <span className="font-semibold text-[#374151]">{p.name}</span>
                      {isNext && (
                        <span className="ml-2 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">
                          KẾ TIẾP
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">{p.email}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-[#374151]">
                      {p.assignedCustomerCount}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <button
                        onClick={() => handleToggleParticipant(p)}
                        disabled={updating}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-60 ${
                          p.isActive ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                        title={p.isActive ? 'Đang tham gia — bấm để tạm ngưng' : 'Đang tạm ngưng — bấm để tham gia lại'}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                            p.isActive ? 'translate-x-[18px]' : 'translate-x-[3px]'
                          }`}
                        />
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {isCursor ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: PRIMARY }}>
                          <MapPin className="h-3.5 w-3.5" /> Cursor
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetCursor(p)}
                          disabled={updating}
                          className="rounded border border-gray-300 px-2.5 py-1 text-[11px] font-semibold text-gray-500 hover:bg-gray-50 disabled:opacity-60"
                          title="Đặt người này làm cursor — người đứng sau sẽ nhận khách tiếp theo"
                        >
                          Đặt làm cursor
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {assignResult && (
        <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="flex items-center gap-1.5 text-[13px] font-bold text-green-700">
            <CheckCircle className="h-4 w-4" /> Đã gán {assignResult.assignedCount} khách hàng
          </p>
          {assignResult.assignments.length > 0 && (
            <ul className="mt-2 space-y-1 text-[12px] text-green-800">
              {assignResult.assignments.map((a) => (
                <li key={a.customerProfileId} className="flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5" />
                  <span className="font-semibold">{a.customerName}</span>
                  <ArrowRight className="h-3 w-3" />
                  <span>{a.staffName}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-4 py-3">
          <h2 className="text-[14px] font-bold text-[#374151]">Lịch sử phân bổ gần đây</h2>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-[11px] font-bold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-2.5">Khách hàng</th>
              <th className="px-4 py-2.5">Gán cho</th>
              <th className="px-4 py-2.5">Người thao tác</th>
              <th className="px-4 py-2.5 text-center">Nguồn</th>
              <th className="px-4 py-2.5">Thời gian</th>
            </tr>
          </thead>
          <tbody>
            {state.recentAssignments.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-10 text-center text-gray-400">
                  Chưa có lịch sử phân bổ.
                </td>
              </tr>
            ) : (
              state.recentAssignments.map((h, idx) => (
                <tr key={h.id} className={idx % 2 === 1 ? 'bg-gray-50/50' : ''}>
                  <td className="px-4 py-2.5 font-semibold text-[#374151]">{h.customerName}</td>
                  <td className="px-4 py-2.5 text-gray-600">{h.staffName}</td>
                  <td className="px-4 py-2.5 text-gray-600">{h.assignedByName || 'Hệ thống (tự động)'}</td>
                  <td className="px-4 py-2.5 text-center">
                    <SourceBadge source={h.source} />
                  </td>
                  <td className="px-4 py-2.5 text-gray-500">{formatDateTime(h.assignedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
