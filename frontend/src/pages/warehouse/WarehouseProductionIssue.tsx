import { useState, useEffect } from 'react';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Search, Eye, RefreshCw, Download, Upload, Send, Save, CheckCircle, Camera, FileText, Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/sales-ui/dialog';
import { getGoodsIssues, postGoodsIssue, uploadGoodsIssueProof } from '../../services/warehouseService';
import WarehouseProductionIssueFormModal from './WarehouseProductionIssueFormModal';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#D97706';
const ERROR   = '#DC2626';
const INFO    = '#2563EB';
const NEUTRAL = '#64748B';

const STATUS_CFG: Record<string, { label: string; bg: string }> = {
  draft:         { label: 'Nháp',               bg: NEUTRAL },
  proof_pending: { label: 'Chờ upload chứng từ', bg: WARNING },
  proof_uploaded:{ label: 'Chờ đăng sổ',        bg: INFO    },
  posted:        { label: 'Đã đăng sổ',          bg: SUCCESS },
  cancelled:     { label: 'Đã hủy',             bg: ERROR   },
};



// We use any for real data mapping now
function Badge({ status }: { status: string }) {
  const normalizedStatus = status?.toLowerCase() || 'draft';
  const c = STATUS_CFG[normalizedStatus] || { label: normalizedStatus, bg: NEUTRAL };
  return <span className="text-[10px] font-semibold text-white px-2 py-0.5 inline-block whitespace-nowrap" style={{ backgroundColor: c.bg, borderRadius: 4 }}>{c.label}</span>;
}

