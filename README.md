# Sehat-Setu

Sehat-Setu is a single repository containing a React/Vite frontend, NestJS
API, Prisma/PostgreSQL data layer, and a stateless FastAPI AI service.

## Local development

Requirements: Node.js 22, Python 3.12, Docker, and FFmpeg (for browser/live
audio conversion).

1. Copy `.env.example` to `.env` and keep the localhost defaults.
2. Start PostgreSQL with `docker compose up -d postgres`.
3. Install Node dependencies with `npm ci`.
4. Apply local migrations with `npx prisma migrate dev` and optionally run
   `npx tsx prisma/seed.ts`.
5. Start NestJS with `npm run start:dev` (port 8000).
6. In `ai-service`, create a virtual environment, install
   `requirements.txt`, and run
   `uvicorn app.main:app --reload --host 0.0.0.0 --port 8001`.
7. Start Vite with `npm --prefix frontend run dev` (port 5173).

The browser calls NestJS. Authenticated JSON AI operations are available under
`/api/ai/:operation`; NestJS supplies the internal service key to FastAPI.

## Production

- Vercel root directory: `frontend`; output directory: `dist`.
- Render backend: root `Dockerfile`, lightweight health check `/health`.
- Render AI service: `ai-service/Dockerfile`, one worker, health check
  `/health`, optional dependency status at `/readiness`.
- Supabase: use its PostgreSQL runtime URL as `DATABASE_URL`. Use the direct
  connection as `DIRECT_URL` when running migrations.
- Apply production migrations only with `npx prisma migrate deploy`.

Never expose `AI_SERVICE_API_KEY`, `INTERNAL_API_KEY`, `JWT_SECRET`,
`DATABASE_URL`, or `GEMINI_API_KEY` to Vite variables.

See `.env.example`, `frontend/.env.example`, `ai-service/.env.example`, and
`render.yaml` for the complete configuration surface.
