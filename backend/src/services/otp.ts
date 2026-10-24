import crypto from "node:crypto";
import { env } from "../config/env";

type OtpRecord = { hash: string; expiresAt: number; attempts: number };
const records = new Map<string, OtpRecord>();
const requests = new Map<string, { count: number; startedAt: number }>();

function hash(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function createOtp(phone: string): void {
  const now = Date.now();
  const request = requests.get(phone);
  if (request && now - request.startedAt < 15 * 60_000 && request.count >= 5) {
    throw new Error("Too many OTP requests. Try again later.");
  }
  requests.set(phone, request && now - request.startedAt < 15 * 60_000
    ? { ...request, count: request.count + 1 }
    : { count: 1, startedAt: now });
  const otp = crypto.randomInt(100000, 1000000).toString();
  records.set(phone, { hash: hash(otp), expiresAt: now + env.OTP_EXPIRY_MINUTES * 60_000, attempts: 0 });
  console.log(`[MiniLedger] OTP for ${phone}: ${otp}`);
}

export function consumeOtp(phone: string, otp: string): boolean {
  const record = records.get(phone);
  if (!record || record.expiresAt < Date.now() || record.attempts >= 5) {
    records.delete(phone);
    return false;
  }
  record.attempts += 1;
  if (record.hash !== hash(otp)) return false;
  records.delete(phone);
  return true;
}
