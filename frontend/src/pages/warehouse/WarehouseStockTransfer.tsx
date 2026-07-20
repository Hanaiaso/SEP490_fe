import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../../components/sales-ui/button';
import { Input } from '../../components/sales-ui/input';
import { Search, Eye, RefreshCw, Download, Plus, Truck, CheckCircle, X, ArrowRight, UploadCloud } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/sales-ui/dialog';

const PRIMARY = '#1F3B64';
const SUCCESS = '#16A34A';
const WARNING = '#D97706';
const ERROR   = '#DC2626';
const INFO    = '#2563EB';
const NEUTRAL = '#64748B';
const PURPLE  = '#7C3AED';

// Tabs: Create Transfer, Dispatch, Receive, Completed
type Tab = 'create' | 'dispatch' | 'receive' | 'completed';

const STATUS_TRANSFER: Record<string, { label: string; bg: string }> = {
  Draft:      { label: 'Nháp',          bg: NEUTRAL },
  Dispatched: { label: 'Đang vận chuyển', bg: PURPLE },
  Received:   { label: 'Đã nhận hàng',    bg: SUCCESS },
  Cancelled:  { label: 'Đã hủy',        bg: ERROR   },
};

interface TransferItem { 
  id?: string; 
  productId: string; 
  productName: string; 
  quantity: number; 
  receivedQuantity?: number;
}

interface Transfer {
  id: string; 
  code: string; 
  sourceWarehouseId: string;
  sourceWarehouseName: string; 
  destinationWarehouseId: string;
  destinationWarehouseName: string; 
  createdByUserName: string;
  createdAt: string; 
  expectedDispatchDate?: string;
  expectedReceiveDate?: string;
  dispatchedAt?: string;
  receivedAt?: string;
  status: string;
  note: string;
  receiveNote?: string;
  proofImageUrl?: string;
  items: TransferItem[];
}

function Badge({ status }: { status: string }) {
  const c = STATUS_TRANSFER[status] || { label: status, bg: NEUTRAL };
  return <span className="text-[10px] font-semibold text-white px-2 py-0.5 inline-block whitespace-nowrap" style={{ backgroundColor: c.bg, borderRadius: 4 }}>{c.label}</span>;
}

