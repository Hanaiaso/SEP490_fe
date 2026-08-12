/**
 * Sheet L4-Permissions — ma tran uy quyen tren giao dien, 7 case, tat ca deu Negative.
 * NFR-SEC03. Kiem O UI, khong chi kiem "an nut".
 *
 * Cac case PM-03/PM-04 kiem CA HAI tang: giao dien co cho vao khong, va goi API truc tiep
 * co bi 403 khong. Chi an nut ma API van cho goi thi van la lo hong.
 */
import { test, expect } from '@playwright/test';
import { ACCOUNTS } from '../fixtures/accounts';
import { vaoVoiVaiTro } from '../fixtures/auth';
import { ctxTheoVaiTro, ctxKhach } from '../fixtures/api';
import { doc1 } from '../fixtures/db';

test.describe('L4-Permissions', () => {

  // NFR-SEC03; FT-01 NAC-05 — Guest go thang /checkout.
  test('L4-PM-01 Guest go thang /checkout bi day ve /login', async ({ page }) => {
    await page.goto('/checkout');
    await expect(page).toHaveURL(/\/login/);
    // Noi dung checkout KHONG duoc render
    await expect(page.getByRole('button', { name: /đặt hàng/i })).toHaveCount(0);
  });

  // NFR-SEC03 — Customer go thang URL portal kho.
  test('L4-PM-02 Customer go thang /warehouse/dashboard bi chan', async ({ page }) => {
    await vaoVoiVaiTro(page, 'customer', '/warehouse/dashboard');
    // ProtectedRoute day Customer ve '/'
    await expect(page).not.toHaveURL(/\/warehouse/);
    // Khong duoc lo du lieu kho
    await expect(page.getByText(/tồn kho|lệnh xuất kho|phiếu nhập/i)).toHaveCount(0);
  });

  // NFR-SEC03; BR-027 — Sales Staff mo man duyet bao gia cap CEO.
  test('L4-PM-03 Sales Staff khong vao duoc man duyet bao gia CEO va API tra 403', async ({ page }) => {
    await vaoVoiVaiTro(page, 'sales', '/ceo');
    await expect(page).not.toHaveURL(/\/ceo/);

    // Tang API: POST /api/Quotation/{id}/ceo-decision co [Authorize(Roles="CEO")]
    const ctx = await ctxTheoVaiTro('sales');
    const res = await ctx.post(`/api/Quotation/${'00000000-0000-0000-0000-000000000001'}/ceo-decision`, {
      data: { isApproved: true, note: 'E2E-L4 permission probe' },
    });
    expect(res.status(), 'Sales Staff goi ceo-decision phai bi tu choi').toBe(403);
    await ctx.dispose();
  });

  // NFR-SEC03; FT-09 NAC-02 — Admin KHONG duoc phe duyet nghiep vu (SRS v2 tach vai tro).
  test('L4-PM-04 Admin khong phe duyet duoc bao gia va dieu chinh ton kho', async ({ page }) => {
    const ctx = await ctxTheoVaiTro('admin');

    // 1. Duyet bao gia — [Authorize(Roles="CEO")]
    const rQuot = await ctx.post(`/api/Quotation/${'00000000-0000-0000-0000-000000000001'}/ceo-decision`, {
      data: { isApproved: true, note: 'E2E-L4 permission probe' },
    });
    expect(rQuot.status(), 'Admin duyet bao gia phai bi tu choi').toBe(403);

    // 2. Dieu chinh ton kho — [Authorize(Roles="WarehouseStaff,CEO")]
    const invId = doc1('SELECT TOP 1 CAST(Id AS varchar(36)) FROM Inventories;');
    const rInv = await ctx.put(`/api/inventory/${invId}/adjust`, {
      data: { newOnHandQuantity: 1, reason: 'E2E-L4 permission probe' },
    });
    expect(rInv.status(), 'Admin dieu chinh ton kho phai bi tu choi').toBe(403);
    await ctx.dispose();

    // 3. Tang UI: ProtectedRoute cho Admin vao ca /ceo va /warehouse
    //    (App.tsx:76,79 — allowedRoles={['CEO','Admin']} / {['WarehouseStaff','Admin']}).
    //    Ghi lai su that nay de bao cao, khong assert Pass gia.
    await vaoVoiVaiTro(page, 'admin', '/warehouse/inv-management/stock-adjustment');
    const vaoDuocManKho = /\/warehouse/.test(page.url());
    expect(
      vaoDuocManKho,
      'UI van cho Admin mo man dieu chinh ton kho (chi API chan). Xem DEF-L4 trong bao cao.',
    ).toBe(false);
  });

  // NFR-SEC03; FT-04 NAC-04 — Sales Staff chi giai trinh, khong duyet/tu choi/xoa.
  test('L4-PM-05 Sales Staff khong co quyen duyet yeu cau doi Sales', async ({ page }) => {
    await vaoVoiVaiTro(page, 'sales', '/sales-manager/change-requests');
    // ProtectedRoute ['SalesManager','Admin'] -> Sales Staff bi day ve /sales
    await expect(page).not.toHaveURL(/\/sales-manager/);

    // Man giai trinh cua chinh minh thi vao duoc, nhung khong duoc co nut Duyet/Tu choi
    await page.goto('/sales/change-requests');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /^duyệt$|phê duyệt|từ chối/i })).toHaveCount(0);
  });

  // NFR-SEC03; FT-05 NAC-05 — Nhan vien kho WH-TRADE thao tac phieu cua WH-PE.
  test('L4-PM-06 Warehouse Staff bi chan theo pham vi kho duoc gan', async ({ page }) => {
    // warehouse2 thuoc WH-TRADE, warehouse3 thuoc WH-PE
    expect(ACCOUNTS.warehouse2.warehouse).toBe('WH-TRADE');
    expect(ACCOUNTS.warehouse3.warehouse).toBe('WH-PE');

    const ctx = await ctxTheoVaiTro('warehouse2');
    // Ton kho thuoc WH-PE
    const invPE = doc1(`
      SELECT TOP 1 CAST(i.Id AS varchar(36))
      FROM Inventories i
      JOIN WarehouseLocations wl ON wl.Id = i.WarehouseLocationId
      JOIN Warehouses w ON w.Id = wl.WarehouseId
      WHERE w.Code = 'WH-PE';`);
    expect(invPE, 'Khong tim thay ton kho nao thuoc WH-PE').not.toBe('');

    const res = await ctx.put(`/api/inventory/${invPE}/adjust`, {
      data: { newOnHandQuantity: 1, reason: 'E2E-L4 cross-warehouse probe' },
    });
    expect(
      [403, 404],
      `Nhan vien WH-TRADE sua duoc ton kho WH-PE (HTTP ${res.status()})`,
    ).toContain(res.status());
    await ctx.dispose();
  });

  // NFR-SEC03; FT-01 NAC-05 — Customer doi id tren URL sang don cua khach khac (IDOR).
  test('L4-PM-07 Customer khong xem duoc don hang cua khach khac', async ({ page }) => {
    const donKhachKhac = doc1(`
      SELECT TOP 1 CAST(o.Id AS varchar(36))
      FROM Orders o
      JOIN CustomerProfiles c ON c.Id = o.CustomerProfileId
      WHERE c.UserId <> '${ACCOUNTS.customer.userId}';`);

    test.skip(donKhachKhac === '', 'Chua co don hang cua khach khac trong DB de thu IDOR');

    // Tang API
    const ctx = await ctxTheoVaiTro('customer');
    const res = await ctx.get(`/api/orders/my-history/${donKhachKhac}`);
    expect([403, 404]).toContain(res.status());
    await ctx.dispose();

    // Tang UI: phai bao loi ro rang bang tieng Viet va KHONG lo du lieu don.
    await vaoVoiVaiTro(page, 'customer', `/profile/orders/${donKhachKhac}`);
    await expect(
      page.getByText(/không tìm thấy|không có quyền|từ chối truy cập|không thể tải/i).first(),
      'UI khong bao loi gi khi mo don cua khach khac',
    ).toBeVisible();

    // Khong duoc lo bat ky thong tin nao cua don do
    const maDon = doc1(`SELECT TOP 1 OrderCode FROM Orders WHERE Id = '${donKhachKhac}';`);
    if (maDon) {
      await expect(page.getByText(maDon), 'Ma don cua khach khac bi lo tren giao dien')
        .toHaveCount(0);
    }
  });
});
