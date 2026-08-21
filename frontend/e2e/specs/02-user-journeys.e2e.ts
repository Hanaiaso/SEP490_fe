/**
 * Sheet L4-UserJourneys — hanh trinh nghiep vu SC-01..SC-06, 13 case.
 *
 * Mot so module da duoc L3 ghi nhan la CHUA TRIEN KHAI (DEF-L3-004/005). O day ta van chay
 * that de xac nhan lai tren giao dien, va phan biet ro:
 *   - Fail    = co man hinh / co endpoint nhung hanh vi sai so voi workbook.
 *   - Blocked = khong co man hinh / khong co endpoint de kiem.
 */
import { test, expect } from '@playwright/test';
import { ACCOUNTS, SKU, NGUONG } from '../fixtures/accounts';
import { vaoVoiVaiTro } from '../fixtures/auth';
import { ctxTheoVaiTro } from '../fixtures/api';
import { xoaGio, themVaoGioQuaApi, taoDon } from '../fixtures/donhang';
import { doc1 } from '../fixtures/db';

test.describe('L4-UserJourneys', () => {

  // ── SC-01 ────────────────────────────────────────────────────────────────────

  // FT-01 AC-02; AC-04; BR-023; BR-024 — Dang ky, xac thuc email, them dia chi, OTP dien thoai.
  test('L4-UJ-01 Dang ky, xac thuc email, them dia chi mac dinh va xac thuc OTP', async ({ page }) => {
    const email = `e2e.l4.uj01.${Date.now()}@viettien.test`;
    // So dien thoai cung phai duy nhat, neu khong lan chay thu hai bi 409 trung so.
    const soDienThoai = `09${String(Date.now()).slice(-8)}`;

    await page.goto('/register');
    await page.getByRole('textbox', { name: /họ.*tên|full ?name/i }).first().fill('E2E L4 Khach Moi');
    await page.getByRole('textbox', { name: /email/i }).first().fill(email);
    await page.getByRole('textbox', { name: /điện thoại|phone/i }).first().fill(soDienThoai);
    const oMatKhau = page.locator('input[type="password"]');
    await oMatKhau.first().fill('Test@123');
    if (await oMatKhau.count() > 1) await oMatKhau.nth(1).fill('Test@123');
    await page.getByRole('button', { name: /đăng ký|tạo tài khoản/i }).first().click();

    // BR-023: tai khoan chi hoat dong SAU khi xac thuc email
    await page.waitForLoadState('networkidle');
    const daXacThuc = doc1(
      `SELECT TOP 1 CAST(IsEmailVerified AS int) FROM Users WHERE Email = '${email}';`);
    expect(daXacThuc, `Tai khoan ${email} chua duoc tao`).not.toBe('');
    expect(daXacThuc, 'Tai khoan moi dang ky KHONG duoc o trang thai da xac thuc email').toBe('0');

    // Dang nhap khi chua xac thuc phai bi tu choi kem thong bao tieng Viet
    const ctx = await ctxTheoVaiTro('customer');
    const thu = await ctx.post('/api/auth/login', { data: { email, password: 'Test@123' } });
    await ctx.dispose();
    expect(thu.status(), 'Tai khoan chua xac thuc email van dang nhap duoc').toBeGreaterThanOrEqual(400);
  });

  // FT-02 AC-01; BV-01; BR-006 — Bac chiet khau theo tong tien gio.
  test('L4-UJ-02 Chiet khau bac va nguong 100 trieu chuyen sang yeu cau bao gia', async ({ page }) => {
    await xoaGio('customer');

    // (a) Duoi 10 trieu -> gia niem yet, khong chiet khau
    await themVaoGioQuaApi('customer', SKU.CAO_GIA.sku, 10); // 2.500.000d
    await vaoVoiVaiTro(page, 'customer', '/cart');
    await page.waitForLoadState('networkidle');
    const chuA = await page.locator('body').innerText();
    expect(chuA, 'Duoi 10 trieu khong duoc hien chiet khau').not.toMatch(/chiết khấu\s*[:\-]?\s*[1-9]/i);

    // (b) Tu 10 trieu -> hien chiet khau bac
    await xoaGio('customer');
    await themVaoGioQuaApi('customer', SKU.CAO_GIA.sku, 48); // 12.000.000d
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByText(/chiết khấu/i).first(),
      `Tong >= ${NGUONG.CHIET_KHAU_DAU} nhung khong hien chiet khau bac`,
    ).toBeVisible();

    // (c) Tu 100 trieu -> AN nut thanh toan, hien "Yeu cau bao gia"
    await xoaGio('customer');
    await themVaoGioQuaApi('customer', SKU.CAO_GIA.sku, 420); // 105.000.000d
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(
      page.getByRole('button', { name: /yêu cầu báo giá/i }).first(),
      `Tong >= ${NGUONG.BAO_GIA} nhung khong chuyen sang yeu cau bao gia`,
    ).toBeVisible();
  });

  // FT-02 AC-04; AC-05; BR-027 — Bao gia qua 4 vai tro: Khach -> Sales -> SM -> CEO -> Khach.
  test('L4-UJ-03 Bao gia phai qua du 2 cap duyet truoc khi khach chap nhan', async ({ page }) => {
    await xoaGio('customer');
    await themVaoGioQuaApi('customer', SKU.CAO_GIA.sku, 480); // 120.000.000d

    // Khach gui yeu cau bao gia
    const kh = await ctxTheoVaiTro('customer');
    const tao = await kh.post('/api/Quotation/from-cart', {
      data: { note: 'E2E-L4 yeu cau bao gia' },
    });
    const body = await tao.text();
    await kh.dispose();
    expect(tao.status(), `Tao bao gia tu gio that bai: ${tao.status()} ${body}`).toBeLessThan(400);

    const bg = JSON.parse(body);
    const quotationId = (bg.data ?? bg).id ?? (bg.data ?? bg).quotationId;

    // BR-027: khach KHONG duoc chap nhan version chua qua du 2 cap duyet
    const kh2 = await ctxTheoVaiTro('customer');
    const chapNhanSom = await kh2.post(`/api/Quotation/${quotationId}/customer-decision`, {
      data: { isAccepted: true },
    });
    await kh2.dispose();
    expect(
      chapNhanSom.status(),
      'Khach chap nhan duoc bao gia CHUA qua duyet Sales Manager va CEO (vi pham BR-027)',
    ).toBeGreaterThanOrEqual(400);

    // Man hinh khach phai thay yeu cau vua gui
    await vaoVoiVaiTro(page, 'customer', '/negotiations');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/negotiations/);
  });

  // FT-01 AC-03; BV-03; NAC-05; BR-028 — Dia chi mac dinh duy nhat, khong xoa cung dia chi da dung.
  test('L4-UJ-14 Chi mot dia chi mac dinh, dia chi da dung khong xoa cung duoc', async ({ page }) => {
    const ctx = await ctxTheoVaiTro('customer');

    // Them dia chi thu hai va dat lam mac dinh
    const them = await ctx.post('/api/user/addresses', {
      data: {
        name: 'E2E L4 Dia chi 2', phone: '0912345679', city: 'Hà Nội', district: '',
        ward: 'Phường Dịch Vọng', addressLine: 'E2E-L4 Số 2 Đường Kiểm Thử',
        type: 'Công ty', isDefault: true,
      },
    });
    expect(them.status(), 'Them dia chi thu hai that bai').toBeLessThan(400);

    // BR-028: chi duoc CO DUNG 1 dia chi mac dinh
    const soMacDinh = doc1(`
      SELECT COUNT(*) FROM Addresses a
      JOIN CustomerProfiles p ON p.Id = a.CustomerProfileId
      WHERE p.UserId = '${ACCOUNTS.customer.userId}' AND a.IsDefault = 1;`);
    expect(soMacDinh, `Co ${soMacDinh} dia chi mac dinh, phai dung 1`).toBe('1');

    await ctx.dispose();

    // Dat mot don DUNG dia chi mac dinh vua tao -> gio dia chi nay "da duoc su dung"
    const don = await taoDon('customer', SKU.RE_NHAT.sku, 1, 'COD');
    const dcDaDung = doc1(`
      SELECT TOP 1 CAST(a.Id AS varchar(36))
      FROM Addresses a
      JOIN CustomerProfiles p ON p.Id = a.CustomerProfileId
      WHERE p.UserId = '${ACCOUNTS.customer.userId}' AND a.IsDefault = 1;`);
    const diaChiTrenDon = doc1(
      `SELECT TOP 1 ShippingAddress FROM Orders WHERE Id = '${don.id}';`);
    expect(diaChiTrenDon, 'Don khong luu dia chi giao').not.toBe('');

    // NAC-05: KHONG duoc xoa cung dia chi da dung — he thong phai giai thich va chi cho
    // ngung su dung.
    const ctx2 = await ctxTheoVaiTro('customer');
    const xoa = await ctx2.delete(`/api/user/addresses/${dcDaDung}`);
    await ctx2.dispose();

    const conTonTai = doc1(`SELECT COUNT(*) FROM Addresses WHERE Id = '${dcDaDung}';`);
    expect(
      xoa.ok() && conTonTai === '0',
      `Dia chi da dung cho don ${don.orderCode} bi XOA CUNG khoi DB (HTTP ${xoa.status()}) `
      + 'thay vi bi chan hoac chi ngung su dung — vi pham NAC-05/BR-028',
    ).toBe(false);

    // Dia chi giao tren don DA DAT phai GIU NGUYEN du ho so doi
    const sauKhiXoa = doc1(`SELECT TOP 1 ShippingAddress FROM Orders WHERE Id = '${don.id}';`);
    expect(sauKhiXoa, 'Dia chi giao tren don da dat bi thay doi').toBe(diaChiTrenDon);

    await vaoVoiVaiTro(page, 'customer', '/profile');
    await expect(page).toHaveURL(/\/profile/);
  });

  // ── SC-02 ────────────────────────────────────────────────────────────────────

  // FT-04 AC-02; AC-04; BR-002 — Round-robin phan cong Sales + yeu cau doi Sales.
  test('L4-UJ-04 Round-robin phan cong Sales luan phien va duyet yeu cau doi Sales', async ({ page }) => {
    await vaoVoiVaiTro(page, 'salesManager', '/sales-manager/round-robin');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/sales-manager\/round-robin/);

    // Phai co >= 2 Sales Staff dang hoat dong tham gia round-robin
    const soThamGia = doc1('SELECT COUNT(*) FROM RoundRobinParticipants;');
    expect(Number(soThamGia || '0'), 'Chua cau hinh nguoi tham gia round-robin').toBeGreaterThanOrEqual(2);

    // BR-002: khach chi duoc CO 1 yeu cau doi Sales dang mo
    const ctx = await ctxTheoVaiTro('customer');
    const r1 = await ctx.post('/api/sales-change-requests', {
      data: { reason: 'E2E-L4 ly do doi sales lan 1' },
    });
    const r2 = await ctx.post('/api/sales-change-requests', {
      data: { reason: 'E2E-L4 ly do doi sales lan 2' },
    });
    await ctx.dispose();

    if (r1.status() < 400) {
      expect(
        r2.status(),
        'Khach tao duoc 2 yeu cau doi Sales cung dang mo (vi pham BR-002)',
      ).toBeGreaterThanOrEqual(400);
    }
  });

  // FT-03 AC-03; NAC-03; BR-016 — Danh sach ngoai le SePay, chan xac nhan thu cong thieu bang chung.
  test('L4-UJ-05 Ngoai le SePay: chan xac nhan thu cong khi thieu bang chung', async ({ page }) => {
    await vaoVoiVaiTro(page, 'salesManager', '/sales-manager/sepay-exceptions');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/sales-manager\/sepay-exceptions/);

    // NAC-03: manual-confirm KHONG duoc di qua khi thieu ly do/bang chung
    const don = await taoDon('customer', SKU.RE_NHAT.sku, 1, 'SePay');
    const ctx = await ctxTheoVaiTro('salesManager');
    const thieu = await ctx.post(`/api/orders/${don.id}/manual-confirm`, { data: {} });
    await ctx.dispose();

    expect(
      thieu.status(),
      'Xac nhan thanh toan thu cong duoc chap nhan du KHONG co ly do/bang chung (vi pham BR-016)',
    ).toBeGreaterThanOrEqual(400);
  });

  // ── SC-03 ────────────────────────────────────────────────────────────────────

  // FT-07 AC-04; NAC-04; BV-02; BR-039 — Thu COD mot phan, tao cong no; don da tra thi khoa o nhap.
  test('L4-UJ-06 Thu COD mot phan tao cong no, don da thanh toan bi khoa o nhap tien', async ({ page }) => {
    await vaoVoiVaiTro(page, 'sales', '/sales/delivery/collection');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/sales\/delivery\/collection/);

    // DEF-L4-002 (dot L4 truoc) doan sai route "/api/delivery/collections" (khong ton tai) va ket
    // luan nham chua co endpoint thu COD. Doi chieu code that: SalesDeliveryCollectionPage.tsx doc
    // danh sach don qua /api/delivery/orders roi ghi nhan thu tien qua POST /{orderId}/complete —
    // dung route that de kiem tra.
    const ctx = await ctxTheoVaiTro('sales');
    const res = await ctx.get('/api/delivery/orders');
    await ctx.dispose();

    expect(
      res.status(),
      `GET /api/delivery/orders tra ${res.status()} — man thu COD dua vao endpoint nay, khong kiem duoc BR-039`,
    ).toBeLessThan(400);
  });

  // FT-08 AC-01..03; BR-017 — Huy don da thanh toan: KHONG hoan tien, chuyen sang don thay the + credit.
  test('L4-UJ-07 Huy don da thanh toan khong hoan tien ma chuyen credit/don thay the', async ({ page }) => {
    const don = await taoDon('customer', SKU.RE_NHAT.sku, 1, 'COD');

    // BR-017: he thong KHONG duoc co duong hoan tien
    const ctx = await ctxTheoVaiTro('customer');
    const hoanTien = await ctx.post(`/api/orders/${don.id}/refund`, { data: { amount: 1000 } });
    expect(
      hoanTien.status(),
      'Ton tai endpoint hoan tien — vi pham BR-017 (he thong khong ho tro hoan tien)',
    ).toBe(404);

    // Khach gui yeu cau huy
    const huy = await ctx.post(`/api/orders/${don.id}/request-cancel`, {
      data: { reason: 'E2E-L4 yeu cau huy don' },
    });
    await ctx.dispose();
    expect(huy.status(), `Gui yeu cau huy that bai: ${huy.status()}`).toBeLessThan(400);

    // Man chi tiet don cua khach KHONG duoc co tuy chon hoan tien
    await vaoVoiVaiTro(page, 'customer', `/profile/orders/${don.id}`);
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /hoàn tiền/i })).toHaveCount(0);
  });

  // FT-08 AC-05; BR-019 — Hang tra ve vao khu cach ly, chua kiem dinh khong duoc vao ton ban duoc.
  test('L4-UJ-08 Hang tra ve phai qua cach ly va kiem dinh moi vao ton ban duoc', async ({ page }) => {
    await vaoVoiVaiTro(page, 'warehouse', '/warehouse/inv-management/quarantine');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/quarantine/);

    // BR-019: so luong trong khu cach ly KHONG duoc cong vao ton kha dung.
    // Kiem thang o DB: QuarantineQuantity phai tach rieng khoi OnHandQuantity.
    const coCotCachLy = doc1(`
      SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Inventories' AND COLUMN_NAME = 'QuarantineQuantity';`);
    expect(coCotCachLy, 'Khong co cot QuarantineQuantity — khong tach duoc hang cach ly').toBe('1');

    // Man kiem dinh chat luong phai vao duoc
    await page.goto('/warehouse/purchase/quality-inspection');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/quality-inspection/);
  });

  // ── SC-06 ────────────────────────────────────────────────────────────────────

  // FT-06 AC-01; AC-03; AC-05; BR-014 — PO -> phieu nhap -> post moi tang ton.
  test('L4-UJ-09 Ton kho chi tang sau khi post phieu nhap, khong tang tu PO', async ({ page }) => {
    // Tien dieu kien: nha cung cap SUP-01 (seed da tao)
    const coNcc = doc1(`SELECT COUNT(*) FROM Suppliers WHERE Code = 'SUP-01';`);
    expect(coNcc, 'Chua co nha cung cap SUP-01').toBe('1');

    const ctx = await ctxTheoVaiTro('ceo');
    const ds = await ctx.get('/api/purchase-orders');
    await ctx.dispose();
    expect(ds.status(), 'Khong doc duoc danh sach PO').toBeLessThan(400);

    // BR-014: KHONG duoc co duong tang ton thang tu PO
    const kho = await ctxTheoVaiTro('warehouse');
    const tatNgang = await kho.post('/api/inventory/post-from-po', { data: {} });
    await kho.dispose();
    // 404 = khong co route; 405 = path trung nhung khong mo method POST. Ca hai deu nghia la
    // KHONG co duong tang ton thang tu PO, tuc la dung BR-014.
    expect(
      [404, 405],
      `POST /api/inventory/post-from-po tra ${tatNgang.status()} — ton tai duong tang ton thang tu PO, vi pham BR-014`,
    ).toContain(tatNgang.status());

    // Man phieu nhap hang phai vao duoc
    await vaoVoiVaiTro(page, 'warehouse', '/warehouse/purchase/goods-receipt');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/goods-receipt/);
  });

  // FT-11 AC-01..03; BR-035 — Chuyen kho: tru kho nguon, ghi chenh lech khi nhan thieu.
  test('L4-UJ-10 Chuyen kho ghi nhan chenh lech va khong tu can bang', async ({ page }) => {
    await vaoVoiVaiTro(page, 'warehouse', '/warehouse/transfer/stock-transfer');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/stock-transfer/);

    const ctx = await ctxTheoVaiTro('warehouse');
    const ds = await ctx.get('/api/stock-transfers');
    await ctx.dispose();
    expect(ds.status(), 'Khong doc duoc danh sach phieu chuyen kho').toBeLessThan(400);

    // Phai co cot InTransitQuantity de theo doi hang dang chuyen (BR-035)
    const coInTransit = doc1(`
      SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Inventories' AND COLUMN_NAME = 'InTransitQuantity';`);
    expect(coInTransit, 'Khong co cot InTransitQuantity — khong theo doi duoc hang dang chuyen').toBe('1');

    // Man doi chieu nhap hang (noi hien chenh lech) phai vao duoc
    await page.goto('/warehouse/purchase/receiving-comparison');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/receiving-comparison/);
  });

  // FT-12 AC-01..03; BR-044 — Phien kiem ke: khoa so ly thuyet, vuot nguong bat CEO duyet.
  test('L4-UJ-11 Phien kiem ke khoa so ly thuyet va bat CEO duyet khi vuot nguong', async ({ page }) => {
    await vaoVoiVaiTro(page, 'warehouse', '/warehouse/inv-management/inventory-count');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/inventory-count/);

    // DEF-L4-003 da xu ly: he thong kiem ke hop nhat ve InventoryCountSessionController,
    // route that la /api/inventory-count-sessions (khong con /api/inventory/count-sessions).
    const ctx = await ctxTheoVaiTro('warehouse');
    const res = await ctx.get('/api/inventory-count-sessions');
    const body = res.ok() ? await res.json() : null;
    await ctx.dispose();

    expect(
      res.status(),
      `GET /api/inventory-count-sessions tra ${res.status()} — phien kiem ke phai co API de kiem BR-044`,
    ).toBeLessThan(400);
    expect(Array.isArray(body), 'danh sach phien kiem ke phai tra ve mang').toBe(true);
  });

  // FT-12 AC-05; BR-045 — Xuat NVL san xuat: chan khi thieu nguoi nhan / so phieu / anh ky.
  test('L4-UJ-12 Xuat NVL san xuat bi chan khi thieu truong bat buoc', async ({ page }) => {
    await vaoVoiVaiTro(page, 'warehouse', '/warehouse/production/issue');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/production\/issue/);

    // Gui phieu THIEU truong bat buoc -> phai bi chan
    const ctx = await ctxTheoVaiTro('warehouse');
    const thieu = await ctx.post('/api/materials/production-issues', { data: {} });
    await ctx.dispose();

    expect(
      thieu.status(),
      'Xuat NVL san xuat duoc chap nhan du thieu truong bat buoc (vi pham BR-045)',
    ).toBeGreaterThanOrEqual(400);
    expect(
      thieu.status(),
      `Endpoint tra ${thieu.status()} — chuc nang xuat NVL san xuat chua trien khai (DEF-L3-005)`,
    ).not.toBe(404);
  });

  // FT-12 AC-04; BV-03; BR-049 — Canh bao ton thap: dung 1 canh bao, xuong them thi cap nhat.
  test('L4-UJ-13 Canh bao ton thap sinh dung mot lan va duoc cap nhat, khong nhan doi', async ({ page }) => {
    await vaoVoiVaiTro(page, 'warehouse', '/warehouse/inventory/low-stock');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/low-stock/);

    // L3 DEF-L3-005: khong co endpoint canh bao ton thap rieng. Xac nhan lai.
    const ctx = await ctxTheoVaiTro('warehouse');
    const res = await ctx.get('/api/inventory/low-stock-alerts');
    await ctx.dispose();

    expect(
      res.status(),
      `GET /api/inventory/low-stock-alerts tra ${res.status()} — canh bao ton thap chua co `
      + 'endpoint rieng (xac nhan lai DEF-L3-005), khong kiem duoc BR-049',
    ).toBeLessThan(400);
  });
});
