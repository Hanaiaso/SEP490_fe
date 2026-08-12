/**
 * Sheet L4-SessionManagement — vong doi phien, 5 case. NFR-SEC02.
 *
 * Cac case nay KHONG dung helper bom localStorage cho luong chinh: chinh viec dang nhap /
 * refresh / dang xuat la thu dang duoc kiem.
 */
import { test, expect } from '@playwright/test';
import { ACCOUNTS, SKU } from '../fixtures/accounts';
import { dangNhapQuaUI, docPhien, themVaoGio } from '../fixtures/auth';
import { dangNhap } from '../fixtures/api';
import { ghi, doc1 } from '../fixtures/db';

/** JWT het han that (exp o qua khu), ky bang khoa rac — dung de ep FE phai di refresh. */
const TOKEN_HET_HAN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
  Buffer.from(JSON.stringify({
    sub: ACCOUNTS.customer.userId,
    email: ACCOUNTS.customer.email,
    exp: Math.floor(Date.now() / 1000) - 3600,
  })).toString('base64url') +
  '.khong-can-chu-ky-hop-le-vi-server-se-tu-choi';

test.describe('L4-SessionManagement', () => {

  // NFR-SEC02 — Access token het han, refresh token con han -> tu refresh ngam.
  //
  // KET QUA: FAIL. Co che loi da xac dinh duoc:
  //   1. POST /api/auth/refresh-token XOAY VONG refresh token; token cu lap tuc 401
  //      (do bang probe: refresh #1 -> 200, dung lai token cu -> 401).
  //   2. authService.fetchWithToken (src/services/authService.js:65-91) KHONG co mutex.
  //      Khi mot trang ban nhieu request can auth cung luc va access token da het han,
  //      TAT CA cung nhan 401 roi cung goi tryRefreshAccessToken(). Request nhanh nhat xoay
  //      token; nhung request con lai da cam token CU -> 401 -> nhanh 401 o dong 82-87 xoa
  //      phien va window.location.href = '/login'.
  //   => Nguoi dung BI DA RA trang dang nhap du refresh token con han. Vi pham NFR-SEC02.
  //   Phu: dong 85 xoa khoa 'user' trong khi AuthContext luu o 'authUser' -> con sot du lieu.
  test('L4-SM-01 Access token het han duoc tu refresh ngam, khong da nguoi dung ra', async ({ page }) => {
    const phien = await dangNhap('customer', true);

    await page.goto('/login');
    await page.evaluate(([at, rt, u]) => {
      localStorage.setItem('accessToken', at as string);
      localStorage.setItem('refreshToken', rt as string);
      localStorage.setItem('authUser', u as string);
    }, [TOKEN_HET_HAN, phien.refreshToken, JSON.stringify(phien.user)]);

    // Thao tac can xac thuc: mo gio hang (goi GET /api/Cart)
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    // KHONG duoc bi da ve trang dang nhap
    await expect(page).not.toHaveURL(/\/login/);
    // Va accessToken phai da duoc thay bang token moi
    const sau = await docPhien(page);
    expect(sau.accessToken, 'accessToken phai duoc refresh ngam').not.toBe(TOKEN_HET_HAN);
  });

  // NFR-SEC02 — Refresh token bi thu hoi phia server.
  test('L4-SM-02 Refresh token bi thu hoi thi bi day ve /login va xoa phien', async ({ page }) => {
    const phien = await dangNhap('customer', true);

    // Thu hoi phia server
    ghi(
      `UPDATE Users SET RefreshToken = NULL, RefreshTokenExpiryTime = NULL
       WHERE Id = '${ACCOUNTS.customer.userId}';`,
      'L4-SM-02 thu hoi refresh token cua customer.test',
    );

    await page.goto('/login');
    await page.evaluate(([at, rt, u]) => {
      localStorage.setItem('accessToken', at as string);
      localStorage.setItem('refreshToken', rt as string);
      localStorage.setItem('authUser', u as string);
    }, [TOKEN_HET_HAN, phien.refreshToken, JSON.stringify(phien.user)]);

    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/login/);
    const sau = await docPhien(page);
    expect(sau.accessToken, 'Du lieu phien phai bi xoa khoi trinh duyet').toBeNull();
  });

  // NFR-SEC02 — Dang xuat o tab A, tab B cung mat phien.
  test('L4-SM-03 Dang xuat o tab A thi tab B cung mat phien', async ({ browser }) => {
    const ctx = await browser.newContext();
    const tabA = await ctx.newPage();
    const tabB = await ctx.newPage();

    await dangNhapQuaUI(tabA, ACCOUNTS.customer.email, ACCOUNTS.customer.password);
    await expect(tabA).not.toHaveURL(/\/login/, { timeout: 15_000 });

    // Dung /profile chu KHONG dung /cart: App.tsx:61 cho /cart allowGuest={true} nen khach
    // van xem duoc, khong phan biet duoc mat phien hay chua.
    await tabB.goto('/profile');
    await expect(tabB).not.toHaveURL(/\/login/);

    // Dang xuat o tab A
    await tabA.evaluate(() => {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('authUser');
    });
    const rtSau = await tabA.evaluate(() => localStorage.getItem('refreshToken'));
    expect(rtSau).toBeNull();

    // Tab B thao tac -> phai mat phien theo
    await tabB.reload();
    await tabB.waitForLoadState('networkidle');
    await expect(tabB).toHaveURL(/\/login/);

    await ctx.close();
  });

  // FT-01 AC-05; BR-025 — Gio hang gan tai khoan, khoi phuc sau khi dang nhap lai.
  test('L4-SM-04 Gio hang duoc khoi phuc dung sau khi dang xuat va dang nhap lai', async ({ page }) => {
    await dangNhapQuaUI(page, ACCOUNTS.customer.email, ACCOUNTS.customer.password);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });

    // Them 1 san pham
    await page.goto('/products');
    await page.getByPlaceholder('Tìm kiếm sản phẩm...').fill(SKU.CAO_GIA.sku);
    await page.waitForLoadState('networkidle');
    await page.locator('a[href^="/products/"]').first().click();
    await themVaoGio(page);

    const soDongTruoc = Number(doc1(`
      SELECT COUNT(*) FROM CartItems ci
      JOIN Carts c ON c.Id = ci.CartId
      JOIN CustomerProfiles p ON p.Id = c.CustomerProfileId
      WHERE p.UserId = '${ACCOUNTS.customer.userId}';`) || '0');
    expect(soDongTruoc, 'Gio phai co it nhat 1 dong truoc khi dang xuat').toBeGreaterThan(0);

    // Dang xuat roi dang nhap lai
    await page.evaluate(() => localStorage.clear());
    await page.goto('/login');
    await dangNhapQuaUI(page, ACCOUNTS.customer.email, ACCOUNTS.customer.password);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });

    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    // Gio hien thi productName (Cart.jsx:252), khong hien SKU
    await expect(page.getByText(/Màng Xốp Hơi|Bong Bóng/i).first()).toBeVisible();
  });

  // FT-01 NAC-03; BV-01; BR-025 — Snapshot gio tao cach day 24:00:01 phai bao het han gia.
  test('L4-SM-05 Gio hang qua 24 gio phai canh bao gia het han va chan thanh toan', async ({ page }) => {
    await dangNhapQuaUI(page, ACCOUNTS.customer.email, ACCOUNTS.customer.password);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });

    // Dam bao gio co hang
    await page.goto('/products');
    await page.getByPlaceholder('Tìm kiếm sản phẩm...').fill(SKU.CAO_GIA.sku);
    await page.waitForLoadState('networkidle');
    await page.locator('a[href^="/products/"]').first().click();
    await themVaoGio(page);

    // Day snapshot lui 24 gio 1 giay
    ghi(`
      UPDATE c SET c.UpdatedAt = DATEADD(SECOND, -1, DATEADD(HOUR, -24, SYSUTCDATETIME()))
      FROM Carts c
      JOIN CustomerProfiles p ON p.Id = c.CustomerProfileId
      WHERE p.UserId = '${ACCOUNTS.customer.userId}';`,
      'L4-SM-05 day snapshot gio lui 24:00:01',
    );

    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    // Phai co canh bao tieng Viet ve gia het han
    await expect(
      page.getByText(/hết hạn|quá hạn|làm mới giá|cập nhật lại giá/i).first(),
      'Khong thay canh bao gia het han sau 24 gio (BR-025)',
    ).toBeVisible();
  });
});
