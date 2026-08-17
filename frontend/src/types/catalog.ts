// Kiểu dữ liệu khớp với DTO backend trong VietTien.API/DTOs/Product và DTOs/Material.

export interface Category {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
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

// ProductImageDto - 1 ảnh trong gallery sản phẩm
export interface ProductImage {
  id: string;
  imageUrl: string;
  sortOrder: number;
}

export interface ProductDetail extends Omit<Product, 'availableStock'> {
  description?: string;
  specifications?: string;
  physicalStock?: number;
  availableStock?: number;
  /** Toàn bộ ảnh sản phẩm theo thứ tự hiển thị */
  images: ProductImage[];
}

// ProductManagementItemDto - dùng cho trang quản lý sản phẩm CEO/Admin
export interface ProductManagementItem {
  id: string;
  name: string;
  sku: string;
  standardListedPrice: number;
  imageUrl?: string;
  categoryId: string;
  categoryName: string;
  unit: string;
  availableStock?: number;
  reorderThreshold?: number | null;
  excessThreshold?: number | null;
  weightKg?: number | null;
  isDiscontinued: boolean;
  averageRating: number;
  reviewCount: number;
  unitsSoldTotal: number;
}

export interface ProductManagementPagedResult {
  items: ProductManagementItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProductStatsSummary {
  totalProducts: number;
  activeProducts: number;
  discontinuedProducts: number;
  totalUnitsSold: number;
  totalRevenue: number;
  totalGrossProfit: number;
}

export interface ProductSalesStat {
  productId: string;
  name: string;
  sku: string;
  imageUrl?: string;
  categoryName: string;
  unitsSold: number;
  revenue: number;
  grossProfit: number;
  orderCount: number;
  availableStock?: number;
}

export interface ProductStatsResult {
  periodFrom: string;
  periodTo: string;
  summary: ProductStatsSummary;
  bestSellers: ProductSalesStat[];
  slowMovers: ProductSalesStat[];
}

// MaterialDto backend KHÔNG có trường sku — chỉ name/unit.
export interface Material {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  safetyThreshold: number;
  maxStockThreshold?: number | null;
  lastAlertSentDate?: string;
  isBelowSafetyThreshold: boolean;
}
