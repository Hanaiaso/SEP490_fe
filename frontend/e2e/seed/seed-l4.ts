/**
 * Seed tien dieu kien cho bo L4. Chay o globalSetup, IDEMPOTENT (chay lai nhieu lan duoc).
 *
 * Nguyen tac:
 *   - Uu tien di qua API that (dung tinh than E2E, nghiep vu duoc thuc thi day du).
 *   - Chi dung SQL truc tiep cho thu API khong co duong toi (du lieu danh muc, trang thai
 *     nhan tao nhu hang doi 30 bai, job da chay...).
 *   - Moi lenh SQL ghi deu duoc ghi vao SEP490_be/tests/L4_mutations_<ngay>.sql.
 *
 * Phat hien khi dung seed: POST /api/Cart/items tra 409 PROFILE_INCOMPLETE neu khach chua co
 * dia chi giao hang. Vi vay buoc dia chi phai chay TRUOC moi case lien quan gio hang.
 */
import { ACCOUNTS, RoleKey } from '../fixtures/accounts';
import { ctxTheoVaiTro } from '../fixtures/api';
import { ghi, doc1, q } from '../fixtures/db';

const KHACH_CAN_DIA_CHI: RoleKey[] = ['customer'];

/** 1. Moi khach test phai co 1 dia chi mac dinh, neu khong se bi chan o buoc them gio hang. */
async function seedDiaChi() {
  for (const role of KHACH_CAN_DIA_CHI) {
    const ctx = await ctxTheoVaiTro(role);
    const hien = await ctx.get('/api/user/addresses');
    const ds = hien.ok() ? await hien.json() : null;
    const soDiaChi = Array.isArray(ds) ? ds.length : Array.isArray(ds?.data) ? ds.data.length : 0;

    if (soDiaChi === 0) {
      const res = await ctx.post('/api/user/addresses', {
        data: {
          name: 'E2E L4 Nguoi Nhan',
          phone: '0912345678',
          city: 'Hà Nội',
          district: '',
          ward: 'Phường Cầu Giấy',
          addressLine: 'E2E-L4 Số 1 Đường Kiểm Thử',
          type: 'Nhà riêng',
          isDefault: true,
        },
      });
      if (!res.ok()) {
        throw new Error(`Seed dia chi cho ${role} that bai: ${res.status()} ${await res.text()}`);
      }
      console.log(`[seed] Da tao dia chi mac dinh cho ${ACCOUNTS[role].email}`);
    }
    await ctx.dispose();
  }
}

/**
 * 2. Workbook L4-CP-06 yeu cau >= 10 san pham Active. DB chi co 7.
 *    Them 3 san pham danh muc bang SQL (day la du lieu danh muc thuan tuy).
 */
function seedSanPham() {
  const dang = Number(doc1('SELECT COUNT(*) FROM Products WHERE IsDiscontinued = 0;') || '0');
  if (dang >= 10) return;

  const catId = doc1('SELECT TOP 1 CAST(Id AS varchar(36)) FROM Categories;');
  const canThem = 10 - dang;

  for (let i = 1; i <= canThem; i++) {
    const sku = `E2E-L4-SP${String(i).padStart(2, '0')}`;
    const daCo = doc1(`SELECT COUNT(*) FROM Products WHERE Sku = ${q(sku)};`);
    if (daCo !== '0') continue;

    ghi(`
      INSERT INTO Products (Id, CategoryId, Name, Sku, StandardListedPrice, Description,
                            Specifications, ImageUrl, Unit, IsDiscontinued, AverageRating, ReviewCount)
      VALUES (NEWID(), '${catId}', ${q(`E2E-L4 San pham kiem thu ${i}`)}, ${q(sku)},
              50000, ${q('San pham do bo E2E L4 tao ra')}, N'', N'', N'Cái', 0, 0, 0);`,
      `Seed san pham ${sku} (du 10 san pham Active cho L4-CP-06)`);
  }
  console.log(`[seed] Da bo sung ${canThem} san pham -> du 10 Active`);
}