export default function WarehouseProductionIssue() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = () => {
    getGoodsIssues('ProductionMaterial')
      .then(res => {
        // Map DTO to match frontend expected format loosely
        const mapped = res.map((r: any) => ({
          ...r,
          id: r.code || r.id, // Display code as ID
          productionRequest: r.referenceId || 'N/A',
          warehouse: r.warehouseName,
          factory: r.note?.replace('Xuất cho: ', '') || 'N/A',
          receiver: r.issuedByName || 'N/A',
          issueDate: r.issueDate ? new Date(r.issueDate).toLocaleString('vi-VN') : (new Date(r.createdAt).toLocaleString('vi-VN')),
          hasProof: !!r.imageProofUrl,
          lines: (r.items || []).map((i: any) => ({
            sku: i.productSku,
            materialName: i.productName,
            unit: i.unit,
            requestedQty: i.quantity,
            issuedQty: i.quantity,
            warehouseLocation: 'Normal', // N/A
            batch: 'N/A',
            lot: 'N/A'
          })),
          timeline: [] // Could be populated from DB
        }));
        setItems(mapped);
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = items.filter(d => {
    const q = search.toLowerCase();
    const ms = !q || d.id.toLowerCase().includes(q) || d.productionRequest.toLowerCase().includes(q) || d.factory.toLowerCase().includes(q);
    const mw = warehouseFilter === 'all' || d.warehouse === warehouseFilter;
    return ms && (statusFilter === 'all' || d.status === statusFilter) && mw;
  });

  const toggleSelect = (id: string) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAll = () => setSelected(p => p.length === filtered.length ? [] : filtered.map(d => d.id));

  const postGoods = async (id: string, realId: string) => {
    try {
      await postGoodsIssue(realId);
      alert('Đăng sổ thành công!');
      loadData();
      setDetail(null);
    } catch (err: any) { alert(err.message); }
  };

  const uploadProof = async (realId: string) => {
    try {
      if (!fileToUpload) return alert('Vui lòng upload chứng từ!');
      setUploading(true);
      await uploadGoodsIssueProof(realId, fileToUpload);
      alert('Upload chứng từ thành công!');
      setUploaded(true);
      loadData();
    } catch (err: any) { 
      alert(err.message); 
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileToUpload(file);
      setUploaded(true);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] mb-0.5"><span className="text-gray-400">Kho hàng</span><span className="text-gray-300">/</span><span className="text-gray-400">Sản xuất (Production)</span><span className="text-gray-300">/</span><span className="text-gray-800 font-semibold">Xuất NVL sản xuất</span></div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Xuất nguyên liệu sản xuất (Production Material Issue)</h2>
            <p className="text-xs text-gray-500 mt-0.5">{items.length} lệnh · {items.filter(i => i.status === 'proof_pending').length} chờ chứng từ · {items.filter(i => i.status === 'proof_uploaded').length} chờ đăng sổ</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={loadData}><RefreshCw className="w-3 h-3" /> Làm mới</Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"><Download className="w-3 h-3" /> Xuất Excel</Button>
            <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: PRIMARY }} onClick={() => setShowCreateModal(true)}><Plus className="w-3 h-3" /> Tạo lệnh xuất</Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input className="pl-8 h-7 text-xs bg-gray-50" placeholder="Mã lệnh, mã yêu cầu, xưởng..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)}>
            <option value="all">Tất cả kho</option>
            <option>Kho Hà Nội</option>
            <option>Kho HCM</option>
            <option>Kho Đà Nẵng</option>
          </select>
          <input type="date" className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <input type="date" className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        {selected.length > 0 && (
          <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded px-3 py-2 mb-2 flex items-center gap-2 text-xs text-blue-700">
            <span className="font-medium">{selected.length} đã chọn</span>
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100 whitespace-nowrap">Upload chứng từ</button>
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100 whitespace-nowrap">Đăng sổ</button>
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100 whitespace-nowrap">Xuất Excel</button>
            <button className="h-6 px-2.5 text-[10px] font-medium rounded border border-blue-300 text-blue-700 hover:bg-blue-100 whitespace-nowrap" onClick={() => setSelected([])}>Hủy chọn</button>
          </div>
        )}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5"><input type="checkbox" checked={selected.length === filtered.length && filtered.length > 0} onChange={toggleAll} /></th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Mã lệnh xuất</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Yêu cầu SX</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Kho</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Nhà máy / Xưởng</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Người nhận</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Ngày xuất</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Chứng từ</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Trạng thái</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={12} className="py-12 text-center"><div className="flex flex-col items-center gap-2"><div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><span className="text-gray-400 text-xl">📋</span></div><p className="text-sm font-medium text-gray-500">Không có dữ liệu</p><p className="text-xs text-gray-400">Thay đổi bộ lọc để xem kết quả khác</p></div></td></tr>
              )}
              {filtered.map((d, i) => (
                <tr key={d.id} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''}`}>
                  <td className="px-3 py-2.5"><input type="checkbox" checked={selected.includes(d.id)} onChange={() => toggleSelect(d.id)} /></td>
                  <td className="px-3 py-2.5 font-semibold" style={{ color: PRIMARY }}>{d.id}</td>
                  <td className="px-3 py-2.5 text-gray-600">{d.productionRequest}</td>
                  <td className="px-3 py-2.5 text-gray-700">{d.warehouse}</td>
                  <td className="px-3 py-2.5 text-gray-700">{d.factory}</td>
                  <td className="px-3 py-2.5 text-gray-700">{d.receiver}</td>
                  <td className="px-3 py-2.5 text-gray-500">{d.issueDate}</td>
                  <td className="px-3 py-2.5 text-center">
                    {d.hasProof
                      ? <span className="text-[10px] font-medium text-white px-1.5 py-0.5" style={{ backgroundColor: SUCCESS, borderRadius: 4 }}>Có chứng từ</span>
                      : <span className="text-[10px] text-gray-400">Chưa có</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center"><Badge status={d.status} /></td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" onClick={() => { setDetail(d); setUploaded(false); }}><Eye className="w-3.5 h-3.5" /></button>
                      {d.status?.toLowerCase() === 'proofpending' && (
                        <button className="p-1 rounded hover:bg-orange-50 text-gray-400 hover:text-orange-600" onClick={() => { setDetail(d); setShowUpload(true); setUploaded(false); }} title="Upload chứng từ"><Upload className="w-3.5 h-3.5" /></button>
                      )}
                      {d.status?.toLowerCase() === 'proofuploaded' && (
                        <button className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600" onClick={() => postGoods(d.id, d.id)} title="Đăng sổ"><Send className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <span className="text-xs text-gray-500">Hiển thị {filtered.length} / {items.length} bản ghi</span>
            <button className="w-6 h-6 text-xs rounded font-medium text-white flex items-center justify-center" style={{ backgroundColor: PRIMARY }}>1</button>
          </div>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detail && !showUpload} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Chi tiết xuất nguyên liệu — {detail?.id}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded p-3 space-y-1.5">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Thông tin lệnh</p>
                  <div className="flex justify-between"><span className="text-gray-500">Mã lệnh:</span><span className="font-semibold" style={{ color: PRIMARY }}>{detail.id}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Yêu cầu SX:</span><span>{detail.productionRequest}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Kho:</span><span>{detail.warehouse}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Trạng thái:</span><Badge status={detail.status} /></div>
                </div>
                <div className="bg-gray-50 rounded p-3 space-y-1.5">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Nhà máy</p>
                  <div className="flex justify-between"><span className="text-gray-500">Xưởng:</span><span className="font-medium text-gray-800">{detail.factory}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Chuyền:</span><span>{detail.productionLine}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Người nhận:</span><span className="font-medium">{detail.receiver}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Ngày xuất:</span><span>{detail.issueDate}</span></div>
                </div>
                <div className="bg-gray-50 rounded p-3 space-y-1.5">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Chứng từ</p>
                  <div className="flex justify-between"><span className="text-gray-500">Trạng thái:</span>{detail.hasProof ? <span className="font-medium" style={{ color: SUCCESS }}>Đã có</span> : <span className="font-medium" style={{ color: WARNING }}>Chưa có</span>}</div>
                  {!detail.hasProof && <p className="text-gray-500 text-[10px]">Cần upload phiếu ký nhận từ xưởng trước khi đăng sổ</p>}
                </div>
              </div>

              {detail.lines.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-600 text-[10px] uppercase tracking-wide mb-2">Danh sách nguyên liệu</p>
                  <table className="w-full border border-gray-200 rounded overflow-hidden">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-3 py-2 text-gray-700 font-semibold">SKU</th>
                        <th className="text-left px-3 py-2 text-gray-700 font-semibold">Nguyên liệu</th>
                        <th className="text-center px-3 py-2 text-gray-700 font-semibold">ĐVT</th>
                        <th className="text-center px-3 py-2 text-gray-700 font-semibold">SL yêu cầu</th>
                        <th className="text-center px-3 py-2 text-gray-700 font-semibold">SL xuất</th>
                        <th className="text-left px-3 py-2 text-gray-700 font-semibold">Vị trí kho</th>
                        <th className="text-left px-3 py-2 text-gray-700 font-semibold">Batch/Lot</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {detail.lines.map(line => (
                        <tr key={line.sku} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-gray-500">{line.sku}</td>
                          <td className="px-3 py-2 text-gray-800">{line.materialName}</td>
                          <td className="px-3 py-2 text-center text-gray-600">{line.unit}</td>
                          <td className="px-3 py-2 text-center font-semibold">{line.requestedQty}</td>
                          <td className="px-3 py-2 text-center font-semibold" style={{ color: PRIMARY }}>{line.issuedQty}</td>
                          <td className="px-3 py-2 font-mono text-gray-600">{line.warehouseLocation}</td>
                          <td className="px-3 py-2 text-gray-600">{line.batch} / {line.lot}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {detail.timeline.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-600 text-[10px] uppercase tracking-wide mb-2">Lịch sử</p>
                  <div className="space-y-2">
                    {detail.timeline.map((t, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: PRIMARY }} />
                        <div><span className="text-gray-500">{t.time}</span><span className="mx-1.5 text-gray-400">·</span><span className="font-medium text-gray-800">{t.event}</span><span className="mx-1.5 text-gray-400">·</span><span className="text-gray-500">{t.user}</span></div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"><Save className="w-3.5 h-3.5" /> Lưu nháp</Button>
                {detail.status?.toLowerCase() === 'proofpending' && (
                  <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: WARNING }} onClick={() => setShowUpload(true)}><Upload className="w-3.5 h-3.5" /> Upload chứng từ</Button>
                )}
                {detail.status?.toLowerCase() === 'proofuploaded' && (
                  <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: PRIMARY }} onClick={() => postGoods(detail.id, detail.id)}><Send className="w-3.5 h-3.5" /> Đăng sổ hàng xuất</Button>
                )}
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"><FileText className="w-3.5 h-3.5" /> In phiếu xuất</Button>
                <Button variant="outline" size="sm" className="h-7 text-xs ml-auto" onClick={() => setDetail(null)}>Đóng</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Upload Proof Dialog */}
      <Dialog open={showUpload} onOpenChange={() => { setShowUpload(false); setUploaded(false); setUploading(false); }}>
        <DialogContent className="max-w-lg" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2"><Upload className="w-4 h-4" style={{ color: PRIMARY }} /> Upload chứng từ ký nhận</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-xs">
            {!uploaded ? (
              <>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer relative"
                >
                  <input type="file" accept="image/*,.pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} />
                  {uploading ? (
                    <>
                      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-gray-600">Đang tải lên...</p>
                    </>
                  ) : (
                    <>
                      <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="font-medium text-gray-700 mb-1">Upload ảnh phiếu ký nhận</p>
                      <p className="text-gray-500 mb-2">Hỗ trợ: JPG, PNG, PDF</p>
                      <Button variant="outline" size="sm" className="h-7 text-xs">Chọn file</Button>
                    </>
                  )}
                </div>
                <div className="p-2 bg-amber-50 border border-amber-200 rounded text-amber-800 text-[11px]">
                  <strong>Bắt buộc:</strong> Phải có chữ ký của người nhận nguyên liệu tại xưởng trước khi đăng sổ.
                </div>
              </>
            ) : (
              <div className="p-4 bg-green-50 border border-green-200 rounded text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="font-medium text-green-700">Upload chứng từ thành công!</p>
                <p className="text-green-600 text-[11px] mt-1">Lệnh xuất đã sẵn sàng để đăng sổ</p>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              {fileToUpload && !uploaded && (
                <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: PRIMARY }} onClick={() => uploadProof(detail.id)}>
                  <Upload className="w-3.5 h-3.5" /> Tải lên
                </Button>
              )}
              {uploaded && detail && (
                <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: PRIMARY }} onClick={() => { postGoods(detail.id, detail.id); setShowUpload(false); }}>
                  <Send className="w-3.5 h-3.5" /> Đăng sổ ngay
                </Button>
              )}
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setShowUpload(false); setUploaded(false); }}>Đóng</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showCreateModal && (
        <WarehouseProductionIssueFormModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => { setShowCreateModal(false); loadData(); }}
        />
      )}
    </div>
  );
}
