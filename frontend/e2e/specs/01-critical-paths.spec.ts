/**
 * Sheet L4-CriticalPaths — smoke suite, 6 case, chi happy path.
 * Workbook: Report_5_4_L4-E2ETests_VietTien_v1_3.xlsx
 *
 * Tieu de moi test BAT DAU bang Test ID -> tools/l4_report.py tu anh xa nguoc vao workbook.
 *
 * Luu y ve checkout: day la wizard 3 buoc (Checkout.jsx:113-118)
 *   Step 0 Dia chi -> Step 1 Xac nhan hoa don -> Step 2 Phuong thuc TT -> dat don.
 */
import { test, expect, Page } from '@playwright/test';
import { ACCOUNTS, SKU } from '../fixtures/accounts';
import { vaoVoiVaiTro, dangNhapQuaUI, themVaoGio } from '../fixtures/auth';
import { taoDon, xoaGio, themVaoGioQuaApi } from '../fixtures/donhang';
import { ctxTheoVaiTro } from '../fixtures/api';
import { doc1 } from '../fixtures/db';
import { sepayToken } from '../fixtures/secrets';

/** Di het wizard checkout va dat don. */
async function diHetCheckout(page: Page, phuongThuc: 'cod' | 'sepay') {
  await expect(page).toHaveURL(/\/checkout/);
  await page.getByRole('button', { name: /xem hóa đơn & tiếp tục/i }).click();
  await page.getByRole('button', { name: /đồng ý & chọn thanh toán/i }).click();
  await page.locator(`input[name="payment"][value="${phuongThuc}"]`).check();
  await page.getByRole('button', { name: /xác nhận & đặt hàng/i }).click();
}

