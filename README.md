# CloserAI Platform

Full-stack CRM dashboard for the CHC Capital sales team — Jacob + Angie agents.

## Stack

- **Backend**: Express + TypeScript (strict) + SQLite + Winston
- **Frontend**: React + Vite + Tailwind CSS
- **Data**: GoHighLevel API (~47k contacts) + real-time SMS pipeline logs

## Quick Start

```bash
# Backend
cd packages/api
cp .env.example .env
# Fill in GHL_API_KEY
npm install
npm run dev

# Frontend (separate terminal)
cd packages/web
npm install
npm run dev
```

Frontend → http://localhost:5173  
API → http://localhost:3001

## Environment Variables

| Variable         | Description                          |
|-----------------|--------------------------------------|
| `GHL_API_KEY`   | GoHighLevel API key                  |
| `PORT`          | API port (default: 3001)             |
| `LOG_LEVEL`     | Winston log level (default: info)    |

## Architecture

```
packages/
  api/    — Express REST API
    config.ts   — Lazy env config
    logger.ts   — Winston logger
    db.ts       — SQLite typed schema
    ghl.ts      — GoHighLevel API client
    sms.ts      — SMS log reader/parser
    routes/     — Endpoint handlers
  web/    — React CRM dashboard
    components/ — UI components
    hooks/      — Data hooks
    types.ts    — Shared interfaces
    api.ts      — Fetch wrapper
```
