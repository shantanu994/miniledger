import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/auth";

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    req.userId = verifyToken(header.slice(7)).userId;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
