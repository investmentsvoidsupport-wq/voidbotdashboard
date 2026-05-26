# Void Bot Dashboard

A lightweight React + Vite dashboard for your Discord bot.

## Setup

1. Open `voiddashboard`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the app:
   ```bash
   npm run dev
   ```

> If you want to view the live HTML dashboard that uses the bot backend from the repository root, run this instead:
>
> ```bash
> npm run dashboard
> ```
>
> That command now works from inside `voiddashboard` and forwards to the repo root dashboard server.

## What is included

- React + Vite scaffold
- bot status dashboard page
- admin quick action cards
- placeholder settings panel
- sample API fetch to `/api/status`

## Next steps

- Add a backend endpoint for `/api/status`
- Connect Discord OAuth2 for manager login
- Render real bot metrics and blacklist state
- Add configuration forms for blacklist channels and roles
