# SiBo

SiBo is an AI-powered medical information organization and intelligence web application. The goal is to turn fragmented patient intake information and medical reports into a single structured, traceable, and human-reviewable patient record.

This project is currently in Phase 0, which focuses on establishing a clean, production-oriented foundation for later phases.

## Current scope
- React frontend with TypeScript
- Express backend with TypeScript
- Tailwind CSS setup
- Environment configuration
- Security middleware
- Request ID and centralized error handling
- Health endpoint
- Frontend-backend connectivity check

AI functionality and medical logic are intentionally not implemented yet.

## Tech stack
- Frontend: React, Vite, TypeScript, Tailwind CSS
- Backend: Node.js, Express.js, TypeScript
- Validation: Zod
- Security: Helmet, CORS, express-rate-limit
- Environment: dotenv
- Icons: lucide-react

## Folder structure
```text
sibo/
├── client/
│   ├── src/
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/
│   ├── src/
│   ├── package.json
│   └── tsconfig.json
├── shared/
├── tests/
├── public/
├── .env.example
├── .gitignore
├── PROGRESS_TRACKER.md
├── MEMORY.md
├── README.md
├── package.json
└── .gitignore
```

## Install dependencies
```bash
npm install
npm --prefix client install
npm --prefix server install
```

## Run frontend
```bash
npm --prefix client run dev
```

## Run backend
```bash
npm --prefix server run dev
```

## Run both together
```bash
npm run dev
```

## Environment variables
Copy `.env.example` to `.env` if needed for local development and adjust values.

Example:
```env
PORT=8080
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

## Health endpoint
```http
GET /api/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "sibo-api"
}
```

## Important notes
- AI features are intentionally not implemented in this phase.
- No database, authentication, or patient storage is included yet.
- No secret credentials should be committed.