function CreateForm({ onClose, onCreated, warehouses, staffUsers, initialData }: { onClose: () => void, onCreated: () => void, warehouses: any[], staffUsers: any[], initialData?: any }) {
  const [items, setItems] = useState<TransferItem[]>(initialData?.items?.length ? initialData.items.map((i: any) => ({ productId: i.sku, productName: i.name, quantity: i.quantity })) : [{ productId: '', productName: '', quantity: 0 }]);
  const [formData, setFormData] = useState({ 
    sourceWarehouseId: initialData?.sourceWarehouseId || '', 
    targetWarehouseId: initialData?.targetWarehouseId || '', 
    note: '', 
    notificationEmail: '',
    expectedDispatchDate: '',
    expectedReceiveDate: ''
  });
  const [inventory, setInventory] = useState<any[]>([]);

  const isInitialMount = useRef(true);

  // Fetch inventory when source warehouse changes
  useEffect(() => {
    if (formData.sourceWarehouseId) {
      import('../../services/warehouseService.js').then(module => {
        module.getWarehouseInventory(formData.sourceWarehouseId, { pageNumber: 1, pageSize: 1000 }).then(data => {
          const invs = data.items || [];
          setInventory(invs);
          
          if (isInitialMount.current && initialData?.items?.length > 0) {
            const mappedItems = initialData.items.map((i: any) => {
              const invItem = invs.find((inv: any) => inv.productSku === i.sku || inv.productId === i.productId);
              return {
                productId: invItem ? invItem.productId : (i.productId || ''),
                productName: i.name || i.productName || (invItem ? invItem.productName : ''),
                quantity: i.quantity
              };
            });
            setItems(mappedItems);
            isInitialMount.current = false;
          } else if (!isInitialMount.current) {
            setItems([{ productId: '', productName: '', quantity: 0 }]);
          }
        });
      });
    } else {
      setInventory([]);
      if (!isInitialMount.current) {
        setItems([{ productId: '', productName: '', quantity: 0 }]);
      }
    }
    isInitialMount.current = false;
  }, [formData.sourceWarehouseId]);
  
  const handleCreate = async () => {
    if (!formData.sourceWarehouseId || !formData.targetWarehouseId) return alert('Vui lòng chọn kho nguồn và kho đích!');
    try {
      const payload = {
        sourceWarehouseId: formData.sourceWarehouseId,
        destinationWarehouseId: formData.targetWarehouseId,
        note: formData.note,
        notificationEmail: formData.notificationEmail,
        expectedDispatchDate: formData.expectedDispatchDate ? new Date(formData.expectedDispatchDate).toISOString() : null,
        expectedReceiveDate: formData.expectedReceiveDate ? new Date(formData.expectedReceiveDate).toISOString() : null,
        items: items.filter(i => i.productId && i.quantity > 0).map(i => ({ productId: i.productId, quantity: i.quantity }))
      };
      if (payload.items.length === 0) return alert('Vui lòng thêm ít nhất 1 sản phẩm với số lượng hợp lệ!');
      
      const { createStockTransfer } = await import('../../services/warehouseService.js');
      await createStockTransfer(payload);
      alert('Tạo lệnh chuyển kho thành công!');
      onCreated();
      onClose();
    } catch (err: any) { alert(err.message); }
  };

  return (
    <div className="space-y-5 text-sm">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-gray-500 font-medium">Kho nguồn *</label>
          <select className="w-full h-9 text-sm border border-gray-200 rounded px-3 bg-white" value={formData.sourceWarehouseId} onChange={e => setFormData({...formData, sourceWarehouseId: e.target.value})}>
            <option value="">-- Chọn Kho nguồn --</option>
            {warehouses.filter(w => w.id !== formData.targetWarehouseId).map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-gray-500 font-medium">Kho đích *</label>
          <select className="w-full h-9 text-sm border border-gray-200 rounded px-3 bg-white" value={formData.targetWarehouseId} onChange={e => setFormData({...formData, targetWarehouseId: e.target.value})}>
            <option value="">-- Chọn Kho đích --</option>
            {warehouses.filter(w => w.id !== formData.sourceWarehouseId).map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        
        <div className="space-y-1.5">
          <label className="text-gray-500 font-medium">Ngày dự kiến xuất</label>
          <Input type="datetime-local" className="h-9 text-sm w-full px-3" value={formData.expectedDispatchDate} onChange={e => setFormData({...formData, expectedDispatchDate: e.target.value})} />
        </div>
        <div className="space-y-1.5">
          <label className="text-gray-500 font-medium">Ngày dự kiến nhận</label>
          <Input type="datetime-local" className="h-9 text-sm w-full px-3" value={formData.expectedReceiveDate} onChange={e => setFormData({...formData, expectedReceiveDate: e.target.value})} />
        </div>

        <div className="space-y-1.5 col-span-2">
          <label className="text-gray-500 font-medium">Nhân viên thông báo (Tùy chọn - Nhập thủ công hoặc chọn)</label>
          <Input type="email" list="staffEmails" className="w-full h-9 text-sm px-3" placeholder="Nhập hoặc chọn email..." value={formData.notificationEmail} onChange={e => setFormData({...formData, notificationEmail: e.target.value})} />
          <datalist id="staffEmails">
            {staffUsers.map(s => (
              <option key={s.id} value={s.email}>{s.fullName} - {s.role}</option>
            ))}
          </datalist>
        </div>
        <div className="space-y-1.5 col-span-2">
          <label className="text-gray-500 font-medium">Ghi chú chung</label>
          <Input className="h-9 text-sm w-full px-3" placeholder="Ghi chú thêm..." value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
        </div>
      </div>
      
      <div>
        <div className="flex items-center justify-between mb-3 mt-5">
          <p className="font-semibold text-gray-600 text-xs uppercase tracking-wide">Danh sách hàng chuyển</p>
          <Button variant="outline" size="sm" className="h-8 text-sm gap-1.5" onClick={() => setItems(p => [...p, { productId: '', productName: '', quantity: 0 }])}>
            <Plus className="w-4 h-4" /> Thêm dòng
          </Button>
        </div>
        <table className="w-full border border-gray-200 rounded overflow-hidden text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200"><th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Sản phẩm có trong kho nguồn</th><th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Tồn kho</th><th className="text-center px-3 py-2.5 text-gray-700 font-semibold">SL chuyển</th><th className="w-10" /></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, idx) => {
              const selectedInv = inventory.find(inv => inv.productId === item.productId);
              return (
                <tr key={idx}>
                  <td className="px-2 py-2">
                    <select className="w-full h-9 text-sm border border-gray-200 rounded px-2 bg-white" value={item.productId} onChange={e => setItems(p => p.map((i, x) => x === idx ? { ...i, productId: e.target.value, productName: inventory.find(inv=>inv.productId === e.target.value)?.productName || '' } : i))}>
                      <option value="">-- Chọn sản phẩm --</option>
                      {inventory.map(inv => (
                        <option key={inv.productId} value={inv.productId}>{inv.productName || inv.productId}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2 text-center font-semibold text-gray-600">{selectedInv ? selectedInv.onHandQuantity : '—'}</td>
                  <td className="px-2 py-2 text-center"><Input type="number" className="h-8 text-sm text-center w-24 mx-auto" value={item.quantity} onChange={e => setItems(p => p.map((i, x) => x === idx ? { ...i, quantity: +e.target.value } : i))} max={selectedInv ? selectedInv.onHandQuantity : undefined} /></td>
                  <td className="px-2 py-2 text-center"><button className="text-gray-400 hover:text-red-500" onClick={() => setItems(p => p.filter((_, x) => x !== idx))}><X className="w-5 h-5" /></button></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="flex gap-2 pt-4 border-t border-gray-100 mt-4">
        <Button size="sm" className="h-9 text-sm gap-2 px-4" style={{ backgroundColor: PRIMARY }} onClick={handleCreate}><CheckCircle className="w-4 h-4" /> Tạo lệnh chuyển kho</Button>
        <Button variant="outline" size="sm" className="h-9 text-sm ml-auto px-4" onClick={onClose}>Hủy</Button>
      </div>
    </div>
  );
}

function ReceiveForm({ transfer, onClose, onReceived }: { transfer: Transfer, onClose: () => void, onReceived: () => void }) {
  const [items, setItems] = useState<{productId: string, receivedQuantity: number}[]>(
    transfer.items.map(i => ({ productId: i.productId, receivedQuantity: i.quantity }))
  );
  const [note, setNote] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const handleReceive = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('ItemsJson', JSON.stringify(items));
      if (note) formData.append('Note', note);
      if (files.length > 0) {
        files.forEach(f => formData.append('ProofImages', f));
      }

      const { receiveStockTransfer } = await import('../../services/warehouseService.js');
      await receiveStockTransfer(transfer.id, formData);
      alert('Nhận hàng thành công!');
      onReceived();
      onClose();
    } catch (err: any) { 
      alert(err.message); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 text-sm">
      <div>
        <p className="font-semibold text-gray-600 text-xs uppercase tracking-wide mb-3">Xác nhận số lượng nhận hàng</p>
        <table className="w-full border border-gray-200 rounded overflow-hidden text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200"><th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Product ID</th><th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Tên sản phẩm</th><th className="text-center px-3 py-2.5 text-gray-700 font-semibold">SL Yêu cầu</th><th className="text-center px-3 py-2.5 text-gray-700 font-semibold">SL Thực nhận</th></tr></thead>
          <tbody className="divide-y divide-gray-100">
            {items.map((item, idx) => {
              const original = transfer.items.find(i => i.productId === item.productId);
              return (
                <tr key={idx}>
                  <td className="px-3 py-2 font-mono text-gray-500 text-xs">{item.productId.substring(0, 8)}...</td>
                  <td className="px-3 py-2">{original?.productName || 'N/A'}</td>
                  <td className="px-3 py-2 text-center font-semibold text-gray-700">{original?.quantity}</td>
                  <td className="px-3 py-2 text-center"><Input type="number" className="h-8 text-sm text-center w-24 mx-auto" value={item.receivedQuantity} onChange={e => setItems(p => p.map((i, x) => x === idx ? { ...i, receivedQuantity: +e.target.value } : i))} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-4 mt-5 pt-5 border-t border-gray-200">
        <div className="space-y-2">
          <label className="text-gray-500 font-medium">Ghi chú khi nhận hàng (Bắt buộc nếu có hao hụt)</label>
          <textarea className="w-full h-20 text-sm border border-gray-200 rounded p-3 bg-white" placeholder="Ví dụ: Thiếu 2 kiện do móp méo..." value={note} onChange={e => setNote(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-gray-500 font-medium">Tải lên bằng chứng (Hình ảnh thiếu/hỏng hàng, có thể chọn nhiều ảnh)</label>
          <div className="flex items-center gap-2">
            <Input type="file" accept="image/*" multiple className="h-10 text-sm flex-1 pt-1.5" onChange={e => setFiles(e.target.files ? Array.from(e.target.files) : [])} />
          </div>
          {files.length > 0 && <p className="text-xs text-blue-600 font-medium">Đã chọn {files.length} ảnh</p>}
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t border-gray-100 mt-4">
        <Button size="sm" className="h-9 text-sm gap-2 px-4" style={{ backgroundColor: SUCCESS }} onClick={handleReceive} disabled={loading}>
          {loading ? 'Đang xử lý...' : <><CheckCircle className="w-4 h-4" /> Hoàn tất nhập kho</>}
        </Button>
        <Button variant="outline" size="sm" className="h-9 text-sm ml-auto px-4" onClick={onClose} disabled={loading}>Hủy</Button>
      </div>
    </div>
  )
}

export default function WarehouseStockTransfer() {
  const location = useLocation();
  const navigate = useNavigate();
  const prefill = location.state?.prefill;

  const [tab, setTab] = useState<Tab>('create');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [detail, setDetail] = useState<Transfer | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [receiveTransfer, setReceiveTransfer] = useState<Transfer | null>(null);
  
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);
  const [prefillData, setPrefillData] = useState<any>(null);

  useEffect(() => {
    if (prefill && warehouses.length > 0) {
      const sourceW = warehouses.find((w: any) => w.name === prefill.sourceWarehouse);
      const targetW = warehouses.find((w: any) => w.name === 'Kho mặc định' || w.name === 'WH-DEFAULT' || w.code === 'WH-DEFAULT' || w.name.includes('WH-DEFAULT') || w.name === 'Kho Chính');
      if (sourceW && targetW) {
        setPrefillData({
           sourceWarehouseId: sourceW.id,
           targetWarehouseId: targetW.id,
           items: prefill.items
        });
        setShowCreate(true);
        // Clean history so refresh doesn't reopen
        navigate(location.pathname, { replace: true, state: {} });
      }
    }
  }, [prefill, warehouses, location.pathname, navigate]);

  const loadData = async () => {
    try {
      const { getStockTransfers, getWarehouses, getStaffUsers } = await import('../../services/warehouseService.js');
      const [tData, wData, sData] = await Promise.all([
        getStockTransfers(),
        getWarehouses(),
        getStaffUsers()
      ]);
      setTransfers(tData);
      setWarehouses(wData);
      setStaffUsers(sData);
    } catch(e) { console.error(e); }
  };

  useEffect(() => {
    loadData();
  }, []);

  const tabFilters: Record<Tab, (t: Transfer) => boolean> = {
    create:   t => true, // Tất cả lệnh
    dispatch: t => ['Draft'].includes(t.status), // Cần xuất kho
    receive:  t => ['Dispatched'].includes(t.status), // Cần nhận hàng
    completed:t => ['Received', 'Cancelled'].includes(t.status), // Đã hoàn thành hoặc Hủy
  };

  const filtered = transfers.filter(t => {
    const q = search.toLowerCase();
    const ms = !q || t.code.toLowerCase().includes(q) || t.sourceWarehouseName.toLowerCase().includes(q) || t.destinationWarehouseName.toLowerCase().includes(q);
    return ms && tabFilters[tab](t) && (statusFilter === 'all' || t.status === statusFilter);
  });

  const dispatch = async (id: string) => {
    if (!confirm('Bạn có chắc chắn xuất kho cho lệnh này? Hàng sẽ bắt đầu được vận chuyển.')) return;
    try {
      const { dispatchStockTransfer } = await import('../../services/warehouseService.js');
      await dispatchStockTransfer(id);
      alert('Xuất kho thành công! Hàng đang trên đường tới kho đích.');
      loadData();
      setDetail(null);
    } catch (err: any) { alert(err.message); }
  };

  const cancel = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn hủy lệnh này? Lệnh sẽ bị hủy bỏ và tồn kho sẽ được hoàn lại.')) return;
    try {
      const { cancelStockTransfer } = await import('../../services/warehouseService.js');
      await cancelStockTransfer(id);
      alert('Hủy lệnh thành công!');
      loadData();
      setDetail(null);
    } catch (err: any) { alert(err.message); }
  }

  const toggleSelect = (id: string) => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const toggleAll = () => setSelected(selected.length === filtered.length ? [] : filtered.map(t => t.id));

  const TABS: { id: Tab; label: string }[] = [
    { id: 'create',    label: 'Tất cả lệnh chuyển' },
    { id: 'dispatch',  label: 'Cần xuất kho' },
    { id: 'receive',   label: 'Cần nhận hàng' },
    { id: 'completed', label: 'Đã hoàn thành' },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-[11px] mb-0.5">
          <span className="text-gray-400">Kho hàng</span><span className="text-gray-400">/</span><span className="text-gray-400">Chuyển kho (Transfer)</span><span className="text-gray-400">/</span><span className="text-gray-800 font-semibold">Lệnh chuyển kho</span>
        </div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">Điều chuyển hàng nội bộ</h2>
            <p className="text-xs text-gray-500 mt-0.5">{transfers.length} lệnh · {transfers.filter(t => t.status === 'Dispatched').length} đang vận chuyển</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: PRIMARY }} onClick={() => setShowCreate(true)}>
              <Plus className="w-3 h-3" /> Tạo lệnh chuyển
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={loadData}><RefreshCw className="w-3 h-3" /> Làm mới</Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0 border-b border-gray-200 -mb-3">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${tab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border-b border-gray-200 px-5 py-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input className="pl-8 h-7 text-xs bg-gray-50" placeholder="Tìm theo mã lệnh, kho..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="h-7 text-xs border border-gray-200 rounded px-2 bg-white text-gray-600" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(STATUS_TRANSFER).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-gray-50 p-4">
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2.5 w-8"><input type="checkbox" checked={filtered.length > 0 && selected.length === filtered.length} onChange={toggleAll} className="w-3.5 h-3.5" /></th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Mã lệnh</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Kho nguồn</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold"><ArrowRight className="w-3 h-3 mx-auto" /></th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Kho đích</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Ngày tạo</th>
                <th className="text-left px-3 py-2.5 text-gray-700 font-semibold">Trạng thái</th>
                <th className="text-center px-3 py-2.5 text-gray-700 font-semibold">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-12 text-center"><div className="flex flex-col items-center gap-2"><div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"><span className="text-gray-400 text-xl">📋</span></div><p className="text-sm font-medium text-gray-500">Không có dữ liệu</p></div></td></tr>
              )}
              {filtered.map((t, i) => (
                <tr key={t.id} className={`hover:bg-blue-50/30 transition-colors ${i % 2 === 1 ? 'bg-gray-50/50' : ''} ${selected.includes(t.id) ? 'bg-blue-50/50' : ''}`}>
                  <td className="px-3 py-2.5"><input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggleSelect(t.id)} className="w-3.5 h-3.5" /></td>
                  <td className="px-3 py-2.5 font-semibold" style={{ color: PRIMARY }}>{t.code}</td>
                  <td className="px-3 py-2.5 text-gray-700">{t.sourceWarehouseName}</td>
                  <td className="px-3 py-2.5 text-center text-gray-400"><ArrowRight className="w-3 h-3 mx-auto" /></td>
                  <td className="px-3 py-2.5 text-gray-700">{t.destinationWarehouseName}</td>
                  <td className="px-3 py-2.5 text-gray-500">{new Date(t.createdAt).toLocaleString('vi-VN')}</td>
                  <td className="px-3 py-2.5 text-gray-600"><Badge status={t.status} /></td>
                  <td className="px-3 py-2.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button className="p-1 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600" onClick={async () => {
                        const { getStockTransferById } = await import('../../services/warehouseService.js');
                        const detailData = await getStockTransferById(t.id);
                        setDetail(detailData);
                      }} title="Xem chi tiết"><Eye className="w-3.5 h-3.5" /></button>
                      
                      {t.status === 'Draft' && (
                        <button className="p-1 rounded hover:bg-purple-50 text-gray-400 hover:text-purple-600" onClick={() => dispatch(t.id)} title="Xuất kho"><Truck className="w-3.5 h-3.5" /></button>
                      )}
                      {t.status === 'Dispatched' && (
                        <button className="p-1 rounded hover:bg-green-50 text-gray-400 hover:text-green-600" onClick={async () => {
                          const { getStockTransferById } = await import('../../services/warehouseService.js');
                          const detailData = await getStockTransferById(t.id);
                          setReceiveTransfer(detailData);
                        }} title="Xác nhận nhận hàng"><CheckCircle className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-sm font-bold">Chi tiết chuyển kho — {detail?.code}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded p-3 space-y-1.5 border border-gray-100">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Thông tin lệnh</p>
                  <div className="flex justify-between"><span className="text-gray-500">Mã lệnh:</span><span className="font-semibold" style={{ color: PRIMARY }}>{detail.code}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Kho nguồn:</span><span className="font-medium text-gray-800">{detail.sourceWarehouseName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Kho đích:</span><span className="font-medium text-gray-800">{detail.destinationWarehouseName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Người tạo:</span><span>{detail.createdByUserName}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Ngày tạo:</span><span>{new Date(detail.createdAt).toLocaleString('vi-VN')}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Ghi chú tạo:</span><span>{detail.note || 'Không có'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Trạng thái:</span><Badge status={detail.status} /></div>
                </div>
                <div className="bg-gray-50 rounded p-3 space-y-1.5 border border-gray-100">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Thông tin vận chuyển / Nhận hàng</p>
                  <div className="flex justify-between"><span className="text-gray-500">Dự kiến xuất:</span><span>{detail.expectedDispatchDate ? new Date(detail.expectedDispatchDate).toLocaleString('vi-VN') : '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Dự kiến đến:</span><span>{detail.expectedReceiveDate ? new Date(detail.expectedReceiveDate).toLocaleString('vi-VN') : '—'}</span></div>
                  <div className="flex justify-between border-t border-gray-200 mt-2 pt-2"><span className="text-gray-500">Thực xuất:</span><span className="font-semibold text-purple-600">{detail.dispatchedAt ? new Date(detail.dispatchedAt).toLocaleString('vi-VN') : '—'}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Thực nhận:</span><span className="font-semibold text-green-600">{detail.receivedAt ? new Date(detail.receivedAt).toLocaleString('vi-VN') : '—'}</span></div>
                  <div className="flex justify-between mt-1"><span className="text-gray-500">Ghi chú lúc nhận:</span><span className="text-red-600 font-medium">{detail.receiveNote || '—'}</span></div>
                </div>
              </div>

              {detail.proofImageUrl && (
                <div className="border border-gray-200 rounded p-3">
                  <p className="font-semibold text-gray-500 text-[10px] uppercase tracking-wide mb-2">Ảnh bằng chứng nhận hàng</p>
                  <div className="flex flex-wrap gap-3">
                    {detail.proofImageUrl.split(',').map((url, i) => (
                      <img key={i} src={url.trim()} alt="Bằng chứng" className="h-40 rounded border border-gray-100 object-cover cursor-pointer hover:opacity-90" onClick={() => window.open(url.trim(), '_blank')} />
                    ))}
                  </div>
                </div>
              )}

              {detail.items && detail.items.length > 0 && (
                <div>
                  <p className="font-semibold text-gray-600 text-[10px] uppercase tracking-wide mb-2">Danh sách hàng chuyển</p>
                  <table className="w-full border border-gray-200 rounded overflow-hidden">
                    <thead><tr className="bg-gray-50 border-b border-gray-200"><th className="text-left px-3 py-2 text-gray-700 font-semibold">Product ID</th><th className="text-left px-3 py-2 text-gray-700 font-semibold">Sản phẩm</th><th className="text-center px-3 py-2 text-gray-700 font-semibold">SL Xuất kho</th><th className="text-center px-3 py-2 text-gray-700 font-semibold">SL Thực nhận</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {detail.items.map(item => (
                        <tr key={item.productId} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-mono text-gray-500">{item.productId}</td>
                          <td className="px-3 py-2 text-gray-800">{item.productName || 'N/A'}</td>
                          <td className="px-3 py-2 text-center font-semibold" style={{ color: PRIMARY }}>{item.quantity}</td>
                          <td className={`px-3 py-2 text-center font-semibold ${item.receivedQuantity !== undefined && item.receivedQuantity < item.quantity ? 'text-red-500' : 'text-green-600'}`}>
                            {item.receivedQuantity ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-gray-100">
                {detail.status === 'Draft' && <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: PRIMARY }} onClick={() => dispatch(detail.id)}><Truck className="w-3.5 h-3.5" /> Xuất kho</Button>}
                {detail.status === 'Dispatched' && <Button size="sm" className="h-7 text-xs gap-1.5" style={{ backgroundColor: SUCCESS }} onClick={() => { setReceiveTransfer(detail); setDetail(null); }}><CheckCircle className="w-3.5 h-3.5" /> Xác nhận nhận hàng</Button>}
                {(detail.status === 'Draft' || detail.status === 'Dispatched') && <Button variant="outline" size="sm" className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => cancel(detail.id)}>Hủy Lệnh</Button>}
                <Button variant="outline" size="sm" className="h-7 text-xs ml-auto" onClick={() => setDetail(null)}>Đóng</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Tạo lệnh chuyển kho mới</DialogTitle>
          </DialogHeader>
          {showCreate && (
            <CreateForm key={prefillData ? 'prefill' : 'empty'} onClose={() => { setShowCreate(false); setPrefillData(null); }} onCreated={loadData} warehouses={warehouses} staffUsers={staffUsers} initialData={prefillData} />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Receive Dialog */}
      <Dialog open={!!receiveTransfer} onOpenChange={() => setReceiveTransfer(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Xác nhận nhận hàng — {receiveTransfer?.code}</DialogTitle>
          </DialogHeader>
          {receiveTransfer && <ReceiveForm transfer={receiveTransfer} onClose={() => setReceiveTransfer(null)} onReceived={loadData} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
