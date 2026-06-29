# AGENTS.md

## Cursor Cloud specific instructions

A Vite + React 19 + TypeScript single-page app (Google AI Studio applet) served in dev by a small Express wrapper (`server.ts`). Standard scripts are in `package.json` / `README.md`.

Cloud-specific notes:

- Dev server: `npm run dev` runs `tsx server.ts`, which mounts Vite in middleware mode and listens on **port 3000** bound to `0.0.0.0`. Health probe: `GET /api/health` → `{"status":"ok"}`.
- Lint / type-check: `npm run lint` (runs `tsc --noEmit`). Passes clean.
- The app calls the Gemini API and Firebase. Without a `GEMINI_API_KEY` (and Firebase config) the bundle still builds and the dev server serves, but the UI stays on its loading state because runtime data calls don't resolve. Provide `GEMINI_API_KEY` via `.env.local`/secrets to exercise full functionality (`.env*` is gitignored except `.env.example`).
- `dev` does not run `vite build`; it serves source directly. Build/preview use `vite build` / `vite preview`.
- This repo and the `MyCloud-...` repo both default to port 3000; run only one on 3000 at a time, or pass a different port to one of them.
