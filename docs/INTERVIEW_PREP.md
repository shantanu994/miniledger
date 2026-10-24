# Interview preparation

MiniLedger has a React Native client, an Express API, Prisma, and PostgreSQL. The client calls the API with Axios and stores the JWT in Expo SecureStore. The API authenticates the JWT before every loan operation and always includes the authenticated user's ID in database filters.

OTP authentication is intentionally a demo flow: the API generates a random six-digit value, hashes it in memory, prints the value, expires it after five minutes, and deletes it after successful use. A production app would use an SMS provider and shared storage. Money is a PostgreSQL Decimal and API responses serialize it as strings. Dates are stored as PostgreSQL dates and compared as `YYYY-MM-DD`, avoiding time-of-day surprises.

## Questions and answers

1. **Why PostgreSQL?** It provides durable relational storage and accurate decimal money types.
2. **Why Prisma?** It gives typed queries and migrations without hiding the database model.
3. **Why JWT?** It lets the stateless API identify a user on each request.
4. **Where is authorization enforced?** The middleware authenticates, and every loan query filters by `userId`.
5. **Why is the OTP not returned?** Returning it would defeat even this mock verification flow.
6. **Why hash OTPs?** A memory dump should not reveal active OTP values.
7. **What happens when an OTP expires?** Verification returns 401 and removes the record.
8. **Why use Decimal?** JavaScript floating point can introduce rounding errors for currency.
9. **What is overdue?** Pending plus a due date before today's date.
10. **Can a repaid loan be overdue?** No; status is checked first.
11. **How are totals calculated?** The API reads only the current user's rows and sums them.
12. **How is another user's loan protected?** Its ID is queried together with the current user's ID.
13. **Why validate with Zod?** It makes input rules explicit at the API boundary.
14. **Why use date-only strings?** Loans are due on a calendar date, not at a particular instant.
15. **How does receipt upload work?** Multer limits images to 5 MB, creates a generated filename, and stores a relative path.
16. **Is local upload storage production-ready?** No; it should be replaced with object storage.
17. **How does the client refresh?** It requests summary and loans again after create or repay.
18. **What happens on an invalid token?** Middleware returns 401 and the client can log out.
19. **Why rate-limit OTP?** It reduces accidental or abusive repeated requests.
20. **What would you improve first?** Real SMS, Redis-backed OTP/rate limits, refresh tokens, and cloud receipt storage.

## Debugging scenarios

- If login fails, inspect the API terminal for the OTP and check the phone format.
- If the phone cannot reach the API, use the computer's LAN IP instead of `localhost`.
- If migrations fail, check PostgreSQL is running and `DATABASE_URL` points to an existing database.
- If a total looks wrong, inspect status and Decimal values in the database and confirm the user filter.
- If an upload fails, check MIME type, file size, and that the API process can write to `backend/uploads`.
