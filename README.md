# Full-Stack Starter (Next.js + NestJS)

This workspace contains a basic full-stack starter with:

- Frontend: Next.js (App Router) + Tailwind CSS
- Backend: NestJS + JWT authentication + Socket.IO

## Project Structure

```text
imcs/
├── frontend/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── lib/
│   │   └── config.ts
│   ├── next.config.mjs
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.ts
│   └── tsconfig.json
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   │   ├── dto/login.dto.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── jwt.strategy.ts
│   │   ├── events/
│   │   │   ├── events.gateway.ts
│   │   │   └── events.module.ts
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   └── users.service.ts
│   │   ├── app.controller.ts
│   │   ├── app.module.ts
│   │   └── main.ts
│   ├── .env.example
│   ├── nest-cli.json
│   ├── package.json
│   ├── tsconfig.build.json
│   └── tsconfig.json
└── .gitignore
```

## Quick Start

1. Install dependencies:

```bash
cd frontend && npm install
cd ../backend && npm install
```

2. Configure environment:

```bash
cd backend
cp .env.example .env
```

3. Run apps in separate terminals:

```bash
cd backend && npm run start:dev
cd frontend && npm run dev
```

Frontend runs on `http://localhost:3000` and backend on `http://localhost:3001`.

## Auth Flow

- `POST /auth/login` with JSON body `{ "username": "admin", "password": "admin123" }`
- Returns `{ access_token: "..." }`
- Use token in `Authorization: Bearer <token>` for protected routes and Socket.IO auth.

## Socket.IO

- Socket server is attached to NestJS backend.
- Client can connect with JWT token using `auth: { token }`.
- Example event:
  - emit `ping` with `{ message: "hello" }`
  - server responds with `pong`
