# Full-Stack Starter (Next.js + NestJS)

This workspace contains a basic full-stack starter with:

- Frontend: Next.js (App Router) + Tailwind CSS
- Backend: NestJS + JWT authentication + Socket.IO + Prisma/PostgreSQL

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

3. Start PostgreSQL (required for message storage):

```bash
cd ..
docker compose up -d
```

4. Generate Prisma client and run migrations:

```bash
cd backend
npm run prisma:generate
npm run prisma:migrate:dev
```

5. Run apps in separate terminals:

```bash
cd backend && npm run start:dev
cd frontend && npm run dev
```

Frontend runs on `http://localhost:3000` and backend on `http://localhost:3001`.

## Secure Auth Flow

- Seed admin user is loaded from environment:
  - `INIT_ADMIN_USERNAME` (default: `admin`)
  - `INIT_ADMIN_PASSWORD` (default: `Admin123!`)
- `POST /auth/login` with `{ "username": "admin", "password": "Admin123!" }`
- Returns `{ "access_token": "..." }` and also sets an `httpOnly` cookie.
- Protected routes can use either:
  - `Authorization: Bearer <token>`
  - Auth cookie (sent automatically by browser)

### Admin User Management

- `POST /users` (admin only)
  - Body: `{ "username": "new_user", "password": "StrongPass123", "role": "user" }`
- `GET /users` (admin only)

### Protected Route Example

- `GET /auth/profile` requires valid JWT via header or cookie.

## Socket.IO

- Socket server is attached to NestJS backend.
- Client can connect with JWT token using `auth: { token }`.

### Realtime Messaging Events

- `join_room`
  - payload: `{ roomKey: string, roomName?: string }`
  - server emits: `room_joined` with room metadata and message history.
- `send_message`
  - payload: `{ roomKey: string, content: string }`
  - server emits: `receive_message` to all clients in the room.
- `typing`
  - payload: `{ roomKey: string, isTyping: boolean }`
  - server forwards typing indicator to other room members.
- `read_receipt`
  - payload: `{ messageId: string, status: 'DELIVERED' | 'READ' }`
  - server persists receipt and broadcasts the update.

### Frontend Pages

- `/login`: sign in and create secure auth cookie.
- `/chat`: room-based realtime group messaging UI with:
  - instant send/receive
  - typing indicator
  - delivered/read status labels
