import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Package, AlertCircle, TrendingDown, CheckCircle,
  ArrowDownToLine, ArrowRightLeft, ClipboardCheck, Truck,
  PackageCheck, ShieldCheck, Loader2, X, ExternalLink, RefreshCw
} from 'lucide-react';
import { getWarehouseStaffDashboard } from '../../services/dashboardService.js';
import {
  getWarehouseOrders, getPickTasks, getStockTransfers,
  getLowStockAlerts, getSlowMovingItems, getQuarantineList
} from '../../services/warehouseService.js';
import { getPurchaseOrders, getAllGoodsReceipts } from '../../services/purchaseOrderService.js';
import { getErrorMessage } from '../../lib/errors';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#D97706';
const ERROR   = '#DC2626';
const INFO    = '#2563EB';
const NEUTRAL = '#64748B';
const PURPLE  = '#7C3AED';

const formatPrice = (n: number) => new Intl.NumberFormat('vi-VN').format(n || 0);

const formatTimeOrDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '—';
  const hasTimezone = /([+-]\d{2}(:?\d{2})?|Z)$/.test(dateStr);
  const d = new Date(hasTimezone ? dateStr : dateStr + 'Z');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${hours}:${minutes} ${day}/${month}`;
};

// ─── Types khớp WarehouseDashboardDto (backend) ────────────────────────────
interface WarehouseSummary { id: string; name: string; code: string }
interface OutboundKpi { pendingOrders: number; pickingInProgress: number; consolidationArea: number; completedToday: number }
interface InboundKpi { pendingPurchaseOrders: number; receiptsInProgress: number; qualityCheckPending: number; returnQuarantinePending: number }
interface InventoryKpi { lowStockCount: number; slowMovingCount: number; transfersInTransit: number; activeWarehouses: number }
interface RecentPickTask { id: string; orderCode: string; customerName: string; status: string }
interface PendingPo { id: string; code: string; supplierName: string; status: string; progressPercent: number }
interface LowStockItem { name: string; onHand: number; threshold: number; unit: string }
interface InTransitTransfer { id: string; code: string; sourceWarehouse: string; destinationWarehouse: string; status: string }
interface RecentMaterialIssue { id: string; code: string; recipient: string; status: string }

interface WarehouseDashboard {
  generatedAt: string;
  warehouses: WarehouseSummary[];
  outbound: OutboundKpi;
  inbound: InboundKpi;
  inventoryOps: InventoryKpi;
  recentPickTasks: RecentPickTask[];
  pendingPurchaseOrders: PendingPo[];
  lowStockAlerts: LowStockItem[];
  inTransitTransfers: InTransitTransfer[];
  recentMaterialIssues: RecentMaterialIssue[];
}

function statusColor(label: string): string {
  if (/hoàn tất|đã đăng sổ|đã xếp xe|completed/i.test(label)) return SUCCESS;
  if (/đang|picking|draft|waiting/i.test(label)) return INFO;
  if (/ngoại lệ|lỗi|rejected|shortage/i.test(label)) return ERROR;
  return WARNING;
}

interface KpiCardProps {
  label: string; value: string | number; sub?: string;
  icon: React.ReactNode; color: string; onClick?: () => void;
}

function KpiCard({ label, value, sub, icon, color, onClick }: KpiCardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white border border-gray-200 rounded-lg p-3 flex items-start gap-2.5 transition-all ${onClick ? 'cursor-pointer hover:border-blue-400 hover:shadow-md hover:bg-blue-50/20 group' : ''}`}
    >
      <div className="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center transition-transform group-hover:scale-110" style={{ backgroundColor: `${color}18` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide font-medium leading-tight group-hover:text-blue-900">{label}</p>
        <p className="text-xl font-black text-gray-900 mt-0.5 leading-none tabular-nums">{value}</p>
        {sub && <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">{sub}</p>}
      </div>
    </div>
  );
}

function PanelHeader({ title, link, onLink }: { title: string; link?: string; onLink?: () => void }) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
      <span className="text-[11px] font-semibold text-gray-600 uppercase tracking-wide">{title}</span>
      {link && <button onClick={onLink} className="text-[11px] text-blue-600 hover:underline cursor-pointer">{link} →</button>}
    </div>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-4 text-center text-[11px] text-gray-400">Không có dữ liệu</td>
    </tr>
  );
}

type DrillDownMetricType =
  | 'outboundPending'
  | 'pickingInProgress'
  | 'consolidation'
  | 'completedToday'
  | 'pendingPO'
  | 'receiptsInProgress'
  | 'returnQuarantine'
  | 'qualityCheckPending'
  | 'lowStock'
  | 'slowMoving'
  | 'transfersInTransit'
  | 'activeWarehouses';

