import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getWarehouseOrderDetail, acceptWarehouseOrder, reportShortage } from '../../services/warehouseService';
import { ArrowLeft, CheckCircle, AlertTriangle, Package } from 'lucide-react';

export default function WarehouseOrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [missingQty, setMissingQty] = useState('');
  const [note, setNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (id) fetchDetail();
  }, [id]);

  const fetchDetail = async () => {
    try {
      setLoading(true);
      const data = await getWarehouseOrderDetail(id);
      setOrder(data);
    } catch (err: any) {
      setError(err.message || 'Lỗi tải chi tiết đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    try {
      setActionLoading(true);
      await acceptWarehouseOrder(id);
      alert('Nhận đơn thành công!');
      fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi nhận đơn');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReportShortage = async () => {
    if (!selectedProduct || !missingQty) return;
    try {
      setActionLoading(true);
      await reportShortage(id, {
        productId: selectedProduct.productId,
        missingQuantity: parseInt(missingQty),
        note
      });
      alert('Báo cáo thiếu hàng thành công!');
      setShowModal(false);
      fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi báo cáo');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6">Đang tải...</div>;
  }

  if (error || !order) {
    return <div className="p-6 text-red-500">{error || 'Không tìm thấy đơn hàng'}</div>;
  }

  return (
    <div className="p-6">
      <button 
        onClick={() => navigate('/warehouse/orders')}
        className="flex items-center text-sm text-gray-500 hover:text-slate-800 mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Quay lại danh sách
      </button>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Mã đơn: {order.orderCode}</h1>
          <p className="text-gray-500 text-sm mt-1">Trạng thái: <span className="font-semibold text-slate-700">{order.status}</span></p>
        </div>
        
        {order.status === 'Received' && (
          <button 
            onClick={handleAccept}
            disabled={actionLoading}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Nhận đơn đóng gói
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Yêu cầu</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Tồn vật lý</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái Tồn</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {order.items?.map((item: any) => (
              <tr key={item.productId}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <Package className="w-5 h-5 text-gray-400 mr-3" />
                    <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  {item.sku}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-gray-900">
                  {item.requestedQuantity}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                  {item.physicalStock}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {item.isStockSufficient ? (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Đủ hàng
                    </span>
                  ) : (
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                      Thiếu hàng
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  {order.status === 'Packing' && !item.isStockSufficient && (
                    <button 
                      onClick={() => {
                        setSelectedProduct(item);
                        setMissingQty((item.requestedQuantity - item.physicalStock).toString());
                        setShowModal(true);
                      }}
                      className="text-red-600 hover:text-red-900 flex items-center justify-end w-full"
                    >
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Báo thiếu
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Báo cáo thiếu hàng</h3>
                <p className="text-sm text-gray-500 mb-4">
                  Sản phẩm: <span className="font-semibold">{selectedProduct?.productName}</span>
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700">Số lượng thiếu</label>
                  <input 
                    type="number" 
                    value={missingQty}
                    onChange={(e) => setMissingQty(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-slate-500 focus:border-slate-500 sm:text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Ghi chú (tuỳ chọn)</label>
                  <textarea 
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-slate-500 focus:border-slate-500 sm:text-sm"
                  />
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  onClick={handleReportShortage}
                  disabled={actionLoading}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  Gửi báo cáo
                </button>
                <button 
                  onClick={() => setShowModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
