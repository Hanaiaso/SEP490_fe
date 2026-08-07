import React, { useState, useEffect } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Search, Eye, RefreshCw, Download, Upload, Send, Save, CheckCircle, Camera, FileText, Plus, AlertTriangle, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/sales-ui/dialog';
import { getGoodsIssues, postGoodsIssue, uploadGoodsIssueProof, updateGoodsIssueHandover, createGoodsIssueReversal } from '../../services/warehouseService';
import WarehouseProductionIssueFormModal from './WarehouseProductionIssueFormModal';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#D97706';
const ERROR   = '#DC2626';
const INFO    = '#2563EB';
const NEUTRAL = '#64748B';

const STATUS_CFG: Record<string, { label: string; bg: string }> = {
  draft:         { label: 'Nháp',               bg: NEUTRAL },
  proofpending:  { label: 'Chờ upload chứng từ', bg: WARNING },
  proofuploaded: { label: 'Chờ đăng sổ',        bg: INFO    },
  posted:        { label: 'Đã đăng sổ',          bg: SUCCESS },
  reversed:      { label: 'Đã đảo chứng từ',    bg: ERROR   },
  cancelled:     { label: 'Đã hủy',             bg: ERROR   },
};

function Badge({ status }: { status: string }) {
  const normalizedStatus = status?.toLowerCase() || 'draft';
  const c = STATUS_CFG[normalizedStatus] || { label: normalizedStatus, bg: NEUTRAL };
  return <span className="text-[10px] font-semibold text-white px-2 py-0.5 inline-block whitespace-nowrap" style={{ backgroundColor: c.bg, borderRadius: 4 }}>{c.label}</span>;
}

