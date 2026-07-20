import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Trash2, Printer, FileText, Check, Loader2, ArrowLeft } from 'lucide-react';
import { getProducts } from '../../services/productService';
import { placeDirectOrder } from '../../services/directOrderService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ─── Utility: Vietnamese Number to Words ─────────────────────────────────────
function numberToVietnameseWords(amount: number): string {
  if (amount === 0) return 'Không đồng';

  const units = ['', ' nghìn', ' triệu', ' tỷ', ' nghìn tỷ', ' triệu tỷ'];
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readGroup3(n: number, showZeroHundred: boolean): string {
    const hundred = Math.floor(n / 100);
    const ten = Math.floor((n % 100) / 10);
    const unit = n % 10;
    let res = '';

    if (hundred > 0 || showZeroHundred) {
      res += digits[hundred] + ' trăm ';
    }

    if (ten > 0) {
      if (ten === 1) res += 'mười ';
      else res += digits[ten] + ' mươi ';
    } else if (hundred > 0 && unit > 0) {
      res += 'lẻ ';
    }

    if (unit > 0) {
      if (unit === 1 && ten > 1) res += 'mốt';
      else if (unit === 5 && ten > 0) res += 'lăm';
      else res += digits[unit];
    }

    return res.trim();
  }

  let strAmount = Math.floor(amount).toString();
  let groups: string[] = [];
  while (strAmount.length > 0) {
    groups.push(strAmount.substring(Math.max(0, strAmount.length - 3)));
    strAmount = strAmount.substring(0, Math.max(0, strAmount.length - 3));
  }

  let resultStr = '';
  for (let i = groups.length - 1; i >= 0; i--) {
    const groupVal = parseInt(groups[i], 10);
    if (groupVal > 0) {
      const showZeroHundred = i < groups.length - 1;
      const groupStr = readGroup3(groupVal, showZeroHundred);
      resultStr += groupStr + units[i] + ' ';
    }
  }

  resultStr = resultStr.trim();
  if (!resultStr) return 'Không đồng';

  resultStr = resultStr.charAt(0).toUpperCase() + resultStr.slice(1) + ' đồng';
  return resultStr + ' chẵn.';
}

interface InvoiceItem {
  id: string; // unique key for UI list
  productId: string;
  name: string;
  sku: string;
  unit: string;
  quantity: number;
  price: number;
  note: string;
  availableStock: number;
}

