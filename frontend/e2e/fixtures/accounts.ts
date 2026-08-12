/**
 * Tai khoan test + anh xa "ten trong workbook" -> "du lieu that trong DB".
 *
 * Nguon tai khoan: VietTien.API/Data/ApplicationDbContext.cs:919-938 (seed HasData).
 * Mat khau chung: "123456" (hash BCrypt o dong 919).
 *
 * Workbook Report_5_4 viet ten dinh danh KHONG khop code that. Bang ANH_XA ben duoi la
 * ban dich chinh thuc, se duoc trich vao cot Notes cua workbook khi bao cao.
 */

export const PASSWORD = '123456';

export type RoleKey =
  | 'customer' | 'sales' | 'sales2' | 'sales3' | 'salesManager'
  | 'warehouse' | 'warehouse2' | 'warehouse3'
  | 'accounting' | 'admin' | 'ceo';

export interface Account {
  email: string;
  password: string;
  /** Gia tri user.role tra ve tu POST /api/auth/login — dung cho ProtectedRoute. */
  role: string;
  userId: string;
  /** Kho duoc gan (chi WarehouseStaff) — dung cho L4-PM-06 (chan theo pham vi kho). */
  warehouse?: string;
}

export const ACCOUNTS: Record<RoleKey, Account> = {
  customer: {
    email: 'customer.test@viettien.com', password: PASSWORD, role: 'Customer',
    userId: '77777777-7777-7777-7777-777777777777',
  },
  sales: {
    email: 'salesstaff.test@viettien.com', password: PASSWORD, role: 'SalesStaff',
    userId: '44444444-4444-4444-4444-444444444444',
  },
  sales2: {
    email: 'salesstaff2.test@viettien.com', password: PASSWORD, role: 'SalesStaff',
    userId: '44444444-4444-4444-4444-444444444402',
  },
  sales3: {
    email: 'salesstaff3.test@viettien.com', password: PASSWORD, role: 'SalesStaff',
    userId: '44444444-4444-4444-4444-444444444403',
  },
  salesManager: {
    email: 'salesmanager.test@viettien.com', password: PASSWORD, role: 'SalesManager',
    userId: '33333333-3333-3333-3333-333333333333',
  },
  warehouse: {
    email: 'warehousestaff.test@viettien.com', password: PASSWORD, role: 'WarehouseStaff',
    userId: '55555555-5555-5555-5555-555555555555', warehouse: 'WH-DEFAULT',
  },
  warehouse2: {
    email: 'warehousestaff2.test@viettien.com', password: PASSWORD, role: 'WarehouseStaff',
    userId: '55555555-5555-5555-5555-555555555502', warehouse: 'WH-TRADE',
  },
  warehouse3: {
    email: 'warehousestaff3.test@viettien.com', password: PASSWORD, role: 'WarehouseStaff',
    userId: '55555555-5555-5555-5555-555555555503', warehouse: 'WH-PE',
  },
  accounting: {
    email: 'accountingstaff.test@viettien.com', password: PASSWORD, role: 'AccountingStaff',
    userId: '66666666-6666-6666-6666-666666666666',
  },
  admin: {
    email: 'admin.test@viettien.com', password: PASSWORD, role: 'Admin',
    userId: '11111111-1111-1111-1111-111111111111',
  },
  ceo: {
    email: 'ceo.test@viettien.com', password: PASSWORD, role: 'CEO',
    userId: '22222222-2222-2222-2222-222222222222',
  },
};

/** Dich tu ten trong workbook sang du lieu that. Dua nguyen vao cot Notes khi bao cao. */
export const ANH_XA: Array<{ workbook: string; that: string; ghiChu: string }> = [
  { workbook: 'customer1@viettien.test', that: 'customer.test@viettien.com', ghiChu: 'Tai khoan seed, mat khau 123456' },
  { workbook: 'warehouse1@viettien.test', that: 'warehousestaff.test@viettien.com', ghiChu: 'Gan kho WH-DEFAULT' },
  { workbook: 'SKU-001', that: 'WRAP-BB-1M2', ghiChu: 'Gia 250.000d, ton 10.000 tai WH-DEFAULT — chon vi gia cao nhat, de dat moc 10tr/100tr' },
  { workbook: 'SKU-002', that: 'TOOL-CUT-5F', ghiChu: 'Gia 25.000d — dung cho case canh bao ton thap' },
  { workbook: 'WH-PROD', that: 'WH-PE', ghiChu: 'KHONG co kho ten WH-PROD; he thong co WH-DEFAULT / WH-TRADE / WH-PE' },
  { workbook: 'SUP-01', that: '(chua ton tai)', ghiChu: 'Bang Suppliers rong — phai seed truoc L4-UJ-09' },
  { workbook: 'ORD-SMOKE', that: 'E2E-L4-SMOKE-*', ghiChu: 'Bang Orders rong — moi don deu do test tao' },
];

/** SKU that dung trong test, kem gia niem yet (VND). */
export const SKU = {
  /** 250.000d — 40 cai = 10tr, 400 cai = 100tr. Ton 10.000 tai WH-DEFAULT. */
  CAO_GIA: { sku: 'WRAP-BB-1M2', gia: 250_000 },
  /** 25.000d — dung cho case ton thap. */
  RE: { sku: 'TOOL-CUT-5F', gia: 25_000 },
  /** 3.500d — re nhat, dung khi can tong tien nho. */
  RE_NHAT: { sku: 'BOX-3L-302015', gia: 3_500 },
} as const;

/** Bac chiet khau dang cau hinh (bang DiscountTiers). Tren 100tr khong co bac -> phai bao gia. */
export const NGUONG = {
  CHIET_KHAU_DAU: 10_000_000,
  BAO_GIA: 100_000_000,
} as const;
