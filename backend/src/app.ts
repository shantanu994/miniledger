import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import path from "node:path";
import { authRouter } from "./routes/auth";
import { loansRouter } from "./routes/loans";
import { requireAuth } from "./middleware/auth";
import { errorHandler } from "./middleware/errors";

export const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60_000, limit: 30 }), authRouter);
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/loans", requireAuth, loansRouter);
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup({ openapi: "3.0.0", info: { title: "MiniLedger API", version: "1.0.0" }, paths: { "/api/health": { get: { responses: { "200": { description: "Healthy" } } } }, "/api/auth/send-otp": { post: { responses: { "200": { description: "OTP generated" } } } }, "/api/auth/verify-otp": { post: { responses: { "200": { description: "JWT returned" } } } }, "/api/loans": { get: { security: [{ bearerAuth: [] }], responses: { "200": { description: "Loans" } } }, post: { security: [{ bearerAuth: [] }], responses: { "201": { description: "Created" } } } } }, components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer" } } } }));
app.use(errorHandler);
