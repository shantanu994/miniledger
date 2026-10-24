import { Router } from "express";
import { prisma } from "../config/prisma";
import { signToken } from "../utils/auth";
import { consumeOtp, createOtp } from "../services/otp";
import { sendOtpSchema, verifyOtpSchema } from "../validators/schemas";

export const authRouter = Router();
authRouter.post("/send-otp", (req, res, next) => {
  try {
    const { phone } = sendOtpSchema.parse(req.body);
    createOtp(phone);
    res.json({ message: "OTP generated. Check the server console in development." });
  } catch (error) { next(error); }
});
authRouter.post("/verify-otp", async (req, res, next) => {
  try {
    const { phone, otp } = verifyOtpSchema.parse(req.body);
    if (!consumeOtp(phone, otp)) {
      res.status(401).json({ error: "Incorrect or expired OTP" });
      return;
    }
    const user = await prisma.user.upsert({ where: { phone }, update: {}, create: { phone } });
    res.json({ token: signToken(user.id), user: { id: user.id, phone: user.phone } });
  } catch (error) { next(error); }
});
