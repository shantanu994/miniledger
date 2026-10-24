import jwt from "jsonwebtoken";
import { env } from "../config/env";

export type TokenPayload = { userId: string };

export function signToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): TokenPayload {
  const payload = jwt.verify(token, env.JWT_SECRET);
  if (typeof payload !== "object" || typeof payload.userId !== "string") throw new Error("Invalid token");
  return { userId: payload.userId };
}
