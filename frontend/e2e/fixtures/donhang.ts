/**
 * Helper tao don hang qua API THAT (khong dung SQL) — dung cho tien dieu kien cua
 * L4-CP-02..05 va cac case UserJourneys.
 *
 * Di qua dung nghiep vu: them gio -> place-order. Nho vay du lieu sinh ra hop le
 * (co OrderItems, co tru ton, co OrderCode dung dinh dang).
 */
import { ctxTheoVaiTro, mapSanPham } from './api';
import { RoleKey } from './accounts';

export interface DonHang {
  id: string;
  orderCode: string;
  tongTien: number;
}

/** Xoa sach gio hang hien tai cua mot vai tro. */
export async function xoaGio(role: RoleKey) {
  const ctx = await ctxTheoVaiTro(role);
  const res = await ctx.get('/api/Cart');
  if (res.ok()) {
    const gio = await res.json();
    const dong = gio?.items ?? gio?.data?.items ?? [];
    for (const d of dong) {
      await ctx.delete(`/api/Cart/items/${d.id ?? d.cartItemId ?? d.productId}`);
    }
  }
  await ctx.dispose();
}

/** Them 1 dong vao gio. Nem loi kem thong diep that neu API tu choi. */
export async function themVaoGioQuaApi(role: RoleKey, sku: string, soLuong: number) {
  const sp = await mapSanPham();
  const item = sp.get(sku);
  if (!item) throw new Error(`Khong tim thay SKU ${sku} trong danh muc`);

  const ctx = await ctxTheoVaiTro(role);
  const res = await ctx.post('/api/Cart/items', {
    data: { productId: item.id, quantity: soLuong },
  });
  const text = await res.text();
  await ctx.dispose();

  if (!res.ok()) {
    throw new Error(`Them gio that bai (${sku} x${soLuong}): ${res.status()} ${text}`);
  }
  return item;
}

/**
 * Dat don tu gio hien tai.
 * @param phuongThuc 'COD' | 'SePay' — enum PaymentMethod cua BE.
 */
export async function datDon(role: RoleKey, phuongThuc: 'COD' | 'SePay'): Promise<DonHang> {
  const ctx = await ctxTheoVaiTro(role);

  // Lay dia chi mac dinh
  const dc = await ctx.get('/api/user/addresses');
  const dsDiaChi = dc.ok() ? await dc.json() : [];
  const ds = Array.isArray(dsDiaChi) ? dsDiaChi : (dsDiaChi?.data ?? []);
  const macDinh = ds.find((a: any) => a.isDefault) ?? ds[0];

  const res = await ctx.post('/api/orders/place-order', {
    data: {
      addressId: macDinh?.id,
      paymentMethod: phuongThuc,
      notes: 'E2E-L4 don do kiem thu tu dong tao',
      requiresRedInvoice: false,
    },
  });
  const text = await res.text();
  await ctx.dispose();

  if (!res.ok()) {
    throw new Error(`Dat don that bai: ${res.status()} ${text}`);
  }

  const body = JSON.parse(text);
  const d = body.data ?? body;
  return {
    id: d.orderId ?? d.id,
    orderCode: d.orderCode,
    tongTien: Number(d.totalAmount ?? d.finalPayment ?? 0),
  };
}

/** Tien ich gop: don sach gio, them hang, dat don. */
export async function taoDon(
  role: RoleKey, sku: string, soLuong: number, phuongThuc: 'COD' | 'SePay',
): Promise<DonHang> {
  await xoaGio(role);
  await themVaoGioQuaApi(role, sku, soLuong);
  return datDon(role, phuongThuc);
}
