import React, { useState } from 'react';
import { Filter, Search, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import WarehouseReceiptFormModal from './WarehouseReceiptFormModal';

// Mock Data
const MOCK_RECEIPTS = [
  {
    id: '1',
    date: '21/02/2024',
    voucherNo: 'NK00026',
    description: 'Mua hàng của CÔNG TY CỔ PHẦN HOÀNG MINH theo hóa đơn số 0002157',
    total: 82250000,
    deliverer: '',
    type: 'Mua hàng trong nước nhập kho'
  },
  {
    id: '2',
    date: '21/02/2024',
    voucherNo: 'NK00025',
    description: 'Mua hàng của CÔNG TY CỔ PHẦN HOÀNG MINH theo hóa đơn số 0002157',
    total: 94000000,
    deliverer: '',
    type: 'Mua hàng trong nước nhập kho'
  },
  {
    id: '3',
    date: '21/02/2024',
    voucherNo: 'NK00024',
    description: 'Mua hàng của CÔNG TY CỔ PHẦN HOÀNG MINH theo hóa đơn số 0002157',
    total: 117500000,
    deliverer: '',
    type: 'Mua hàng trong nước nhập kho'
  },
  {
    id: '4',
    date: '12/01/2024',
    voucherNo: 'NK00023',
    description: 'Nhập kho thành phẩm sản xuất',
    total: 23500000,
    deliverer: 'Công ty TNHH MTV Việt Tiến',
    type: 'Nhập kho thành phẩm'
  }
];

const MOCK_DETAILS: Record<string, any[]> = {
  '1': [
    { id: 1, itemCode: 'AN3-X1', itemName: 'Rơ le AN3-X1', warehouse: '156', account: '1561', debitAccount: '3312', unit: 'Chiếc', quantity: 350, price: 235000, total: 82250000, fee: 0, vat: 10 }
  ],
  '2': [
    { id: 1, itemCode: 'AN3-X2', itemName: 'Rơ le AN3-X2', warehouse: '156', account: '1561', debitAccount: '3312', unit: 'Chiếc', quantity: 400, price: 235000, total: 94000000, fee: 0, vat: 10 }
  ],
  '3': [
    { id: 1, itemCode: 'AN3-X3', itemName: 'Rơ le AN3-X3', warehouse: '156', account: '1561', debitAccount: '3312', unit: 'Chiếc', quantity: 500, price: 235000, total: 117500000, fee: 0, vat: 10 }
  ],
  '4': [
    { id: 1, itemCode: 'TP-01', itemName: 'Áo sơ mi nam', warehouse: '155', account: '1551', debitAccount: '154', unit: 'Cái', quantity: 100, price: 235000, total: 23500000, fee: 0, vat: 0 }
  ]
};

export default function WarehouseReceiptsPage() {
  const [selectedReceiptId, setSelectedReceiptId] = useState<string>('1');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailExpanded, setIsDetailExpanded] = useState(true);

  const selectedDetails = selectedReceiptId ? (MOCK_DETAILS[selectedReceiptId] || []) : [];

  return (
    <div className="flex flex-col h-full bg-white font-sans text-[13px] text-gray-800">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-2">
          <div className="flex rounded border border-gray-300 overflow-hidden">
            <button className="px-3 py-1.5 bg-white hover:bg-gray-50 flex items-center gap-1 font-medium border-r">
              Thực hiện hàng loạt <ChevronDown className="w-3 h-3" />
            </button>
          </div>
          
          <button className="px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1 font-medium">
            Lọc <ChevronDown className="w-3 h-3" />
          </button>
          
          <span className="ml-2 font-semibold">Đầu năm tới hiện tại</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Tìm kiếm" 
              className="pl-3 pr-8 py-1.5 border border-gray-300 rounded focus:outline-none focus:border-blue-500 w-48 italic text-gray-500" 
            />
            <Search className="w-4 h-4 text-gray-400 absolute right-2 top-2" />
          </div>
          
          <button className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded">
            <Settings className="w-4 h-4" />
          </button>
          
          <button className="px-3 py-1.5 bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1 font-medium">
            Tiện ích <ChevronDown className="w-3 h-3" />
          </button>
          
          <div className="flex rounded overflow-hidden shadow-sm ml-2">
            <button 
              onClick={() => setIsFormOpen(true)}
              className="px-4 py-1.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white font-medium transition-colors"
            >
              Thêm
            </button>
            <button className="px-2 py-1.5 bg-[#2E7D32] hover:bg-[#1B5E20] text-white border-l border-white/20 transition-colors">
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Master View (List) */}
      <div className={`flex flex-col border-b ${isDetailExpanded ? 'h-[50%]' : 'flex-1'} transition-all duration-300`}>
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-[#F3F4F6] shadow-sm z-10 text-[12px]">
              <tr>
                <th className="border-r border-b w-10 py-2">
                  <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" />
                </th>
                <th className="border-r border-b px-3 py-2 text-left font-semibold text-gray-600">Ngày hạch toán</th>
                <th className="border-r border-b px-3 py-2 text-left font-semibold text-gray-600">Số chứng từ</th>
                <th className="border-r border-b px-3 py-2 text-left font-semibold text-gray-600">Diễn giải</th>
                <th className="border-r border-b px-3 py-2 text-right font-semibold text-gray-600">Tổng tiền</th>
                <th className="border-r border-b px-3 py-2 text-left font-semibold text-gray-600">Người giao</th>
                <th className="border-r border-b px-3 py-2 text-left font-semibold text-gray-600">Loại chứng từ</th>
                <th className="border-b px-3 py-2 text-center font-semibold text-gray-600 w-24">Chức năng</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_RECEIPTS.map((receipt) => (
                <tr 
                  key={receipt.id}
                  onClick={() => setSelectedReceiptId(receipt.id)}
                  className={`border-b cursor-pointer hover:bg-[#E5F1FF] ${selectedReceiptId === receipt.id ? 'bg-[#E5F1FF]' : ''}`}
                >
                  <td className="border-r text-center py-2">
                    <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" onClick={(e) => e.stopPropagation()} />
                  </td>
                  <td className="border-r px-3 py-2 whitespace-nowrap">{receipt.date}</td>
                  <td className="border-r px-3 py-2 whitespace-nowrap text-blue-600">{receipt.voucherNo}</td>
                  <td className="border-r px-3 py-2 min-w-[300px] truncate">{receipt.description}</td>
                  <td className="border-r px-3 py-2 text-right font-medium whitespace-nowrap">
                    {new Intl.NumberFormat('vi-VN').format(receipt.total)}
                  </td>
                  <td className="border-r px-3 py-2 truncate max-w-[150px]">{receipt.deliverer}</td>
                  <td className="border-r px-3 py-2 truncate max-w-[200px]">{receipt.type}</td>
                  <td className="px-3 py-2 text-center text-blue-600 font-medium">
                    <button className="hover:underline flex items-center justify-center gap-1 mx-auto">
                      Xem <ChevronDown className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
              {/* Summary Row */}
              <tr className="bg-[#EAECEF] font-bold">
                <td colSpan={4} className="border-r px-3 py-2 text-center">Tổng</td>
                <td className="border-r px-3 py-2 text-right">
                  {new Intl.NumberFormat('vi-VN').format(MOCK_RECEIPTS.reduce((sum, r) => sum + r.total, 0))}
                </td>
                <td colSpan={3} className="border-r"></td>
              </tr>
            </tbody>
          </table>
        </div>
        
        {/* Pagination Master */}
        <div className="flex items-center justify-between px-4 py-2 bg-white border-t flex-shrink-0">
          <span className="text-gray-600">Tổng số: <b>{MOCK_RECEIPTS.length}</b> bản ghi</span>
          <div className="flex items-center gap-4 text-gray-600">
            <select className="border border-gray-300 rounded px-2 py-1 outline-none">
              <option>20 bản ghi trên 1 trang</option>
              <option>50 bản ghi trên 1 trang</option>
            </select>
            <div className="flex items-center gap-2">
              <button className="hover:text-blue-600 disabled:opacity-50" disabled>Trước</button>
              <span className="px-2 py-0.5 border rounded font-semibold bg-gray-50">1</span>
              <button className="hover:text-blue-600 disabled:opacity-50" disabled>Sau</button>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Divider */}
      <div 
        className="h-2 bg-gray-200 cursor-row-resize hover:bg-gray-300 flex items-center justify-center group"
        onClick={() => setIsDetailExpanded(!isDetailExpanded)}
      >
        <div className="w-8 h-1 bg-gray-400 rounded-full group-hover:bg-gray-500"></div>
      </div>

      {/* Detail View */}
      {isDetailExpanded && (
        <div className="flex-1 flex flex-col min-h-0 bg-white">
          <div className="flex px-4 border-b">
            <button className="px-4 py-2 border-b-2 border-blue-600 text-blue-700 font-semibold bg-yellow-50">
              Chi tiết
            </button>
          </div>
          
          <div className="flex-1 overflow-auto">
            <table className="w-full border-collapse">
              <thead className="sticky top-0 bg-[#F3F4F6] shadow-sm z-10 text-[12px]">
                <tr>
                  <th className="border-r border-b w-10 text-center py-2 font-semibold text-gray-600">#</th>
                  <th className="border-r border-b px-3 py-2 text-left font-semibold text-gray-600">Mã hàng</th>
                  <th className="border-r border-b px-3 py-2 text-left font-semibold text-gray-600">Tên hàng</th>
                  <th className="border-r border-b px-3 py-2 text-left font-semibold text-gray-600 w-24">Kho</th>
                  <th className="border-r border-b px-3 py-2 text-left font-semibold text-gray-600 w-24">TK Kho</th>
                  <th className="border-r border-b px-3 py-2 text-left font-semibold text-gray-600 w-24">TK Công nợ</th>
                  <th className="border-r border-b px-3 py-2 text-center font-semibold text-gray-600 w-20">ĐVT</th>
                  <th className="border-r border-b px-3 py-2 text-right font-semibold text-gray-600 w-28">Số lượng</th>
                  <th className="border-r border-b px-3 py-2 text-right font-semibold text-gray-600 w-32">Đơn giá</th>
                  <th className="border-r border-b px-3 py-2 text-right font-semibold text-gray-600 w-32">Thành tiền</th>
                  <th className="border-r border-b px-3 py-2 text-right font-semibold text-gray-600 w-32">Chi phí mua hàng</th>
                  <th className="border-b px-3 py-2 text-right font-semibold text-gray-600 w-24">% Thuế GTGT</th>
                </tr>
              </thead>
              <tbody>
                {selectedDetails.map((detail, index) => (
                  <tr key={detail.id} className="border-b hover:bg-gray-50">
                    <td className="border-r text-center py-2">{index + 1}</td>
                    <td className="border-r px-3 py-2">{detail.itemCode}</td>
                    <td className="border-r px-3 py-2">{detail.itemName}</td>
                    <td className="border-r px-3 py-2">{detail.warehouse}</td>
                    <td className="border-r px-3 py-2">{detail.account}</td>
                    <td className="border-r px-3 py-2">{detail.debitAccount}</td>
                    <td className="border-r px-3 py-2 text-center">{detail.unit}</td>
                    <td className="border-r px-3 py-2 text-right">{new Intl.NumberFormat('vi-VN').format(detail.quantity)}</td>
                    <td className="border-r px-3 py-2 text-right">{new Intl.NumberFormat('vi-VN').format(detail.price)}</td>
                    <td className="border-r px-3 py-2 text-right">{new Intl.NumberFormat('vi-VN').format(detail.total)}</td>
                    <td className="border-r px-3 py-2 text-right">{detail.fee}</td>
                    <td className="px-3 py-2 text-right">{detail.vat}</td>
                  </tr>
                ))}
                {selectedDetails.length > 0 && (
                  <tr className="bg-[#EAECEF] font-bold">
                    <td colSpan={7} className="border-r px-3 py-2 text-center">Tổng</td>
                    <td className="border-r px-3 py-2 text-right">
                      {new Intl.NumberFormat('vi-VN').format(selectedDetails.reduce((sum, d) => sum + d.quantity, 0))}
                    </td>
                    <td className="border-r"></td>
                    <td className="border-r px-3 py-2 text-right">
                      {new Intl.NumberFormat('vi-VN').format(selectedDetails.reduce((sum, d) => sum + d.total, 0))}
                    </td>
                    <td className="border-r px-3 py-2 text-right">0</td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Detail */}
          <div className="flex items-center justify-between px-4 py-2 bg-white border-t flex-shrink-0">
            <span className="text-gray-600">Tổng số: <b>{selectedDetails.length}</b> bản ghi</span>
            <div className="flex items-center gap-4 text-gray-600">
              <select className="border border-gray-300 rounded px-2 py-1 outline-none">
                <option>20 bản ghi trên 1 trang</option>
              </select>
              <div className="flex items-center gap-2">
                <button className="hover:text-blue-600 disabled:opacity-50" disabled>Trước</button>
                <span className="px-2 py-0.5 border rounded font-semibold bg-gray-50">1</span>
                <button className="hover:text-blue-600 disabled:opacity-50" disabled>Sau</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <WarehouseReceiptFormModal onClose={() => setIsFormOpen(false)} />
      )}
    </div>
  );
}