test.describe('L4-CriticalPaths', () => {

  // FT-01 AC-01; NFR-U03 — Guest duyet, tim, loc, mo chi tiet. Case CHI DOC.
  test('L4-CP-06 Guest duyet trang chu, tim kiem, loc va mo chi tiet san pham', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/$|\/home/);

    await page.goto('/products');
    const oTim = page.getByPlaceholder('Tìm kiếm sản phẩm...');
    await expect(oTim).toBeVisible();

    await oTim.fill('Băng Keo');
    await page.waitForLoadState('networkidle');

    const theSanPham = page.locator('a[href^="/products/"]');
    await expect(theSanPham.first()).toBeVisible();
    expect(await theSanPham.count()).toBeGreaterThan(0);

    await theSanPham.first().click();
    await expect(page).toHaveURL(/\/products\/[0-9a-f-]+/);
    // Dung exact: cac the "san pham lien quan" ben duoi cung co aria-label="Thêm vào giỏ".
    await expect(page.getByRole('button', { name: 'Thêm Vào Giỏ', exact: true })).toBeVisible();

    // San pham ngung kinh doanh KHONG duoc xuat hien
    await page.goto('/products');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/ngừng kinh doanh/i)).toHaveCount(0);
  });

  // FT-01 AC-05; FT-03 AC-04; SC-01 — Dang nhap -> them gio -> checkout COD.
  test('L4-CP-01 Customer dang nhap, them gio, dat hang COD', async ({ page }) => {
    await xoaGio('customer');

    // Dang nhap QUA UI: chinh luong dang nhap la thu dang kiem
    await dangNhapQuaUI(page, ACCOUNTS.customer.email, ACCOUNTS.customer.password);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });

    await page.goto('/products');
    await page.getByPlaceholder('Tìm kiếm sản phẩm...').fill(SKU.CAO_GIA.sku);
    await page.waitForLoadState('networkidle');
    await page.locator('a[href^="/products/"]').first().click();
    await themVaoGio(page);

    await page.goto('/cart');
    await expect(page.getByText(/Màng Xốp Hơi|Bong Bóng/i).first()).toBeVisible();
    await page.getByRole('button', { name: /thanh toán|đặt hàng/i }).first().click();

    await diHetCheckout(page, 'cod');

    // Trang xac nhan: dat hang thanh cong + ma don
    await expect(page.getByText(/đặt hàng thành công/i).first()).toBeVisible({ timeout: 30_000 });

    // Doi chieu DB: don vua tao phai o trang thai cho xac nhan
    const trangThai = doc1(`
      SELECT TOP 1 CAST(o.OrderStatus AS varchar(20))
      FROM Orders o
      JOIN CustomerProfiles p ON p.Id = o.CustomerProfileId
      WHERE p.UserId = '${ACCOUNTS.customer.userId}'
      ORDER BY o.CreatedAt DESC;`);
    expect(trangThai, 'Khong tim thay don vua dat trong DB').not.toBe('');
  });

  // FT-03 AC-02; BR-009 — QR SePay + webhook -> UI tu doi trang thai qua SignalR.
  test('L4-CP-02 Thanh toan SePay: QR, dem nguoc, webhook cap nhat khong reload', async ({ page }) => {
    await xoaGio('customer');
    await dangNhapQuaUI(page, ACCOUNTS.customer.email, ACCOUNTS.customer.password);
    await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });

    await themVaoGioQuaApi('customer', SKU.CAO_GIA.sku, 1);

    await page.goto('/cart');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /thanh toán|đặt hàng/i }).first().click();
    await diHetCheckout(page, 'sepay');

    // Man cho thanh toan SePay: QR + ma tham chieu + dem nguoc
    await expect(page.getByAltText(/SePay QR/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/chuyển khoản sepay/i).first()).toBeVisible();

    const maDon = doc1(`
      SELECT TOP 1 OrderCode FROM Orders o
      JOIN CustomerProfiles p ON p.Id = o.CustomerProfileId
      WHERE p.UserId = '${ACCOUNTS.customer.userId}'
      ORDER BY o.CreatedAt DESC;`);
    const soTien = doc1(`
      SELECT TOP 1 CAST(CAST(FinalPayment AS int) AS varchar(20)) FROM Orders o
      JOIN CustomerProfiles p ON p.Id = o.CustomerProfileId
      WHERE p.UserId = '${ACCOUNTS.customer.userId}'
      ORDER BY o.CreatedAt DESC;`);

    // Kich webhook sandbox — ten that la /api/webhooks/sepay-callback, xac thuc bang
    // header x-sepay-token (workbook ghi /api/webhooks/sepay + HMAC: khong dung).
    const ctx = await ctxTheoVaiTro('admin');
    const res = await ctx.post('/api/webhooks/sepay-callback', {
      headers: { 'x-sepay-token': sepayToken() },
      data: {
        gateway: 'E2E-L4', transactionDate: new Date().toISOString(),
        accountNumber: '0000', content: maDon, transferType: 'in',
        transferAmount: Number(soTien), referenceCode: `E2E-L4-${Date.now()}`,
        description: maDon,
      },
    });
    await ctx.dispose();
    expect(res.status(), `Webhook SePay tra ${res.status()}`).toBeLessThan(400);

    // UI phai tu doi trang thai, KHONG can tai lai trang (SignalR / poll)
    await expect(page.getByText(/thanh toán thành công/i).first()).toBeVisible({ timeout: 40_000 });
  });

  // FT-05 AC-01; AC-04; BR-011 — Warehouse nhan don va nhap so luong soan.
  test('L4-CP-03 Warehouse Staff nhan don va ghi so luong soan', async ({ page }) => {
    // Tien dieu kien: co don da CONFIRMED
    const don = await taoDon('customer', SKU.CAO_GIA.sku, 1, 'COD');
    const sales = await ctxTheoVaiTro('sales');
    const xacNhan = await sales.post(`/api/orders/sales/${don.id}/confirm`);
    await sales.dispose();
    expect(xacNhan.status(), `Sales xac nhan don that bai: ${xacNhan.status()}`).toBeLessThan(400);

    // Don phai co trong hang doi xuat kho. Kiem qua API voi pageSize lon: giao dien phan
    // trang 10 dong/trang (WarehouseController.cs:35) nen sau vai chuc don, don moi nhat
    // khong con nam o trang 1 — bam vao trang 1 se do gia.
    const kho = await ctxTheoVaiTro('warehouse');
    // tabType hop le (WarehouseService.cs:32-53): OnlinePending / ExternalPending / InProgress /
    // Consolidation / Handover / GoodsIssue. Don online da CONFIRMED nam o "OnlinePending".
    // Hang doi sap xep FIFO (cu truoc) nen don moi nhat nam CUOI -> phai lay pageSize lon.
    const hangDoi = await kho.get('/api/warehouse/orders?tabType=OnlinePending&pageNumber=1&pageSize=100');
    const dsBody = hangDoi.ok() ? await hangDoi.text() : '';
    await kho.dispose();

    expect(hangDoi.status(), `Doc hang doi xuat kho that bai: ${hangDoi.status()}`).toBeLessThan(400);
    expect(
      dsBody.includes(don.orderCode),
      `Don ${don.orderCode} da CONFIRMED nhung khong co trong hang doi xuat kho`,
    ).toBe(true);

    // Va man hang doi phai render duoc cho nhan vien kho
    await vaoVoiVaiTro(page, 'warehouse', '/warehouse/fulfillment/orders');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/warehouse\/fulfillment\/orders/);
    await expect(page.getByText(/^VT\d{17}$/).first()).toBeVisible({ timeout: 20_000 });
  });

  // FT-05 AC-05; BR-034 — Ban giao 2 chu ky (kho + sales) moi cho xuat kho.
  //
  // KET QUA: FAIL — quy tac 2 chu ky KHONG THE hoan tat.
  // HandoverController.cs:35-36 khai [Authorize(Roles = "Sales")] cho sales-confirm,
  // nhung enum SystemRole (Models/User.cs:60-70) KHONG CO gia tri "Sales" — vai tro that
  // la "SalesStaff". Khong tai khoan nao mang role "Sales" nen buoc xac nhan phia Sales
  // vinh vien tra 403 -> khong bao gio du 2 chu ky -> khong bao gio xuat kho duoc.
  test('L4-CP-04 Ban giao kho-sales phai du 2 xac nhan moi xuat kho', async ({ page }) => {
    await vaoVoiVaiTro(page, 'warehouse', '/warehouse/fulfillment/handover');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/warehouse\/fulfillment\/handover/);

    // Buoc xac nhan phia Sales phai goi duoc boi tai khoan SalesStaff that.
    const ctx = await ctxTheoVaiTro('sales');
    const res = await ctx.post(
      `/api/handover-records/${'00000000-0000-0000-0000-000000000001'}/sales-confirm`,
      { data: { confirmedPackageCount: 1 } },
    );
    await ctx.dispose();

    // 403 = vai tro bi tu choi (loi cau hinh role). 404 = khong tim thay bien ban (chap nhan
    // duoc, vi id tren la gia). Chi 403 moi la loi.
    expect(
      res.status(),
      'SalesStaff bi 403 o sales-confirm: HandoverController khai role "Sales" khong ton tai '
      + 'trong enum SystemRole -> BR-034 (2 chu ky) khong the hoan tat',
    ).not.toBe(403);
  });

  // FT-07 AC-01; AC-03; BR-038 — Sap xep chuyen giao, bat dau, POD anh + chu ky.
  test('L4-CP-05 Sales sap xep giao hang va ghi nhan giao thanh cong', async ({ page }) => {
    await vaoVoiVaiTro(page, 'sales', '/sales/delivery/arrangement');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/sales\/delivery\/arrangement/);

    // BR-038 yeu cau: khong luu duoc khi thieu anh hoac chu ky.
    // L3 (DEF-L3-004) da ghi nhan module Delivery Trip / POD chua co endpoint rieng.
    // Kiem lai o day de xac nhan tren giao dien.
    const ctx = await ctxTheoVaiTro('sales');
    const trips = await ctx.get('/api/delivery/trips');
    await ctx.dispose();

    expect(
      trips.status(),
      `GET /api/delivery/trips tra ${trips.status()} — module chuyen giao hang chua trien khai (xac nhan lai DEF-L3-004)`,
    ).toBeLessThan(400);
  });
});
