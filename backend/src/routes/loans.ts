import path from "node:path";
import crypto from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { Prisma } from "@prisma/client";
import { prisma } from "../config/prisma";
import { AuthenticatedRequest } from "../middleware/auth";
import { dateOnly, isOverdue } from "../utils/date";
import { loanSchema } from "../validators/schemas";

const upload = multer({
  dest: path.resolve(process.cwd(), "uploads"),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const allowed = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);
    const valid = file.mimetype.startsWith("image/") && allowed.has(extension);
    if (!valid) throw new Error("Only common image files are allowed");
    callback(null, true);
  }
});
const router = Router();
function currentUser(req: AuthenticatedRequest): string {
  if (!req.userId) throw new Error("Authentication required");
  return req.userId;
}
function loanId(req: AuthenticatedRequest): string {
  const id = req.params.id;
  if (typeof id !== "string") throw new Error("Invalid loan ID");
  return id;
}
function serialize(loan: { id: string; friendName: string; amount: Prisma.Decimal; dueDate: Date; status: string; receiptImagePath: string | null; createdAt: Date }) {
  return { ...loan, amount: loan.amount.toString(), dueDate: dateOnly(loan.dueDate), overdue: isOverdue(loan.status, loan.dueDate) };
}

router.post("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const data = loanSchema.parse(req.body);
    const loan = await prisma.loan.create({ data: { ...data, dueDate: new Date(`${data.dueDate}T00:00:00.000Z`), userId: currentUser(req), amount: new Prisma.Decimal(data.amount.toFixed(2)) } });
    res.status(201).json({ loan: serialize(loan) });
  } catch (error) { next(error); }
});
router.get("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const loans = await prisma.loan.findMany({ where: { userId: currentUser(req) }, orderBy: { dueDate: "asc" } });
    res.json({ loans: loans.map(serialize).sort((a, b) => Number(b.overdue) - Number(a.overdue) || a.dueDate.localeCompare(b.dueDate)) });
  } catch (error) { next(error); }
});
router.get("/summary", async (req: AuthenticatedRequest, res, next) => {
  try {
    const loans = await prisma.loan.findMany({ where: { userId: currentUser(req) } });
    const totalLent = loans.reduce((sum, loan) => sum + Number(loan.amount), 0);
    const repaid = loans.filter((loan) => loan.status === "REPAID");
    const pending = loans.filter((loan) => loan.status === "PENDING");
    const money = (items: typeof loans) => items.reduce((sum, loan) => sum + Number(loan.amount), 0);
    res.json({ totalLent: totalLent.toFixed(2), totalRepaid: money(repaid).toFixed(2), pendingAmount: money(pending).toFixed(2), overdueAmount: money(pending.filter((loan) => isOverdue(loan.status, loan.dueDate))).toFixed(2), totalEntries: loans.length });
  } catch (error) { next(error); }
});
router.get("/:id", async (req: AuthenticatedRequest, res, next) => {
  try {
    const loan = await prisma.loan.findFirst({ where: { id: loanId(req), userId: currentUser(req) } });
    if (!loan) { res.status(404).json({ error: "Loan not found" }); return; }
    res.json({ loan: serialize(loan) });
  } catch (error) { next(error); }
});
router.patch("/:id/repay", async (req: AuthenticatedRequest, res, next) => {
  try {
    const loan = await prisma.loan.findFirst({ where: { id: loanId(req), userId: currentUser(req) } });
    if (!loan) { res.status(404).json({ error: "Loan not found" }); return; }
    if (loan.status === "REPAID") { res.status(409).json({ error: "Loan has already been repaid" }); return; }
    const updated = await prisma.loan.update({ where: { id: loan.id }, data: { status: "REPAID" } });
    res.json({ loan: serialize(updated) });
  } catch (error) { next(error); }
});
router.post("/:id/receipt", upload.single("receipt"), async (req: AuthenticatedRequest, res, next) => {
  try {
    const loan = await prisma.loan.findFirst({ where: { id: loanId(req), userId: currentUser(req) } });
    if (!loan) { res.status(404).json({ error: "Loan not found" }); return; }
    if (!req.file) { res.status(400).json({ error: "Receipt image is required" }); return; }
    const extension = path.extname(req.file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, "");
    const filename = `${crypto.randomUUID()}${extension || ".jpg"}`;
    const finalPath = path.join(path.dirname(req.file.path), filename);
    const fs = await import("node:fs/promises");
    await fs.rename(req.file.path, finalPath);
    const updated = await prisma.loan.update({ where: { id: loan.id }, data: { receiptImagePath: `/uploads/${filename}` } });
    res.json({ receiptImagePath: updated.receiptImagePath });
  } catch (error) { next(error); }
});
export { router as loansRouter };
