import React, { useState } from 'react';
import { X, Search, Plus, Minus, Trash2, Upload, Loader2, Sparkles, RefreshCw, Calculator, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { getProducts } from '../../services/productService';

const PRIMARY = '#1F3B64';

interface ExchangeRequestModalProps {
  order: any;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

async function uploadEvidenceFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/orders/upload-evidence', {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Upload thất bại');
  }
  const data = await res.json();
  return data.url;
}

function formatVnd(val?: number) {
  return `${new Intl.NumberFormat('vi-VN').format(Number(val || 0))} đ`;
}

export default function ExchangeRequestModal({ order, onClose, onSubmit }: ExchangeRequestModalProps) {
  const sourceItems = order?.items || order?.orderItems || [];
  const [returnItems, setReturnItems] = useState(
    sourceItems.map((item: any) => ({ ...item, returnQty: 0 }))
  );
  
  const [exchangeItems, setExchangeItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [reason, setReason] = useState('');
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleSearchProduct = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const data = await getProducts({ page: 1, pageSize: 20, search: searchQuery });
      setSearchResults(data.items || (data as any).data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const handleQuickAddSameSku = () => {
    const selectedReturns = returnItems.filter((i: any) => i.returnQty > 0);
    if (selectedReturns.length === 0) {
      alert('Vui lòng chọn số lượng hàng trả ở Bước 1 trước khi chọn nhanh!');
      return;
    }

    const doQuickAdd = () => {
      const newExchanges = selectedReturns.map((ret: any) => ({
        ...ret,
        productId: ret.productId,
        name: ret.productName || ret.name,
        standardListedPrice: ret.priceSnapshot || ret.unitPrice || 0,
        exchangeQty: ret.returnQty,
        isDifferentSku: false
      }));
      setExchangeItems(newExchanges);
    };

    const hasDifferentSku = exchangeItems.some((e: any) => e.isDifferentSku);
    if (hasDifferentSku) {
      setConfirmModalConfig({
        isOpen: true,
        title: 'Xác nhận chuyển đổi loại sản phẩm đổi',
        message: 'Bạn đã chọn sản phẩm đổi khác loại trước đó. Chuyển sang đổi "Cùng loại" sẽ làm mới danh sách sản phẩm đổi. Bạn có muốn tiếp tục?',
        onConfirm: doQuickAdd
      });
    } else {
      doQuickAdd();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(file => uploadEvidenceFile(file));
      const urls = await Promise.all(uploadPromises);
      setEvidenceUrls(prev => [...prev, ...urls]);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi tải ảnh lên');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleAddExchangeItem = (product: any) => {
    const doAddItem = () => {
      setExchangeItems([{
        ...product,
        productId: product.id,
        name: product.name,
        exchangeQty: 1,
        isDifferentSku: true
      }]);
      setSearchResults([]);
      setSearchQuery('');
    };

    const hasSameSku = exchangeItems.some((e: any) => !e.isDifferentSku);
    if (hasSameSku) {
      setConfirmModalConfig({
        isOpen: true,
        title: 'Chuyển sang Đổi sản phẩm khác loại',
        message: `Bạn đang ở chế độ đổi sản phẩm cùng loại. Việc chọn món mới (${product.name}) sẽ chuyển sang Đổi sản phẩm khác loại. Bạn có muốn tiếp tục?`,
        onConfirm: doAddItem
      });
    } else {
      if (exchangeItems.find((i) => i.productId === product.id)) return;
      setExchangeItems([...exchangeItems, { 
        ...product, 
        productId: product.id, 
        name: product.name,
        exchangeQty: 1,
        isDifferentSku: true
      }]);
      setSearchResults([]);
      setSearchQuery('');
    }
  };

  const handleRemoveExchangeItem = (productId: string) => {
    setExchangeItems(exchangeItems.filter((i) => i.productId !== productId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert('Vui lòng nhập lý do.');
      return;
    }

    const selectedReturns = returnItems.filter((i: any) => i.returnQty > 0);
    if (selectedReturns.length === 0) {
      alert('Vui lòng chọn ít nhất 1 sản phẩm để trả/đổi.');
      return;
    }

    const payload = {
      reason,
      evidenceUrls: JSON.stringify(evidenceUrls),
      returnItems: selectedReturns.map((i: any) => ({
        productId: i.productId,
        quantity: Number(i.returnQty)
      })),
      exchangeItems: exchangeItems.map((i: any) => ({
        productId: i.productId,
        quantity: Number(i.exchangeQty)
      }))
    };

    onSubmit(payload);
  };

  // Tính toán tài chính ước tính
  const totalReturnVal = returnItems.reduce((acc: number, i: any) => acc + ((Number(i.returnQty) || 0) * (i.priceSnapshot || i.unitPrice || 0)), 0);
  const totalExchangeVal = exchangeItems.reduce((acc: number, i: any) => acc + ((Number(i.exchangeQty) || 0) * (i.standardListedPrice || i.unitPrice || i.priceSnapshot || 0)), 0);
  const diffVal = totalExchangeVal - totalReturnVal;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-100 overflow-hidden">
        
        {/* Header đồng bộ với ReturnExchangeRequestDetailModal */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-white sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                WF-15
              </span>
              <h3 className="text-lg font-bold text-slate-900">Yêu cầu Từ chối & Đổi hàng</h3>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Đơn hàng gốc: <span className="font-semibold text-slate-700">{order.orderCode}</span>
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto p-6 flex-1">
          
          {/* Bước 1: Trả Hàng */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <div className="flex items-center justify-between border-b border-slate-200/80 pb-3 mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1F3B64] text-[10px] font-bold text-white">1</span>
                Sản phẩm từ chối / trả lại
              </h4>
              <span className="text-xs text-slate-400 font-medium">Nhập số lượng thực tế cần trả</span>
            </div>

            <div className="space-y-2.5">
              {returnItems.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs hover:border-slate-300 transition">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{item.productName || item.name || 'Sản phẩm'}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Đã mua: <span className="font-semibold text-slate-700">{item.quantity}</span> | Đơn giá: <span className="font-semibold text-slate-700">{(item.priceSnapshot || item.unitPrice || 0).toLocaleString()} đ</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Số lượng trả:</label>
                    <div className="flex items-center rounded-xl border border-slate-300 bg-slate-50 overflow-hidden shadow-xs">
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = [...returnItems];
                          newItems[idx].returnQty = Math.max(0, Number(newItems[idx].returnQty || 0) - 1);
                          setReturnItems(newItems);
                        }}
                        className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-30"
                        disabled={item.returnQty <= 0}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        max={item.quantity}
                        value={item.returnQty}
                        onChange={(e) => {
                          const newItems = [...returnItems];
                          newItems[idx].returnQty = Math.min(Math.max(0, Number(e.target.value)), item.quantity);
                          setReturnItems(newItems);
                        }}
                        className="w-12 text-center text-sm font-bold text-slate-900 bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const newItems = [...returnItems];
                          newItems[idx].returnQty = Math.min(item.quantity, Number(newItems[idx].returnQty || 0) + 1);
                          setReturnItems(newItems);
                        }}
                        className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-30"
                        disabled={item.returnQty >= item.quantity}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bước 2: Đổi Hàng (Cùng SKU hoặc Khác SKU) */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-3">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1F3B64] text-[10px] font-bold text-white">2</span>
                  2. Chọn sản phẩm đổi sang (Đổi SKU)
                </h4>
                <p className="mt-0.5 text-xs text-slate-400">Hỗ trợ đổi cùng mặt hàng hoặc chọn món mới trong hệ thống</p>
              </div>

              {/* Nút Chọn nhanh cùng SKU */}
              <button
                type="button"
                onClick={handleQuickAddSameSku}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:border-slate-300 shadow-xs"
              >
                <Sparkles className="h-3.5 w-3.5" style={{ color: PRIMARY }} />
                <span>Chọn nhanh cùng loại (Same SKU)</span>
              </button>
            </div>

            {/* Thanh Tìm Kiếm Đồng Bộ */}
            <div className="relative mb-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Tìm sản phẩm mới để đổi (Tên sản phẩm hoặc mã SKU)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchProduct())}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-10 pr-10 text-sm font-medium text-slate-800 placeholder-slate-400 transition focus:border-[#1F3B64] focus:bg-white focus:outline-none"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => { setSearchQuery(''); setSearchResults([]); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleSearchProduct}
                  disabled={searching}
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white transition shadow-xs disabled:opacity-50"
                  style={{ backgroundColor: PRIMARY }}
                >
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  <span>Tìm kiếm</span>
                </button>
              </div>

              {/* Kết quả tìm kiếm Dropdown */}
              {searchResults.length > 0 && (
                <div className="relative z-20 mt-2 max-h-60 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-xl">
                  {searchResults.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between p-3 transition hover:bg-slate-50">
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                        <p className="text-xs text-slate-500">Mã SKU: <span className="font-medium text-slate-700">{p.sku || p.code || 'N/A'}</span> | Giá niêm yết: <span className="font-semibold text-slate-900">{formatVnd(p.standardListedPrice || p.unitPrice)}</span></p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddExchangeItem(p)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-[#1F3B64] hover:text-white hover:border-[#1F3B64]"
                      >
                        <Plus className="h-3.5 w-3.5" /> Thêm món
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Danh sách các sản phẩm đổi đã chọn */}
            {exchangeItems.length > 0 ? (
              <div className="space-y-2.5 mb-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Sản phẩm đổi đã chọn ({exchangeItems.length}):</p>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    exchangeItems.some((e: any) => e.isDifferentSku)
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {exchangeItems.some((e: any) => e.isDifferentSku) ? 'Chế độ: Đổi khác SKU' : 'Chế độ: Đổi cùng SKU'}
                  </span>
                </div>
                {exchangeItems.map((item: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800">{item.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">Đơn giá đổi: <span className="font-semibold text-slate-700">{formatVnd(item.standardListedPrice || item.unitPrice || item.priceSnapshot)}</span></p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">SL Đổi:</label>
                        <div className="flex items-center rounded-xl border border-slate-300 bg-white overflow-hidden shadow-xs">
                          <button
                            type="button"
                            onClick={() => {
                              const newItems = [...exchangeItems];
                              newItems[idx].exchangeQty = Math.max(1, Number(newItems[idx].exchangeQty || 1) - 1);
                              setExchangeItems(newItems);
                            }}
                            className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-30"
                            disabled={item.exchangeQty <= 1}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <input
                            type="number"
                            min={1}
                            value={item.exchangeQty}
                            onChange={(e) => {
                              const newItems = [...exchangeItems];
                              newItems[idx].exchangeQty = Math.max(1, Number(e.target.value));
                              setExchangeItems(newItems);
                            }}
                            className="w-12 text-center text-sm font-bold text-slate-900 bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newItems = [...exchangeItems];
                              newItems[idx].exchangeQty = Number(newItems[idx].exchangeQty || 1) + 1;
                              setExchangeItems(newItems);
                            }}
                            className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveExchangeItem(item.productId)} 
                        className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-50"
                        title="Xóa món này"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-6 text-center text-slate-400">
                <RefreshCw className="mx-auto mb-1.5 h-6 w-6 opacity-30 text-slate-500" />
                <p className="text-xs font-medium text-slate-500">Chưa chọn sản phẩm đổi. Tìm kiếm hoặc bấm <span className="font-semibold text-slate-700">"Chọn nhanh cùng loại"</span>.</p>
              </div>
            )}

            {/* BẢNG ƯỚC TÍNH TÀI CHÍNH ĐỒNG BỘ UI */}
            {(totalReturnVal > 0 || totalExchangeVal > 0) && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 border-b border-slate-200 pb-2 mb-3">
                  <Calculator className="h-4 w-4 text-slate-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ước tính cấn trừ tài chính</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Hàng từ chối/trả</span>
                    <span className="mt-1 text-sm font-bold text-slate-900 block">{formatVnd(totalReturnVal)}</span>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">Hàng chọn đổi mới</span>
                    <span className="mt-1 text-sm font-bold text-slate-900 block">{formatVnd(totalExchangeVal)}</span>
                  </div>

                  <div className={`rounded-xl border p-3 ${
                    diffVal > 0 ? 'border-amber-200 bg-amber-50 text-amber-900' :
                    diffVal < 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-900' :
                    'border-slate-200 bg-white text-slate-900'
                  }`}>
                    <span className="text-xs font-semibold uppercase tracking-wider block opacity-75">
                      {diffVal > 0 ? 'Khách trả thêm' : diffVal < 0 ? 'Hoàn lại ví Credit' : 'Đổi ngang'}
                    </span>
                    <span className="mt-1 text-sm font-extrabold block">
                      {formatVnd(Math.abs(diffVal))}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bước 3: Lý do & Bằng chứng */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-3 mb-3 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1F3B64] text-[10px] font-bold text-white">3</span>
              3. Lý do & Bằng chứng hàng lỗi
            </h4>
            <textarea
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-medium text-slate-800 placeholder-slate-400 transition focus:border-[#1F3B64] focus:outline-none shadow-xs"
              rows={3}
              placeholder="Nhập chi tiết lý do từ chối nhận hàng hoặc đổi trả..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            
            <div className="mt-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Ảnh minh chứng (Tối đa 5 ảnh)</label>
              <label className={`inline-flex items-center gap-2 rounded-xl border-2 border-dashed px-4 py-2.5 text-xs font-semibold cursor-pointer transition ${
                uploading ? 'border-slate-300 bg-slate-100 text-slate-400' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
              }`}>
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                    <span>Đang tải lên...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 text-slate-500" />
                    <span>Chọn ảnh minh chứng</span>
                  </>
                )}
                <input 
                  type="file" 
                  multiple 
                  accept="image/*"
                  onChange={handleFileChange}
                  disabled={uploading || evidenceUrls.length >= 5}
                  className="hidden"
                />
              </label>

              {evidenceUrls.length > 0 && (
                <div className="flex flex-wrap gap-3 mt-3">
                  {evidenceUrls.map((url, i) => (
                    <div key={i} className="relative group h-20 w-20 overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-xs">
                      <img src={url} className="h-full w-full object-cover" alt={`Bằng chứng ${i + 1}`} />
                      <button 
                        type="button"
                        onClick={() => setEvidenceUrls(evidenceUrls.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 rounded-full bg-red-500 p-1 text-white opacity-0 transition group-hover:opacity-100 shadow-md"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </form>

        {/* Footer đồng bộ */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-4 sticky bottom-0 z-10">
          <div className="text-xs text-slate-500 font-medium">
            {exchangeItems.length > 0 ? (
              <span className="flex items-center gap-1.5 text-slate-800 font-semibold">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Đã chọn {exchangeItems.length} sản phẩm đổi
              </span>
            ) : (
              <span>Chế độ: Trả hàng hoàn tiền/Credit</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button 
              type="button" 
              onClick={onClose} 
              className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
            >
              Hủy bỏ
            </button>
            <button 
              type="button" 
              onClick={handleSubmit} 
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: PRIMARY }}
            >
              <span>Gửi yêu cầu đổi trả</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Custom Confirmation Modal */}
        {confirmModalConfig && confirmModalConfig.isOpen && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-gray-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3 text-amber-600 font-bold text-sm">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <span>{confirmModalConfig.title}</span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed font-medium">
                {confirmModalConfig.message}
              </p>
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setConfirmModalConfig(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmModalConfig.onConfirm();
                    setConfirmModalConfig(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors"
                >
                  Đồng ý tiếp tục
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
