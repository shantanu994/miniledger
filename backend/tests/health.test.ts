import request from "supertest";

process.env.DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/miniledger";
process.env.JWT_SECRET = "test-secret-that-is-long-enough";
const { app } = require("../src/app") as typeof import("../src/app");

describe("health", () => {
  it("reports a healthy API", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "ok" });
  });
});
