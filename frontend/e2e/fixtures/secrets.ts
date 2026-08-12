/**
 * Doc cau hinh that ma backend dang dung, de test kich duoc webhook SePay.
 *
 * KHONG in gia tri ra log, khong ghi ra file. Chi tra ve cho request dung.
 * File appsettings.Development.json da .gitignore (dong 34) va chua key that.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const DUONG_DAN = resolve(
  __dirname, '../../../../SEP490_be/VietTien.API/appsettings.Development.json',
);

let cache: Record<string, any> | null = null;

function doc(): Record<string, any> {
  if (!cache) cache = JSON.parse(readFileSync(DUONG_DAN, 'utf8'));
  return cache!;
}

/** Token webhook SePay — SePayController doi chieu header x-sepay-token voi gia tri nay. */
export function sepayToken(): string {
  return process.env.SEPAY_TOKEN ?? doc().SePaySettings?.ApiToken ?? '';
}
