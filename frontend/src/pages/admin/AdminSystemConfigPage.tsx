import { useEffect, useState } from 'react';
import { History as HistoryIcon, Pencil } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getAllConfigs, getConfigHistory, updateConfig } from '../../services/adminSystemConfigService.js';

function formatDate(iso: string) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('vi-VN');
}

// ─── Modal: Sửa giá trị cấu hình ─────────────────────────────────────────────
function EditConfigModal({ config, onClose, onSaved }: { config: any; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [value, setValue] = useState(config.effectiveValue ?? '');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (value === '' || value === null || value === undefined) return toast.error('Vui lòng nhập giá trị.');
    if (!reason.trim()) return toast.error('Vui lòng nhập lý do thay đổi.');

    setSaving(true);
    try {
      await updateConfig(config.key, {
        value: String(value),
        effectiveDate: effectiveDate ? new Date(effectiveDate).toISOString() : undefined,
        reason: reason.trim(),
      });
      toast.success('Cập nhật cấu hình thành công!');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-[460px] flex flex-col gap-4 shadow-xl">
        <div>
          <h2 className="text-lg font-semibold text-[#1f3b64]">Sửa cấu hình: {config.key}</h2>
          <p className="text-xs text-gray-500 mt-1">{config.description}</p>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Giá trị mới {config.unit ? `(${config.unit})` : ''}</label>
          {config.valueType === 'Bool' ? (
            <select className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
              value={String(value)} onChange={e => setValue(e.target.value)}>
              <option value="true">Bật (true)</option>
              <option value="false">Tắt (false)</option>
            </select>
          ) : (
            <input
              type={config.valueType === 'Int' || config.valueType === 'Decimal' ? 'number' : 'text'}
              className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
              value={value} onChange={e => setValue(e.target.value)}
            />
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Ngày hiệu lực (để trống = áp dụng ngay)</label>
          <input type="datetime-local" className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500"
            value={effectiveDate} onChange={e => setEffectiveDate(e.target.value)} />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Lý do thay đổi *</label>
          <textarea rows={3} className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500 resize-none"
            value={reason} onChange={e => setReason(e.target.value)} placeholder="Vì sao cần thay đổi giá trị này?" />
        </div>

        <div className="flex justify-end gap-2 border-t pt-3">
          <button onClick={onClose} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Hủy</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium disabled:opacity-50">
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Modal: Lịch sử phiên bản ────────────────────────────────────────────────
function HistoryModal({ configKey, onClose }: { configKey: string; onClose: () => void }) {
  const { toast } = useToast();
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConfigHistory(configKey)
      .then(setVersions)
      .catch((err: any) => toast.error(err.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configKey]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-[640px] max-h-[80vh] overflow-y-auto flex flex-col gap-4 shadow-xl">
        <h2 className="text-lg font-semibold text-[#1f3b64] border-b pb-2">Lịch sử: {configKey}</h2>
        {loading ? (
          <p className="text-sm text-gray-500 text-center py-4">Đang tải...</p>
        ) : versions.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">Chưa có lịch sử.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {versions.map(v => (
              <div key={v.id} className={`border rounded-lg p-3 flex flex-col gap-1 ${v.isCurrentlyEffective ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-[#1f3b64]">Giá trị: {v.value}</span>
                  {v.isCurrentlyEffective && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-green-600 text-white font-medium">Đang hiệu lực</span>
                  )}
                </div>
                <p className="text-xs text-gray-500">Hiệu lực từ: {formatDate(v.effectiveDate)}</p>
                <p className="text-xs text-gray-500">Người thay đổi: {v.actorEmail || 'Hệ thống'}</p>
                {v.changeReason && <p className="text-xs text-gray-600 italic">Lý do: {v.changeReason}</p>}
                <p className="text-[10px] text-gray-400">Tạo lúc: {formatDate(v.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end border-t pt-3">
          <button onClick={onClose} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Đóng</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminSystemConfigPage() {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [historyKey, setHistoryKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAllConfigs();
      setConfigs(data || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="flex flex-col gap-[20px] p-[24px]">
      <div>
        <h1 className="font-semibold text-[20px] text-[#1f3b64]">Cấu hình hệ thống</h1>
        <p className="text-xs text-gray-500 mt-1">Các tham số vận hành (SLA, ngưỡng giá, OTP...) — mỗi thay đổi được lưu phiên bản và ghi audit log.</p>
      </div>

      <div className="bg-white border border-[#e5e7eb] rounded-[8px] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f5f7fa] border-b border-[#e5e7eb]">
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Tham số</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Mô tả</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Giá trị hiệu lực</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Ngày hiệu lực</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Cấp sở hữu</th>
              <th className="text-center px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-4 text-sm text-gray-500">Đang tải...</td></tr>
            ) : configs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-4 text-sm text-gray-500">Chưa có dữ liệu</td></tr>
            ) : configs.map(c => (
              <tr key={c.key} className="border-b border-[#f5f7fa] hover:bg-[#f5f7fa]">
                <td className="px-[16px] py-[12px] text-[12px] font-mono font-medium text-[#1f3b64]">{c.key}</td>
                <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">{c.description}</td>
                <td className="px-[16px] py-[12px] text-[12px] font-semibold text-[#1f3b64]">
                  {c.effectiveValue} {c.unit || ''}
                </td>
                <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">{formatDate(c.effectiveDate)}</td>
                <td className="px-[16px] py-[12px] text-[12px]">
                  <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">{c.ownerLevel}</span>
                </td>
                <td className="px-[16px] py-[12px]">
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={() => setEditTarget(c)} title="Sửa giá trị" className="text-[#3b82f6] hover:text-[#2563eb]">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setHistoryKey(c.key)} title="Xem lịch sử" className="text-gray-500 hover:text-gray-700">
                      <HistoryIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editTarget && (
        <EditConfigModal config={editTarget} onClose={() => setEditTarget(null)} onSaved={load} />
      )}
      {historyKey && (
        <HistoryModal configKey={historyKey} onClose={() => setHistoryKey(null)} />
      )}
    </div>
  );
}
