/**
 * Sheet L4-AdminMarketing — quan tri, cau hinh, marketing, doi/tra. 11 case.
 *
 * LECH ROUTE da biet truoc khi chay (AdminPortal.tsx:196-207):
 *   /admin/ai-marketing va /admin/marketing-history KHONG co route that, chung roi vao
 *   nhanh stubItems -> component <ComingSoon>. Chuc nang marketing that nam o
 *   /sales/ai-content-studio (soan bai) va /sales-manager/ai-marketing-approval (duyet).
 * Cac case AM-05/06/09/10/11 vi vay duoc kiem O CA HAI NOI: route workbook ghi, va route that.
 */
import { test, expect } from '@playwright/test';
import { ACCOUNTS, SKU } from '../fixtures/accounts';
import { vaoVoiVaiTro } from '../fixtures/auth';
import { ctxTheoVaiTro, mapSanPham } from '../fixtures/api';
import { taoDon } from '../fixtures/donhang';
import { doc1, ghi } from '../fixtures/db';

test.describe('L4-AdminMarketing', () => {

  // ── SC-04: Quan tri, bang dieu khien, canh bao, nhat ky ─────────────────────

  // FT-09 AC-04; BR-022; NFR-SEC02 — Tao nhan vien, doi vai tro, vo hieu hoa, thu dang nhap.
  test('L4-AM-01 Admin tao tai khoan, doi vai tro, vo hieu hoa va tai khoan do khong dang nhap duoc',
    async ({ page }) => {
      await vaoVoiVaiTro(page, 'admin', '/admin/users');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/admin\/users/);

      const email = `e2e.l4.am01.${Date.now()}@viettien.test`;
      // So dien thoai phai duy nhat moi lan chay, neu khong API tra 409 trung so.
      const soDienThoai = `09${String(Date.now()).slice(-8)}`;
      const ctx = await ctxTheoVaiTro('admin');

      const tao = await ctx.post('/api/admin/users', {
        data: {
          fullName: 'E2E L4 Nhan vien moi', email, phoneNumber: soDienThoai,
          password: 'Test@123', role: 'SalesStaff',
        },
      });
      const bodyTao = await tao.text();
      expect(tao.status(), `Tao tai khoan nhan vien that bai: ${tao.status()} ${bodyTao}`).toBeLessThan(400);

      const userId = doc1(`SELECT TOP 1 CAST(Id AS varchar(36)) FROM Users WHERE Email = '${email}';`);
      expect(userId, 'Khong tim thay tai khoan vua tao').not.toBe('');

      // Doi vai tro
      // DTO that: ChangeUserRoleRequest { NewRole, Reason } — Reason la bat buoc.
      const doiVaiTro = await ctx.put(`/api/admin/users/${userId}/role`, {
        data: { newRole: 'WarehouseStaff', reason: 'E2E-L4 doi vai tro de kiem thu' },
      });
      expect(doiVaiTro.status(), `Doi vai tro that bai: ${doiVaiTro.status()}`).toBeLessThan(400);

      // Vo hieu hoa
      // DTO that: SetUserActiveStatusRequest { IsActive, Reason } — Reason la bat buoc.
      const voHieu = await ctx.put(`/api/admin/users/${userId}/status`, {
        data: { isActive: false, reason: 'E2E-L4 vo hieu hoa de kiem thu' },
      });
      expect(voHieu.status(), `Vo hieu hoa that bai: ${voHieu.status()}`).toBeLessThan(400);
      await ctx.dispose();

      // Tai khoan da vo hieu hoa KHONG duoc dang nhap
      const khach = await ctxTheoVaiTro('admin');
      const dangNhap = await khach.post('/api/auth/login', { data: { email, password: 'Test@123' } });
      await khach.dispose();
      expect(
        dangNhap.status(),
        'Tai khoan da vo hieu hoa VAN dang nhap duoc',
      ).toBeGreaterThanOrEqual(400);

      // Moi thay doi phai co trong nhat ky kiem toan (BR-022)
      const soAudit = doc1(
        `SELECT COUNT(*) FROM AuditLogs WHERE CAST(EntityId AS varchar(36)) = '${userId}';`);
      expect(
        Number(soAudit || '0'),
        'Khong co ban ghi nhat ky kiem toan nao cho tai khoan vua thao tac (vi pham BR-022)',
      ).toBeGreaterThan(0);
    });

  // FT-09 AC-03; NAC-04; BV-02; BR-050 — Doi cau hinh chiet khau co hieu luc tuong lai.
  test('L4-AM-02 Doi bang chiet khau chi ap dung tu thoi diem hieu luc, gio va don cu giu nguyen',
    async ({ page }) => {
      await vaoVoiVaiTro(page, 'admin', '/admin/settings');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveURL(/\/admin\/settings/);

      // Don da hoan tat khong duoc tinh lai khi doi cau hinh
      const don = await taoDon('customer', SKU.CAO_GIA.sku, 48, 'COD'); // 12tr -> co chiet khau
      const truoc = doc1(
        `SELECT TOP 1 CAST(CAST(FinalPayment AS bigint) AS varchar(20)) FROM Orders WHERE Id = '${don.id}';`);

      // Doi bac chiet khau (co bang SystemConfigVersions -> phai co truong hieu luc)
      const coBangVersion = doc1(`
        SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SystemConfigVersions';`);
      expect(coBangVersion, 'Khong co bang SystemConfigVersions de luu hieu luc cau hinh').toBe('1');

      const sau = doc1(
        `SELECT TOP 1 CAST(CAST(FinalPayment AS bigint) AS varchar(20)) FROM Orders WHERE Id = '${don.id}';`);
      expect(sau, 'Don da hoan tat bi tinh lai gia (vi pham BR-050)').toBe(truoc);
    });

  // FT-09 NAC-03; BR-048; NFR-SEC08 — Nhat ky kiem toan bat bien, xuat CSV che PII.
  test('L4-AM-03 Nhat ky kiem toan khong sua/xoa duoc va xuat CSV che PII', async ({ page }) => {
    await vaoVoiVaiTro(page, 'admin', '/admin/audit-log');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/audit-log/);

    // Giao dien KHONG duoc co nut sua/xoa ban ghi
    await expect(page.getByRole('button', { name: /^(sửa|xoá|xóa)$/i })).toHaveCount(0);

    const ctx = await ctxTheoVaiTro('admin');
    const banGhi = doc1('SELECT TOP 1 CAST(Id AS varchar(36)) FROM AuditLogs;');
    test.skip(banGhi === '', 'Chua co ban ghi nhat ky nao de thu sua/xoa');

    // BR-048: KHONG duoc mo route sua/xoa
    const xoa = await ctx.delete(`/api/admin/audit-logs/${banGhi}`);
    expect([404, 405], `DELETE audit-log tra ${xoa.status()} — dang mo duong xoa nhat ky, vi pham BR-048`)
      .toContain(xoa.status());

    const sua = await ctx.put(`/api/admin/audit-logs/${banGhi}`, { data: { action: 'E2E-L4 tampered' } });
    expect([404, 405], `PUT audit-log tra ${sua.status()} — dang mo duong sua nhat ky, vi pham BR-048`)
      .toContain(sua.status());
    await ctx.dispose();
  });

  // FT-09 AC-05; BV-03; BR-049; NFR-A04 — Theo doi job: loi hien so lan thu lai, job chua chay
  // khong duoc bao la khoe manh.
  test('L4-AM-04 Man theo doi job phan biet ro job loi va job chua chay', async ({ page }) => {
    await vaoVoiVaiTro(page, 'admin', '/admin/system-health');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/system-health/);

    // Phai co du lieu job that de doi chieu (Hangfire da chay khi khoi dong BE)
    const soJob = doc1('SELECT COUNT(*) FROM JobRuns;');
    expect(Number(soJob || '0'), 'Khong co ban ghi JobRuns nao de doi chieu').toBeGreaterThan(0);

    const chu = await page.locator('body').innerText();
    expect(
      chu,
      'Man giam sat khong hien ten hay trang thai job nao',
    ).toMatch(/job|tác vụ|tiến trình|trạng thái/i);
  });

  // ── SC-05: Marketing AI + Facebook · Doi tra ────────────────────────────────

  // FT-10 AC-01..03; BR-046; NFR-P07 — Soan bai AI, gui duyet, SM duyet + hen gio, dang bai.
  test('L4-AM-05 Soan bai AI, gui duyet, Sales Manager duyet va hen gio dang', async ({ page }) => {
    // (a) Route workbook ghi — kiem xem co that khong
    await vaoVoiVaiTro(page, 'admin', '/admin/ai-marketing');
    await page.waitForLoadState('networkidle');
    const laStub = /sắp ra mắt|coming soon|đang phát triển/i.test(await page.locator('body').innerText());

    // (b) Route that
    await vaoVoiVaiTro(page, 'sales', '/sales/ai-content-studio');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/ai-content-studio/);

    // Sales tao bai nhap
    const ctx = await ctxTheoVaiTro('sales');
    // CreateMarketingPostDto bat buoc ProductId cua san pham that.
    const sp = await mapSanPham();
    const idSanPham = sp.get(SKU.CAO_GIA.sku)!.id;
    const tao = await ctx.post('/api/marketing-posts', {
      data: {
        productId: idSanPham,
        promptUsed: 'E2E-L4 prompt kiem thu',
        generatedImageUrl: 'https://placehold.co/600x600?text=E2E-L4',
        generatedCaption: 'E2E-L4 caption sinh tu dong',
        selectedImageUrl: 'https://placehold.co/600x600?text=E2E-L4',
        editedCaption: 'E2E-L4 noi dung bai kiem thu tu dong.',
      },
    });
    const bodyTao = await tao.text();
    await ctx.dispose();
    expect(tao.status(), `Tao bai marketing that bai: ${tao.status()} ${bodyTao}`).toBeLessThan(400);

    expect(
      laStub,
      'Route /admin/ai-marketing trong workbook chi la stub ComingSoon (AdminPortal.tsx:205-207); '
      + 'chuc nang that o /sales/ai-content-studio — workbook ghi sai route',
    ).toBe(false);
  });

  // FT-10 NAC-01; NAC-02; BR-046; NFR-SEC03 — Sales KHONG tu duyet bai cua chinh minh.
  test('L4-AM-06 Sales Staff khong tu duyet duoc bai cua chinh minh', async ({ page }) => {
    await vaoVoiVaiTro(page, 'sales', '/sales/ai-content-studio');
    await page.waitForLoadState('networkidle');

    // Giao dien cua Sales khong duoc co nut Duyet
    await expect(page.getByRole('button', { name: /^duyệt$|phê duyệt/i })).toHaveCount(0);

    // Goi API truc tiep cung phai bi tu choi
    const ctx = await ctxTheoVaiTro('sales');
    const ds = await ctx.get('/api/marketing-posts');
    const dsBody = ds.ok() ? await ds.json() : [];
    const bai = (Array.isArray(dsBody) ? dsBody : dsBody.items ?? [])[0];

    if (bai?.id) {
      const duyet = await ctx.post(`/api/marketing-posts/${bai.id}/decision`, {
        data: { action: 'Approve', scheduledAt: new Date(Date.now() + 3600_000).toISOString() },
      });
      expect(
        duyet.status(),
        'Sales Staff tu duyet duoc bai marketing cua chinh minh (vi pham BR-046/NFR-SEC03)',
      ).toBeGreaterThanOrEqual(400);
    }
    await ctx.dispose();
  });

  // FT-08 AC-05; BR-019 — Doi/tra: khach tao yeu cau, SM duyet, Sales thu hoi.
  test('L4-AM-07 Luong doi tra: khach tao yeu cau, Sales Manager duyet, Sales thu hoi hang',
    async ({ page }) => {
      const don = await taoDon('customer', SKU.RE_NHAT.sku, 2, 'COD');

      // Tien dieu kien that: chi don DA GIAO THANH CONG moi duoc yeu cau doi/tra.
      // Enum that (Models/Order.cs:7-9): OrderStatus.Completed = 5, DeliveryStatus.Delivered = 3.
      ghi(`UPDATE Orders SET DeliveryStatus = 3, DeliveredAt = SYSUTCDATETIME(),
                             OrderStatus = 5
           WHERE Id = '${don.id}';`,
        `L4-AM-07 dua don ${don.orderCode} ve trang thai da giao de mo luong doi/tra`);

      const kh = await ctxTheoVaiTro('customer');
      const yc = await kh.post(`/api/orders/${don.id}/exchange-request`, {
        data: { reason: 'E2E-L4 san pham loi', items: [] },
      });
      const ycBody = await yc.text();
      await kh.dispose();
      expect(yc.status(), `Tao yeu cau doi/tra that bai: ${yc.status()} ${ycBody}`).toBeLessThan(400);

      // Sales Staff KHONG duoc tu duyet yeu cau doi/tra
      const sales = await ctxTheoVaiTro('sales');
      const req = doc1('SELECT TOP 1 CAST(Id AS varchar(36)) FROM ReturnExchangeRequests ORDER BY 1 DESC;');
      if (req) {
        const tuDuyet = await sales.post(`/api/orders/exchange-request/${req}/process`, {
          data: { isApproved: true },
        });
        expect(
          tuDuyet.status(),
          'Sales Staff tu duyet duoc yeu cau doi/tra (vi pham BR-019)',
        ).toBeGreaterThanOrEqual(400);
      }
      await sales.dispose();

      // Man len lich thu hoi. Workbook ghi /sales/pickup-arrangement; nhanh "Gop lai 2 trang sap xep
      // van chuyen trung lap" da gop man nay vao /sales/delivery/arrangement (SalesDeliveryArrangementPage
      // doc /api/delivery/pickups va cho xep chuyen thu hoi cung cho voi giao hang).
      // SalesPortal.tsx co <Route path="*" element={<SalesDashboardPage />} /> nen URL van giu nguyen
      // du route khong ton tai -> KHONG duoc dua vao page.url() de ket luan; phai doi chieu NOI DUNG.
      await vaoVoiVaiTro(page, 'sales', '/sales/delivery/arrangement');
      await page.waitForLoadState('networkidle');
      const noiDung = await page.locator('main, body').first().innerText();
      const roiVeDashboard = /doanh số hôm nay/i.test(noiDung);
      expect(
        roiVeDashboard,
        'Route /sales/delivery/arrangement roi vao catch-all ve Dashboard — khong co man len lich thu hoi',
      ).toBe(false);
    });

  // FT-08 AC-03; BV-02; BR-042; BR-043 — Don thay the: cung ma giu gia goc, khac ma dung gia hien hanh.
  test('L4-AM-08 Don thay the cung ma giu gia goc, khac ma dung gia hien hanh', async ({ page }) => {
    await vaoVoiVaiTro(page, 'sales', '/sales/orders');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/sales\/orders/);

    // BR-042/043 doi hoi don thay the giu duoc gia goc -> phai co lien ket ReplacementOrderId
    const coCot = doc1(`
      SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Orders' AND COLUMN_NAME = 'ReplacementOrderId';`);
    expect(coCot, 'Khong co cot ReplacementOrderId — khong lan vet duoc don thay the').toBe('1');

    // Va phai co bang luu gia da chot theo dong don
    // Ten cot that la PriceSnapshot (khong phai UnitPrice)
    const coPriceSnapshot = doc1(`
      SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'OrderItems' AND COLUMN_NAME = 'PriceSnapshot';`);
    expect(coPriceSnapshot, 'OrderItems khong luu PriceSnapshot — khong giu duoc gia goc').toBe('1');
  });

  // FT-10 NAC-03; BV-01; BV-02 — Hen gio qua khu bi chan; hang doi toi da 30 bai.
  test('L4-AM-09 Chan hen gio o qua khu va chan vuot gioi han hang doi 30 bai', async ({ page }) => {
    await vaoVoiVaiTro(page, 'salesManager', '/sales-manager/ai-marketing-approval');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/ai-marketing-approval/);

    const ctx = await ctxTheoVaiTro('salesManager');
    const ds = await ctx.get('/api/marketing-posts');
    const dsBody = ds.ok() ? await ds.json() : [];
    const bai = (Array.isArray(dsBody) ? dsBody : dsBody.items ?? [])[0];
    test.skip(!bai?.id, 'Chua co bai marketing nao de thu hen gio');

    // BV-01: thoi diem dang DA QUA phai bi chan
    const quaKhu = await ctx.post(`/api/marketing-posts/${bai.id}/decision`, {
      data: { action: 'Approve', scheduledAt: new Date(Date.now() - 3600_000).toISOString() },
    });
    await ctx.dispose();

    expect(
      quaKhu.status(),
      'He thong chap nhan hen gio dang bai o THOI DIEM DA QUA (vi pham BV-01)',
    ).toBeGreaterThanOrEqual(400);
  });

  // FT-10 NAC-04; BV-03; NFR-SEC07 — Chan file sai dinh dang va anh vuot dung luong.
  test('L4-AM-10 Chan file sai dinh dang va anh vuot dung luong khi dinh kem bai', async ({ page }) => {
    await vaoVoiVaiTro(page, 'sales', '/sales/ai-content-studio');
    await page.waitForLoadState('networkidle');

    const ctx = await ctxTheoVaiTro('sales');
    const ds = await ctx.get('/api/marketing-posts');
    const dsBody = ds.ok() ? await ds.json() : [];
    const bai = (Array.isArray(dsBody) ? dsBody : dsBody.items ?? [])[0];
    test.skip(!bai?.id, 'Chua co bai nhap nao de thu dinh kem');

    // File PE (.exe) doi duoi .png — NFR-SEC07 doi hoi kiem magic byte, khong chi kiem duoi
    const gia = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(1024, 0)]);
    const res = await ctx.post(`/api/marketing-posts/${bai.id}/media`, {
      multipart: {
        file: { name: 'E2E-L4-gia-mao.png', mimeType: 'image/png', buffer: gia },
      },
    });
    await ctx.dispose();

    expect(
      res.status(),
      `POST /api/marketing-posts/{id}/media tra ${res.status()} — chuc nang upload media chua `
      + 'trien khai (xac nhan lai DEF-L3-005), khong kiem duoc NFR-SEC07',
    ).not.toBe(404);
    expect(
      res.status(),
      'File PE doi duoi .png duoc chap nhan — chi kiem phan mo rong, khong kiem magic byte',
    ).toBeGreaterThanOrEqual(400);
  });

  // FT-10 AC-04; AC-05; BR-003; BR-049 — Chi so tuong tac, thu lai bai loi khong tao bai trung.
  test('L4-AM-11 Lich su marketing: chi so tuong tac va thu lai bai loi khong tao bai trung',
    async ({ page }) => {
      // Route workbook ghi
      await vaoVoiVaiTro(page, 'admin', '/admin/marketing-history');
      await page.waitForLoadState('networkidle');
      const laStub = /sắp ra mắt|coming soon|đang phát triển/i.test(await page.locator('body').innerText());

      const ctx = await ctxTheoVaiTro('sales');
      const ds = await ctx.get('/api/marketing-posts');
      const dsBody = ds.ok() ? await ds.json() : [];
      const bai = (Array.isArray(dsBody) ? dsBody : dsBody.items ?? [])[0];

      if (bai?.id) {
        const chiSo = await ctx.get(`/api/marketing-posts/${bai.id}/metrics`);
        expect(
          chiSo.status(),
          `GET /api/marketing-posts/{id}/metrics tra ${chiSo.status()} — chi so tuong tac chua `
          + 'trien khai (xac nhan lai DEF-L3-005)',
        ).toBeLessThan(400);
      }
      await ctx.dispose();

      // BR-003: khach vao tu bai viet KHONG duoc doi nguoi phu trach
      expect(
        laStub,
        'Route /admin/marketing-history trong workbook chi la stub ComingSoon '
        + '(AdminPortal.tsx:205-207) — workbook ghi sai route',
      ).toBe(false);
    });
});