interface DrillDownModalProps {
  metric: DrillDownMetricType;
  title: string;
  targetPath: string;
  targetLabel: string;
  loading: boolean;
  error: string;
  items: any[];
  onClose: () => void;
  onRetry: () => void;
  onNavigate: (path?: string) => void;
}

function WarehouseDrillDownModal({
  metric, title, targetPath, targetLabel, loading, error, items, onClose, onRetry, onNavigate
}: DrillDownModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[82vh] bg-white rounded-lg shadow-xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-gray-800">{title}</span>
            <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
              {items.length} bản ghi
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate(targetPath)}
              className="text-xs font-semibold text-[#1F3B64] hover:underline flex items-center gap-1 cursor-pointer bg-blue-50 px-2.5 py-1 rounded"
            >
              {targetLabel} <ExternalLink className="w-3 h-3" />
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-700 cursor-pointer ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16">
              <RefreshCw className="w-6 h-6 animate-spin text-[#1F3B64]" />
              <span className="text-xs text-slate-500 font-semibold">Đang tải danh sách...</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <span className="text-xs text-red-500 font-bold">{error}</span>
              <button onClick={onRetry} className="px-3 py-1 bg-[#1F3B64] text-white rounded text-xs font-semibold cursor-pointer">
                Thử lại
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-400">Không có dữ liệu trong mục này.</div>
          ) : (
            <table className="w-full text-left" style={{ fontSize: 12 }}>
              <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
                <tr>
                  {(metric === 'outboundPending' || metric === 'consolidation') && (
                    <>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase">Mã đơn</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase">Khách hàng</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase">Ngày tạo</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase text-right">Tổng tiền</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase text-center">Trạng thái</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase text-center">Thao tác</th>
                    </>
                  )}

                  {(metric === 'pickingInProgress' || metric === 'completedToday') && (
                    <>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase">Mã Pick Task</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase">Mã đơn</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase">Người nhặt</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase text-center">Tiến độ nhặt</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase text-center">Trạng thái</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase text-center">Thao tác</th>
                    </>
                  )}

                  {metric === 'pendingPO' && (
                    <>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase">Mã PO</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase">Nhà cung cấp</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase">Ngày giao DK</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase text-center">Tiến độ</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase text-right">Tổng tiền</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase text-center">Thao tác</th>
                    </>
                  )}

                  {metric === 'receiptsInProgress' && (
                    <>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase">Mã phiếu nhập</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase">Mã PO</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase">Nhà cung cấp</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase">Người nhận</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase text-center">Trạng thái</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase text-center">Thao tác</th>
                    </>
                  )}

                  {(metric === 'returnQuarantine' || metric === 'qualityCheckPending') && (
                    <>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase">Mã cách ly</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase">Sản phẩm / Nguồn</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase">Số lượng</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase">Lý do</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase text-center">Trạng thái</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase text-center">Thao tác</th>
                    </>
                  )}

                  {metric === 'lowStock' && (
                    <>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase">Sản phẩm</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase text-right">Tồn thực tế</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase text-right">Ngưỡng tối thiểu</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase text-center">Đơn vị</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase text-center">Tỷ lệ an toàn</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase text-center">Thao tác</th>
                    </>
                  )}

                  {metric === 'slowMoving' && (
                    <>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase">Sản phẩm / SKU</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase text-right">Tồn kho</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase text-center">Số ngày chưa xuất</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase">Vị trí kho</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase text-center">Thao tác</th>
                    </>
                  )}

                  {metric === 'transfersInTransit' && (
                    <>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase">Mã lệnh</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase">Kho xuất → Kho nhận</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase">Ngày tạo</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase text-center">Trạng thái</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase text-center">Thao tác</th>
                    </>
                  )}

                  {metric === 'activeWarehouses' && (
                    <>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase">Mã kho</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase">Tên kho</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase text-center">Trạng thái</th>
                      <th className="px-3 py-2 text-[11px] font-bold text-gray-600 uppercase text-center">Thao tác</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(metric === 'outboundPending' || metric === 'consolidation') && items.map((o: any, i: number) => (
                  <tr key={o.id || i} className="hover:bg-blue-50/30" style={{ backgroundColor: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}>
                    <td className="px-3 py-2 font-bold whitespace-nowrap" style={{ color: PRIMARY }}>{o.orderCode || o.code}</td>
                    <td className="px-3 py-2 text-gray-800 font-medium">{o.customerName || 'Khách hàng'}</td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{formatTimeOrDate(o.createdAt)}</td>
                    <td className="px-3 py-2 text-right font-bold text-gray-800 tabular-nums">{formatPrice(o.finalPayment || o.totalAmount)} đ</td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-[10px] font-semibold text-white px-2 py-0.5 rounded" style={{ backgroundColor: statusColor(o.fulfillmentStatus || o.status) }}>
                        {o.fulfillmentStatus || o.status || 'Chờ xử lý'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => onNavigate(targetPath)} className="px-2 py-1 bg-[#1F3B64] text-white rounded text-[11px] font-semibold hover:opacity-90 cursor-pointer">
                        Xử lý
                      </button>
                    </td>
                  </tr>
                ))}

                {(metric === 'pickingInProgress' || metric === 'completedToday') && items.map((p: any, i: number) => (
                  <tr key={p.id || i} className="hover:bg-blue-50/30" style={{ backgroundColor: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}>
                    <td className="px-3 py-2 font-bold whitespace-nowrap" style={{ color: PRIMARY }}>{p.pickTaskCode || p.code || p.id?.slice(0, 8)}</td>
                    <td className="px-3 py-2 text-gray-800 font-medium">{p.orderCode || '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{p.assignedStaffName || p.assignedTo || 'Chưa gán'}</td>
                    <td className="px-3 py-2 text-center font-mono text-[11px]">
                      {p.pickedItems != null && p.totalItems != null ? `${p.pickedItems} / ${p.totalItems}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-[10px] font-semibold text-white px-2 py-0.5 rounded" style={{ backgroundColor: statusColor(p.status) }}>
                        {p.status || 'Đang thực hiện'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => onNavigate(targetPath)} className="px-2 py-1 bg-[#1F3B64] text-white rounded text-[11px] font-semibold hover:opacity-90 cursor-pointer">
                        Mở Pick
                      </button>
                    </td>
                  </tr>
                ))}

                {metric === 'pendingPO' && items.map((po: any, i: number) => (
                  <tr key={po.id || i} className="hover:bg-blue-50/30" style={{ backgroundColor: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}>
                    <td className="px-3 py-2 font-bold whitespace-nowrap" style={{ color: PRIMARY }}>{po.code}</td>
                    <td className="px-3 py-2 text-gray-800 font-medium">{po.supplierName || 'Nhà cung cấp'}</td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{formatTimeOrDate(po.expectedDeliveryDate || po.createdAt)}</td>
                    <td className="px-3 py-2 text-center font-mono text-[11px]">{po.progressPercent ?? 0}%</td>
                    <td className="px-3 py-2 text-right font-bold text-gray-800 tabular-nums">{formatPrice(po.totalAmount)} đ</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => onNavigate(targetPath)} className="px-2 py-1 bg-[#1F3B64] text-white rounded text-[11px] font-semibold hover:opacity-90 cursor-pointer">
                        Xem PO
                      </button>
                    </td>
                  </tr>
                ))}

                {metric === 'receiptsInProgress' && items.map((r: any, i: number) => (
                  <tr key={r.id || i} className="hover:bg-blue-50/30" style={{ backgroundColor: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}>
                    <td className="px-3 py-2 font-bold whitespace-nowrap" style={{ color: PRIMARY }}>{r.code || r.id?.slice(0, 8)}</td>
                    <td className="px-3 py-2 text-gray-800 font-medium">{r.poNo || '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{r.supplier || 'Nhà cung cấp'}</td>
                    <td className="px-3 py-2 text-gray-600">{r.receiver || '—'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-[10px] font-semibold text-white px-2 py-0.5 rounded" style={{ backgroundColor: statusColor(r.status) }}>
                        {r.status || 'Đang nhận hàng'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => onNavigate(targetPath)} className="px-2 py-1 bg-[#1F3B64] text-white rounded text-[11px] font-semibold hover:opacity-90 cursor-pointer">
                        Nhận hàng
                      </button>
                    </td>
                  </tr>
                ))}

                {(metric === 'returnQuarantine' || metric === 'qualityCheckPending') && items.map((q: any, i: number) => (
                  <tr key={q.id || i} className="hover:bg-blue-50/30" style={{ backgroundColor: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}>
                    <td className="px-3 py-2 font-bold whitespace-nowrap" style={{ color: PRIMARY }}>{q.quarantineCode || q.code || q.id?.slice(0, 8)}</td>
                    <td className="px-3 py-2 text-gray-800 font-medium">{q.itemName || q.orderCode || q.goodsReceiptCode || 'Lô hàng'}</td>
                    <td className="px-3 py-2 font-mono text-[11px]">{q.quantity ?? 1}</td>
                    <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate">{q.reason || q.notes || 'Chờ kiểm tra'}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-[10px] font-semibold text-white px-2 py-0.5 rounded" style={{ backgroundColor: statusColor(q.status) }}>
                        {q.status || 'Đang kiểm tra'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => onNavigate(targetPath)} className="px-2 py-1 bg-[#1F3B64] text-white rounded text-[11px] font-semibold hover:opacity-90 cursor-pointer">
                        Kiểm định
                      </button>
                    </td>
                  </tr>
                ))}

                {metric === 'lowStock' && items.map((m: any, i: number) => {
                  const pct = m.threshold > 0 ? Math.round((m.onHand / m.threshold) * 100) : 0;
                  return (
                    <tr key={m.name || i} className="hover:bg-blue-50/30" style={{ backgroundColor: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}>
                      <td className="px-3 py-2 font-bold text-gray-800">{m.name || m.productName}</td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums" style={{ color: pct < 50 ? ERROR : WARNING }}>{(m.onHand || m.currentStock || 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-medium text-gray-600 tabular-nums">{(m.threshold || m.minStockLevel || 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-center text-gray-500">{m.unit || 'cái'}</td>
                      <td className="px-3 py-2 text-center font-bold" style={{ color: pct < 50 ? ERROR : WARNING }}>{pct}%</td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={() => onNavigate(targetPath)} className="px-2 py-1 bg-[#1F3B64] text-white rounded text-[11px] font-semibold hover:opacity-90 cursor-pointer">
                          Đặt hàng / Bù
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {metric === 'slowMoving' && items.map((sm: any, i: number) => (
                  <tr key={sm.sku || sm.name || i} className="hover:bg-blue-50/30" style={{ backgroundColor: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}>
                    <td className="px-3 py-2 font-bold text-gray-800">{sm.productName || sm.name || sm.sku}</td>
                    <td className="px-3 py-2 text-right font-bold text-gray-800 tabular-nums">{(sm.quantity || sm.onHand || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-center font-mono text-[11px] text-amber-600 font-semibold">{sm.daysInStock || 14}+ ngày</td>
                    <td className="px-3 py-2 text-gray-600">{sm.warehouseName || 'Kho chính'}</td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => onNavigate(targetPath)} className="px-2 py-1 bg-[#1F3B64] text-white rounded text-[11px] font-semibold hover:opacity-90 cursor-pointer">
                        Điều phối
                      </button>
                    </td>
                  </tr>
                ))}

                {metric === 'transfersInTransit' && items.map((t: any, i: number) => (
                  <tr key={t.id || i} className="hover:bg-blue-50/30" style={{ backgroundColor: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}>
                    <td className="px-3 py-2 font-bold whitespace-nowrap" style={{ color: PRIMARY }}>{t.code}</td>
                    <td className="px-3 py-2 text-gray-800">{t.sourceWarehouse || t.sourceWarehouseName} → {t.destinationWarehouse || t.destinationWarehouseName}</td>
                    <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{formatTimeOrDate(t.createdAt)}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-[10px] font-semibold text-white px-2 py-0.5 rounded" style={{ backgroundColor: statusColor(t.status) }}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => onNavigate(targetPath)} className="px-2 py-1 bg-[#1F3B64] text-white rounded text-[11px] font-semibold hover:opacity-90 cursor-pointer">
                        Theo dõi
                      </button>
                    </td>
                  </tr>
                ))}

                {metric === 'activeWarehouses' && items.map((w: any, i: number) => (
                  <tr key={w.id || i} className="hover:bg-blue-50/30" style={{ backgroundColor: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}>
                    <td className="px-3 py-2 font-bold whitespace-nowrap" style={{ color: PRIMARY }}>{w.code || w.id?.slice(0, 8)}</td>
                    <td className="px-3 py-2 text-gray-800 font-medium">{w.name}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-[10px] font-semibold text-white px-2 py-0.5 rounded bg-emerald-600">
                        Đang hoạt động
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => onNavigate(targetPath)} className="px-2 py-1 bg-[#1F3B64] text-white rounded text-[11px] font-semibold hover:opacity-90 cursor-pointer">
                        Kiểm kê
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WarehouseDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<WarehouseDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      setError('');
      const result = await getWarehouseStaffDashboard();
      setData(result);
    } catch (err) {
      setError(getErrorMessage(err, 'Không thể tải dashboard kho hàng'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // Drill-down Modal State
  const [drillDown, setDrillDown] = useState<{
    metric: DrillDownMetricType;
    title: string;
    targetPath: string;
    targetLabel: string;
  } | null>(null);
  const [drillDownItems, setDrillDownItems] = useState<any[]>([]);
  const [drillDownLoading, setDrillDownLoading] = useState(false);
  const [drillDownError, setDrillDownError] = useState('');

  const loadDrillDownData = async (metric: DrillDownMetricType) => {
    setDrillDownLoading(true);
    setDrillDownError('');
    try {
      if (metric === 'outboundPending') {
        const res = await getWarehouseOrders('OnlinePending', 1, 50);
        const list = res?.orders || res?.items || (Array.isArray(res) ? res : []);
        setDrillDownItems(list);
      } else if (metric === 'pickingInProgress') {
        const res = await getPickTasks('InProgress', 1, 50);
        const list = res?.items || res?.pickTasks || (Array.isArray(res) ? res : []);
        setDrillDownItems(list);
      } else if (metric === 'consolidation') {
        const res = await getWarehouseOrders('Consolidation', 1, 50);
        const list = res?.orders || res?.items || (Array.isArray(res) ? res : []);
        setDrillDownItems(list);
      } else if (metric === 'completedToday') {
        const res = await getPickTasks('Completed', 1, 50);
        const list = res?.items || res?.pickTasks || (Array.isArray(res) ? res : []);
        setDrillDownItems(list);
      } else if (metric === 'pendingPO') {
        // KPI "PO chờ nhập kho" đếm PurchaseOrderStatus.SentToWarehouse — trước đây modal lại gọi
        // status='Issued' (giai đoạn PO khác hẳn), luôn ra danh sách lệch với con số trên KPI.
        const res = await getPurchaseOrders('SentToWarehouse');
        const list = Array.isArray(res) ? res : res?.items || res?.purchaseOrders || [];
        setDrillDownItems(list);
      } else if (metric === 'receiptsInProgress') {
        const res = await getAllGoodsReceipts('');
        const list = Array.isArray(res) ? res.filter((r: any) => r.status === 'Draft' || String(r.status).toLowerCase() === 'draft') : [];
        setDrillDownItems(list);
      } else if (metric === 'returnQuarantine') {
        const res = await getQuarantineList();
        setDrillDownItems(Array.isArray(res) ? res.filter((q: any) => q.orderId != null) : []);
      } else if (metric === 'qualityCheckPending') {
        const res = await getQuarantineList();
        setDrillDownItems(Array.isArray(res) ? res.filter((q: any) => q.goodsReceiptItemId != null) : []);
      } else if (metric === 'lowStock') {
        const res = await getLowStockAlerts();
        const list = Array.isArray(res) ? res : res?.items || data?.lowStockAlerts || [];
        setDrillDownItems(list);
      } else if (metric === 'slowMoving') {
        const res = await getSlowMovingItems();
        const list = Array.isArray(res) ? res : res?.items || [];
        setDrillDownItems(list);
      } else if (metric === 'transfersInTransit') {
        // KPI "Lệnh chuyển kho" đếm StockTransferStatus.Dispatched — 'InTransit' không phải giá trị
        // enum hợp lệ nên backend bỏ qua bộ lọc và trả về TOÀN BỘ lệnh chuyển kho (mọi trạng thái).
        const res = await getStockTransfers('Dispatched');
        const list = Array.isArray(res) ? res : res?.items || data?.inTransitTransfers || [];
        setDrillDownItems(list);
      } else if (metric === 'activeWarehouses') {
        setDrillDownItems(data?.warehouses || []);
      }
    } catch {
      setDrillDownError('Không thể tải dữ liệu chi tiết.');
    } finally {
      setDrillDownLoading(false);
    }
  };

  const openDrillDown = (
    metric: DrillDownMetricType,
    title: string,
    targetPath: string,
    targetLabel: string
  ) => {
    setDrillDown({ metric, title, targetPath, targetLabel });
    setDrillDownItems([]);
    loadDrillDownData(metric);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center" style={{ background: '#F5F7FA' }}>
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3" style={{ background: '#F5F7FA' }}>
        <p className="text-sm text-red-600 font-semibold">{error || 'Không thể tải dashboard kho hàng'}</p>
        <button onClick={fetchDashboard} className="px-3 py-1 bg-[#1F3B64] text-white rounded text-xs font-semibold cursor-pointer">
          Thử lại
        </button>
      </div>
    );
  }

  const generatedAtLabel = new Date(data.generatedAt).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="flex flex-col h-full overflow-auto" style={{ background: '#F5F7FA' }}>
      {/* Page header */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-0.5">
          <span className="text-gray-400">Kho hàng</span>
          <span className="text-gray-300">/</span>
          <span className="text-gray-800 font-semibold">Dashboard</span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-bold text-gray-900">Dashboard Kho hàng</h2>
            <p className="text-xs text-gray-500 mt-0.5">Cập nhật lúc {generatedAtLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDashboard}
              className="h-7 px-3 text-[12px] border border-[#D1D5DB] rounded text-[#374151] bg-white hover:bg-gray-50 flex items-center gap-1.5 cursor-pointer mr-2"
            >
              <RefreshCw className="w-3 h-3 text-[#9CA3AF]" /> Làm mới
            </button>
            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
              {data.warehouses.map((w) => (
                <span key={w.id} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full inline-block bg-blue-500" /> {w.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-3 overflow-auto">

        {/* Outbound KPIs */}
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2 px-0.5">Xuất kho (Outbound) — Bấm số để xem chi tiết</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 4xl:grid-cols-6 gap-3">
            <KpiCard
              label="Lệnh xuất chờ xử lý"
              value={data.outbound.pendingOrders}
              sub="cần xử lý hôm nay · Bấm xem"
              icon={<Package className="w-4 h-4" />}
              color={WARNING}
              onClick={() => openDrillDown('outboundPending', 'Lệnh xuất kho chờ xử lý', '/warehouse/fulfillment/orders', 'Quản lý Lệnh xuất')}
            />
            <KpiCard
              label="Đang Pick & Pack"
              value={data.outbound.pickingInProgress}
              sub="đang thực hiện · Bấm xem"
              icon={<PackageCheck className="w-4 h-4" />}
              color={INFO}
              onClick={() => openDrillDown('pickingInProgress', 'Nhiệm vụ Pick & Pack đang thực hiện', '/warehouse/fulfillment/pick-packing', 'Quản lý Pick & Pack')}
            />
            <KpiCard
              label="Khu tập kết"
              value={data.outbound.consolidationArea}
              sub="chờ bàn giao Sales · Bấm xem"
              icon={<Truck className="w-4 h-4" />}
              color={PURPLE}
              onClick={() => openDrillDown('consolidation', 'Đơn hàng tại khu tập kết chờ bàn giao', '/warehouse/fulfillment/consolidation', 'Khu tập kết')}
            />
            <KpiCard
              label="Hoàn tất hôm nay"
              value={data.outbound.completedToday}
              sub="pick task hoàn tất · Bấm xem"
              icon={<CheckCircle className="w-4 h-4" />}
              color={SUCCESS}
              onClick={() => openDrillDown('completedToday', 'Pick Task đã hoàn tất hôm nay', '/warehouse/fulfillment/orders', 'Xem tất cả đơn')}
            />
          </div>
        </div>

        {/* Inbound KPIs */}
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2 px-0.5">Nhập kho (Inbound) — Bấm số để xem chi tiết</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 4xl:grid-cols-6 gap-3">
            <KpiCard
              label="PO chờ nhập kho"
              value={data.inbound.pendingPurchaseOrders}
              sub="đã phát hành · Bấm xem"
              icon={<ArrowDownToLine className="w-4 h-4" />}
              color={INFO}
              onClick={() => openDrillDown('pendingPO', 'Đơn đặt hàng mua (PO) chờ nhập kho', '/warehouse/purchase/orders', 'Quản lý PO')}
            />
            <KpiCard
              label="Phiếu nhập đang xử lý"
              value={data.inbound.receiptsInProgress}
              sub="đang nhập hàng · Bấm xem"
              icon={<ArrowDownToLine className="w-4 h-4" />}
              color={WARNING}
              onClick={() => openDrillDown('receiptsInProgress', 'Phiếu nhập kho đang xử lý (Nháp)', '/warehouse/purchase/goods-receipt', 'Phiếu nhập kho')}
            />
            <KpiCard
              label="Cách ly (Quarantine)"
              value={data.inbound.returnQuarantinePending}
              sub="hàng khách trả · Bấm xem"
              icon={<ShieldCheck className="w-4 h-4" />}
              color={WARNING}
              onClick={() => openDrillDown('returnQuarantine', 'Hàng cách ly & khách trả về', '/warehouse/inv-management/quarantine', 'Quản lý cách ly')}
            />
            <KpiCard
              label="QC nhập kho chờ duyệt"
              value={data.inbound.qualityCheckPending}
              sub="hàng lỗi/thừa/sai từ PO · Bấm xem"
              icon={<ShieldCheck className="w-4 h-4" />}
              color={WARNING}
              onClick={() => openDrillDown('qualityCheckPending', 'Hàng chờ QC kiểm định (từ phiếu nhập kho)', '/warehouse/inv-management/quarantine', 'Quản lý cách ly')}
            />
          </div>
        </div>

        {/* Inventory KPIs */}
        <div>
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-2 px-0.5">Tồn kho & Vận hành — Bấm số để xem chi tiết</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 4xl:grid-cols-6 gap-3">
            <KpiCard
              label="Sản phẩm sắp hết"
              value={data.inventoryOps.lowStockCount}
              sub="dưới ngưỡng tối thiểu · Bấm xem"
              icon={<AlertCircle className="w-4 h-4" />}
              color={ERROR}
              onClick={() => openDrillDown('lowStock', 'Sản phẩm sắp hết hàng (Dưới mức an toàn)', '/warehouse/inventory/low-stock', 'Cảnh báo tồn kho')}
            />
            <KpiCard
              label="Hàng chậm luân chuyển"
              value={data.inventoryOps.slowMovingCount}
              sub="trên 2 tuần · Bấm xem"
              icon={<TrendingDown className="w-4 h-4" />}
              color={NEUTRAL}
              onClick={() => openDrillDown('slowMoving', 'Hàng tồn chậm luân chuyển (> 14 ngày)', '/warehouse/inventory/slow-moving', 'Hàng chậm luân chuyển')}
            />
            <KpiCard
              label="Lệnh chuyển kho"
              value={data.inventoryOps.transfersInTransit}
              sub="đang vận chuyển · Bấm xem"
              icon={<ArrowRightLeft className="w-4 h-4" />}
              color={INFO}
              onClick={() => openDrillDown('transfersInTransit', 'Lệnh chuyển kho đang vận chuyển', '/warehouse/transfer/stock-transfer', 'Chuyển kho')}
            />
            <KpiCard
              label="Kho đang hoạt động"
              value={data.inventoryOps.activeWarehouses}
              sub="tổng số kho · Bấm xem"
              icon={<ClipboardCheck className="w-4 h-4" />}
              color={PURPLE}
              onClick={() => openDrillDown('activeWarehouses', 'Danh sách kho hàng đang hoạt động', '/warehouse/inv-management/inventory-count', 'Kiểm kê kho')}
            />
          </div>
        </div>

        {/* Bottom panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Fulfillment orders */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <PanelHeader title="Lệnh xuất kho gần đây" link="Xem tất cả" onLink={() => navigate('/warehouse/fulfillment/orders')} />
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-3 py-2 text-gray-700 font-semibold">Mã đơn</th>
                  <th className="text-left px-3 py-2 text-gray-700 font-semibold">Khách hàng</th>
                  <th className="text-center px-3 py-2 text-gray-700 font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.recentPickTasks.length === 0 && <EmptyRow colSpan={3} />}
                {data.recentPickTasks.map((o, i) => (
                  <tr key={o.id} className="hover:bg-blue-50/30 cursor-pointer" style={{ backgroundColor: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}
                    onClick={() => navigate('/warehouse/fulfillment/orders')}>
                    <td className="px-3 py-2 font-semibold text-[11px]" style={{ color: PRIMARY }}>{o.orderCode}</td>
                    <td className="px-3 py-2 text-gray-700 truncate max-w-[90px]">{o.customerName}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-[10px] font-semibold text-white px-1.5 py-0.5 whitespace-nowrap inline-block" style={{ backgroundColor: statusColor(o.status), borderRadius: 4 }}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PO Waiting */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <PanelHeader title="PO chờ nhập kho" link="Xem tất cả" onLink={() => navigate('/warehouse/purchase/orders')} />
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-3 py-2 text-gray-700 font-semibold">Mã PO</th>
                  <th className="text-left px-3 py-2 text-gray-700 font-semibold">Nhà cung cấp</th>
                  <th className="text-center px-3 py-2 text-gray-700 font-semibold">Tiến độ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.pendingPurchaseOrders.length === 0 && <EmptyRow colSpan={3} />}
                {data.pendingPurchaseOrders.map((po, i) => (
                  <tr key={po.id} className="hover:bg-blue-50/30 cursor-pointer" style={{ backgroundColor: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}
                    onClick={() => navigate('/warehouse/purchase/orders')}>
                    <td className="px-3 py-2 font-semibold text-[11px]" style={{ color: PRIMARY }}>{po.code}</td>
                    <td className="px-3 py-2 text-gray-700 truncate max-w-[90px] text-[11px]">{po.supplierName}</td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center gap-1.5 justify-center">
                        <div className="w-12 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${po.progressPercent}%`, backgroundColor: po.progressPercent >= 100 ? SUCCESS : INFO }} />
                        </div>
                        <span className="font-mono text-[10px] text-gray-500">{po.progressPercent}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Low stock alerts */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <PanelHeader title="Cảnh báo tồn kho" link="Xem tất cả" onLink={() => navigate('/warehouse/inventory/low-stock')} />
            <div className="p-3 space-y-2.5">
              {data.lowStockAlerts.length === 0 && <p className="text-[11px] text-gray-400 text-center py-2">Không có cảnh báo</p>}
              {data.lowStockAlerts.map((m) => {
                const pct = m.threshold > 0 ? Math.round((m.onHand / m.threshold) * 100) : 0;
                return (
                  <div key={m.name} className="cursor-pointer hover:bg-gray-50 -mx-3 px-3 py-1 rounded" onClick={() => navigate('/warehouse/inventory/low-stock')}>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="font-medium text-gray-800">{m.name}</span>
                      <span className="font-semibold tabular-nums" style={{ color: pct < 50 ? ERROR : WARNING }}>{m.onHand.toLocaleString()} / {m.threshold.toLocaleString()} {m.unit}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: pct < 50 ? ERROR : WARNING }} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">{pct}% ngưỡng tối thiểu</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Production + Transfer quick info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <PanelHeader title="Chuyển kho đang vận chuyển" link="Xem tất cả" onLink={() => navigate('/warehouse/transfer/stock-transfer')} />
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-3 py-2 text-gray-700 font-semibold">Mã lệnh</th>
                  <th className="text-left px-3 py-2 text-gray-700 font-semibold">Nguồn → Đích</th>
                  <th className="text-center px-3 py-2 text-gray-700 font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.inTransitTransfers.length === 0 && <EmptyRow colSpan={3} />}
                {data.inTransitTransfers.map((t, i) => (
                  <tr key={t.id} className="hover:bg-blue-50/30 cursor-pointer" style={{ backgroundColor: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}
                    onClick={() => navigate('/warehouse/transfer/stock-transfer')}>
                    <td className="px-3 py-2 font-semibold" style={{ color: PRIMARY }}>{t.code}</td>
                    <td className="px-3 py-2 text-gray-700">{t.sourceWarehouse} → {t.destinationWarehouse}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-[10px] font-semibold text-white px-1.5 py-0.5 whitespace-nowrap inline-block"
                        style={{ backgroundColor: statusColor(t.status), borderRadius: 4 }}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <PanelHeader title="Xuất NVL sản xuất gần đây" link="Xem tất cả" onLink={() => navigate('/warehouse/production/issue')} />
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-3 py-2 text-gray-700 font-semibold">Mã lệnh</th>
                  <th className="text-left px-3 py-2 text-gray-700 font-semibold">Nơi nhận</th>
                  <th className="text-center px-3 py-2 text-gray-700 font-semibold">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.recentMaterialIssues.length === 0 && <EmptyRow colSpan={3} />}
                {data.recentMaterialIssues.map((p, i) => (
                  <tr key={p.id} className="hover:bg-blue-50/30 cursor-pointer" style={{ backgroundColor: i % 2 === 1 ? '#FAFAFA' : '#FFFFFF' }}
                    onClick={() => navigate('/warehouse/production/issue')}>
                    <td className="px-3 py-2 font-semibold" style={{ color: PRIMARY }}>{p.code}</td>
                    <td className="px-3 py-2 text-gray-700 truncate max-w-[140px]">{p.recipient}</td>
                    <td className="px-3 py-2 text-center">
                      <span className="text-[10px] font-semibold text-white px-1.5 py-0.5 whitespace-nowrap inline-block"
                        style={{ backgroundColor: statusColor(p.status), borderRadius: 4 }}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Drill-down Modal */}
      {drillDown && (
        <WarehouseDrillDownModal
          metric={drillDown.metric}
          title={drillDown.title}
          targetPath={drillDown.targetPath}
          targetLabel={drillDown.targetLabel}
          loading={drillDownLoading}
          error={drillDownError}
          items={drillDownItems}
          onClose={() => setDrillDown(null)}
          onRetry={() => loadDrillDownData(drillDown.metric)}
          onNavigate={(path) => {
            const target = path || drillDown.targetPath;
            setDrillDown(null);
            navigate(target);
          }}
        />
      )}
    </div>
  );
}

