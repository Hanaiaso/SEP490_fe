import { getErrorMessage } from '../../lib/errors';
import { useState, useEffect } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Search, Eye, RefreshCw, Download, Printer, CheckCircle, Save, Check, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/sales-ui/dialog';
import { getAllGoodsReceipts, updateGoodsReceipt, postGoodsReceipt } from '../../services/purchaseOrderService.js';
import type { GoodsReceipt as ApiGoodsReceipt } from '../../types/warehouse';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#D97706';
const INFO    = '#2563EB';
const NEUTRAL = '#64748B';

// GoodsReceiptStatus (backend enum thật): chỉ có Draft, Posted, Cancelled — không có trạng thái
// "receiving"/"discrepancy" nào cả, nên 2 khóa đó trước đây không bao giờ khớp được dữ liệu thật.
const STATUS_CFG: Record<string, { label: string; bg: string }> = {
  draft:     { label: 'Đang nhận hàng (Nháp)', bg: INFO    },
  completed: { label: 'Hoàn tất',              bg: SUCCESS },
  cancelled: { label: 'Đã hủy',                bg: WARNING },
};

function mapStatus(status: string): string {
  switch (status) {
    case 'Draft': return 'draft';
    case 'Posted': return 'completed';
    case 'Cancelled': return 'cancelled';
    default: return status;
  }
}

interface ReceiptItem {
  purchaseOrderItemId: string;
  sku: string; name: string; orderedQty: number; actualQty: number;
  acceptedQty: number; rejectedQty: number; damagedQty: number;
  excessQty: number; shortQty: number;
  warehouseLocation: string; batchNo: string; lotNo: string;
  expirationDate: string; storageLocation: string;
}

interface GoodsReceipt {
  id: string; poNo: string; poCode: string; supplier: string; warehouse: string;
  receivingDate: string; receiver: string; code: string;
  status: string;
  items: ReceiptItem[];
}

function Badge({ status }: { status: string }) {
  const c = STATUS_CFG[mapStatus(status)] || { label: status, bg: NEUTRAL };
  return <span className="text-[10px] font-semibold text-white px-2 py-0.5 inline-block whitespace-nowrap" style={{ backgroundColor: c.bg, borderRadius: 4 }}>{c.label}</span>;
}

