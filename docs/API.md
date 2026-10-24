# MiniLedger API

All protected endpoints use `Authorization: Bearer <token>`.

## Health

`GET /api/health` returns `{ "status": "ok" }`.

## Authentication

- `POST /api/auth/send-otp` body `{ "phone": "9876543210" }`
- `POST /api/auth/verify-otp` body `{ "phone": "9876543210", "otp": "123456" }`

The verify response contains `token` and a small `user` object. The OTP is only printed by the server in development.

## Loans

- `GET /api/loans` lists the authenticated user's loans.
- `POST /api/loans` body `{ "friendName": "Rahul", "amount": 1500, "dueDate": "2026-11-15" }`.
- `GET /api/loans/:id` gets one owned loan.
- `PATCH /api/loans/:id/repay` changes `PENDING` to `REPAID`.
- `GET /api/loans/summary` returns `totalLent`, `totalRepaid`, `pendingAmount`, `overdueAmount`, and `totalEntries`.
- `POST /api/loans/:id/receipt` accepts an image in multipart field `receipt`, limited to 5 MB.

Amounts are returned as strings to avoid floating-point ambiguity. Dates are date-only `YYYY-MM-DD` values. A loan is overdue only when it is pending and its date is before the API server's current date.

Errors use `{ "error": "..." }`; validation errors also include a `details` array. A missing or invalid token returns 401, and a loan owned by another user behaves as not found.
