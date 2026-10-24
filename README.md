# MiniLedger

MiniLedger is a full-stack app for tracking money lent to friends. It uses an Express API, PostgreSQL, Prisma, and an Expo SDK 58 mobile client.

## Features

- Mock phone + OTP login
- JWT-protected loan management
- Loan summaries, repayment tracking, and receipt uploads
- Expo web, phone, and emulator support

## Requirements

- Node.js 20+
- Docker Desktop or PostgreSQL 14+
- Expo Go for phone testing

## Run locally on Windows

### 1. Start PostgreSQL

Run once:

```powershell
docker run --name miniledger-postgres `
  -e POSTGRES_USER=postgres `
  -e POSTGRES_PASSWORD=postgres `
  -e POSTGRES_DB=miniledger `
  -p 5432:5432 `
  -d postgres:16
```

For later runs:

```powershell
docker start miniledger-postgres
```

### 2. Start the backend

From the repository root:

```powershell
Copy-Item backend\.env.example backend\.env
Set-Location D:\projects\miniledger\backend
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

The API runs at [http://localhost:4000](http://localhost:4000). Check it with:

```powershell
Invoke-RestMethod http://localhost:4000/api/health
```

Swagger docs: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

### 3. Start the mobile app

In a second PowerShell window:

```powershell
Set-Location D:\projects\miniledger\mobile
npm install
npx expo start --web
```

Open the URL shown by Expo, usually [http://localhost:8081](http://localhost:8081).

For a phone or emulator, use:

```powershell
npx expo start
```

For a physical phone, set `EXPO_PUBLIC_API_URL` to your computer's LAN address, such as `http://192.168.1.20:4000/api`.

### 4. Sign in

1. Enter a 10-digit phone number and select **Send OTP**.
2. Copy the OTP printed in the backend terminal.
3. Enter it and select **Verify OTP**.

Due dates accept `DD-MM-YYYY` or `YYYY-MM-DD`.

## Tests and checks

```powershell
Set-Location D:\projects\miniledger\backend
npm test
npm run build

Set-Location D:\projects\miniledger\mobile
npx tsc --noEmit
npx expo-doctor
```

## Project structure

| Directory | Purpose |
| --- | --- |
| `backend/` | Express API, Prisma schema, migrations, and tests |
| `mobile/` | Expo React Native app |
| `docs/` | API reference and interview notes |

See [docs/API.md](docs/API.md) for endpoints and [backend/.env.example](backend/.env.example) for configuration. Never commit `.env`, credentials, or uploaded receipts.

OTP authentication and local receipt storage are for development only.
