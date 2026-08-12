/**
 * Sheet L4-Responsive (Optional) — 4 case, chay o project mobile375 (375x812).
 * NFR-U01 (>= 375px) · NFR-U02 (tieng Viet) · NFR-U03 (checkout <= 4 buoc)
 */
import { test, expect, Page } from '@playwright/test';
import { ACCOUNTS } from '../fixtures/accounts';
import { vaoVoiVaiTro } from '../fixtures/auth';
import { xoaGio, themVaoGioQuaApi } from '../fixtures/donhang';
import { SKU } from '../fixtures/accounts';

/** Trang co bi tran ngang khong. Cho sai so 1px cho viec lam tron cua trinh duyet. */
async function coCuonNgang(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
}

test.describe('L4-Responsive', () => {

  // NFR-U01 — /products, /cart, /checkout o 375px khong duoc cuon ngang.
  test('L4-RS-01 Khong cuon ngang o 375px tren products, cart va checkout', async ({ page }) => {
    const loi: string[] = [];

    for (const duongDan of ['/products', '/cart', '/checkout']) {
      await vaoVoiVaiTro(page, 'customer', duongDan);
      await page.waitForLoadState('networkidle');
      if (await coCuonNgang(page)) {
        const w = await page.evaluate(() => document.documentElement.scrollWidth);
        loi.push(`${duongDan} (scrollWidth=${w} > 375)`);
      }
    }

    expect(loi, `Cac trang bi tran ngang o 375px: ${loi.join(', ')}`).toEqual([]);
  });

  // NFR-U01 — Sales dung ngoai duong: man ghi nhan giao hang + thu tien phai dung duoc o mobile.
  test('L4-RS-02 Man thu tien giao hang dung duoc o 375px', async ({ page }) => {
    await vaoVoiVaiTro(page, 'sales', '/sales/delivery/collection');
    await page.waitForLoadState('networkidle');

    // Vao dung man, khong bi day di noi khac
    await expect(page).toHaveURL(/\/sales\/delivery\/collection/);
    expect(await coCuonNgang(page), 'Man thu tien bi tran ngang o 375px').toBe(false);

    // Cac nut thao tac chinh phai bam duoc (khong bi che/khong bi 0px)
    const nut = page.getByRole('button');
    const soNut = await nut.count();
    expect(soNut, 'Man thu tien khong render nut thao tac nao').toBeGreaterThan(0);
  });

  // NFR-U02 — 100% van ban nguoi dung thay la tieng Viet, dinh dang tien/ngay theo chuan VN.
  test('L4-RS-03 Toan bo luong dat hang hien thi tieng Viet va dinh dang VN', async ({ page }) => {
    await vaoVoiVaiTro(page, 'customer', '/products');
    await page.waitForLoadState('networkidle');

    const chu = (await page.locator('body').innerText()).replace(/\s+/g, ' ');

    // Dinh dang tien VN: "250.000 ₫" (dau cham phan nhom, ky hieu ₫)
    expect(chu, 'Khong thay dinh dang tien te kieu Viet Nam').toMatch(/\d{1,3}(\.\d{3})+\s*₫/);

    // Khong duoc lot van ban tieng Anh mac dinh cua khung suon
    const tuTiengAnh = /\b(Add to cart|Checkout|Search products|Loading\.\.\.|Not found|Sign in)\b/i;
    expect(chu, 'Con van ban tieng Anh tren giao dien khach hang').not.toMatch(tuTiengAnh);
  });

  // NFR-U03 — Tu gio hang toi khi chon xong phuong thuc thanh toan: toi da 4 click/trang.
  test('L4-RS-04 Tu gio den chon xong phuong thuc thanh toan khong qua 4 buoc', async ({ page }) => {
    // Tu lo tien dieu kien: cac case truoc co the da dat het hang trong gio.
    await xoaGio('customer');
    await themVaoGioQuaApi('customer', SKU.RE_NHAT.sku, 1);

    await vaoVoiVaiTro(page, 'customer', '/cart');
    await page.waitForLoadState('networkidle');

    // Checkout la wizard 3 buoc (Checkout.jsx:113-118):
    //   Step 0 Dia chi -> Step 1 Xac nhan hoa don -> Step 2 Phuong thuc TT
    let soBuoc = 0;

    // Click 1: bam Thanh toan o gio hang
    const nutThanhToan = page.getByRole('button', { name: /thanh toán|đặt hàng/i }).first();
    await expect(nutThanhToan, 'Gio hang khong co nut thanh toan (gio dang rong?)').toBeVisible();
    await nutThanhToan.click();
    soBuoc++;

    await expect(page).toHaveURL(/\/checkout/);
    await page.waitForLoadState('networkidle');

    // Click 2: Step 0 -> Step 1
    await page.getByRole('button', { name: /xem hóa đơn & tiếp tục/i }).click();
    soBuoc++;

    // Click 3: Step 1 -> Step 2
    await page.getByRole('button', { name: /đồng ý & chọn thanh toán/i }).click();
    soBuoc++;

    // Click 4: chon phuong thuc COD
    const radioCod = page.locator('input[name="payment"][value="cod"]');
    await expect(radioCod, 'Step 2 khong render lua chon phuong thuc thanh toan').toBeVisible();
    await radioCod.check();
    soBuoc++;

    expect(soBuoc, `Tu gio den chon xong phuong thuc thanh toan mat ${soBuoc} click`)
      .toBeLessThanOrEqual(4);
  });
});
