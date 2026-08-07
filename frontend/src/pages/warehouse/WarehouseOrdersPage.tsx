import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as signalR from '@microsoft/signalr';
import { getWarehouseOrders } from '../../services/warehouseService';
import { PackageSearch, Clock, ChevronRight } from 'lucide-react';

const TABS = [
  { id: 'OnlinePending', label: 'Đơn hàng trực tuyến' },
  { id: 'ExternalPending', label: 'Đơn mua ngoài' },
  { id: 'InProgress', label: 'Đang đóng gói' }
];

export default function WarehouseOrdersPage() {
  const [activeTab, setActiveTab] = useState('OnlinePending');
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getWarehouseOrders(activeTab, 1, 50);
      setOrders(data || []);
    } catch (err: any) {
      setError(err.message || 'Lỗi tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/api/hubs/warehouse', {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    connection.start().then(() => {
      console.log('Connected to WarehouseHub');
    }).catch(err => console.error('SignalR Connection Error: ', err));

    connection.on('ReceiveNewOrder', () => {
      // Refresh list if we are in one of the pending tabs
      if (activeTab === 'OnlinePending' || activeTab === 'ExternalPending') {
        fetchOrders();
      }
    });

    return () => {
      connection.stop();
    };
  }, [activeTab]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý Đóng gói</h1>
        <p className="text-gray-500 text-sm mt-1">Tiếp nhận đơn hàng và chuẩn bị xuất kho</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-slate-800 text-slate-800'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-8">{error}</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <PackageSearch className="mx-auto h-12 w-12 text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Không có đơn hàng nào</h3>
              <p className="mt-1 text-sm text-gray-500">Danh sách hiện tại đang trống.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {orders.map((order) => (
                <div 
                  key={order.orderId}
                  onClick={() => navigate(`/warehouse/orders/${order.orderId}`)}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:border-slate-400 cursor-pointer transition-colors"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-900">{order.orderCode}</span>
                    <div className="flex items-center mt-1 text-xs text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(order.confirmedAt).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">Tổng SL: {order.totalQuantity}</div>
                      <div className="text-xs text-gray-500">{order.status}</div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