export default function WarehouseGoodsReceipt() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<GoodsReceipt | null>(null);
  const [editItems, setEditItems] = useState<ReceiptItem[]>([]);
  const [DATA, setDATA] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const isReadOnly = !!detail && mapStatus(detail.status) === 'completed';

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const loadData = async () => {
    setLoading(true);
    try {
      const receipts: ApiGoodsReceipt[] = await getAllGoodsReceipts('');
      const mapped: GoodsReceipt[] = receipts.map((r) => ({
        id: r.id,
        code: r.code,
        poNo: r.purchaseOrderId,
        poCode: r.purchaseOrderCode,
        supplier: 'NCC (Từ PO)',
        warehouse: 'Kho Hệ Thống',
        receivingDate: r.receivedDate,
        receiver: r.receivedByUserName,
        status: r.status,
        items: (r.items || []).map((i) => ({
          purchaseOrderItemId: i.purchaseOrderItemId,
          sku: i.itemSku,
          name: i.itemName,
          orderedQty: 0,
          // Thừa (excessQuantity) là phần NẰM TRONG Đạt+Hỏng+Sai loại vượt số lượng còn thiếu của PO
          // (xem GoodsReceiptService.UpdateDraftReceiptAsync), không phải số lượng cộng thêm — cộng nó
          // vào đây sẽ đếm trùng và thổi phồng SL thực tế mỗi khi phiếu có hàng thừa.
          actualQty: i.acceptedQuantity + i.damagedQuantity + i.wrongItemQuantity,
          acceptedQty: i.acceptedQuantity,
          rejectedQty: i.wrongItemQuantity,
          damagedQty: i.damagedQuantity,
          excessQty: i.excessQuantity,
          shortQty: i.shortQuantity,
          warehouseLocation: '-',
          batchNo: i.batchNumber || '-',
          lotNo: '-',
          expirationDate: i.expiryDate || '-',
          storageLocation: '-'
        }))
      }));
      setDATA(mapped);
    } catch (err: unknown) {
      setToast({ text: 'Lỗi tải phiếu nhập: ' + getErrorMessage(err), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = DATA.filter(d => {
    const q = search.toLowerCase();
    const ms = !q || d.id.toLowerCase().includes(q) || d.poNo.toLowerCase().includes(q) || (d.poCode ?? '').toLowerCase().includes(q) || d.supplier.toLowerCase().includes(q) || (d.code && d.code.toLowerCase().includes(q));
    return ms && (statusFilter === 'all' || mapStatus(d.status) === statusFilter) && (warehouseFilter === 'all' || d.warehouse === warehouseFilter);
  });

  const toggleSelect = (id: string) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map(d => d.id));

  const openDetail = (d: GoodsReceipt) => {
    setDetail(d);
    setEditItems(d.items.map(i => ({ ...i })));
  };

  const updateQty = (idx: number, field: keyof ReceiptItem, value: number) => {
    setEditItems(p => p.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      // Giữ actualQty đồng bộ trong state (không chỉ ở phần hiển thị bảng) — handlePrintReceipt đọc
      // trực tiếp item.actualQty, nếu không đồng bộ thì bản in sẽ hiện SL thực tế cũ sau khi sửa.
      updated.actualQty = updated.acceptedQty + updated.damagedQty + updated.rejectedQty;
      return updated;
    }));
  };

  const handleExportExcel = (itemsToExport?: GoodsReceipt[]) => {
    const list = itemsToExport && itemsToExport.length > 0 ? itemsToExport : filtered;
    if (list.length === 0) {
      setToast({ text: 'Không có dữ liệu phiếu nhập để xuất file.', type: 'error' });
      return;
    }
    const lines: string[] = [];
    lines.push('DANH SACH PHIEU NHAP KHO (GOODS RECEIPT)');
    lines.push(`Ngay xuat: ${new Date().toLocaleDateString('vi-VN')}`);
    lines.push('');
    lines.push('Ma phieu,Ma PO,Nha cung cap,Kho nhap,Ngay nhap,Nguoi nhap,Trang thai,So mat hang');
    list.forEach(r => {
      lines.push(`"${r.code}","${r.poCode || r.poNo}","${r.supplier}","${r.warehouse}","${r.receivingDate}","${r.receiver}","${r.status}","${r.items.length}"`);
    });
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `danh-sach-phieu-nhap-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    setToast({ text: `Đã xuất ${list.length} phiếu nhập kho ra file CSV thành công!`, type: 'success' });
  };

  const handlePrintReceipt = (receipt?: GoodsReceipt | null) => {
    const target = receipt || detail;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Vui lòng cho phép mở popup để in phiếu.');
      return;
    }
    const itemsToPrint = (target ? (target === detail ? editItems : target.items) : []).map((item, idx) => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #ddd; padding: 8px;"><strong>${item.name}</strong><br/><small style="color: #666;">${item.sku}</small></td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.actualQty}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; color: green; font-weight: bold;">${item.acceptedQty}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; color: red;">${item.damagedQty}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; color: #2563eb; font-weight: bold;">${item.excessQty > 0 ? '+' + item.excessQty : '0'}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${item.batchNo || '-'}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${item.storageLocation || '-'}</td>
      </tr>
    `).join('');
    const html = target ? `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Phiếu Nhập Kho - ${target.code}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #333; }
          .header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #1F3B64; padding-bottom: 15px; }
          .title { font-size: 22px; font-weight: bold; color: #1F3B64; margin-top: 5px; }
          .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 12px; }
          th { background-color: #f4f6f9; border: 1px solid #ddd; padding: 8px; text-align: center; }
          .footer { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr 1fr; text-align: center; font-size: 13px; }
          .sign-box { height: 70px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="font-size: 14px; font-weight: 600; text-transform: uppercase; color: #666;">CÔNG TY TNHH SẢN XUẤT BAO BÌ VIỆT TIẾN</div>
          <div class="title">PHIẾU NHẬP KHO (GOODS RECEIPT NOTE)</div>
          <div style="font-size: 12px; color: #888; margin-top: 4px;">Mã phiếu: <strong>${target.code}</strong> | Ngày nhập: ${target.receivingDate || new Date().toLocaleDateString('vi-VN')}</div>
        </div>
        <div class="meta">
          <div><strong>Nhà cung cấp:</strong> ${target.supplier}</div>
          <div><strong>Kho nhập:</strong> ${target.warehouse}</div>
          <div><strong>Mã đơn PO:</strong> ${target.poCode || target.poNo}</div>
          <div><strong>Người nhập hàng:</strong> ${target.receiver || 'Thủ kho'}</div>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 40px;">STT</th>
              <th>Tên hàng / SKU</th>
              <th style="width: 90px;">SL Thực tế</th>
              <th style="width: 90px;">Đạt (Nhập kho)</th>
              <th style="width: 90px;">Hỏng / Lỗi</th>
              <th style="width: 70px;">Thừa</th>
              <th style="width: 100px;">Lô / Batch</th>
              <th style="width: 100px;">Vị trí</th>
            </tr>
          </thead>
          <tbody>
            ${itemsToPrint || '<tr><td colspan="8" style="text-align: center; padding: 20px;">Không có dữ liệu mặt hàng</td></tr>'}
          </tbody>
        </table>
        <div class="footer">
          <div><strong>Người giao hàng</strong><br/><small>(Ký và ghi rõ họ tên)</small><div class="sign-box"></div></div>
          <div><strong>Thủ kho nhận</strong><br/><small>(Ký và ghi rõ họ tên)</small><div class="sign-box"></div></div>
          <div><strong>Kế toán kho</strong><br/><small>(Ký và ghi rõ họ tên)</small><div class="sign-box"></div></div>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    ` : `
      <!DOCTYPE html>
      <html>
      <head><title>In danh sách phiếu nhập</title></head>
      <body>
        <h2>DANH SÁCH PHIẾU NHẬP KHO</h2>
        <p>In toàn bộ danh sách phiếu nhập kho hiện tại</p>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const buildUpdatePayload = (items: ReceiptItem[]) => ({
    items: items.map(i => ({
      purchaseOrderItemId: i.purchaseOrderItemId,
      acceptedQuantity: i.acceptedQty,
      damagedQuantity: i.damagedQty,
      wrongItemQuantity: i.rejectedQty
    }))
  });

  // BUGFIX: trước đây chỉ đổi state React cục bộ, không hề gọi API — mọi chỉnh sửa biến mất
  // ngay khi tải lại trang. Nay gọi PUT /receipts/{id} thật (chỉ hoạt động khi phiếu còn Draft).
  const handleSaveDraft = async () => {
    if (!detail) return;
    setLoadingAction(true);
    try {
      await updateGoodsReceipt(detail.poNo, detail.id, buildUpdatePayload(editItems));
      const updated = { ...detail, items: [...editItems] };
      setDetail(updated);
      setDATA(prev => prev.map(d => d.id === detail.id ? updated : d));
      setToast({ text: `Đã lưu thay đổi của phiếu ${detail.code} thành công!`, type: 'success' });
    } catch (err) {
      setToast({ text: 'Lỗi khi lưu phiếu: ' + getErrorMessage(err), type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  // BUGFIX: trước đây lỗi từ postGoodsReceipt bị nuốt âm thầm (try/catch rỗng chỉ console.warn),
  // UI vẫn báo "hoàn tất thành công" và đổi trạng thái local dù backend từ chối (vd thiếu ảnh minh
  // chứng khi có hàng Hỏng/Sai loại) — dữ liệu thật vẫn ở Draft, tồn kho chưa được cộng. Nay để lỗi
  // trồi lên catch ngoài, không báo thành công giả. Đồng thời lưu chỉnh sửa đang hiển thị TRƯỚC khi
  // ghi sổ, để "Hoàn tất" luôn phản ánh đúng số liệu trên màn hình chứ không phải số liệu lúc tạo phiếu.
  const handleCompleteReceipt = async (receipt?: GoodsReceipt | null) => {
    const target = receipt || detail;
    if (!target) return;
    setLoadingAction(true);
    try {
      if (target.poNo && target.id) {
        if (target === detail) {
          await updateGoodsReceipt(target.poNo, target.id, buildUpdatePayload(editItems));
        }
        await postGoodsReceipt(target.poNo, target.id);
      }
      const updated = { ...target, status: 'Posted', items: target === detail ? editItems : target.items };
      setDetail(updated);
      setDATA(prev => prev.map(d => d.id === target.id ? { ...d, status: 'Posted' } : d));
      setToast({ text: `Phiếu nhập ${target.code} đã được hoàn tất và ghi sổ kho thành công!`, type: 'success' });
    } catch (err) {
      setToast({ text: 'Lỗi khi hoàn tất phiếu nhập: ' + getErrorMessage(err), type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  // BUGFIX: cùng lỗi "báo thành công giả" như trên — lỗi post của TỪNG phiếu bị nuốt, sau đó TOÀN
  // BỘ phiếu đã chọn (kể cả những phiếu vừa lỗi) vẫn bị đổi trạng thái local thành "Posted". Nay chỉ
  // đổi trạng thái cho phiếu thực sự post thành công, báo rõ danh sách phiếu lỗi, và giữ lại lựa chọn
  // các phiếu lỗi để người dùng biết cần xử lý tiếp.
  const handleBulkComplete = async () => {
    if (selected.length === 0) return;
    setLoadingAction(true);
    try {
      const targets = DATA.filter(d => selected.includes(d.id) && d.status !== 'completed' && d.status !== 'Posted');
      const succeededIds: string[] = [];
      const failed: { code: string; id: string; error: string }[] = [];

      for (const item of targets) {
        try {
          await postGoodsReceipt(item.poNo, item.id);
          succeededIds.push(item.id);
        } catch (e) {
          failed.push({ code: item.code, id: item.id, error: getErrorMessage(e) });
        }
      }

      if (succeededIds.length > 0) {
        setDATA(prev => prev.map(d => succeededIds.includes(d.id) ? { ...d, status: 'Posted' } : d));
      }
      setSelected(failed.map(f => f.id));

      if (failed.length === 0) {
        setToast({ text: `Đã hoàn tất ${succeededIds.length} phiếu nhập kho đã chọn!`, type: 'success' });
      } else {
        setToast({ text: `Hoàn tất ${succeededIds.length}/${targets.length} phiếu. Lỗi: ${failed.map(f => f.code).join(', ')}.`, type: 'error' });
      }
    } catch (err) {
      setToast({ text: 'Lỗi xử lý hàng loạt: ' + getErrorMessage(err), type: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="flex flex-col h-full relative">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-xs font-medium text-white transition-all transform duration-300 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toast.type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          <span>{toast.text}</span>
        </div>
      )}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] mb-0.5">
          <span className="text-gray-400">Kho hàng</span><span className="text-gray-400">/</span><span className="text-gray-400">Nhập kho (Inbound)</span><span className="text-gray-400">/</span><span className="text-gray-800 font-semibold">Lịch sử phiếu nhập (GRN)</span>
        </div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Lịch sử phiếu nhập hàng (Goods Receipt)</h2>
            <p className="text-xs text-gray-500 mt-0.5">{DATA.length} phiếu · {DATA.filter(d => mapStatus(d.status) === 'draft').length} đang nhập</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 cursor-pointer" onClick={loadData} disabled={loading}><RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Làm mới</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 cursor-pointer" onClick={() => handlePrintReceipt(null)}><Printer className="w-3 h-3" /> In phiếu nhập</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 cursor-pointer" onClick={() => handleExportExcel(filtered)}><Download className="w-3 h-3" /> Xuất Excel</Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" /><Input className="pl-8 h-7 text-xs bg-gray-50" placeholder="Mã GR, mã PO, nhà cung cấp..." value={search} onChange={e => setSearch(e.target.value)} /></div>
          <select className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600 cursor-pointer" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">Tất cả trạng thái</option>{Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
          <input type="date" className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600 cursor-pointer" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <input type="date" className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600 cursor-pointer" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          <select className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600 cursor-pointer" value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)}><option value="all">Tất cả kho</option><option value="Kho Hà Nội">Kho Hà Nội</option><option value="Kho HCM">Kho HCM</option><option value="Kho Đà Nẵng">Kho Đà Nẵng</option></select>
        </div>
      </div>
      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        {selected.length > 0 && (
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded px-3 py-2 mb-2 flex items-center gap-2 text-xs text-blue-700">
            <span className="font-medium">{selected.length} phiếu được chọn</span>
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100 whitespace-nowrap cursor-pointer" onClick={() => handlePrintReceipt(null)}>In phiếu nhập</button>
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100 whitespace-nowrap cursor-pointer" onClick={handleBulkComplete} disabled={loadingAction}>Hoàn tất nhập hàng</button>
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100 whitespace-nowrap cursor-pointer" onClick={() => handleExportExcel(DATA.filter(d => selected.includes(d.id)))}>Xuất Excel</button>
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100 whitespace-nowrap cursor-pointer" onClick={() => setSelected([])}>Hủy chọn</button>
          </div>
        )}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={filtered.length > 0 && selected.length === filtered.length} onChange={toggleAll} className="w-3.5 h-3.5 cursor-pointer" /></th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Mã phiếu nhập</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Mã PO</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Nhà cung cấp</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Kho</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Ngày nhập</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Người nhập</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Trạng thái</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (<tr><td colSpan={12} className="py-12 text-center"><div className="flex flex-col items-center gap-2"><div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><span className="text-gray-400 text-xl">📋</span></div><p className="text-sm font-medium text-gray-500">Không có dữ liệu</p><p className="text-xs text-gray-400">Thay đổi bộ lọc để xem kết quả khác</p></div></td></tr>)}
              {filtered.map((d, i) => (
                <tr key={d.id} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''} ${selected.includes(d.id) ? 'bg-blue-50/50' : ''}`}>
                  <td className="px-3 py-2.5"><input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggleSelect(d.id)} className="w-3.5 h-3.5 cursor-pointer" /></td>
                  <td className="px-3 py-2.5 font-semibold" style={{ color: PRIMARY }}>{d.code}</td>
                  <td className="px-3 py-2.5 text-gray-600">{d.poCode || `${d.poNo?.substring(0, 8)}...`}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-800">{d.supplier}</td>
                  <td className="px-3 py-2.5 text-gray-700">{d.warehouse}</td>
                  <td className="px-3 py-2.5 text-gray-500">{d.receivingDate}</td>
                  <td className="px-3 py-2.5 text-gray-700">{d.receiver}</td>
                  <td className="px-3 py-2.5 text-center"><Badge status={d.status} /></td>
                  <td className="px-3 py-2.5 text-center"><div className="flex items-center justify-center gap-1"><button className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600 cursor-pointer" onClick={() => openDetail(d)} title="Xem chi tiết"><Eye className="w-3.5 h-3.5" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <span className="text-xs text-gray-500">Hiển thị {filtered.length} / {DATA.length} bản ghi</span>
            <button className="w-6 h-6 text-xs rounded font-medium text-white flex items-center justify-center" style={{ backgroundColor: PRIMARY }}>1</button>
          </div>
        </div>
      </div>
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-4xl max-h-[88vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader><DialogTitle className="text-sm font-bold">Phiếu nhập hàng — {detail?.code || detail?.id}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded p-3 space-y-1.5"><p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Thông tin phiếu</p><div className="flex justify-between"><span className="text-gray-500">Mã phiếu:</span><span className="font-semibold" style={{ color: PRIMARY }}>{detail.code}</span></div><div className="flex justify-between"><span className="text-gray-500">Mã PO:</span><span>{detail.poCode || detail.poNo}</span></div><div className="flex justify-between"><span className="text-gray-500">Ngày nhập:</span><span>{detail.receivingDate}</span></div><div className="flex justify-between"><span className="text-gray-500">Người nhập:</span><span className="font-medium">{detail.receiver || 'Thủ kho'}</span></div></div>
                <div className="bg-gray-50 rounded p-3 space-y-1.5"><p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Nhà cung cấp</p><div className="flex justify-between"><span className="text-gray-500">Tên NCC:</span><span className="font-semibold text-gray-800">{detail.supplier}</span></div><div className="flex justify-between"><span className="text-gray-500">Kho nhập:</span><span>{detail.warehouse}</span></div></div>
                <div className="bg-gray-50 rounded p-3 space-y-1.5"><p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Trạng thái</p><div className="flex justify-between"><span className="text-gray-500">Trạng thái:</span><Badge status={detail.status} /></div></div>
              </div>
              {editItems.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-gray-600 text-[10px] uppercase tracking-wide">Chi tiết hàng nhập</p>
                    {isReadOnly && (
                      <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-medium">
                        🔒 Phiếu đã ghi sổ kho — Chỉ xem, không được chỉnh sửa
                      </span>
                    )}
                  </div>
                  <div className="border border-gray-200 rounded overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left px-3 py-2 text-gray-700 font-semibold">SKU / Sản phẩm</th>
                          <th className="text-center px-3 py-2 text-gray-700 font-semibold">SL đặt</th>
                          <th className="text-center px-3 py-2 text-gray-700 font-semibold">SL thực tế</th>
                          <th className="text-center px-3 py-2 text-gray-700 font-semibold">Chấp nhận</th>
                          <th className="text-center px-3 py-2 text-gray-700 font-semibold">Sai loại</th>
                          <th className="text-center px-3 py-2 text-gray-700 font-semibold">Hư hỏng</th>
                          <th className="text-center px-3 py-2 text-gray-700 font-semibold">Thừa</th>
                          <th className="text-center px-3 py-2 text-gray-700 font-semibold">Thiếu</th>
                          <th className="text-left px-3 py-2 text-gray-700 font-semibold">Batch / Lot</th>
                          <th className="text-left px-3 py-2 text-gray-700 font-semibold">Vị trí lưu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {editItems.map((item, idx) => (
                          <tr key={item.sku} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <p className="font-mono text-gray-500">{item.sku}</p>
                              <p className="text-gray-800 font-medium">{item.name}</p>
                            </td>
                            <td className="px-3 py-2 text-center font-semibold text-gray-600">{item.orderedQty}</td>
                            <td className="px-3 py-2 text-center">
                              {/* SL thực tế = Chấp nhận + Sai loại + Hư hỏng — luôn tự tính, không nhập tay
                                  để không thể lệch với 3 số liệu thật sự lưu ở backend (Excess/Short cũng
                                  do server tự tính lại theo đúng công thức này, xem UpdateDraftReceiptAsync). */}
                              <span className="font-semibold text-gray-900">{item.acceptedQty + item.damagedQty + item.rejectedQty}</span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              {isReadOnly ? (
                                <span className="font-bold text-emerald-600">{item.acceptedQty}</span>
                              ) : (
                                <Input type="number" value={item.acceptedQty} className="h-6 text-xs text-center w-16 mx-auto text-emerald-600 font-semibold" onChange={e => updateQty(idx, 'acceptedQty', +e.target.value)} />
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {isReadOnly ? (
                                <span className="text-gray-500">{item.rejectedQty}</span>
                              ) : (
                                <Input type="number" value={item.rejectedQty} className="h-6 text-xs text-center w-16 mx-auto" onChange={e => updateQty(idx, 'rejectedQty', +e.target.value)} />
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {isReadOnly ? (
                                <span className={item.damagedQty > 0 ? 'font-bold text-red-600' : 'text-gray-400'}>{item.damagedQty}</span>
                              ) : (
                                <Input type="number" value={item.damagedQty} className="h-6 text-xs text-center w-16 mx-auto text-red-600 font-semibold" onChange={e => updateQty(idx, 'damagedQty', +e.target.value)} />
                              )}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={item.excessQty > 0 ? 'font-bold text-blue-600' : 'text-gray-300'}>{item.excessQty > 0 ? `+${item.excessQty}` : '0'}</span>
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={item.shortQty > 0 ? 'font-bold text-orange-600' : 'text-gray-300'}>{item.shortQty > 0 ? `-${item.shortQty}` : '0'}</span>
                            </td>
                            <td className="px-3 py-2">
                              <p className="text-gray-600">{item.batchNo || '-'}</p>
                              <p className="text-gray-400">{item.lotNo || '-'}</p>
                            </td>
                            <td className="px-3 py-2 text-gray-600">{item.storageLocation || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!isReadOnly && (
                    <p className="text-gray-400 mt-1 text-[10px]">* SL thực tế = Chấp nhận + Sai loại + Hư hỏng (tự tính). Thừa/Thiếu do hệ thống tính lại khi bấm "Lưu nháp".</p>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                {!isReadOnly && (
                  <>
                    <Button size="sm" className="h-7 text-xs gap-1.5 cursor-pointer" variant="outline" onClick={handleSaveDraft}>
                      <Save className="w-3.5 h-3.5" /> Lưu nháp
                    </Button>
                    <Button size="sm" className="h-7 text-xs gap-1.5 cursor-pointer text-white" style={{ backgroundColor: PRIMARY }} onClick={() => handleCompleteReceipt(detail)} disabled={loadingAction}>
                      <CheckCircle className="w-3.5 h-3.5" /> {loadingAction ? 'Đang xử lý...' : 'Hoàn tất nhập hàng'}
                    </Button>
                  </>
                )}
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 cursor-pointer" onClick={() => handlePrintReceipt(detail)}>
                  <Printer className="w-3.5 h-3.5" /> In phiếu nhập
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs ml-auto cursor-pointer" onClick={() => setDetail(null)}>
                  Đóng
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