/** 3. L4-UJ-09 can nha cung cap SUP-01. Bang Suppliers dang rong. */
function seedNhaCungCap() {
  const daCo = doc1(`SELECT COUNT(*) FROM Suppliers WHERE Code = ${q('SUP-01')};`);
  if (daCo !== '0') return;

  // Cot that: Id,Name,Code,ContactPerson,Phone,Email,Address,TaxCode,IsActive,CreatedAt
  ghi(`
    INSERT INTO Suppliers (Id, Name, Code, ContactPerson, Phone, Email, Address, TaxCode, IsActive, CreatedAt)
    VALUES (NEWID(), ${q('E2E-L4 Nha cung cap kiem thu')}, ${q('SUP-01')}, ${q('Nguoi lien he')},
            '0900000001', ${q('sup01@viettien.test')}, ${q('E2E-L4 Dia chi NCC')},
            ${q('0100000000')}, 1, SYSUTCDATETIME());`,
    'Seed nha cung cap SUP-01 cho L4-UJ-09');
  console.log('[seed] Da tao nha cung cap SUP-01');
}

/**
 * 4. L4-PM-07 (IDOR) can MOT don thuoc KHACH KHAC de thu doi id tren URL.
 *    Toan bo don hien co deu thuoc customer.test, nen ta chuyen quyen so huu mot don sang
 *    ho so khach khac. Day la thao tac SQL vi API co tinh khong cho doi chu so huu don.
 */
function seedDonKhachKhac() {
  const daCo = doc1(`
    SELECT COUNT(*) FROM Orders o
    JOIN CustomerProfiles p ON p.Id = o.CustomerProfileId
    WHERE p.UserId <> '${ACCOUNTS.customer.userId}';`);
  if (daCo !== '0') return;

  // Chon mot ho so khach KHAC customer.test. Uu tien ho so do chinh dot L4 tao ra ('e2e.l4.%'),
  // nhung DB moi reset (Respawn cua bo L3 xUnit) chi con ho so tu seed HasData nen phai co duong
  // lui: lay bat ky ho so nao khong thuoc customer.test. Neu khong, L4-PM-07 se bi test.skip va
  // case IDOR trong workbook khong bao gio duoc chay.
  const hoSoKhac =
    doc1(`
      SELECT TOP 1 CAST(p.Id AS varchar(36))
      FROM CustomerProfiles p
      JOIN Users u ON u.Id = p.UserId
      WHERE p.UserId <> '${ACCOUNTS.customer.userId}' AND u.Email LIKE 'e2e.l4.%';`)
    || doc1(`
      SELECT TOP 1 CAST(p.Id AS varchar(36))
      FROM CustomerProfiles p
      WHERE p.UserId <> '${ACCOUNTS.customer.userId}';`);
  if (!hoSoKhac) {
    console.warn('[seed] Chua co ho so khach nao khac de dung cho L4-PM-07');
    return;
  }

  const don = doc1(`
    SELECT TOP 1 CAST(o.Id AS varchar(36)) FROM Orders o
    JOIN CustomerProfiles p ON p.Id = o.CustomerProfileId
    WHERE p.UserId = '${ACCOUNTS.customer.userId}' ORDER BY o.CreatedAt ASC;`);
  if (!don) {
    console.warn('[seed] Chua co don nao de chuyen sang khach khac cho L4-PM-07');
    return;
  }

  ghi(`UPDATE Orders SET CustomerProfileId = '${hoSoKhac}' WHERE Id = '${don}';`,
    `Seed L4-PM-07: chuyen don ${don} sang ho so khach khac de thu IDOR`);
  console.log(`[seed] Da chuyen 1 don sang khach khac cho L4-PM-07`);
}

export default async function globalSetup() {
  console.log('[seed] Bat dau seed tien dieu kien L4...');
  await seedDiaChi();
  seedSanPham();
  try {
    seedDonKhachKhac();
  } catch (e) {
    console.warn(`[seed] Bo qua seed don khach khac: ${(e as Error).message.split('\n')[0]}`);
  }
  try {
    seedNhaCungCap();
  } catch (e) {
    // Khong chan ca bo test neu schema Suppliers khac du doan — case UJ-09 se tu bao Blocked.
    console.warn(`[seed] Bo qua seed nha cung cap: ${(e as Error).message.split('\n')[0]}`);
  }
  console.log('[seed] Xong.');
}
