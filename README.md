# Huel RTD ROI Dashboard

This app is now Airtable-first for shared production data.

## Architecture

- React + Vite frontend
- Vercel API routes in `/api`
- Airtable as the source of truth for:
  - retailer records
  - product rows
  - pricing config
  - confirmed placements planner rows
  - commercial signals
  - execution tasks

The browser no longer owns the canonical portfolio state.

## Required Vercel Environment Variables

- `AIRTABLE_TOKEN`
- `AIRTABLE_BASE_ID`

These should be configured in the linked Vercel project so the API routes can read and write Airtable server-side.

## Airtable Tables

- `Retailers`
- `Products`
- `Pricing Config`
- `Placements Forecast`
- `Signals` (optional, but recommended for command-center workflow)
- `Tasks` (optional, but recommended for command-center workflow)

The Settings screen includes the expected field schema for each table.

## Local Development

To run the full app locally with API routes:

1. Run Vercel dev on port `3000`
2. Run Vite dev normally

The Vite dev server proxies `/api` to `http://127.0.0.1:3000`.

Example:

```bash
vercel dev --listen 3000
npm run dev
```

## Production Deploys

- Git remote: GitHub
- Hosting: Vercel
- Shared data: Airtable through Vercel API routes

Pushing changes to the connected production branch and deploying on Vercel will update the app while keeping data centralized in Airtable.
