/**
 * Truy cap SQL truc tiep cho cac trang thai API khong tao duoc
 * (snapshot gio het han, thu hoi refresh token, hang doi 30 bai marketing...).
 *
 * MOI LENH GHI deu duoc ghi lai vao SEP490_be/tests/L4_mutations_<ngay>.sql TRUOC khi chay,
 * de sau dot test con dau vet nhung gi da thay doi.
 */
import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export const DB = process.env.L4_DB ?? 'VietTien22_L3';

const NGAY = new Date().toISOString().slice(0, 10);
const NHAT_KY = resolve(__dirname, '../../../../SEP490_be/tests', `L4_mutations_${NGAY}.sql`);

function ghiNhatKy(sql: string) {
  mkdirSync(dirname(NHAT_KY), { recursive: true });
  appendFileSync(NHAT_KY, `\n-- ${new Date().toISOString()}\n${sql.trim()}\n`, 'utf8');
}

function chay(sql: string, ...them: string[]): string {
  // -b: sqlcmd tra ma thoat khac 0 khi cau lenh loi -> execFileSync nem exception.
  // Khong co -b thi loi SQL (vd sai ten cot) bi NUOT, seed "thanh cong" gia ma bang van rong.
  return execFileSync(
    'sqlcmd',
    ['-S', 'localhost', '-E', '-C', '-b', '-d', DB, '-W', '-s', '|',
      // QUOTED_IDENTIFIER/ANSI_NULLS phai ON: cac bang co filtered index (vd Inventories,
      // Users) se tu choi moi INSERT/UPDATE neu tat, kem Msg 1934. sqlcmd -Q mac dinh TAT.
      '-Q', `SET QUOTED_IDENTIFIER ON;\nSET ANSI_NULLS ON;\nSET NOCOUNT ON;\n${sql}`, ...them],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  );
}

/** Cau lenh CHI DOC. Khong ghi nhat ky. */
export function doc(sql: string): string {
  return chay(sql);
}

/**
 * Doc 1 o dau tien, tra ve chuoi da trim (rong neu khong co dong nao).
 * Dung `-h -1` de sqlcmd BO HAN dong tieu de va dong gach ngang — neu con tieu de thi
 * viec dem dong rat de lech (cot khong dat alias se in ra mot dong tieu de RONG).
 */
export function doc1(sql: string): string {
  const raw = chay(sql, '-h', '-1');
  const dong = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const v = dong[0] ?? '';
  return v === 'NULL' ? '' : v;
}

/** Cau lenh GHI. Ghi nhat ky truoc khi chay. */
export function ghi(sql: string, moTa = ''): string {
  ghiNhatKy(moTa ? `-- ${moTa}\n${sql}` : sql);
  return chay(sql);
}

/** Escape chuoi cho literal SQL. */
export function q(s: string): string {
  return `N'${s.replace(/'/g, "''")}'`;
}