export default function WarehouseProductionIssue() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Handover Info Form State inside Detail
  const [handoverRecipient, setHandoverRecipient] = useState('');
  const [handoverDepartment, setHandoverDepartment] = useState('');
  const [handoverPaperDoc, setHandoverPaperDoc] = useState('');
  const [handoverPurpose, setHandoverPurpose] = useState('');
  const [handoverReceivedAt, setHandoverReceivedAt] = useState('');
  const [savingHandover, setSavingHandover] = useState(false);

  // Reversal State
  const [showReversalModal, setShowReversalModal] = useState(false);
  const [reversalReason, setReversalReason] = useState('');
  const [submittingReversal, setSubmittingReversal] = useState(false);

  const loadData = () => {
    getGoodsIssues('ProductionMaterial')
      .then(res => {
        const mapped = res.map((r: any) => ({
          ...r,
          realId: r.id,
          id: r.code || r.id,
          warehouse: r.warehouseName,
          factory: r.department || r.note?.replace('Xuất cho: ', '') || 'Xưởng sản xuất',
          receiver: r.externalRecipientName || r.issuedByName || 'Chưa ghi nhận',
          paperDoc: r.paperDocumentNumber || 'Chưa nhập',
          receivedAtFormatted: r.receivedAt ? new Date(r.receivedAt).toLocaleString('vi-VN') : 'Chưa ghi nhận',
          issueDate: r.issueDate ? new Date(r.issueDate).toLocaleString('vi-VN') : new Date(r.createdAt).toLocaleString('vi-VN'),
          hasProof: !!r.imageProofUrl,
          lines: (r.items || []).map((i: any) => ({
            sku: i.itemSku || '-',
            materialName: i.itemName || 'N/A',
            unit: i.unit || 'Cái',
            issuedQty: i.quantity,
            note: i.note
          }))
        }));
        setItems(mapped);
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadData();
  }, []);

  const openDetailModal = (item: any) => {
    setDetail(item);
    setHandoverRecipient(item.externalRecipientName || '');
    setHandoverDepartment(item.department || item.factory || '');
    setHandoverPaperDoc(item.paperDocumentNumber || '');
    setHandoverPurpose(item.usagePurpose || '');
    setHandoverReceivedAt(item.receivedAt ? item.receivedAt.substring(0, 16) : new Date().toISOString().substring(0, 16));
  };

  const filtered = items.filter(d => {
    const q = search.toLowerCase();
    const ms = !q || d.id.toLowerCase().includes(q) || d.factory.toLowerCase().includes(q) || d.receiver.toLowerCase().includes(q) || d.paperDoc.toLowerCase().includes(q);
    const mw = warehouseFilter === 'all' || d.warehouse === warehouseFilter;
    return ms && (statusFilter === 'all' || d.status?.toLowerCase() === statusFilter) && mw;
  });

  const toggleSelect = (id: string) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAll = () => setSelected(p => p.length === filtered.length ? [] : filtered.map(d => d.id));

  const handleSaveHandover = async () => {
    if (!detail) return;
    try {
      setSavingHandover(true);
      await updateGoodsIssueHandover(detail.realId, {
        externalRecipientName: handoverRecipient,
        department: handoverDepartment,
        paperDocumentNumber: handoverPaperDoc,
        usagePurpose: handoverPurpose,
        receivedAt: handoverReceivedAt ? new Date(handoverReceivedAt).toISOString() : new Date().toISOString()
      });
      alert('Cập nhật thông tin bàn giao thành công!');
      loadData();
      setDetail(null);
    } catch (err: any) {
      alert('Lỗi: ' + err.message);
    } finally {
      setSavingHandover(false);
    }
  };

  const postGoods = async (realId: string) => {
    try {
      await postGoodsIssue(realId);
      alert('Đăng sổ xuất kho thành công! Tồn kho đã được trừ.');
      loadData();
      setDetail(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const uploadProof = async (realId: string) => {
    try {
      if (!fileToUpload) return alert('Vui lòng chọn ảnh biên bản giấy đã có chữ ký!');
      setUploading(true);
      await uploadGoodsIssueProof(realId, fileToUpload);
      alert('Upload ảnh biên bản thành công!');
      setShowUpload(false);
      setFileToUpload(null);
      loadData();
    } catch (err: any) { 
      alert(err.message); 
    } finally {
      setUploading(false);
    }
  };

  const handleCreateReversal = async () => {
    if (!reversalReason) return alert('Vui lòng nhập lý do tạo chứng từ Reversal đảo tồn kho!');
    try {
      setSubmittingReversal(true);
      await createGoodsIssueReversal(detail.realId, { reversalReason });
      alert('Tạo phiếu Reversal thành công! Tồn kho nguyên liệu đã được hoàn lại đầy đủ.');
      setShowReversalModal(false);
      setReversalReason('');
      setDetail(null);
      loadData();
    } catch (err: any) {
      alert('Lỗi Reversal: ' + err.message);
    } finally {
      setSubmittingReversal(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] mb-0.5"><span className="text-gray-400">Kho hàng</span><span className="text-gray-300">/</span><span className="text-gray-400">Sản xuất (Production)</span><span className="text-gray-300">/</span><span className="text-gray-800 font-semibold">Xuất NVL Sản Xuất</span></div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Xuất Nguyên Liệu Cho Sản Xuất Ngoài Hệ Thống</h2>
            <p className="text-xs text-gray-500 mt-0.5">{items.length} lệnh · {items.filter(i => i.status?.toLowerCase() === 'proofpending').length} chờ chứng từ · {items.filter(i => i.status?.toLowerCase() === 'proofuploaded').length} chờ đăng sổ</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={loadData}><RefreshCw className="w-3.5 h-3.5" /> Làm mới</Button>
            <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: PRIMARY }} onClick={() => setShowCreateModal(true)}><Plus className="w-3.5 h-3.5" /> Tạo lệnh xuất NVL</Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input className="pl-8 h-7 text-xs bg-gray-50" placeholder="Mã lệnh, số biên bản, xưởng..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-auto bg-gray-50 px-5 pb-5">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5"><input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Mã phiếu xuất</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Kho xuất</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Bộ phận sản xuất</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Người nhận (Đại diện)</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Số biên bản giấy</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Ảnh biên bản</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Trạng thái</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-500">
                    Không có phiếu xuất nguyên vật liệu nào.
                  </td>
                </tr>
              )}
              {filtered.map((d, i) => (
                <tr key={d.id} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-3 py-2.5"><input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggleSelect(d.id)} /></td>
                  <td className="px-3 py-2.5 font-bold" style={{ color: PRIMARY }}>{d.id}</td>
                  <td className="px-3 py-2.5 text-gray-700">{d.warehouse}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-800">{d.factory}</td>
                  <td className="px-3 py-2.5 text-gray-700">{d.receiver}</td>
                  <td className="px-3 py-2.5 font-mono text-gray-600">{d.paperDoc}</td>
                  <td className="px-3 py-2.5 text-center">
                    {d.hasProof
                      ? <a href={d.imageProofUrl} target="_blank" rel="noreferrer" className="text-[10px] font-semibold text-white px-2 py-0.5 rounded bg-emerald-600 hover:underline">Xem ảnh</a>
                      : <span className="text-[10px] text-rose-500 font-medium">Chưa có ảnh</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center"><Badge status={d.status} /></td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1 rounded hover:bg-blue-50 text-gray-500 hover:text-blue-600" onClick={() => openDetailModal(d)} title="Xem chi tiết & Bàn giao"><Eye className="w-4 h-4" /></button>
                      
                      {d.status?.toLowerCase() !== 'posted' && d.status?.toLowerCase() !== 'reversed' && (
                        <button className="p-1 rounded hover:bg-orange-50 text-gray-500 hover:text-orange-600" onClick={() => { setDetail(d); setShowUpload(true); }} title="Upload ảnh biên bản"><Upload className="w-4 h-4" /></button>
                      )}

                      {d.hasProof && d.status?.toLowerCase() !== 'posted' && d.status?.toLowerCase() !== 'reversed' && (
                        <button className="p-1 rounded hover:bg-green-50 text-gray-500 hover:text-green-600" onClick={() => postGoods(d.realId)} title="Đăng sổ ngay"><Send className="w-4 h-4" /></button>
                      )}

                      {d.status?.toLowerCase() === 'posted' && (
                        <button className="p-1 rounded hover:bg-red-50 text-gray-500 hover:text-red-600" onClick={() => { setDetail(d); setShowReversalModal(true); }} title="Tạo phiếu Reversal đảo chứng từ"><RotateCcw className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail & Handover Dialog */}
      <Dialog open={!!detail && !showUpload && !showReversalModal} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center justify-between">
              <span>Chi tiết lệnh xuất NVL — {detail?.id}</span>
              <Badge status={detail?.status} />
            </DialogTitle>
          </DialogHeader>

          {detail && (
            <div className="space-y-4 text-xs">
              {/* Mandatory Handover 5-Fields Form */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wide flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Bàn giao chứng từ giấy & Thông tin người nhận
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Tên người nhận (Ngoài hệ thống) *</label>
                    <Input 
                      value={handoverRecipient} 
                      onChange={(e: any) => setHandoverRecipient(e.target.value)} 
                      placeholder="Nhập họ tên đại diện xưởng sản xuất..."
                      className="h-8 text-xs"
                      disabled={detail.status?.toLowerCase() === 'posted' || detail.status?.toLowerCase() === 'reversed'}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Bộ phận sản xuất nhận *</label>
                    <Input 
                      value={handoverDepartment} 
                      onChange={(e: any) => setHandoverDepartment(e.target.value)} 
                      placeholder="Xưởng may A, Tổ PE..."
                      className="h-8 text-xs"
                      disabled={detail.status?.toLowerCase() === 'posted' || detail.status?.toLowerCase() === 'reversed'}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Số biên bản giấy (Duy nhất) *</label>
                    <Input 
                      value={handoverPaperDoc} 
                      onChange={(e: any) => setHandoverPaperDoc(e.target.value)} 
                      placeholder="BBBG-2026-XXXX..."
                      className="h-8 text-xs font-mono uppercase font-bold text-blue-900"
                      disabled={detail.status?.toLowerCase() === 'posted' || detail.status?.toLowerCase() === 'reversed'}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Thời điểm thực tế nhận *</label>
                    <Input 
                      type="datetime-local" 
                      value={handoverReceivedAt} 
                      onChange={(e: any) => setHandoverReceivedAt(e.target.value)} 
                      className="h-8 text-xs"
                      disabled={detail.status?.toLowerCase() === 'posted' || detail.status?.toLowerCase() === 'reversed'}
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">Mục đích sử dụng *</label>
                    <Input 
                      value={handoverPurpose} 
                      onChange={(e: any) => setHandoverPurpose(e.target.value)} 
                      placeholder="Nhập mục đích xuất..."
                      className="h-8 text-xs"
                      disabled={detail.status?.toLowerCase() === 'posted' || detail.status?.toLowerCase() === 'reversed'}
                    />
                  </div>
                </div>

                {detail.status?.toLowerCase() !== 'posted' && detail.status?.toLowerCase() !== 'reversed' && (
                  <div className="flex justify-end">
                    <Button size="sm" onClick={handleSaveHandover} disabled={savingHandover} className="h-7 text-xs bg-blue-700 hover:bg-blue-800">
                      {savingHandover ? 'Đang lưu...' : 'Lưu Thông Tin Bàn Giao'}
                    </Button>
                  </div>
                )}
              </div>

              {/* Items Table */}
              <div>
                <p className="font-bold text-gray-700 text-xs mb-2 uppercase tracking-wide">Danh Sách Nguyên Liệu Xuất</p>
                <table className="w-full border border-gray-200 rounded overflow-hidden">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-3 py-2 text-gray-700 font-semibold">SKU</th>
                      <th className="text-left px-3 py-2 text-gray-700 font-semibold">Mặt hàng / Nguyên liệu</th>
                      <th className="text-center px-3 py-2 text-gray-700 font-semibold">ĐVT</th>
                      <th className="text-center px-3 py-2 text-gray-700 font-semibold">SL xuất</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {detail.lines.map((line: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-gray-500">{line.sku}</td>
                        <td className="px-3 py-2 text-gray-800 font-medium">{line.materialName}</td>
                        <td className="px-3 py-2 text-center text-gray-600">{line.unit}</td>
                        <td className="px-3 py-2 text-center font-bold text-blue-600">{line.issuedQty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Proof Image View */}
              {detail.hasProof && (
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-bold text-emerald-900 text-xs">Đã có ảnh biên bản giấy ký nhận</p>
                      <p className="text-[11px] text-emerald-700">Đã hợp lệ bằng chứng theo quy tắc A1</p>
                    </div>
                  </div>
                  <a href={detail.imageProofUrl} target="_blank" rel="noreferrer" className="px-3 py-1 bg-emerald-700 text-white font-semibold rounded text-xs hover:bg-emerald-800">
                    Mở ảnh biên bản
                  </a>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t border-gray-100 items-center">
                {detail.status?.toLowerCase() !== 'posted' && detail.status?.toLowerCase() !== 'reversed' && (
                  <>
                    <Button size="sm" className="h-8 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700" onClick={() => setShowUpload(true)}>
                      <Camera className="w-4 h-4" /> Upload Ảnh Biên Bản
                    </Button>
                    <Button size="sm" className="h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => postGoods(detail.realId)}>
                      <Send className="w-4 h-4" /> Post Đăng Sổ Xuất Kho
                    </Button>
                  </>
                )}

                {detail.status?.toLowerCase() === 'posted' && (
                  <Button size="sm" className="h-8 text-xs gap-1.5 bg-rose-600 hover:bg-rose-700" onClick={() => setShowReversalModal(true)}>
                    <RotateCcw className="w-4 h-4" /> Tạo Chứng Từ Reversal (Sửa Sai / Đảo Tồn)
                  </Button>
                )}

                <Button variant="outline" size="sm" className="h-8 text-xs ml-auto" onClick={() => setDetail(null)}>Đóng</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Proof Dialog */}
      <Dialog open={showUpload} onOpenChange={() => setShowUpload(false)}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Camera className="w-4 h-4 text-blue-600" /> Upload Ảnh Biên Bản Giấy Đã Có Chữ Ký
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-xs">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors relative bg-gray-50">
              <input type="file" accept="image/*" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={e => setFileToUpload(e.target.files?.[0] || null)} />
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="font-semibold text-gray-700">{fileToUpload ? fileToUpload.name : 'Nhấp để chọn ảnh biên bản giấy đã ký'}</p>
              <p className="text-gray-400 text-[11px] mt-1">Dung lượng tối đa 10MB (JPG, PNG)</p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowUpload(false)}>Hủy</Button>
              <Button size="sm" className="bg-blue-900 text-white font-bold" onClick={() => uploadProof(detail.realId)} disabled={uploading || !fileToUpload}>
                {uploading ? 'Đang upload...' : 'Upload Chứng Từ'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reversal Dialog */}
      <Dialog open={showReversalModal} onOpenChange={() => setShowReversalModal(false)}>
        <DialogContent className="max-w-md" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2 text-rose-700">
              <AlertTriangle className="w-5 h-5 text-rose-600" /> Tạo Chứng Từ Reversal (Đảo Tồn Kho)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
              <strong>Lưu ý quan trọng (BR-021):</strong> Chứng từ xuất kho đã Post không thể xóa hay sửa trực tiếp. Thao tác này sẽ tự động sinh một phiếu <strong>Reversal đối ứng</strong> để cộng trả lại toàn bộ tồn kho nguyên liệu.
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Lý do đảo chứng từ *</label>
              <textarea 
                className="w-full border border-gray-300 rounded-md p-2 text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                rows={3}
                placeholder="Nhập lý do xuất sai số lượng, xuất nhầm mã nguyên liệu..."
                value={reversalReason}
                onChange={e => setReversalReason(e.target.value)}
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowReversalModal(false)}>Hủy bỏ</Button>
              <Button size="sm" className="bg-rose-600 hover:bg-rose-700 text-white font-bold" onClick={handleCreateReversal} disabled={submittingReversal}>
                {submittingReversal ? 'Đang tạo Reversal...' : 'Xác Nhận Đảo Chứng Từ'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Issue Modal */}
      {showCreateModal && (
        <WarehouseProductionIssueFormModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); loadData(); }}
        />
      )}
    </div>
  );
}
