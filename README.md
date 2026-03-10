# P2P Admin Elite

Project is split into **backend** (APIs, routes, secrets) and **frontend** (UI components).

## Structure

- **`/backend`** – Node.js + Express
  - Port: **4050**
  - Start: **`npm start`**
  - Holds: API routes, `.env`, and all confidential keys (e.g. `GEMINI_API_KEY`). Never expose these to the frontend.

- **`/frontend`** – Vite + React
  - Port: **3000**
  - Start: **`npm run dev`**
  - UI only; calls backend at `http://localhost:4050` via proxy (`/api` → backend).

## Run locally

**Prerequisites:** Node.js

1. **Backend**
   - `cd backend`
   - `npm install`
   - Copy `backend/.env.example` to `backend/.env` and set `GEMINI_API_KEY` (and any other secrets).
   - `npm start` → backend runs at http://localhost:4050

2. **Frontend**
   - `cd frontend`
   - `npm install`
   - `npm run dev` → frontend runs at http://localhost:3000

**From repo root:**

- Backend: **`npm start`**
- Frontend: **`npm run dev`**

Open http://localhost:3000 in the browser. The frontend proxies `/api` to the backend.
