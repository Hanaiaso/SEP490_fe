// Kiểu dữ liệu khớp với DTO backend trong VietTien.API/DTOs/Product và DTOs/Material.

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  standardListedPrice: number;
  imageUrl?: string;
  categoryName: string;
  categoryId: string;
  availableStock?: number;
}

export interface ProductDetail extends Omit<Product, 'availableStock'> {
  description?: string;
  specifications?: string;
  physicalStock?: number;
  availableStock?: number;
}

// MaterialDto backend KHÔNG có trường sku — chỉ name/unit.
export interface Material {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  safetyThreshold: number;
  lastAlertSentDate?: string;
  isBelowSafetyThreshold: boolean;
}
