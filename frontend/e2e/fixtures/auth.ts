/**
 * Dat phien dang nhap vao trinh duyet.
 *
 * FE luu phien o localStorage voi 3 khoa (src/context/AuthContext.jsx:6-8, 34-38):
 *   accessToken  -> chuoi JWT tho
 *   refreshToken -> chuoi tho
 *   authUser     -> JSON cua user
 *
 * Cac case L4-CP-01 va L4-SM-01..05 KHONG dung helper nay — chung phai dang nhap qua UI
 * vi chinh luong dang nhap/phien la thu dang duoc kiem.
 */
import { Page } from '@playwright/test';
import { dangNhap } from './api';
import { RoleKey } from './accounts';

/**
 * Bom phien vao localStorage roi dieu huong. Phai vao trang cung origin truoc khi ghi
 * localStorage, nen ta mo '/' rong roi moi goto dich that.
 */
export async function vaoVoiVaiTro(page: Page, role: RoleKey, duongDan: string) {
  const phien = await dangNhap(role);

  await page.goto('/login');
  await page.evaluate(
    ([at, rt, u]) => {
      localStorage.setItem('accessToken', at as string);
      localStorage.setItem('refreshToken', rt as string);
      localStorage.setItem('authUser', u as string);
    },
    [phien.accessToken, phien.refreshToken, JSON.stringify(phien.user)],
  );

  await page.goto(duongDan);
}

/**
 * Dang nhap QUA GIAO DIEN — dung cho cac case kiem chinh luong dang nhap.
 * Cho den khi authUser thuc su nam trong localStorage roi moi tra ve: neu di tiep som,
 * CartContext van coi la khach va se ghi vao gio tam localStorage thay vi gio tren server.
 */
export async function dangNhapQuaUI(page: Page, email: string, matKhau: string) {
  await page.goto('/login');
  await page.getByRole('textbox', { name: /email/i }).fill(email);
  await page.locator('input[type="password"]').first().fill(matKhau);
  await page.getByRole('button', { name: /đăng nhập/i }).click();
  await page.waitForFunction(() => localStorage.getItem('authUser') !== null, null, { timeout: 20_000 });
}

/** Them san pham dang xem vao gio va cho request /api/Cart/items ket thuc. */
export async function themVaoGio(page: Page) {
  const cho = page.waitForResponse(
    r => /\/api\/Cart\/items/i.test(r.url()) && r.request().method() === 'POST',
    { timeout: 20_000 },
  );
  await page.getByRole('button', { name: 'Thêm Vào Giỏ', exact: true }).click();
  return cho;
}

/** Xoa sach phien khoi trinh duyet. */
export async function xoaPhien(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('authUser');
  });
}

/** Doc phien hien tai trong trinh duyet — dung de assert da bi xoa hay chua. */
export async function docPhien(page: Page) {
  return page.evaluate(() => ({
    accessToken: localStorage.getItem('accessToken'),
    refreshToken: localStorage.getItem('refreshToken'),
    authUser: localStorage.getItem('authUser'),
  }));
}
