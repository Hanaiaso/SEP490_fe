import React, { useState, useEffect } from 'react';
import { Input } from '../../components/sales-ui/input';
import { Button } from '../../components/sales-ui/button';
import { Search, Download, RefreshCw, ArrowUpFromLine, ArrowDownToLine, Layers, Eye, FileText, CheckCircle, RotateCcw, Calendar, User, Building } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/sales-ui/dialog';
import { getGoodsIssues } from '../../services/warehouseService';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#F97316';
const ERROR   = '#DC2626';
const INFO    = '#2563EB';

export default function WarehouseMaterialHistory() {
  const [loading, setLoading] = useState(false);
  const [historyItems, setHistoryItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // all, receive, issue, reversal
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedDetail, setSelectedDetail] = useState<any | null>(null);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res: any = await getGoodsIssues('ProductionMaterial');
      
      const mapped = (res || []).map((gi: any) => {
        const isReversal = gi.isReversal || gi.status?.toLowerCase() === 'reversed';
        const typeStr = isReversal ? 'reversal' : 'issue';
        
        return {
          id: gi.code || gi.id,
          realId: gi.id,
          type: typeStr, // issue, receive, reversal
          warehouse: gi.warehouseName || 'Kho chính',
          department: gi.department || gi.note?.replace('Xuất cho: ', '') || 'Xưởng sản xuất',
          recipient: gi.externalRecipientName || gi.issuedByName || 'Chưa ghi nhận',
          paperDoc: gi.paperDocumentNumber || '—',
          user: gi.issuedByName || 'Hệ thống',
          createdAt: gi.createdAt ? new Date(gi.createdAt).toLocaleString('vi-VN') : 'N/A',
          issueDate: gi.issueDate ? new Date(gi.issueDate).toLocaleString('vi-VN') : 'Chưa đăng sổ',
          status: gi.status,
          imageProofUrl: gi.imageProofUrl,
          usagePurpose: gi.usagePurpose || 'Phục vụ sản xuất',
          itemsCount: (gi.items || []).length,
          totalQty: (gi.items || []).reduce((acc: number, curr: any) => acc + (curr.quantity || 0), 0),
          lines: (gi.items || []).map((i: any) => ({
            sku: i.itemSku || '-',
            materialName: i.itemName || 'Nguyên vật liệu',
            unit: i.unit || 'Cái',
            quantity: i.quantity,
            note: i.note
          }))
        };
      });

      setHistoryItems(mapped);
    } catch (err: any) {
      console.error('Lỗi khi tải lịch sử xuất nhập NVL:', err);
    } fontinally: {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const filtered = historyItems.filter(item => {
    const q = search.toLowerCase();
    const matchSearch = !q || 
      item.id.toLowerCase().includes(q) ||
      item.department.toLowerCase().includes(q) ||
      item.recipient.toLowerCase().includes(q) ||
      item.paperDoc.toLowerCase().includes(q) ||
      item.lines.some((l: any) => l.materialName.toLowerCase().includes(q) || l.sku.toLowerCase().includes(q));

    const matchType = typeFilter === 'all' || item.type === typeFilter;
    return matchSearch && matchType;
  });

  const totalTransactions = filtered.length;
  const totalIssueQty = filtered.filter(i => i.type === 'issue').reduce((acc, curr) => acc + curr.totalQty, 0);
  const totalReversalCount = filtered.filter(i => i.type === 'reversal').length;

  const handleExportCSV = () => {
    if (filtered.length === 0) return alert('Không có dữ liệu để xuất Excel!');
    const headers = ['Mã phiếu', 'Loại giao dịch', 'Kho xuất', 'Bộ phận nhận', 'Người nhận', 'Số biên bản', 'Tổng số lượng', 'Ngày tạo'];
    const rows = filtered.map(i => [
      i.id,
      i.type === 'issue' ? 'Xuất kho SX' : i.type === 'receive' ? 'Nhập kho' : 'Reversal hoàn tồn',
      i.warehouse,
      i.department,
      i.recipient,
      i.paperDoc,
      i.totalQty,
      i.createdAt
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `lich_su_nhap_xuat_nvl_${new Date().toISOString().substring(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Top Header */}
      <div className="bg-white border-b border-gray-200 px-5 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-900" />
              Lịch Sử Nhập Xuất & Biến Động Nguyên Vật Liệu
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Theo dõi chi tiết toàn bộ nhật ký giao dịch xuất kho sản xuất & nhập kho nguyên liệu</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={fetchHistory}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Làm mới
            </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 border-blue-200 text-blue-800 hover:bg-blue-50" onClick={handleExportCSV}>
              <Download className="w-3.5 h-3.5" /> Xuất File CSV / Excel
            </Button>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Tổng Giao Dịch</p>
              <p className="text-lg font-bold text-gray-900">{totalTransactions.toLocaleString()} <span className="text-xs font-normal text-gray-500">lượt</span></p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 font-bold">
              <ArrowUpFromLine className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Tổng Số Lượng Xuất SX</p>
              <p className="text-lg font-bold text-amber-900">{totalIssueQty.toLocaleString()} <span className="text-xs font-normal text-gray-500">đơn vị</span></p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center flex-shrink-0 font-bold">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Lượt Reversal (Hoàn tồn)</p>
              <p className="text-lg font-bold text-rose-900">{totalReversalCount.toLocaleString()} <span className="text-xs font-normal text-gray-500">chứng từ</span></p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input 
              className="pl-9 h-8 text-xs bg-gray-50 w-full" 
              placeholder="Tìm theo nguyên liệu, mã phiếu, bộ phận, người nhận, số biên bản..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select 
              className="h-8 text-xs border border-gray-200 rounded-lg px-3 bg-white text-gray-700 font-medium outline-none focus:ring-2 focus:ring-blue-500" 
              value={typeFilter} 
              onChange={e => setTypeFilter(e.target.value)}
            >
              <option value="all">Tất cả loại giao dịch</option>
              <option value="issue">Xuất kho sản xuất</option>
              <option value="receive">Nhập kho nguyên liệu</option>
              <option value="reversal">Reversal (Đảo chứng từ)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="flex-1 overflow-auto bg-gray-50 px-5 pb-5">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200 text-gray-700">
                <th className="text-left px-4 py-3 font-semibold w-32">Mã chứng từ</th>
                <th className="text-center px-4 py-3 font-semibold w-32">Loại giao dịch</th>
                <th className="text-left px-4 py-3 font-semibold">Bộ phận nhận / Đối tác</th>
                <th className="text-left px-4 py-3 font-semibold">Người đại diện nhận</th>
                <th className="text-mono px-4 py-3 text-left font-semibold">Số biên bản giấy</th>
                <th className="text-right px-4 py-3 font-semibold">Tổng số lượng</th>
                <th className="text-center px-4 py-3 font-semibold">Thời gian</th>
                <th className="text-center px-4 py-3 font-semibold w-24">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Đang tải nhật ký lịch sử nhập xuất...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    Không tìm thấy lịch sử giao dịch nào khớp với điều kiện lọc.
                  </td>
                </tr>
              ) : (
                filtered.map((item, idx) => (
                  <tr key={item.id} className={`hover:bg-blue-50/40 transition-colors ${idx % 2 === 1 ? 'bg-slate-50/50' : ''}`}>
                    <td className="px-4 py-3 font-bold" style={{ color: PRIMARY }}>{item.id}</td>
                    <td className="px-4 py-3 text-center">
                      {item.type === 'issue' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                          <ArrowUpFromLine className="w-3 h-3" /> Xuất kho SX
                        </span>
                      )}
                      {item.type === 'receive' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <ArrowDownToLine className="w-3 h-3" /> Nhập kho
                        </span>
                      )}
                      {item.type === 'reversal' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200">
                          <RotateCcw className="w-3 h-3" /> Reversal
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.department}</td>
                    <td className="px-4 py-3 text-gray-700">{item.recipient}</td>
                    <td className="px-4 py-3 font-mono text-gray-600">{item.paperDoc}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-900">{item.totalQty.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-gray-500">{item.createdAt}</td>
                    <td className="px-4 py-3 text-center">
                      <Button size="sm" variant="outline" className="h-7 text-xs border-gray-300 text-gray-700 hover:bg-blue-50" onClick={() => setSelectedDetail(item)}>
                        <Eye className="w-3.5 h-3.5" /> Xem
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Modal */}
      {selectedDetail && (
        <Dialog open={!!selectedDetail} onOpenChange={() => setSelectedDetail(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className="text-sm font-bold flex items-center justify-between border-b pb-3">
                <span>Chi tiết nhật ký xuất nhập — {selectedDetail.id}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  selectedDetail.type === 'issue' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                }`}>
                  {selectedDetail.type === 'issue' ? 'Xuất kho sản xuất' : 'Reversal đảo chứng từ'}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div><span className="text-gray-500">Mã phiếu:</span> <span className="font-bold text-gray-900">{selectedDetail.id}</span></div>
                <div><span className="text-gray-500">Kho xuất:</span> <span className="font-semibold text-gray-800">{selectedDetail.warehouse}</span></div>
                <div><span className="text-gray-500">Bộ phận nhận:</span> <span className="font-semibold text-gray-800">{selectedDetail.department}</span></div>
                <div><span className="text-gray-500">Người đại diện:</span> <span className="font-semibold text-gray-800">{selectedDetail.recipient}</span></div>
                <div><span className="text-gray-500">Số biên bản giấy:</span> <span className="font-mono font-bold text-blue-700">{selectedDetail.paperDoc}</span></div>
                <div><span className="text-gray-500">Thời điểm tạo:</span> <span>{selectedDetail.createdAt}</span></div>
                <div className="col-span-2"><span className="text-gray-500">Mục đích sử dụng:</span> <span className="text-gray-800 italic">{selectedDetail.usagePurpose}</span></div>
              </div>

              <div>
                <p className="font-bold text-gray-800 text-xs mb-2">Danh Sách Mặt Hàng Chi Tiết</p>
                <table className="w-full border border-gray-200 rounded overflow-hidden">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-200 text-gray-700">
                      <th className="px-3 py-2 text-left">SKU</th>
                      <th className="px-3 py-2 text-left">Tên nguyên liệu / sản phẩm</th>
                      <th className="px-3 py-2 text-center">ĐVT</th>
                      <th className="px-3 py-2 text-right">Số lượng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedDetail.lines.map((line: any, idx: number) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono text-gray-500">{line.sku}</td>
                        <td className="px-3 py-2 font-medium text-gray-900">{line.materialName}</td>
                        <td className="px-3 py-2 text-center text-gray-600">{line.unit}</td>
                        <td className="px-3 py-2 text-right font-bold text-blue-900">{line.quantity.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedDetail.imageProofUrl && (
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span>Đã đính kèm ảnh biên bản giấy có chữ ký</span>
                  </div>
                  <a href={selectedDetail.imageProofUrl} target="_blank" rel="noreferrer" className="px-3 py-1 bg-emerald-700 text-white font-bold rounded text-xs hover:bg-emerald-800">
                    Xem ảnh chứng từ
                  </a>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedDetail(null)}>Đóng</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
