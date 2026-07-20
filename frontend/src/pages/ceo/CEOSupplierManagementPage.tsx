import { useState, useEffect } from 'react';
import { getSuppliers, createSupplier, updateSupplier } from '../../services/supplierService.js';
import { Plus, Edit, Search, Loader2 } from 'lucide-react';

export default function CEOSupplierManagementPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);
  const [searchingMst, setSearchingMst] = useState(false);

  const [formData, setFormData] = useState({
    name: '', code: '', contactPerson: '', phone: '', email: '', address: '', taxCode: '', isActive: true
  });

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const data = await getSuppliers();
      setSuppliers(data || []);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleOpenModal = (supplier: any = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({ ...supplier });
    } else {
      setEditingSupplier(null);
      const nextCode = `NCC-${String((suppliers.length || 0) + 1).padStart(3, '0')}`;
      setFormData({ name: '', code: nextCode, contactPerson: '', phone: '', email: '', address: '', taxCode: '', isActive: true });
    }
    setIsModalOpen(true);
  };

  const handleMstLookup = async () => {
    const code = formData.taxCode?.trim();
    if (!code) {
      alert('Vui lòng nhập mã số thuế để tra cứu.');
      return;
    }

    const cleanedCode = code.replace(/[\s-]/g, '');
    if (cleanedCode.length !== 10 && cleanedCode.length !== 13) {
      alert('Mã số thuế của doanh nghiệp phải có độ dài 10 hoặc 13 số.');
      return;
    }

    try {
      setSearchingMst(true);
      const res = await fetch(`https://api.vietqr.io/v2/business/${cleanedCode}`);
      const json = await res.json();

      if (json && json.code === '00' && json.data) {
        const businessName = json.data.name;
        const businessAddress = json.data.address;

        setFormData(prev => ({
          ...prev,
          taxCode: cleanedCode,
          name: businessName || prev.name,
          address: businessAddress || prev.address
        }));
        alert(`Tự động điền thành công!\nDoanh nghiệp: ${businessName}`);
      } else {
        alert(json.desc || 'Không tìm thấy doanh nghiệp tương ứng với mã số thuế này. Vui lòng kiểm tra lại.');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể kết nối đến hệ thống tra cứu. Vui lòng thử lại sau.');
    } finally {
      setSearchingMst(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.name.trim()) return alert("Vui lòng nhập Tên nhà cung cấp");
      if (!formData.code.trim()) return alert("Vui lòng nhập Mã nhà cung cấp");

      if (editingSupplier) {
        await updateSupplier(editingSupplier.id, formData);
        alert('Cập nhật nhà cung cấp thành công!');
      } else {
        await createSupplier(formData);
        alert('Thêm nhà cung cấp thành công!');
      }
      setIsModalOpen(false);
      loadSuppliers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="flex flex-col gap-[20px] p-[24px]">
      <div className="flex justify-between items-center">
        <h1 className="font-semibold text-[20px] text-[#1f3b64]">Quản lý Nhà cung cấp (CEO)</h1>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-[#1f3b64] text-white px-[16px] py-[8px] rounded-[4px] text-[12px] font-medium hover:bg-[#162a4a]"
        >
          <Plus className="w-4 h-4" /> Thêm NCC
        </button>
      </div>

      <div className="bg-white border border-[#e5e7eb] rounded-[8px] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-[#f5f7fa] border-b border-[#e5e7eb]">
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Mã</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Tên nhà cung cấp</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Mã số thuế</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">SĐT</th>
              <th className="text-left px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Trạng thái</th>
              <th className="text-center px-[16px] py-[12px] text-[11px] font-medium text-[#64748b] uppercase">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-4 text-sm text-gray-500">Đang tải...</td></tr>
            ) : suppliers.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-4 text-sm text-gray-500">Chưa có dữ liệu</td></tr>
            ) : suppliers.map(s => (
              <tr key={s.id} className="border-b border-[#f5f7fa] hover:bg-[#f5f7fa]">
                <td className="px-[16px] py-[12px] text-[12px] font-medium text-[#1f3b64]">{s.code}</td>
                <td className="px-[16px] py-[12px] text-[12px] font-medium text-[#1f3b64]">{s.name}</td>
                <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">{s.taxCode || '-'}</td>
                <td className="px-[16px] py-[12px] text-[12px] text-[#64748b]">{s.phone || '-'}</td>
                <td className="px-[16px] py-[12px] text-[12px]">
                  <span className={`px-2 py-1 rounded text-xs ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {s.isActive ? 'Hoạt động' : 'Ngừng'}
                  </span>
                </td>
                <td className="px-[16px] py-[12px] text-center">
                  <button onClick={() => handleOpenModal(s)} className="text-[#3b82f6] hover:text-[#2563eb]">
                    <Edit className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-[550px] flex flex-col gap-4 shadow-xl">
            <h2 className="text-lg font-semibold text-[#1f3b64] border-b pb-2">{editingSupplier ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs font-medium text-gray-600">Mã số thuế (Nhập MST để tự động tìm & điền thông tin)</label>
                <div className="flex gap-2">
                  <input 
                    className="border rounded px-2.5 py-1.5 text-sm flex-1 outline-none focus:border-blue-500 font-medium" 
                    placeholder="Nhập 10 hoặc 13 số MST..."
                    value={formData.taxCode} 
                    onChange={e => setFormData({...formData, taxCode: e.target.value})} 
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleMstLookup(); } }}
                  />
                  <button 
                    type="button"
                    onClick={handleMstLookup}
                    disabled={searchingMst}
                    className="bg-[#1f3b64] text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-[#162a4a] flex items-center gap-1 min-w-[95px] justify-center"
                  >
                    {searchingMst ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    {searchingMst ? 'Đang tra...' : 'Tra cứu MST'}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Mã NCC *</label>
                <input className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Tên NCC *</label>
                <input className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>

              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs font-medium text-gray-600">Địa chỉ doanh nghiệp</label>
                <input className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Người liên hệ</label>
                <input className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500" value={formData.contactPerson} onChange={e => setFormData({...formData, contactPerson: e.target.value})} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-600">Điện thoại</label>
                <input className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs font-medium text-gray-600">Email</label>
                <input className="border rounded px-2.5 py-1.5 text-sm outline-none focus:border-blue-500" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="isActive" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} />
                <label htmlFor="isActive" className="text-xs font-medium text-gray-600 cursor-pointer">Hoạt động</label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 border-t pt-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded text-sm hover:bg-gray-50">Hủy</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 font-medium">Lưu Nhà cung cấp</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