export default function DirectPurchasePage() {
  const navigate = useNavigate();

  // ─── Customer details ──────────────────────────────────────────────────────
  const [customerName, setCustomerName] = useState('Khách lẻ');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('Thái Bình');
  const [invoiceDate, setInvoiceDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });

  // ─── Products lists ────────────────────────────────────────────────────────
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);

  // ─── Checkout configs ──────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'SePay'>('Cash');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [hasVat, setHasVat] = useState(false);
  const [paperSize, setPaperSize] = useState<'A5' | 'A4'>('A5');

  // ─── API Submit status ──────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [sepayQr, setSepayQr] = useState<{ qrImageUrl: string; transferContent: string } | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [showRedirectSuccessModal, setShowRedirectSuccessModal] = useState(false);
  const [confirmingCash, setConfirmingCash] = useState(false);

  // Redirection when payment status becomes 'Paid'
  useEffect(() => {
    if (paymentStatus === 'Paid') {
      setShowRedirectSuccessModal(true);
      const timer = setTimeout(() => {
        navigate('/sales/dashboard');
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [paymentStatus, navigate]);

  const handleConfirmCashPayment = async () => {
    if (!successOrder) return;
    setConfirmingCash(true);
    setErrorMsg('');
    try {
      const response = await fetch(`/api/orders/${successOrder.orderId}/confirm-payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        setPaymentStatus('Paid');
      } else {
        const errData = await response.json();
        setErrorMsg(errData.message || 'Lỗi xác nhận thanh toán.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Lỗi hệ thống khi kết nối server.');
    } finally {
      setConfirmingCash(false);
    }
  };

  // Polling for SePay payment status
  useEffect(() => {
    if (!successOrder || successOrder.paymentMethod !== 'SePay' || paymentStatus === 'Paid') {
      return;
    }

    let isMounted = true;
    let intervalId: any = null;

    const fetchSePayQr = async () => {
      try {
        const response = await fetch(`/api/orders/${successOrder.orderId}/sepay-qr`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
        if (response.ok && isMounted) {
          const qrData = await response.json();
          setSepayQr(qrData);
        }
      } catch (err) {
        console.error('Error fetching SePay QR:', err);
      }
    };

    fetchSePayQr();

    const checkPaymentStatus = async () => {
      try {
        const response = await fetch(`/api/orders/${successOrder.orderId}/payment-status`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
        if (response.ok && isMounted) {
          const statusData = await response.json();
          if (statusData.status === 'Paid') {
            setPaymentStatus('Paid');
            clearInterval(intervalId);
          }
        }
      } catch (err) {
        console.error('Error checking payment status:', err);
      }
    };

    // Poll every 3 seconds
    intervalId = setInterval(checkPaymentStatus, 3000);

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [successOrder, paymentStatus]);

  // ─── Validation / Concurrency / Highlights (NAC-01, NAC-02, NAC-04) ───────
  const [phoneError, setPhoneError] = useState('');
  const [stockErrors, setStockErrors] = useState<Record<string, string>>({});
  const [highlightErrors, setHighlightErrors] = useState<Record<string, boolean>>({});

  // ─── Dom ref for PDF capture ───────────────────────────────────────────────
  const previewRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ─── Product searching ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await getProducts({ page: 1, pageSize: 20, search: searchQuery });
        setSearchResults(data.items || []);
      } catch (err) {
        console.error('Lỗi khi tìm sản phẩm:', err);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  // Click outside to close product search dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ─── Auto-Suggestion & Phone Format Verification (AC-01, NAC-04, BV-02) ────
  useEffect(() => {
    const cleanPhone = phoneNumber.trim();
    if (!cleanPhone) {
      setPhoneError('');
      return;
    }

    // Standard Vietnamese format: 10 to 11 numeric digits (BV-02, NAC-04)
    const isNumeric = /^\d+$/.test(cleanPhone);
    if (!isNumeric || cleanPhone.length < 10 || cleanPhone.length > 11) {
      setPhoneError('Invalid phone number format.');
      return;
    }

    setPhoneError('');

    // Fetch existing customer details (AC-01)
    const delayDebounce = setTimeout(async () => {
      try {
        const response = await fetch(`/api/customer-profile/by-phone/${cleanPhone}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
        if (response.ok) {
          const profile = await response.json();
          if (profile.representative || profile.companyName) {
            setCustomerName(profile.representative || profile.companyName);
            setHighlightErrors(prev => ({ ...prev, customerName: false }));
          }
          if (profile.companyAddress) {
            setAddress(profile.companyAddress);
          }
        }
      } catch (err) {
        console.error('Error fetching customer details:', err);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [phoneNumber]);

  // ─── Add Product ───────────────────────────────────────────────────────────
  const handleAddProduct = (product: any) => {
    const stock = product.availableStock ?? 0;

    // Concurrency or standard stock validation (NAC-01, BV-01)
    const existingIndex = items.findIndex(i => i.productId === product.id);
    if (existingIndex > -1) {
      const existingItem = items[existingIndex];
      const targetQty = existingItem.quantity + 1;
      if (targetQty > stock) {
        setStockErrors(prev => ({
          ...prev,
          [existingItem.id]: `Insufficient stock. Available: ${stock} units. Please adjust the quantity or contact Warehouse.`
        }));
        alert(`Insufficient stock. Available: ${stock} units. Please adjust the quantity or contact Warehouse.`);
        return;
      }
      const updated = [...items];
      updated[existingIndex].quantity = targetQty;
      setItems(updated);

      // Clear error if resolved
      setStockErrors(prev => {
        const copy = { ...prev };
        delete copy[existingItem.id];
        return copy;
      });
    } else {
      if (1 > stock) {
        alert(`Insufficient stock. Available: ${stock} units. Please adjust the quantity or contact Warehouse.`);
        return;
      }

      let defaultUnit = 'Cuộn';
      const nameLower = product.name.toLowerCase();
      if (nameLower.includes('khăn') || nameLower.includes('tờ') || nameLower.includes('rút')) {
        defaultUnit = 'Gói';
      }
      if (nameLower.includes('hộp')) {
        defaultUnit = 'Hộp';
      }
      if (nameLower.includes('thùng')) {
        defaultUnit = 'Thùng';
      }

      setItems([
        ...items,
        {
          id: `${Date.now()}-${product.id}`,
          productId: product.id,
          name: product.name,
          sku: product.sku,
          unit: defaultUnit,
          quantity: 1,
          price: product.standardListedPrice,
          note: '',
          availableStock: stock
        }
      ]);
    }
    setSearchQuery('');
    setShowDropdown(false);
  };

  // ─── Edit fields ───────────────────────────────────────────────────────────
  const updateItemField = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        if (field === 'quantity') {
          const requestedQty = value === '' ? 0 : (parseInt(value) || 0);
          const stock = item.availableStock ?? 0;
          if (requestedQty > stock) {
            setStockErrors(prev => ({
              ...prev,
              [item.id]: `Insufficient stock. Available: ${stock} units. Please adjust the quantity or contact Warehouse.`
            }));
          } else if (requestedQty <= 0) {
            setStockErrors(prev => ({
              ...prev,
              [item.id]: `Quantity must be greater than 0.`
            }));
          } else {
            setStockErrors(prev => {
              const copy = { ...prev };
              delete copy[item.id];
              return copy;
            });
          }
          return { ...item, quantity: requestedQty };
        }
        if (field === 'price') {
          return { ...item, price: Math.max(0, parseFloat(value) || 0) };
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
    setStockErrors(prev => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  // ─── Calculations ──────────────────────────────────────────────────────────
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const totalAfterDiscount = subtotal - discountAmount;
  const vatAmount = hasVat ? Math.round(totalAfterDiscount * 0.1) : 0;
  const totalAmount = totalAfterDiscount + vatAmount;

  // Format date Vietnamese
  const formatDateVietnamese = (dateStr: string) => {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `Ngày ${day} tháng ${month} năm ${year}`;
  };

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN').format(price);
  };

  // ─── Generate PDF & Save Order ─────────────────────────────────────────────
  const generatePdfBlob = async (): Promise<string | null> => {
    if (!previewRef.current) return null;
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const width = paperSize === 'A5' ? 148 : 210;
      const height = paperSize === 'A5' ? 210 : 297;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: paperSize === 'A5' ? 'a5' : 'a4'
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, width, height);
      return pdf.output('datauristring'); // base64 URI
    } catch (err) {
      console.error('Lỗi khi vẽ PDF:', err);
      return null;
    }
  };

  const handleLocalDownloadPdf = async () => {
    if (items.length === 0) {
      alert('Vui lòng thêm sản phẩm trước khi xuất hóa đơn.');
      return;
    }
    if (!previewRef.current) return;

    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const width = paperSize === 'A5' ? 148 : 210;
      const height = paperSize === 'A5' ? 210 : 297;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: paperSize === 'A5' ? 'a5' : 'a4'
      });

      pdf.addImage(imgData, 'JPEG', 0, 0, width, height);
      pdf.save(`HoaDon_Viettien_${customerName.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    } catch (err) {
      console.error('Lỗi tải PDF:', err);
      alert('Không thể xuất PDF. Vui lòng kiểm tra console.');
    }
  };

  const handleSaveOrder = async () => {
    // Validation checks (NAC-02)
    const errors: Record<string, boolean> = {};
    if (!customerName || customerName.trim() === '') {
      errors.customerName = true;
    }
    if (!phoneNumber || phoneNumber.trim() === '') {
      errors.phoneNumber = true;
    }
    if (phoneError) {
      errors.phoneNumber = true;
    }
    if (items.length === 0) {
      errors.items = true;
    }

    if (Object.keys(errors).length > 0) {
      setHighlightErrors(errors);
      setErrorMsg('Vui lòng điền đầy đủ các thông tin bắt buộc và kiểm tra lỗi.');
      return;
    }

    if (Object.keys(stockErrors).length > 0) {
      setErrorMsg('Vui lòng điều chỉnh các dòng sản phẩm có lỗi số lượng/tồn kho.');
      return;
    }

    setHighlightErrors({});
    setSubmitting(true);
    setErrorMsg('');

    try {
      // 1. Generate PDF base64 string
      const pdfBase64 = await generatePdfBlob();

      // 2. Prepare payload
      const backendPaymentMethod = paymentMethod === 'Cash' ? 'Cash' : 'SePay';

      const payload = {
        customerName: customerName,
        phoneNumber: phoneNumber || null,
        address: address || null,
        totalAmount: subtotal,
        discountAmount: discountAmount,
        vatAmount: vatAmount,
        finalPayment: totalAmount,
        paymentMethod: backendPaymentMethod,
        invoicePdfBase64: pdfBase64,
        items: items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price
        }))
      };

      // 3. Post to API (Atomic inventory deduction AC-03, NAC-03)
      const result = await placeDirectOrder(payload);

      setSuccessOrder({ ...result, paymentMethod: backendPaymentMethod });

      // 4. Open generated PDF in a new tab immediately (AC-04)
      if (previewRef.current) {
        try {
          const canvas = await html2canvas(previewRef.current, {
            scale: 2,
            useCORS: true
          });
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          const width = paperSize === 'A5' ? 148 : 210;
          const height = paperSize === 'A5' ? 210 : 297;

          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: paperSize === 'A5' ? 'a5' : 'a4'
          });

          pdf.addImage(imgData, 'JPEG', 0, 0, width, height);
          const pdfBlob = pdf.output('blob');
          const blobUrl = URL.createObjectURL(pdfBlob);
          window.open(blobUrl, '_blank');
        } catch (err) {
          console.error('Error auto-opening print tab:', err);
        }
      }

      // Clear invoice form on success
      setItems([]);
      setCustomerName('Khách lẻ');
      setPhoneNumber('');
      setAddress('Thái Bình');
      setDiscountPercent(0);
      setHasVat(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi hệ thống khi lưu đơn hàng.');
    } finally {
      setSubmitting(false);
    }
  };

  // Generate blank table rows to match image (fills layout space)
  const minRows = 12;
  const blankRowsCount = Math.max(0, minRows - items.length);
  const blankRows = Array.from({ length: blankRowsCount });

  return (
    <div className="flex flex-col h-full bg-slate-50" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* Top Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 h-12 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/sales/dashboard')}
            className="p-1 rounded hover:bg-slate-100 text-slate-500 transition-colors"
            title="Quay lại"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-[14px] font-bold text-slate-800">Mua hàng trực tiếp tại quầy (POS)</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-lg bg-slate-100 p-1">
            <button
              onClick={() => setPaperSize('A5')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${paperSize === 'A5' ? 'bg-white shadow-sm text-blue-900' : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              Khổ A5
            </button>
            <button
              onClick={() => setPaperSize('A4')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${paperSize === 'A4' ? 'bg-white shadow-sm text-blue-900' : 'text-slate-500 hover:text-slate-900'
                }`}
            >
              Khổ A4 (Auto Scale)
            </button>
          </div>
          <button
            onClick={handleLocalDownloadPdf}
            className="h-8 px-3 rounded-lg text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <Printer className="w-4 h-4 text-slate-500" /> Tải PDF/In
          </button>
          <button
            onClick={handleSaveOrder}
            disabled={submitting || items.length === 0}
            className="h-8 px-4 rounded-lg text-white bg-blue-900 hover:bg-blue-950 transition-colors flex items-center gap-1.5 text-xs font-bold shadow-sm disabled:bg-slate-300 disabled:text-slate-500"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Đang lưu...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" /> Lưu & Xuất Hóa Đơn
              </>
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden p-4 gap-4">
        {/* LEFT COLUMN - FORM ENTRY */}
        <div className="w-[45%] flex flex-col bg-white border border-slate-200 rounded-xl p-5 overflow-y-auto space-y-5">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-slate-100">Thông tin khách hàng & sản phẩm</h2>

          {errorMsg && (
            <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-200">
              {errorMsg}
            </div>
          )}

          {successOrder && (
            <div className="bg-green-50 text-green-800 text-xs p-4 rounded-lg border border-green-200 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 font-bold text-sm">
                <Check className="w-5 h-5 text-green-600 bg-green-100 rounded-full p-0.5" />
                <span>Lưu đơn hàng thành công!</span>
              </div>
              <p>Mã đơn hàng: <strong className="text-blue-900">{successOrder.orderCode}</strong></p>
              <p>Tổng tiền thanh toán: <strong>{formatPrice(successOrder.finalPayment)} đ</strong></p>

              {successOrder.paymentMethod === 'SePay' && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 flex flex-col items-center gap-2">
                  <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wide">Mã QR Quét Thanh Toán SePay</span>
                  {sepayQr ? (
                    <>
                      <img src={sepayQr.qrImageUrl} alt="SePay QR Code" className="w-48 h-48 border border-slate-100" />
                      <div className="text-center text-[10px] text-slate-500 leading-tight">
                        <p>Nội dung CK: <strong className="text-blue-900">{sepayQr.transferContent}</strong></p>
                        <p>Số tiền: <strong>{formatPrice(successOrder.finalPayment)} đ</strong></p>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-400 py-6">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      <span>Đang tải mã QR...</span>
                    </div>
                  )}

                  <div className="mt-2 flex items-center justify-center">
                    {paymentStatus === 'Paid' ? (
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-bold text-[10px] flex items-center gap-1.5 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-green-600"></span>
                        ĐÃ THANH TOÁN THÀNH CÔNG!
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full font-semibold text-[10px] flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                        Chờ quét mã thanh toán...
                      </span>
                    )}
                  </div>
                </div>
              )}

              {successOrder.invoicePdfUrl && (
                <a
                  href={`/api${successOrder.invoicePdfUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex text-xs text-blue-600 hover:underline font-semibold"
                >
                  Xem tệp PDF hóa đơn đã lưu trên hệ thống
                </a>
              )}

              {successOrder.paymentMethod === 'Cash' && (
                <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 flex flex-col gap-2">
                  <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wide">Thanh toán tiền mặt</span>
                  {paymentStatus === 'Paid' ? (
                    <div className="flex items-center justify-center py-2">
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-bold text-[10px] flex items-center gap-1.5 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-green-600"></span>
                        ĐÃ NHẬN TIỀN MẶT & HOÀN TẤT!
                      </span>
                    </div>
                  ) : (
                    <>
                      <p className="text-[10px] text-amber-600 font-semibold bg-amber-50 p-2 rounded border border-amber-100">
                        Vui lòng thu tiền mặt số tiền <strong>{formatPrice(successOrder.finalPayment)}đ</strong> từ khách hàng trước khi xác nhận.
                      </p>
                      <button
                        onClick={handleConfirmCashPayment}
                        disabled={confirmingCash}
                        className="mt-1 w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-[11px] flex items-center justify-center gap-1.5 shadow transition-colors disabled:bg-slate-300 disabled:text-slate-500 cursor-pointer"
                      >
                        {confirmingCash ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang xác nhận...
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" /> Xác nhận đã nhận tiền mặt
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}

              <button
                onClick={() => {
                  setSuccessOrder(null);
                  setSepayQr(null);
                  setPaymentStatus('');
                }}
                className="mt-2 w-full py-1.5 border border-slate-300 rounded bg-white text-slate-700 hover:bg-slate-50 text-[11px] font-semibold cursor-pointer"
              >
                Tạo hóa đơn mới
              </button>
            </div>
          )}

          {/* Customer Profile inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tên khách hàng</label>
              <input
                type="text"
                value={customerName}
                onChange={e => {
                  setCustomerName(e.target.value);
                  if (e.target.value.trim() !== '') {
                    setHighlightErrors(prev => ({ ...prev, customerName: false }));
                  }
                }}
                placeholder="Nhập tên khách hàng (vd: Siêu thị Vinmart+, Chị Hạnh...)"
                className={`w-full text-xs h-8 border rounded px-2.5 outline-none focus:border-blue-900 ${highlightErrors.customerName ? 'border-red-500 bg-red-50' : 'border-slate-300'
                  }`}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Số điện thoại</label>
              <input
                type="text"
                value={phoneNumber}
                onChange={e => {
                  setPhoneNumber(e.target.value);
                  if (e.target.value.trim() !== '') {
                    setHighlightErrors(prev => ({ ...prev, phoneNumber: false }));
                  }
                }}
                placeholder="09xx xxx xxx"
                className={`w-full text-xs h-8 border rounded px-2.5 outline-none focus:border-blue-900 ${highlightErrors.phoneNumber ? 'border-red-500 bg-red-50' : 'border-slate-300'
                  }`}
              />
              {phoneError && (
                <p className="text-[10px] text-red-500 font-semibold mt-0.5">{phoneError}</p>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Ngày lập phiếu</label>
              <input
                type="date"
                value={invoiceDate}
                onChange={e => setInvoiceDate(e.target.value)}
                className="w-full text-xs h-8 border border-slate-300 rounded px-2.5 outline-none focus:border-blue-900"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Địa chỉ</label>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Nhập địa chỉ nhận hàng"
                className="w-full text-xs h-8 border border-slate-300 rounded px-2.5 outline-none focus:border-blue-900"
              />
            </div>
          </div>

          {/* Product Lookup */}
          <div className="relative" ref={dropdownRef}>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tìm kiếm sản phẩm</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setShowDropdown(true)}
                onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                placeholder="Tìm theo tên hoặc mã SKU sản phẩm..."
                className="w-full text-xs h-8 border border-slate-300 rounded pl-9 pr-4 outline-none focus:border-blue-900"
              />
              {searching && (
                <div className="absolute right-2.5 top-2.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                </div>
              )}
            </div>

            {/* Dropdown search results */}
            {showDropdown && searchQuery.trim() && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100">
                {searchResults.length > 0 ? (
                  searchResults.map(p => (
                    <div
                      key={p.id}
                      onClick={() => handleAddProduct(p)}
                      className="p-2.5 text-xs hover:bg-slate-50 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div className="min-w-0 pr-3">
                        <p className="font-semibold text-slate-800 truncate">{p.name}</p>
                        <p className="text-[10px] text-slate-400">SKU: {p.sku} | Kho: {p.availableStock ?? 0}</p>
                      </div>
                      <span className="font-bold text-slate-900 whitespace-nowrap">{formatPrice(p.standardListedPrice)}đ</span>
                    </div>
                  ))
                ) : (
                  !searching && (
                    <div className="p-3 text-xs text-slate-400 text-center">Không tìm thấy sản phẩm nào</div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Form Item list */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-500 uppercase">Sản phẩm đã chọn ({items.length})</label>
            <div className={`border rounded-lg divide-y divide-slate-200 max-h-64 overflow-y-auto bg-slate-50 ${highlightErrors.items ? 'border-red-500 bg-red-50' : 'border-slate-200'
              }`}>
              {items.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">Chưa có sản phẩm nào. Dùng ô tìm kiếm để chọn sản phẩm.</div>
              ) : (
                items.map(item => {
                  const hasStockError = !!stockErrors[item.id];
                  return (
                    <div
                      key={item.id}
                      className={`p-3 flex flex-col gap-2 transition-colors ${hasStockError ? 'bg-red-50 border border-red-500 rounded-md' : 'bg-white'
                        }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-400">SKU: {item.sku} | Kho: {item.availableStock}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-slate-400 hover:text-red-500 transition-colors p-1"
                          title="Xóa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">ĐVT</label>
                          <input
                            type="text"
                            value={item.unit}
                            onChange={e => updateItemField(item.id, 'unit', e.target.value)}
                            className="w-full text-xs h-7 border border-slate-300 rounded px-1.5 outline-none focus:border-blue-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Số lượng</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={e => updateItemField(item.id, 'quantity', e.target.value)}
                            className={`w-full text-xs h-7 border rounded px-1.5 outline-none focus:border-blue-900 ${hasStockError ? 'border-red-500 bg-red-100 text-red-700 font-bold' : 'border-slate-300'
                              }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Đơn giá (đ)</label>
                          <input
                            type="number"
                            value={item.price}
                            onChange={e => updateItemField(item.id, 'price', e.target.value)}
                            className="w-full text-xs h-7 border border-slate-300 rounded px-1.5 outline-none focus:border-blue-900"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">Ghi chú</label>
                          <input
                            type="text"
                            value={item.note}
                            onChange={e => updateItemField(item.id, 'note', e.target.value)}
                            className="w-full text-xs h-7 border border-slate-300 rounded px-1.5 outline-none focus:border-blue-900"
                            placeholder="..."
                          />
                        </div>
                      </div>
                      {hasStockError && (
                        <p className="text-[10px] text-red-600 font-bold leading-tight mt-1">
                          {stockErrors[item.id]}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Discounts, VAT, Payment Method */}
          <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Phương thức thanh toán</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as any)}
                className="w-full text-xs h-8 border border-slate-300 rounded px-2 outline-none focus:border-blue-900 bg-white"
              >
                <option value="Cash">Tiền mặt tại quầy</option>
                <option value="SePay">Chuyển khoản SePay</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Chiết khấu (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={e => setDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-full text-xs h-8 border border-slate-300 rounded px-2 outline-none focus:border-blue-900"
              />
            </div>
            <div className="col-span-2 flex items-center gap-2 py-1">
              <input
                type="checkbox"
                id="vatCheckbox"
                checked={hasVat}
                onChange={e => setHasVat(e.target.checked)}
                className="w-4 h-4 rounded text-blue-900 border-slate-300 focus:ring-blue-900 accent-blue-900"
              />
              <label htmlFor="vatCheckbox" className="text-xs font-semibold text-slate-600 cursor-pointer select-none">
                Tính thêm thuế VAT (10%)
              </label>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - LIVE DYNAMIC PREVIEW */}
        <div className="flex-1 bg-slate-200 border border-slate-300 rounded-xl overflow-auto p-6 flex justify-center items-start">
          {/* Zoom Wrapper to prevent html2canvas render distortion and errors */}
          <div
            style={{
              transform: paperSize === 'A5' ? 'scale(1)' : 'scale(0.85)',
              transformOrigin: 'top center',
            }}
          >
            {/* Document preview container */}
            <div
              ref={previewRef}
              className="relative overflow-hidden flex flex-col shrink-0"
              style={{
                width: paperSize === 'A5' ? '148mm' : '210mm',
                minHeight: paperSize === 'A5' ? '210mm' : '297mm',
                fontFamily: '"Times New Roman", Times, serif',
                color: '#000',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                padding: '2rem',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
              }}
            >
              {/* INVOICE TITLE */}
              <div className="text-center mt-2 mb-4">
                <h1 className="text-[22px] font-bold tracking-wide uppercase leading-tight">Phiếu Giao Hàng</h1>
              </div>

              {/* CUSTOMER & DETAILS INFO */}
              <div className="space-y-1.5 text-[13px] leading-relaxed mb-4">
                <div className="flex">
                  <span className="whitespace-nowrap">Tên khách hàng :&nbsp;</span>
                  <span className="border-b border-dotted border-black flex-1 font-bold">
                    {customerName ? `CH - ${customerName}` : ''}
                  </span>
                </div>
                <div className="flex">
                  <span className="whitespace-nowrap">Địa chỉ:&nbsp;</span>
                  <span className="border-b border-dotted border-black flex-1">
                    {address}
                  </span>
                </div>
                {phoneNumber && (
                  <div className="flex">
                    <span className="whitespace-nowrap">Số điện thoại:&nbsp;</span>
                    <span className="border-b border-dotted border-black flex-1 font-medium">
                      {phoneNumber}
                    </span>
                  </div>
                )}
              </div>

              {/* PRODUCTS GRID TABLE */}
              <div className="flex-1 mb-4">
                <table className="w-full text-[12px] border-collapse border border-black">
                  <thead>
                    <tr className="text-[11px] font-bold text-center" style={{ backgroundColor: '#f8fafc' }}>
                      <th className="border border-black px-2 py-1.5 w-[42%]">Quy cách</th>
                      <th className="border border-black px-2 py-1.5 w-[10%]">ĐVT</th>
                      <th className="border border-black px-2 py-1.5 w-[10%]">Số lượng</th>
                      <th className="border border-black px-2 py-1.5 w-[13%]">Đơn giá</th>
                      <th className="border border-black px-2 py-1.5 w-[15%]">Thành tiền</th>
                      <th className="border border-black px-2 py-1.5 w-[10%]">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="leading-relaxed">
                        <td className="border border-black px-2 py-1 font-bold align-middle">{item.name}</td>
                        <td className="border border-black px-2 py-1 text-center align-middle">{item.unit}</td>
                        <td className="border border-black px-2 py-1 text-center align-middle">{item.quantity}</td>
                        <td className="border border-black px-2 py-1 text-right align-middle">{formatPrice(item.price)}</td>
                        <td className="border border-black px-2 py-1 text-right align-middle font-bold">
                          {formatPrice(item.quantity * item.price)}
                        </td>
                        <td className="border border-black px-2 py-1 text-center align-middle text-[10px]">{item.note}</td>
                      </tr>
                    ))}

                    {/* Blank placeholder rows matching the original template */}
                    {blankRows.map((_, idx) => (
                      <tr key={`blank-${idx}`} className="h-6">
                        <td className="border border-black">&nbsp;</td>
                        <td className="border border-black">&nbsp;</td>
                        <td className="border border-black">&nbsp;</td>
                        <td className="border border-black">&nbsp;</td>
                        <td className="border border-black">&nbsp;</td>
                        <td className="border border-black">&nbsp;</td>
                      </tr>
                    ))}

                    {/* Totals row */}
                    <tr>
                      <td colSpan={4} className="border border-black px-2 py-1.5 font-bold text-center uppercase tracking-wider" style={{ backgroundColor: '#f8fafc' }}>
                        Cộng
                      </td>
                      <td className="border border-black px-2 py-1.5 text-right font-bold" style={{ color: '#dc2626', backgroundColor: '#f8fafc' }}>
                        {formatPrice(subtotal)}
                      </td>
                      <td className="border border-black" style={{ backgroundColor: '#f8fafc' }}>&nbsp;</td>
                    </tr>

                    {/* Discount details row if any */}
                    {discountPercent > 0 && (
                      <tr>
                        <td colSpan={4} className="border border-black px-2 py-1 text-right text-[11px] font-semibold" style={{ color: '#64748b' }}>
                          Chiết khấu ({discountPercent}%)
                        </td>
                        <td className="border border-black px-2 py-1 text-right font-semibold" style={{ color: '#64748b' }}>
                          -{formatPrice(discountAmount)}
                        </td>
                        <td className="border border-black">&nbsp;</td>
                      </tr>
                    )}

                    {/* VAT row if checked */}
                    {hasVat && (
                      <tr>
                        <td colSpan={4} className="border border-black px-2 py-1 text-right text-[11px] font-semibold" style={{ color: '#64748b' }}>
                          Thuế VAT (10%)
                        </td>
                        <td className="border border-black px-2 py-1 text-right font-semibold" style={{ color: '#64748b' }}>
                          {formatPrice(vatAmount)}
                        </td>
                        <td className="border border-black">&nbsp;</td>
                      </tr>
                    )}

                    {/* Final payment total row */}
                    {(discountPercent > 0 || hasVat) && (
                      <tr className="font-bold" style={{ backgroundColor: '#f1f5f9' }}>
                        <td colSpan={4} className="border border-black px-2 py-1.5 text-center uppercase tracking-wider">
                          Tổng thanh toán
                        </td>
                        <td className="border border-black px-2 py-1.5 text-right text-[13px]" style={{ color: '#b91c1c' }}>
                          {formatPrice(totalAmount)}
                        </td>
                        <td className="border border-black">&nbsp;</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* WRITE IN WORDS FOOTER */}
              <div className="space-y-4 text-[13px] leading-relaxed">
                <div className="flex items-start">
                  <span className="whitespace-nowrap">Thành tiền viết thành chữ :&nbsp;</span>
                  <span className="flex-1 font-bold italic leading-tight">
                    {numberToVietnameseWords(totalAmount)}
                  </span>
                </div>

                {/* DATE STATEMENT */}
                <div className="text-right italic font-medium pr-4 mt-2">
                  {formatDateVietnamese(invoiceDate)}
                </div>

                {/* SIGNATURE SECTION */}
                <div className="grid grid-cols-3 text-center text-[12px] font-bold mt-4 pt-1 gap-2 leading-relaxed">
                  <div>
                    <p>Người nhận hàng</p>
                    <span className="text-[10px] block font-normal mt-0.5" style={{ color: '#94a3b8' }}>(Ký, ghi rõ họ tên)</span>
                  </div>
                  <div>
                    <p>Đã nhận đủ tiền</p>
                    <span className="text-[10px] block font-normal mt-0.5" style={{ color: '#94a3b8' }}>(Ký, ghi rõ họ tên)</span>
                  </div>
                  <div>
                    <p>Người lập phiếu</p>
                    <span className="text-[10px] block font-normal mt-0.5" style={{ color: '#94a3b8' }}>(Ký, ghi rõ họ tên)</span>
                  </div>
                </div>

                {/* Pad bottom for signature signing height */}
                <div className="h-16"></div>
              </div>
            </div>
          </div> {/* Zoom Wrapper */}
        </div>
      </div>

      {showRedirectSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white/95 border border-slate-200 shadow-2xl rounded-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center text-center animate-scale-up">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600 animate-pulse">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">Thanh Toán Thành Công!</h3>
            <p className="text-xs text-slate-500 mt-2">
              Đơn hàng <strong className="text-blue-900">{successOrder?.orderCode}</strong> đã được thanh toán và hoàn tất.
            </p>
            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mt-6">
              <div className="bg-green-600 h-full rounded-full animate-progress-bar"></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">Đang chuyển hướng về Dashboard bán hàng...</p>
          </div>
        </div>
      )}
      <style>{`
        @keyframes progressBar {
          from { width: 0%; }
          to { width: 100%; }
        }
        .animate-progress-bar {
          animation: progressBar 2.5s linear forwards;
        }
      `}</style>
    </div>
  );
}
