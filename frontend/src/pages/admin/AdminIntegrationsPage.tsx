import { getErrorMessage } from '../../lib/errors';
import { useCallback, useEffect, useState } from 'react';
import { History as HistoryIcon, Pencil, Plug } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getAllConfigs } from '../../services/adminSystemConfigService.js';
import type { SystemConfig } from '../../types/admin';
import { EditConfigModal, HistoryModal } from './AdminSystemConfigPage';

interface IntegrationGroup {
  title: string;
  description: string;
  prefix: string;
}

// Nhóm hiển thị cho 5 tích hợp thật đang gọi dịch vụ bên ngoài (UC-59).
// OCR/AI Service (đọc ảnh hoá đơn PO) chưa có trong danh sách này vì backend hiện là mock hoàn
// toàn (PurchaseOrderService.ImportFromImageAsync) — chưa có gì để cấu hình thật.
const GROUPS: IntegrationGroup[] = [
  { title: 'SePay', description: 'Thanh toán QR chuyển khoản và xác thực webhook.', prefix: 'SEPAY_' },
  { title: 'Google OAuth', description: 'Đăng nhập bằng tài khoản Google.', prefix: 'GOOGLE_' },
  { title: 'SMS Gateway (eSMS)', description: 'Gửi mã OTP qua tin nhắn SMS.', prefix: 'ESMS_' },
  { title: 'Email Service (SMTP)', description: 'Gửi email xác thực, hoá đơn, thông báo hệ thống.', prefix: 'EMAIL_' },
  { title: 'Facebook / Make.com', description: 'Webhook đăng bài marketing tự động lên Facebook.', prefix: 'MAKE_' },
];

function formatDate(iso: string | undefined) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('vi-VN');
}

export default function AdminIntegrationsPage() {
  const { toast } = useToast();
  const [configs, setConfigs] = useState<SystemConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<SystemConfig | null>(null);
  const [historyKey, setHistoryKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAllConfigs();
      setConfigs((data || []).filter((c: SystemConfig) => GROUPS.some(g => c.key.startsWith(g.prefix))));
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col gap-[20px] p-[24px]">
      <div>
        <h1 className="font-semibold text-[20px] text-[#1f3b64] flex items-center gap-2">
          <Plug className="w-5 h-5" /> Tích hợp hệ thống
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Thay thế cấu hình cứng trong appsettings — mỗi thay đổi được lưu phiên bản và ghi audit log.
          Giá trị nhạy cảm (API key/mật khẩu) được mã hoá khi lưu và không hiển thị lại nguyên văn.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-8 text-sm text-gray-500">Đang tải...</div>
      ) : (
        GROUPS.map(group => {
          const items = configs.filter(c => c.key.startsWith(group.prefix));
          if (items.length === 0) return null;
          return (
            <div key={group.prefix} className="bg-white border border-[#e5e7eb] rounded-[8px] overflow-hidden">
              <div className="px-[16px] py-[12px] border-b border-[#e5e7eb] bg-[#f5f7fa]">
                <h2 className="text-[13px] font-semibold text-[#1f3b64]">{group.title}</h2>
                <p className="text-[11px] text-[#64748b] mt-0.5">{group.description}</p>
              </div>
              <table className="w-full">
                <tbody>
                  {items.map(c => (
                    <tr key={c.key} className="border-b border-[#f5f7fa] last:border-b-0 hover:bg-[#f5f7fa]">
                      <td className="px-[16px] py-[10px] text-[12px] w-[40%]">
                        <p className="font-medium text-[#1f3b64]">{c.description}</p>
                        <p className="font-mono text-[10px] text-[#94a3b8] mt-0.5">{c.key}</p>
                      </td>
                      <td className="px-[16px] py-[10px] text-[12px]">
                        {c.isSecret ? (
                          c.effectiveValue ? (
                            <span className="px-2 py-1 rounded text-xs bg-green-50 text-green-700 font-mono">{c.effectiveValue}</span>
                          ) : (
                            <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-500">Chưa cấu hình (dùng appsettings)</span>
                          )
                        ) : c.effectiveValue ? (
                          <span className="font-semibold text-[#1f3b64]">{c.effectiveValue}</span>
                        ) : (
                          <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-500">Chưa cấu hình (dùng appsettings)</span>
                        )}
                      </td>
                      <td className="px-[16px] py-[10px] text-[12px] text-[#64748b] w-[160px]">{formatDate(c.effectiveDate)}</td>
                      <td className="px-[16px] py-[10px] w-[80px]">
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
          );
        })
      )}

      {editTarget && (
        <EditConfigModal config={editTarget} onClose={() => setEditTarget(null)} onSaved={load} />
      )}
      {historyKey && (
        <HistoryModal configKey={historyKey} onClose={() => setHistoryKey(null)} />
      )}
    </div>
  );
}
