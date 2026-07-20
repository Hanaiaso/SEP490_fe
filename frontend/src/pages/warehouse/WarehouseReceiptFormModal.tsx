import React, { useState } from 'react';
import { X, HelpCircle, Settings, Trash2, Plus, Calendar, Paperclip } from 'lucide-react';

interface ReceiptItem {
  id: string;
  itemCode: string;
  itemName: string;
  warehouse: string;
  debitAccount: string;
  creditAccount: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function WarehouseReceiptFormModal({
  onClose
}: {
  onClose: () => void;
}) {
  const [items, setItems] = useState<ReceiptItem[]>([
    {
      id: '1', itemCode: 'NL_001', itemName: 'Vải Cotton', warehouse: 'KHO_155',
      debitAccount: '1521', creditAccount: '331', unit: 'Cuộn', quantity: 10, unitPrice: 500000, total: 5000000
    }
  ]);

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        id: Date.now().toString(),
        itemCode: '', itemName: '', warehouse: 'KHO_155',
        debitAccount: '1521', creditAccount: '331', unit: '', quantity: 0, unitPrice: 0, total: 0
      }
    ]);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col font-sans text-[13px] text-gray-800">
      {/* Header */}
      <div className="h-12 bg-white border-b flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-medium flex items-center gap-2">
            <span className="text-gray-400">🕒</span> Phiếu nhập kho NK00027
          </h2>
          <select className="border-b border-blue-500 bg-transparent text-sm focus:outline-none text-blue-700 pb-0.5">
            <option>1. Thành phẩm sản xuất</option>
            <option>2. Nhập mua hàng</option>
            <option>3. Nhập khác</option>
          </select>
          <div className="relative ml-2">
            <input type="text" placeholder="Nhập lệnh sản xuất" className="border rounded px-2 py-1 text-[12px] w-48 italic text-gray-500 focus:outline-none focus:border-blue-500" />
            <SearchIcon className="w-3.5 h-3.5 absolute right-2 top-1.5 text-gray-400" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button className="flex items-center gap-1.5 text-green-600 font-medium hover:bg-green-50 px-2 py-1 rounded">
            <div className="w-4 h-4 rounded-full border border-green-600 flex items-center justify-center text-[10px]">?</div>
            Hướng dẫn
          </button>
          <button className="text-gray-500 hover:text-gray-700">
            <Settings className="w-5 h-5" />
          </button>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-[#F4F5F8] p-3 flex flex-col">
        {/* Form Info */}
        <div className="bg-white rounded border border-gray-200 p-4 mb-3 grid grid-cols-12 gap-6 shadow-sm">
          {/* Left col */}
          <div className="col-span-8 flex flex-col gap-3">
            <div className="flex gap-4">
              <div className="w-1/3">
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Mã người giao hàng</label>
                <div className="flex">
                  <input type="text" className="flex-1 border rounded-l px-2 py-1.5 focus:border-blue-500 outline-none" defaultValue="CTTRUNG" />
                  <button className="border border-l-0 rounded-r px-2 bg-gray-50 text-gray-500 hover:bg-gray-100">+</button>
                </div>
              </div>
              <div className="w-2/3">
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Tên người giao hàng</label>
                <input type="text" className="w-full border rounded px-2 py-1.5 focus:border-blue-500 outline-none" defaultValue="Cao Thành Trung" />
              </div>
            </div>
            
            <div>
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Diễn giải</label>
              <input type="text" className="w-full border rounded px-2 py-1.5 focus:border-blue-500 outline-none" defaultValue="Nhập kho thành phẩm" />
            </div>

            <div className="flex items-center gap-3">
              <label className="text-[12px] font-medium text-gray-600 whitespace-nowrap">Kèm theo</label>
              <input type="text" className="w-20 border rounded px-2 py-1 text-right focus:border-blue-500 outline-none" placeholder="Số lượng" />
              <span className="text-[12px] text-gray-500">chứng từ gốc</span>
              <span className="text-[12px] text-blue-600 ml-4 cursor-pointer hover:underline">Tham chiếu LSX00006 ...</span>
            </div>
          </div>

          {/* Right col */}
          <div className="col-span-4 border-l pl-6 flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-4">
                <label className="block text-[12px] font-medium text-gray-600 mb-1">Ngày hạch toán</label>
                <div className="relative">
                  <input type="text" className="w-full border rounded px-2 py-1.5 pr-8 focus:border-blue-500 outline-none font-medium" defaultValue="23/02/2024" />
                  <Calendar className="w-4 h-4 text-gray-400 absolute right-2 top-2" />
                </div>
              </div>
              <div className="text-right">
                <span className="block text-[12px] text-gray-500">Tổng tiền</span>
                <span className="text-2xl font-bold text-gray-800 block leading-none mt-1">
                  {new Intl.NumberFormat('vi-VN').format(calculateTotal())}
                </span>
              </div>
            </div>

            <div className="w-1/2 pr-2">
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Ngày chứng từ</label>
              <div className="relative">
                <input type="text" className="w-full border rounded px-2 py-1.5 pr-8 focus:border-blue-500 outline-none font-medium" defaultValue="23/02/2024" />
                <Calendar className="w-4 h-4 text-gray-400 absolute right-2 top-2" />
              </div>
            </div>

            <div className="w-1/2 pr-2">
              <label className="block text-[12px] font-medium text-gray-600 mb-1">Số chứng từ</label>
              <input type="text" className="w-full border rounded px-2 py-1.5 focus:border-blue-500 outline-none font-medium" defaultValue="NK00027" />
            </div>
          </div>
        </div>

        {/* Grid Area */}
        <div className="flex-1 bg-white rounded border border-gray-200 flex flex-col shadow-sm">
          <div className="border-b px-4 py-2">
            <h3 className="font-semibold text-gray-800">Hàng tiền</h3>
          </div>
          
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-[#F3F4F6] border-b text-[12px]">
                  <th className="border-r w-10 text-center py-2 font-semibold text-gray-600">#</th>
                  <th className="border-r px-2 py-2 text-left font-semibold text-gray-600">Mã hàng</th>
                  <th className="border-r px-2 py-2 text-left font-semibold text-gray-600">Tên hàng</th>
                  <th className="border-r px-2 py-2 text-left font-semibold text-gray-600 w-24">Kho</th>
                  <th className="border-r px-2 py-2 text-left font-semibold text-gray-600 w-20">TK Nợ</th>
                  <th className="border-r px-2 py-2 text-left font-semibold text-gray-600 w-20">TK Có</th>
                  <th className="border-r px-2 py-2 text-center font-semibold text-gray-600 w-20">ĐVT</th>
                  <th className="border-r px-2 py-2 text-right font-semibold text-gray-600 w-28">Số lượng</th>
                  <th className="border-r px-2 py-2 text-right font-semibold text-gray-600 w-32">Đơn giá</th>
                  <th className="border-r px-2 py-2 text-right font-semibold text-gray-600 w-32">Thành tiền</th>
                  <th className="w-10 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={item.id} className="border-b hover:bg-yellow-50 focus-within:bg-yellow-50 group">
                    <td className="border-r text-center py-1.5 text-gray-500">{index + 1}</td>
                    <td className="border-r px-1"><input className="w-full px-1 py-1 bg-transparent focus:bg-white focus:outline-none focus:ring-1 ring-blue-400 border border-transparent focus:border-blue-400" defaultValue={item.itemCode} /></td>
                    <td className="border-r px-1"><input className="w-full px-1 py-1 bg-transparent focus:bg-white focus:outline-none focus:ring-1 ring-blue-400 border border-transparent focus:border-blue-400" defaultValue={item.itemName} /></td>
                    <td className="border-r px-1"><input className="w-full px-1 py-1 bg-transparent focus:bg-white focus:outline-none focus:ring-1 ring-blue-400 border border-transparent focus:border-blue-400" defaultValue={item.warehouse} /></td>
                    <td className="border-r px-1"><input className="w-full px-1 py-1 bg-transparent focus:bg-white focus:outline-none focus:ring-1 ring-blue-400 border border-transparent focus:border-blue-400" defaultValue={item.debitAccount} /></td>
                    <td className="border-r px-1"><input className="w-full px-1 py-1 bg-transparent focus:bg-white focus:outline-none focus:ring-1 ring-blue-400 border border-transparent focus:border-blue-400" defaultValue={item.creditAccount} /></td>
                    <td className="border-r px-1 text-center"><input className="w-full text-center px-1 py-1 bg-transparent focus:bg-white focus:outline-none focus:ring-1 ring-blue-400 border border-transparent focus:border-blue-400" defaultValue={item.unit} /></td>
                    <td className="border-r px-1"><input type="number" className="w-full text-right px-1 py-1 bg-transparent focus:bg-white focus:outline-none focus:ring-1 ring-blue-400 border border-transparent focus:border-blue-400" defaultValue={item.quantity} /></td>
                    <td className="border-r px-1"><input type="number" className="w-full text-right px-1 py-1 bg-transparent focus:bg-white focus:outline-none focus:ring-1 ring-blue-400 border border-transparent focus:border-blue-400" defaultValue={item.unitPrice} /></td>
                    <td className="border-r px-2 text-right font-medium text-gray-700 bg-gray-50">{new Intl.NumberFormat('vi-VN').format(item.total)}</td>
                    <td className="text-center px-1">
                      <button onClick={() => handleRemoveItem(item.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#F9FAFB] font-semibold border-b">
                  <td colSpan={7} className="border-r px-3 py-2 text-left">Tổng số: {items.length} bản ghi</td>
                  <td className="border-r px-2 py-2 text-right text-gray-800">{items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)}</td>
                  <td className="border-r"></td>
                  <td className="border-r px-2 py-2 text-right text-gray-800">{new Intl.NumberFormat('vi-VN').format(calculateTotal())}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Grid Actions */}
          <div className="p-3 border-t bg-white flex items-start justify-between">
            <div className="flex gap-2">
              <button onClick={handleAddItem} className="px-3 py-1.5 border rounded bg-white text-gray-700 hover:bg-gray-50 font-medium shadow-sm">
                Thêm dòng
              </button>
              <button onClick={() => setItems([])} className="px-3 py-1.5 border rounded bg-white text-gray-700 hover:bg-gray-50 shadow-sm">
                Xóa hết dòng
              </button>
            </div>
            
            <div className="border rounded p-3 w-72 bg-[#FAFAFA] border-dashed">
              <div className="flex items-center gap-2 mb-2">
                <Paperclip className="w-4 h-4 text-gray-400" />
                <span className="font-semibold text-gray-600">Đính kèm</span>
                <span className="text-[11px] text-gray-400">Dung lượng tối đa 5MB</span>
              </div>
              <div className="border border-dashed border-gray-300 rounded bg-white text-center p-3 text-gray-400 cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors">
                Kéo/thả tệp vào đây hoặc bấm vào đây
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="h-12 bg-[#333333] flex items-center justify-between px-4 flex-shrink-0 text-white">
        <button onClick={onClose} className="px-4 py-1.5 border border-gray-500 rounded hover:bg-gray-700 transition-colors">
          Hủy
        </button>
        <div className="flex items-center gap-2">
          <button className="px-4 py-1.5 border border-gray-500 rounded hover:bg-gray-700 transition-colors">
            Cất
          </button>
          <div className="flex">
            <button className="px-4 py-1.5 bg-[#2E7D32] hover:bg-[#1B5E20] border border-[#2E7D32] rounded-l font-medium transition-colors">
              Cất và In
            </button>
            <button className="px-2 py-1.5 bg-[#2E7D32] hover:bg-[#1B5E20] border border-l-0 border-white/20 rounded-r transition-colors">
              ▼
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
