/**
 * Goi API that (khong mock) de seed du lieu va de kiem tang API trong cac case Permission.
 * Di thang toi backend :5050, khong qua proxy Vite — nhanh hon va khong phu thuoc FE.
 */
import { request, APIRequestContext } from '@playwright/test';
import { ACCOUNTS, RoleKey } from './accounts';

export const API_BASE = 'http://localhost:5050';

export interface Phien {
  accessToken: string;
  refreshToken: string;
  user: Record<string, unknown>;
}

const cache = new Map<RoleKey, Phien>();

/** Dang nhap qua API, co cache theo vai tro de khong login lai o moi test. */
export async function dangNhap(role: RoleKey, boQuaCache = false): Promise<Phien> {
  if (!boQuaCache && cache.has(role)) return cache.get(role)!;

  const acc = ACCOUNTS[role];
  const ctx = await request.newContext({ baseURL: API_BASE });
  const res = await ctx.post('/api/auth/login', {
    data: { email: acc.email, password: acc.password },
  });
  if (!res.ok()) {
    throw new Error(`Login that bai cho ${role} (${acc.email}): ${res.status()} ${await res.text()}`);
  }
  const body = await res.json();
  await ctx.dispose();

  const phien: Phien = {
    accessToken: body.data.accessToken,
    refreshToken: body.data.refreshToken,
    user: body.data.user,
  };
  cache.set(role, phien);
  return phien;
}

/** Request context da gan Bearer token cua mot vai tro. */
export async function ctxTheoVaiTro(role: RoleKey): Promise<APIRequestContext> {
  const { accessToken } = await dangNhap(role);
  return request.newContext({
    baseURL: API_BASE,
    extraHTTPHeaders: { Authorization: `Bearer ${accessToken}` },
  });
}

/** Request context khong dang nhap (Guest). */
export async function ctxKhach(): Promise<APIRequestContext> {
  return request.newContext({ baseURL: API_BASE });
}

/** Lay danh sach san pham that -> map SKU sang productId. */
export async function mapSanPham(): Promise<Map<string, { id: string; gia: number; ton: number }>> {
  const ctx = await ctxKhach();
  const res = await ctx.get('/api/products?page=1&pageSize=200');
  const body = await res.json();
  await ctx.dispose();

  const m = new Map<string, { id: string; gia: number; ton: number }>();
  for (const p of body.items ?? []) {
    m.set(p.sku, { id: p.id, gia: Number(p.standardListedPrice), ton: Number(p.availableStock ?? 0) });
  }
  return m;
}
