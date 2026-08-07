// Kiểu dữ liệu khớp với DTO backend trong VietTien.API/DTOs/Supplier/SupplierDtos.cs
// (api/Suppliers, CEO-only). SupplierDto KHÔNG có field liên kết vật tư/sản phẩm cung cấp.

export interface Supplier {
  id: string;
  name: string;
  code: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxCode?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CreateSupplierRequest {
  name: string;
  code: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  taxCode?: string;
}

export interface UpdateSupplierRequest extends CreateSupplierRequest {
  isActive: boolean;
}
