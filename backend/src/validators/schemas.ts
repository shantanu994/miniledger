import { z } from "zod";

const phone = z.string().regex(/^\d{10}$/, "Phone must contain exactly 10 digits");
export const sendOtpSchema = z.object({ phone });
export const verifyOtpSchema = z.object({ phone, otp: z.string().regex(/^\d{6}$/, "OTP must contain 6 digits") });
export const loanSchema = z.object({
  friendName: z.string().trim().min(1).max(100),
  amount: z.coerce.number().finite().positive(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Due date must be YYYY-MM-DD").refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }, "Due date is invalid")
});
